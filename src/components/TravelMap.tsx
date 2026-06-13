"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Location, RouteResult, HotelMapItem } from "@/src/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const MARKER_COLORS: Record<string, string> = {
  departure: "#0e3c60", // navy
  venue: "#f96c1a", // ember
  hotel: "#caa24a", // gold
};

const MODE_DASH: Record<string, number[]> = {
  plane: [2, 2],
  train: [3, 2],
  walking: [1, 2],
  car: [],
  bus: [],
};

interface TravelMapProps {
  departure: Location | null;
  venue: Location | null;
  hotel: Location | null;
  route: RouteResult | null;
  hotelResults: HotelMapItem[];
  selectedHotelId: string | null;
  onHotelSelect: (hotel: HotelMapItem) => void;
  hotelRadius: number;
  showHotels: boolean;
}

export default function TravelMap({
  departure,
  venue,
  hotel,
  route,
  hotelResults,
  selectedHotelId,
  onHotelSelect,
  hotelRadius,
  showHotels,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const hotelLayersReady = useRef(false);
  const radiusIdsRef = useRef<string[]>([]);
  const routeIdsRef = useRef<string[]>([]);
  const drawRef = useRef<() => void>(() => {});
  const onHotelSelectRef = useRef(onHotelSelect);
  useEffect(() => {
    onHotelSelectRef.current = onHotelSelect;
  }, [onHotelSelect]);

  // ── Init map (declared first so the map exists before other effects run) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [2.3522, 46.6],
      zoom: 4.6,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      readyRef.current = true;
      drawRef.current();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      hotelLayersReady.current = false;
    };
  }, []);

  // ── Markers + fit bounds (markers don't require the style to be loaded) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = (key: string, loc: Location | null) => {
      markersRef.current[key]?.remove();
      delete markersRef.current[key];
      if (!loc) return;

      const labelText = key === "departure" ? "Départ" : key === "venue" ? "Arrivée" : key === "hotel" ? "Hôtel" : "";
      
      const el = document.createElement("div");
      el.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 2px 8px rgba(0,17,58,0.25));
        cursor: pointer;
      `;
      
      const labelEl = document.createElement("div");
      labelEl.style.cssText = `
        background: ${MARKER_COLORS[key]};
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: system-ui, -apple-system, sans-serif;
        white-space: nowrap;
        margin-bottom: 5px;
        border: 1px solid rgba(255,255,255,0.2);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        pointer-events: none;
      `;
      labelEl.innerText = labelText;
      el.appendChild(labelEl);

      const dotEl = document.createElement("div");
      dotEl.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${MARKER_COLORS[key]};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      `;
      el.appendChild(dotEl);

      markersRef.current[key] = new mapboxgl.Marker({ element: el, anchor: "bottom", offset: [0, 7] })
        .setLngLat([loc.coords.lng, loc.coords.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: [0, -28], closeButton: false }).setHTML(
            `<strong style="color:#00113a">${loc.name}</strong>`
          )
        )
        .addTo(map);
    };

    sync("departure", departure);
    sync("venue", venue);
    sync("hotel", hotel);

    const locs = [departure, venue, hotel].filter(Boolean) as Location[];
    if (locs.length === 1) {
      map.flyTo({ center: [locs[0].coords.lng, locs[0].coords.lat], zoom: 12 });
    } else if (locs.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locs.forEach((l) => bounds.extend([l.coords.lng, l.coords.lat]));
      map.fitBounds(bounds, { padding: 90, maxZoom: 13.5, duration: 800 });
    }
  }, [departure, venue, hotel]);

  // ── Style-dependent layers: hotels, radius, route ──
  useEffect(() => {
    const draw = () => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      /* Hotels (create the source + layers once, then just update constants) */
      if (!hotelLayersReady.current) {
        map.addSource("hotels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "hotels-circle",
          type: "circle",
          source: "hotels",
          filter: ["!=", ["get", "selected"], true],
          paint: {
            "circle-radius": 7,
            "circle-color": "#caa24a",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "hotels-circle-selected",
          type: "circle",
          source: "hotels",
          filter: ["==", ["get", "selected"], true],
          paint: {
            "circle-radius": 10,
            "circle-color": "#f96c1a",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 3,
          },
        });

        const click = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          onHotelSelectRef.current({
            id: p.id,
            name: p.name,
            locationName: p.locationName,
            coords: { lat: p.lat, lng: p.lng },
            stars: p.stars || undefined,
            pricePerNight: p.pricePerNight || undefined,
            currency: p.currency || undefined,
            photo: p.photo || undefined,
          });
        };
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        for (const layer of ["hotels-circle", "hotels-circle-selected"]) {
          map.on("click", layer, click);
          map.on("mouseenter", layer, (e) => {
            map.getCanvas().style.cursor = "pointer";
            const p = e.features?.[0]?.properties;
            if (!p) return;
            const price = p.pricePerNight ? `<br/><span style="color:#9f4200;font-weight:600">${p.currency || "€"}${p.pricePerNight}/nuit</span>` : "";
            popup
              .setLngLat([p.lng, p.lat])
              .setHTML(`<strong style="color:#00113a">${p.name}</strong>${price}`)
              .addTo(map);
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });
        }
        hotelLayersReady.current = true;
      }

      const features = (showHotels ? hotelResults : []).map((h) => ({
        type: "Feature" as const,
        properties: {
          id: h.id,
          name: h.name,
          locationName: h.locationName,
          lat: h.coords.lat,
          lng: h.coords.lng,
          stars: h.stars || 0,
          pricePerNight: h.pricePerNight || 0,
          currency: h.currency || "€",
          photo: h.photo || "",
          selected: h.id === selectedHotelId,
        },
        geometry: { type: "Point" as const, coordinates: [h.coords.lng, h.coords.lat] },
      }));
      (map.getSource("hotels") as mapboxgl.GeoJSONSource | undefined)?.setData({
        type: "FeatureCollection",
        features,
      });

      /* Radius ring around the venue */
      for (const id of radiusIdsRef.current) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource("radius")) map.removeSource("radius");
      radiusIdsRef.current = [];
      if (showHotels && venue) {
        const c = [venue.coords.lng, venue.coords.lat];
        const ring: [number, number][] = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * 2 * Math.PI;
          const dx = hotelRadius / (111.32 * Math.cos((c[1] * Math.PI) / 180));
          const dy = hotelRadius / 110.574;
          ring.push([c[0] + dx * Math.cos(a), c[1] + dy * Math.sin(a)]);
        }
        map.addSource("radius", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } },
        });
        map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#f96c1a", "fill-opacity": 0.06 } });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: { "line-color": "#f96c1a", "line-width": 1.5, "line-opacity": 0.45, "line-dasharray": [3, 3] },
        });
        radiusIdsRef.current = ["radius-fill", "radius-line"];
      }

      /* Journey route */
      for (const id of routeIdsRef.current) {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
      routeIdsRef.current = [];
      if (route) {
        route.segments.forEach((seg, i) => {
          const id = `route-${i}`;
          map.addSource(id, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: seg.coordinates.map(([lat, lng]) => [lng, lat]) },
            },
          });
          const dash = MODE_DASH[seg.mode] || [];
          const getLineColor = () => {
            if (seg.color) return seg.color;
            switch (seg.mode) {
              case "walking": return "#94a3b8";
              case "car": return "#64748b";
              case "bus": return "#0d5c63";
              case "plane": return "#0ea5e9";
              case "train": return "#9f4200";
              default: return "#0e3c60";
            }
          };
          map.addLayer({
            id,
            type: "line",
            source: id,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": getLineColor(),
              "line-width": seg.mode === "walking" ? 3 : 4,
              "line-opacity": 0.9,
              ...(dash.length ? { "line-dasharray": dash } : {}),
            },
          });
          routeIdsRef.current.push(id);
        });
      }
    };

    drawRef.current = draw;
    if (readyRef.current) draw();
  }, [route, hotelResults, selectedHotelId, hotelRadius, showHotels, venue]);

  return <div ref={containerRef} className="h-full w-full" />;
}
