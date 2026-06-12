import { NextRequest } from "next/server";

interface StopCoord {
  name: string;
  lat: number;
  lng: number;
}

interface RouteSection {
  mode: string;
  color?: string;
  label?: string;
  fromName: string;
  toName: string;
  coordinates: [number, number][];
}

// Cache: journey key → coordinates
const cache = new Map<string, { coords: [number, number][]; sections?: RouteSection[]; ts: number }>();
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
    return Response.json({ coordinates: cached.coords, sections: cached.sections || [] });
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
      return Response.json({ coordinates: [], sections: [] });
    }

    const journeyData = await journeyRes.json();
    const journey = journeyData.journeys?.[0];
    if (!journey) {
      return Response.json({ coordinates: [], sections: [] });
    }

    // 2. Process sections to build coordinates per section (for styling)
    const resultSections: RouteSection[] = [];
    const allStops: string[] = [];

    for (const section of journey.sections) {
      if (section.type === "waiting") continue;

      let mode = "train";
      let color: string | undefined = undefined;
      let label: string | undefined = undefined;
      const fromName = section.from?.name || section.from?.stop_area?.name || "";
      const toName = section.to?.name || section.to?.stop_area?.name || "";
      let sectionCoords: [number, number][] = [];

      // Extract transport display info (color, label)
      const di = section.display_informations;
      if (di) {
        if (di.color) {
          color = di.color.startsWith("#") ? di.color : `#${di.color}`;
        }
        const commMode = di.commercial_mode || "";
        const code = di.code || di.label || "";
        label = commMode ? `${commMode} ${code}`.trim() : (di.name || "");
      }

      if (section.type === "transfer" || section.type === "street_network") {
        mode = "walking";
        color = "#94a3b8";
        label = "Transfert à pied";
      }

      // Try to get coordinates from section.geojson
      if (section.geojson?.coordinates && section.geojson.coordinates.length > 0) {
        sectionCoords = section.geojson.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
      } else {
        // Fallback: collect stop times
        const sectionStops: StopCoord[] = [];
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
                  sectionStops.push({
                    name: sp.name,
                    lat: parseFloat(sp.coord.lat),
                    lng: parseFloat(sp.coord.lon),
                  });
                }
              }
            }
          }
        }

        if (sectionStops.length === 0) {
          if (section.from?.stop_point?.coord) {
            const c = section.from.stop_point.coord;
            sectionStops.push({ name: section.from.name, lat: parseFloat(c.lat), lng: parseFloat(c.lon) });
          }
          if (section.to?.stop_point?.coord) {
            const c = section.to.stop_point.coord;
            sectionStops.push({ name: section.to.name, lat: parseFloat(c.lat), lng: parseFloat(c.lon) });
          }
        }

        // Add stop names to allStops
        sectionStops.forEach(s => {
          if (!allStops.includes(s.name)) allStops.push(s.name);
        });

        if (sectionStops.length >= 2) {
          const waypointStr = sectionStops.map(s => `${s.lng},${s.lat}`).join(";");
          const profile = mode === "walking" ? "foot" : "driving";
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/${profile}/${waypointStr}?overview=full&geometries=geojson`
          );

          if (osrmRes.ok) {
            const osrmData = await osrmRes.json();
            if (osrmData.code === "Ok" && osrmData.routes?.length) {
              sectionCoords = osrmData.routes[0].geometry.coordinates.map(
                ([lng, lat]: [number, number]) => [lat, lng]
              );
            }
          }
        }
      }

      // Straight line fallback if OSRM and geojson both failed
      if (sectionCoords.length === 0) {
        const fromLat = section.from?.stop_point?.coord?.lat || section.from?.coord?.lat;
        const fromLng = section.from?.stop_point?.coord?.lon || section.from?.coord?.lon;
        const toLat = section.to?.stop_point?.coord?.lat || section.to?.coord?.lat;
        const toLng = section.to?.stop_point?.coord?.lon || section.to?.coord?.lon;
        if (fromLat && fromLng && toLat && toLng) {
          sectionCoords = [
            [parseFloat(fromLat), parseFloat(fromLng)],
            [parseFloat(toLat), parseFloat(toLng)]
          ];
        }
      }

      if (sectionCoords.length > 0) {
        resultSections.push({
          mode,
          color,
          label,
          fromName,
          toName,
          coordinates: sectionCoords,
        });
      }
    }

    // Flat coordinates for backward compatibility
    const flatCoordinates = resultSections.reduce((acc, curr) => {
      return acc.concat(curr.coordinates);
    }, [] as [number, number][]);

    // Save in cache
    cache.set(cacheKey, { coords: flatCoordinates, sections: resultSections, ts: Date.now() });

    return Response.json({
      coordinates: flatCoordinates,
      sections: resultSections,
      stops: allStops,
    });
  } catch {
    return Response.json({ coordinates: [], sections: [] });
  }
}
