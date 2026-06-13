import { NextRequest } from "next/server";
import { SNCFSection, TrainDetail } from "@/src/types";
import { formatSncfDate } from "@/src/utils/date";
import { sncfConfig } from "@/src/config";

export async function GET(request: NextRequest) {
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");

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

  const url = `${sncfConfig.baseUrl}/coverage/sncf/journeys?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
    },
  });

  if (!res.ok) {
    return Response.json({ error: `SNCF API error: ${res.status}` }, { status: res.status });
  }

  const data = await res.json();

  if (!data.journeys?.length) {
    return Response.json({ journeys: [] });
  }

  const journeys = data.journeys.map(
    (j: {
      duration: number;
      departure_date_time: string;
      arrival_date_time: string;
      nb_transfers: number;

      sections: SNCFSection[];
      fare?: { total?: { value?: string } };
    }) => {
      // Extract each train in the journey
      const trains: TrainDetail[] = j.sections
        .filter((s) => s.type === "public_transport")
        .map((s) => {
          const di = s.display_informations;
          const commercialMode = di?.commercial_mode || "";
          const tripNumber = di?.headsign || di?.trip_short_name || di?.code || "";
          const label = di?.label || "";

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

  return Response.json({ journeys });
}
