import { NextRequest } from "next/server";

interface SNCFSection {
  type: string;
  departure_date_time?: string;
  arrival_date_time?: string;
  from?: { name: string; stop_area?: { name: string } };
  to?: { name: string; stop_area?: { name: string } };
  geojson?: { coordinates: [number, number][] };
  display_informations?: {
    commercial_mode?: string;
    physical_mode?: string;
    label?: string;
    headsign?: string;
    direction?: string;
    name?: string;
    network?: string;
    trip_short_name?: string;
    code?: string;
    description?: string;
  };
}

interface TrainDetail {
  type: string;        // TGV INOUI, TER, OUIGO, Intercités...
  name: string;        // ex: "TGV INOUI 6231"
  number: string;      // numéro de service (headsign/trip_short_name)
  network: string;     // SNCF, etc.
  direction: string;   // direction du train
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
}

export async function GET(request: NextRequest) {
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");

  if (!fromId || !toId) {
    return Response.json({ error: "from and to SNCF stop_area IDs required" }, { status: 400 });
  }

  const apiKey = process.env.SNCF_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    from: fromId,
    to: toId,
    count: "5",
    "data_freshness": "realtime",
  });

  const url = `https://api.sncf.com/v1/coverage/sncf/journeys?${params}`;

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

function formatSncfDate(sncfDate: string): string {
  if (sncfDate.length < 15) return sncfDate;
  const y = sncfDate.slice(0, 4);
  const m = sncfDate.slice(4, 6);
  const d = sncfDate.slice(6, 8);
  const h = sncfDate.slice(9, 11);
  const min = sncfDate.slice(11, 13);
  return `${y}-${m}-${d}T${h}:${min}:00`;
}
