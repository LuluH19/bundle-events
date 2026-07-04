import { NextRequest } from "next/server";
import { StopCoord, RouteSection } from "@/src/types";
import { sncfConfig, osrmConfig, openRailwayRoutingConfig } from "@/src/config";

export const dynamic = "force-dynamic";

// Cache: journey key → coordinates
const cache = new Map<string, { coords: [number, number][]; sections?: RouteSection[]; ts: number }>();

export async function GET(request: NextRequest) {
  const fromId = request.nextUrl.searchParams.get("from");
  const toId = request.nextUrl.searchParams.get("to");

  if (!fromId || !toId) {
    return Response.json({ error: "from and to SNCF stop_area IDs required" }, { status: 400 });
  }

  const cacheKey = `${fromId}-${toId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < sncfConfig.geometryCacheTtl) {
    return Response.json({ coordinates: cached.coords, sections: cached.sections || [] });
  }

  const apiKey = sncfConfig.apiKey;
  if (!apiKey) {
    return Response.json({ error: "SNCF_API_KEY not configured" }, { status: 500 });
  }

  try {
    // 1. Find a journey to get the vehicle_journey/line
    const journeyRes = await fetch(
      `${sncfConfig.baseUrl}/coverage/sncf/journeys?from=${fromId}&to=${toId}&count=1&disable_geojson=false`,
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

      // 1. Gather all intermediate stops from SNCF
      const sectionStops: StopCoord[] = [];
      const vjLink = section.links?.find((l: { type: string }) => l.type === "vehicle_journey");
      if (vjLink?.id) {
        const vjRes = await fetch(
          `${sncfConfig.baseUrl}/coverage/sncf/vehicle_journeys/${vjLink.id}?depth=2`,
          { headers: { Authorization: `Basic ${btoa(apiKey + ":")}` } }
        );

        if (vjRes.ok) {
          const vjData = await vjRes.json();
          const vj = vjData.vehicle_journeys?.[0];
          if (vj?.stop_times) {
            let recording = false;
            for (const st of vj.stop_times) {
              const sp = st.stop_point;
              
              if (!recording) {
                const matchFromId = sp?.id === section.from?.id || sp?.id === section.from?.stop_point?.id || sp?.stop_area?.id === section.from?.id;
                const matchFromName = sp?.name === section.from?.name;
                if (matchFromId || matchFromName) {
                  recording = true;
                }
              }

              if (recording && sp?.coord?.lat && sp?.coord?.lon) {
                sectionStops.push({
                  name: sp.name,
                  lat: parseFloat(sp.coord.lat),
                  lng: parseFloat(sp.coord.lon),
                });
              }

              if (recording) {
                const matchToId = sp?.id === section.to?.id || sp?.id === section.to?.stop_point?.id || sp?.stop_area?.id === section.to?.id;
                const matchToName = sp?.name === section.to?.name;
                if (matchToId || matchToName) {
                  break;
                }
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

      // 2. Fetch routing
      if (sectionStops.length >= 2) {
        if (mode === "train") {
          try {
            const startNode = sectionStops[0];
            const endNode = sectionStops[sectionStops.length - 1];
            const url = `${openRailwayRoutingConfig.routingBaseUrl}/route?point=${startNode.lat},${startNode.lng}&point=${endNode.lat},${endNode.lng}&profile=all_tracks&points_encoded=false`;
            const ormRes = await fetch(url);
            if (ormRes.ok) {
              const ormData = await ormRes.json();
              if (ormData.paths?.length > 0 && ormData.paths[0].points?.coordinates) {
                sectionCoords = ormData.paths[0].points.coordinates.map(
                  ([lng, lat]: [number, number]) => [lat, lng]
                );
              }
            }
          } catch (err) {
            console.error("OpenRailRouting fetch error", err);
          }
        }
        
        if (sectionCoords.length === 0 && mode !== "train") {
          const waypointStr = sectionStops.map(s => `${s.lng},${s.lat}`).join(";");
          const profile = mode === "walking" ? "foot" : "driving";
          try {
            const osrmRes = await fetch(
              `${osrmConfig.baseUrl}/${profile}/${waypointStr}?overview=full&geometries=geojson`
            );
            if (osrmRes.ok) {
              const osrmData = await osrmRes.json();
              if (osrmData.code === "Ok" && osrmData.routes?.length) {
                sectionCoords = osrmData.routes[0].geometry.coordinates.map(
                  ([lng, lat]: [number, number]) => [lat, lng]
                );
              }
            }
          } catch (err) {
            console.error("OSRM fetch error", err);
          }
        }
      }

      // 3. Fallback to section.geojson if APIs failed or didn't run (e.g. OpenRailRouting failed)
      if (sectionCoords.length === 0 && section.geojson?.coordinates && section.geojson.coordinates.length > 0) {
        if (section.geojson.type === "MultiLineString") {
          // Flatten MultiLineString
          sectionCoords = section.geojson.coordinates.flat().map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
        } else {
          sectionCoords = section.geojson.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
        }
      }

      // 4. Fallback to connecting intermediate stops
      if (sectionCoords.length === 0 && sectionStops.length >= 2) {
        sectionCoords = sectionStops.map(s => [s.lat, s.lng]);
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
