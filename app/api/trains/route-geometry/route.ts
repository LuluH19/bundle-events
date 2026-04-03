import { NextRequest } from "next/server";

interface StopCoord {
  name: string;
  lat: number;
  lng: number;
}

// Cache: journey key → coordinates
const cache = new Map<string, { coords: [number, number][]; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function GET(request: NextRequest) {
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");

  if (!fromId || !toId) {
    return Response.json({ error: "from and to SNCF stop_area IDs required" }, { status: 400 });
  }

  const cacheKey = `${fromId}-${toId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json({ coordinates: cached.coords });
  }

  const apiKey = process.env.SNCF_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  try {
    // 1. Find a journey to get the vehicle_journey/line
    const journeyRes = await fetch(
      `https://api.sncf.com/v1/coverage/sncf/journeys?from=${fromId}&to=${toId}&count=1`,
      { headers: { Authorization: `Basic ${btoa(apiKey + ":")}` } }
    );

    if (!journeyRes.ok) {
      return Response.json({ coordinates: [] });
    }

    const journeyData = await journeyRes.json();
    const journey = journeyData.journeys?.[0];
    if (!journey) {
      return Response.json({ coordinates: [] });
    }

    // 2. Extract stop coordinates from all public_transport sections
    const stops: StopCoord[] = [];

    for (const section of journey.sections) {
      if (section.type !== "public_transport") continue;

      // Get the vehicle_journey to find intermediate stops
      const vjLink = section.links?.find((l: { type: string }) => l.type === "vehicle_journey");
      if (vjLink?.id) {
        const vjRes = await fetch(
          `https://api.sncf.com/v1/coverage/sncf/vehicle_journeys/${vjLink.id}?depth=2`,
          { headers: { Authorization: `Basic ${btoa(apiKey + ":")}` } }
        );

        if (vjRes.ok) {
          const vjData = await vjRes.json();
          const vj = vjData.vehicle_journeys?.[0];
          if (vj?.stop_times) {
            for (const st of vj.stop_times) {
              const sp = st.stop_point;
              if (sp?.coord?.lat && sp?.coord?.lon) {
                stops.push({
                  name: sp.name,
                  lat: parseFloat(sp.coord.lat),
                  lng: parseFloat(sp.coord.lon),
                });
              }
            }
          }
        }
      }

      // Fallback: use section from/to if no vehicle_journey
      if (stops.length === 0) {
        if (section.from?.stop_point?.coord) {
          const c = section.from.stop_point.coord;
          stops.push({ name: section.from.name, lat: parseFloat(c.lat), lng: parseFloat(c.lon) });
        }
        if (section.to?.stop_point?.coord) {
          const c = section.to.stop_point.coord;
          stops.push({ name: section.to.name, lat: parseFloat(c.lat), lng: parseFloat(c.lon) });
        }
      }
    }

    if (stops.length < 2) {
      return Response.json({ coordinates: [] });
    }

    // 3. Build OSRM route through all intermediate stops
    // OSRM supports multi-waypoint: lng,lat;lng,lat;lng,lat;...
    const waypointStr = stops.map(s => `${s.lng},${s.lat}`).join(";");
    const osrmRes = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${waypointStr}?overview=full&geometries=geojson`
    );

    if (!osrmRes.ok) {
      return Response.json({ coordinates: [] });
    }

    const osrmData = await osrmRes.json();
    if (osrmData.code !== "Ok" || !osrmData.routes?.length) {
      return Response.json({ coordinates: [] });
    }

    // Convert [lng,lat] → [lat,lng]
    const coordinates: [number, number][] = osrmData.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    cache.set(cacheKey, { coords: coordinates, ts: Date.now() });

    return Response.json({ coordinates, stops: stops.map(s => s.name) });
  } catch {
    return Response.json({ coordinates: [] });
  }
}
