import { NextRequest } from "next/server";

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
      co2_emission?: { value: number };
      sections: {
        type: string;
        display_informations?: {
          commercial_mode?: string;
          label?: string;
          network?: string;
        };
      }[];
      fare?: { total?: { value?: string } };
    }) => {
      const trainSection = j.sections.find(
        (s: { type: string }) => s.type === "public_transport"
      );

      return {
        durationMinutes: j.duration / 60,
        departureAt: formatSncfDate(j.departure_date_time),
        arrivalAt: formatSncfDate(j.arrival_date_time),
        transfers: j.nb_transfers,
        trainType: trainSection?.display_informations?.commercial_mode || "Train",
        trainLabel: trainSection?.display_informations?.label || "",
        network: trainSection?.display_informations?.network || "",
        co2Kg: j.co2_emission ? j.co2_emission.value / 1000 : undefined,
        price: j.fare?.total?.value ? Number(j.fare.total.value) / 100 : undefined,
      };
    }
  );

  return Response.json({ journeys });
}

function formatSncfDate(sncfDate: string): string {
  // SNCF format: "20260402T143000" → ISO
  if (sncfDate.length < 15) return sncfDate;
  const y = sncfDate.slice(0, 4);
  const m = sncfDate.slice(4, 6);
  const d = sncfDate.slice(6, 8);
  const h = sncfDate.slice(9, 11);
  const min = sncfDate.slice(11, 13);
  return `${y}-${m}-${d}T${h}:${min}:00`;
}
