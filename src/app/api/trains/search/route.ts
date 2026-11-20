import { NextRequest } from "next/server";
import { SNCFSection, TrainDetail } from "@/src/types";
import { formatSncfDate, toSncfDateTime } from "@/src/utils/date";
import { apiCacheConfig, sncfConfig } from "@/src/config";
import { cached } from "@/src/lib/api-cache";

export async function GET(request: NextRequest) {
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");
  const datetime = request.nextUrl.searchParams.get("datetime");
  const represents = request.nextUrl.searchParams.get("represents") === "arrival" ? "arrival" : "departure";

  if (!fromId || !toId) {
    return Response.json({ error: "from and to SNCF stop_area IDs required" }, { status: 400 });
  }

  const apiKey = sncfConfig.apiKey;
  if (!apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    from: fromId,
    to: toId,
    count: "5",
    "data_freshness": "realtime",
  });

  const sncfDateTime = datetime ? toSncfDateTime(datetime) : "";
  if (sncfDateTime) {
    params.set("datetime", sncfDateTime);
    params.set("datetime_represents", represents);
  }

  const url = `${sncfConfig.baseUrl}/coverage/sncf/journeys?${params}`;

  // With a datetime it is a real timetable (short TTL). Without one, callers only read
  // durations (short-haul flight check), which are stable: a few hours is fine.
  const policy = sncfDateTime ? apiCacheConfig.policies.trainTimetable : apiCacheConfig.policies.trainDuration;

  try {
    const { data: journeys, status } = await cached({
      provider: "sncf",
      key: `journeys:${fromId}:${toId}:${sncfDateTime || "now"}:${represents}`,
      ...policy,
      fetcher: () => fetchJourneys(url, apiKey),
    });
    return Response.json({ journeys }, { headers: { "X-Cache": status } });
  } catch {
    return Response.json({ journeys: [], degraded: true }, { status: 503 });
  }
}

async function fetchJourneys(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
    },
  });

  if (!res.ok) {
    throw new Error(`SNCF API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.journeys?.length) {
    return [];
  }

  return data.journeys.map(
    (j: {
      duration: number;
      departure_date_time: string;
      arrival_date_time: string;
      nb_transfers: number;

      sections: SNCFSection[];
      fare?: { total?: { value?: string } };
    }) => {
      // Extract each train in the journey
      const ptSections = j.sections.filter((s) => s.type === "public_transport");
      const trains: TrainDetail[] = ptSections.map((s, idx) => {
        const di = s.display_informations;
        const commercialMode = di?.commercial_mode || "";
        const tripNumber = di?.headsign || di?.trip_short_name || di?.code || "";
        const label = di?.label || "";

        let waitTimeAfterMinutes: number | undefined;
        const nextDep = ptSections[idx + 1]?.departure_date_time;
        if (idx < ptSections.length - 1 && s.arrival_date_time && nextDep) {
          const arrTime = Date.parse(formatSncfDate(s.arrival_date_time));
          const depTime = Date.parse(formatSncfDate(nextDep));
          if (Number.isFinite(arrTime) && Number.isFinite(depTime) && depTime >= arrTime) {
            waitTimeAfterMinutes = Math.round((depTime - arrTime) / 60000);
          }
        }

        return {
          type: commercialMode,
          name: `${commercialMode} ${label}`.trim() || `Train ${tripNumber}`,
          number: tripNumber,
          network: di?.network || "SNCF",
          direction: di?.direction || "",
          departureStation: s.from?.stop_area?.name || s.from?.name || "",
          arrivalStation: s.to?.stop_area?.name || s.to?.name || "",
          departureTime: s.departure_date_time ? formatSncfDate(s.departure_date_time) : "",
          arrivalTime: s.arrival_date_time ? formatSncfDate(s.arrival_date_time) : "",
          waitTimeAfterMinutes,
        };
      });

      // Collect geojson coordinates from all sections
      const coordinates: [number, number][] = [];
      for (const section of j.sections) {
        if (section.geojson?.coordinates) {
          for (const coord of section.geojson.coordinates) {
            coordinates.push([coord[1], coord[0]]);
          }
        }
      }

      return {
        durationMinutes: j.duration / 60,
        departureAt: formatSncfDate(j.departure_date_time),
        arrivalAt: formatSncfDate(j.arrival_date_time),
        transfers: j.nb_transfers,
        trains,
        price: j.fare?.total?.value ? Number(j.fare.total.value) / 100 : undefined,
        coordinates,
      };
    }
  );
}
