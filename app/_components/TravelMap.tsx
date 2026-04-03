"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LatLng, Location, RouteResult, HotelMapItem } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const MARKER_COLORS: Record<string, string> = {
  departure: "#3B82F6",
  hotel: "#F59E0B",
  venue: "#EF4444",
};

const LEG_COLORS: Record<string, string> = {
  legA: "#3B82F6",
  legB: "#F97316",
};

const MODE_DASH: Record<string, number[]> = {
  plane: [6, 4],
  train: [8, 4],
  walking: [2, 3],
  car: [],
  bus: [],
};

interface TravelMapProps {
  departure: Location | null;
  hotel: Location | null;
  venue: Location | null;
  legARoute: RouteResult | null;
  legBRoute: RouteResult | null;
  onMapClick: (coords: LatLng) => void;
  mapClickTarget: string | null;
  hotelResults: HotelMapItem[];
  selectedHotelId: string | null;
  onHotelSelect: (hotel: HotelMapItem) => void;
  hotelRadius: number;
}

export default function TravelMap({
  departure,
  hotel,
  venue,
  legARoute,
  legBRoute,
  onMapClick,
  mapClickTarget,
  hotelResults,
  selectedHotelId,
  onHotelSelect,
  hotelRadius,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const hotelSourceReady = useRef(false);
  const radiusLayerRef = useRef<{ sourceId: string; layerId: string } | null>(null);
  const mapClickTargetRef = useRef(mapClickTarget);
  const onHotelSelectRef = useRef(onHotelSelect);
  const layerIdsRef = useRef<string[]>([]);
  const sourceIdsRef = useRef<string[]>([]);

  mapClickTargetRef.current = mapClickTarget;
  onHotelSelectRef.current = onHotelSelect;

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [1.888334, 46.603354],
      zoom: 5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("click", (e) => {
      if (mapClickTargetRef.current) {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick]);

  // Main markers (departure, hotel, venue)
  const updateMarker = useCallback(
    (key: string, location: Location | null) => {
      const existing = markersRef.current[key];
      if (existing) {
        existing.remove();
        delete markersRef.current[key];
      }
      if (!location || !mapRef.current) return;

      const el = document.createElement("div");
      el.style.cssText = `width:20px;height:20px;background:${MARKER_COLORS[key]||"#666"};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([location.coords.lng, location.coords.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(
          `${key === "departure" ? "Depart" : key === "hotel" ? "Hotel" : "Evenement"}: ${location.name}`
        ))
        .addTo(mapRef.current);

      markersRef.current[key] = marker;
    },
    []
  );

  useEffect(() => updateMarker("departure", departure), [departure, updateMarker]);
  useEffect(() => updateMarker("hotel", hotel), [hotel, updateMarker]);
  useEffect(() => updateMarker("venue", venue), [venue, updateMarker]);

  // Fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const locs = [departure, hotel, venue].filter(Boolean) as Location[];
    if (locs.length === 0) return;
    if (locs.length === 1) {
      map.flyTo({ center: [locs[0].coords.lng, locs[0].coords.lat], zoom: 12 });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    locs.forEach((l) => bounds.extend([l.coords.lng, l.coords.lat]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
  }, [departure, hotel, venue]);

  // Hotel points as GeoJSON (fixed to coordinates, never drift)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setupSource = () => {
      if (!hotelSourceReady.current) {
        // First time: create source + layers
        map.addSource("hotels", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Unselected hotels
        map.addLayer({
          id: "hotels-circle",
          type: "circle",
          source: "hotels",
          filter: ["!=", ["get", "selected"], true],
          paint: {
            "circle-radius": 7,
            "circle-color": "#FCD34D",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 2,
          },
        });

        // Selected hotel
        map.addLayer({
          id: "hotels-circle-selected",
          type: "circle",
          source: "hotels",
          filter: ["==", ["get", "selected"], true],
          paint: {
            "circle-radius": 10,
            "circle-color": "#F59E0B",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 3,
          },
        });

        // Hotel names on hover
        map.addLayer({
          id: "hotels-label",
          type: "symbol",
          source: "hotels",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-optional": true,
          },
          paint: {
            "text-color": "#333",
            "text-halo-color": "#fff",
            "text-halo-width": 1,
          },
          minzoom: 13,
        });

        // Click handler
        function handleHotelClick(e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) {
          const props = e.features?.[0]?.properties;
          if (props) {
            const h: HotelMapItem = {
              id: props.id,
              name: props.name,
              locationName: props.locationName,
              coords: { lat: props.lat, lng: props.lng },
              stars: props.stars || undefined,
              pricePerNight: props.pricePerNight || undefined,
              currency: props.currency || undefined,
            };
            onHotelSelectRef.current(h);
          }
        }
        map.on("click", "hotels-circle", handleHotelClick);
        map.on("click", "hotels-circle-selected", handleHotelClick);

        // Cursor pointer on hover
        map.on("mouseenter", "hotels-circle", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "hotels-circle", () => { map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "hotels-circle-selected", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "hotels-circle-selected", () => { map.getCanvas().style.cursor = ""; });

        // Popup on hover
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        map.on("mouseenter", "hotels-circle", (e) => {
          const props = e.features?.[0]?.properties;
          if (props) {
            const starsHtml = props.stars ? `<br/><span style="color:#d97706">${props.stars} etoiles</span>` : "";
            popup.setLngLat([props.lng, props.lat])
              .setHTML(`<strong>${props.name}</strong>${starsHtml}<br/><span style="color:#666;font-size:12px">${props.locationName}</span>`)
              .addTo(map);
          }
        });
        map.on("mouseleave", "hotels-circle", () => { popup.remove(); });

        hotelSourceReady.current = true;
      }

      // Update data
      const features = hotelResults.map((h) => ({
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
          selected: h.id === selectedHotelId,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [h.coords.lng, h.coords.lat],
        },
      }));

      const src = map.getSource("hotels") as mapboxgl.GeoJSONSource;
      if (src) {
        src.setData({ type: "FeatureCollection", features });
      }
    };

    if (map.isStyleLoaded()) setupSource();
    else map.on("load", setupSource);
  }, [hotelResults, selectedHotelId]);

  // Radius circle around venue
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cleanup = () => {
      if (radiusLayerRef.current) {
        if (map.getLayer(radiusLayerRef.current.layerId)) map.removeLayer(radiusLayerRef.current.layerId);
        if (map.getLayer(radiusLayerRef.current.layerId + "-outline")) map.removeLayer(radiusLayerRef.current.layerId + "-outline");
        if (map.getSource(radiusLayerRef.current.sourceId)) map.removeSource(radiusLayerRef.current.sourceId);
        radiusLayerRef.current = null;
      }
    };

    const draw = () => {
      cleanup();
      if (!venue) return;

      const center = [venue.coords.lng, venue.coords.lat];
      const km = hotelRadius;
      const coords = [];
      for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * 2 * Math.PI;
        const dx = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
        const dy = km / 110.574;
        coords.push([center[0] + dx * Math.cos(angle), center[1] + dy * Math.sin(angle)]);
      }

      const srcId = "radius-circle";
      const layerId = "radius-circle-fill";

      map.addSource(srcId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } },
      });
      map.addLayer({
        id: layerId,
        type: "fill",
        source: srcId,
        paint: { "fill-color": "#F59E0B", "fill-opacity": 0.05 },
      });
      map.addLayer({
        id: layerId + "-outline",
        type: "line",
        source: srcId,
        paint: { "line-color": "#F59E0B", "line-width": 1.5, "line-opacity": 0.4, "line-dasharray": [4, 4] },
      });

      radiusLayerRef.current = { sourceId: srcId, layerId };
    };

    if (map.isStyleLoaded()) draw();
    else map.on("load", draw);

    return cleanup;
  }, [venue, hotelRadius]);

  // Zoom to venue when selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !venue) return;
    if (!departure) {
      map.flyTo({ center: [venue.coords.lng, venue.coords.lat], zoom: 13 });
    }
  }, [venue, departure]);

  // Route segments
  const updateRoute = useCallback(
    (legId: string, route: RouteResult | null) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const toRemove = layerIdsRef.current.filter((id) => id.startsWith(legId));
      for (const id of toRemove) { if (map.getLayer(id)) map.removeLayer(id); }
      const srcRemove = sourceIdsRef.current.filter((id) => id.startsWith(legId));
      for (const id of srcRemove) { if (map.getSource(id)) map.removeSource(id); }
      layerIdsRef.current = layerIdsRef.current.filter((id) => !id.startsWith(legId));
      sourceIdsRef.current = sourceIdsRef.current.filter((id) => !id.startsWith(legId));

      if (!route) return;

      const color = LEG_COLORS[legId] || "#666";

      route.segments.forEach((seg, i) => {
        const srcId = `${legId}-seg-${i}`;
        const layerId = `${legId}-seg-${i}-line`;
        const coords = seg.coordinates.map(([lat, lng]) => [lng, lat]);

        map.addSource(srcId, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
        });

        const dash = MODE_DASH[seg.mode] || [];
        map.addLayer({
          id: layerId,
          type: "line",
          source: srcId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": seg.mode === "walking" ? 3 : 4,
            "line-opacity": 0.85,
            ...(dash.length ? { "line-dasharray": dash } : {}),
          },
        });

        layerIdsRef.current.push(layerId);
        sourceIdsRef.current.push(srcId);
      });
    },
    []
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => updateRoute("legA", legARoute);
    if (map.isStyleLoaded()) run();
    else map.on("load", run);
  }, [legARoute, updateRoute]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => updateRoute("legB", legBRoute);
    if (map.isStyleLoaded()) run();
    else map.on("load", run);
  }, [legBRoute, updateRoute]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {mapClickTarget && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium">
          Cliquez pour placer : {mapClickTarget === "departure" ? "Depart" : mapClickTarget === "hotel" ? "Hotel" : "Evenement"}
        </div>
      )}
    </div>
  );
}
