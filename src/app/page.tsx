"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type Hotel = {
  id: string;
  name: string;
  stars: number;
  address: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
};

const CONCERT = {
  name: "Zénith de Paris",
  lat: 48.8979,
  lng: 2.3920,
};

const ORANGE = "#FF6B35";
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatStars(stars: number) {
  if (!Number.isFinite(stars)) return "0";
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1).replace(".0", "");
}

function createConcertMarkerElement() {
  const el = document.createElement("div");
  el.style.width = "44px";
  el.style.height = "44px";
  el.style.borderRadius = "9999px";
  el.style.background = "#FF3B30";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontSize = "20px";
  el.style.boxShadow = "0 0 0 3px rgba(255,59,48,0.25)";
  el.style.userSelect = "none";
  el.style.cursor = "default";
  el.textContent = "⭐";
  return el;
}

function createHotelMarkerElement(selected: boolean) {
  const el = document.createElement("div");
  el.style.width = selected ? "52px" : "36px";
  el.style.height = selected ? "52px" : "36px";
  el.style.borderRadius = "9999px";
  el.style.background = selected ? ORANGE : "rgba(255, 107, 53, 0.78)";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.fontSize = selected ? "22px" : "18px";
  el.style.boxShadow = selected
    ? "0 0 0 5px rgba(255, 107, 53, 0.25)"
    : "0 0 0 0 rgba(255, 107, 53, 0)";
  el.style.transform = selected ? "translateZ(0) scale(1)" : "translateZ(0) scale(1)";
  el.style.transition = "all 120ms ease";
  el.style.userSelect = "none";
  el.style.cursor = "pointer";
  el.textContent = "🏨";
  return el;
}

export default function Page() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  const hotelsRef = useRef<Hotel[]>([]);
  const selectedHotelIdRef = useRef<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoadedRef = useRef(false);

  const hotelMarkerElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hotelMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    hotelsRef.current = hotels;
  }, [hotels]);

  useEffect(() => {
    selectedHotelIdRef.current = selectedHotelId;
    // Update marker styles when selection changes.
    hotelMarkerElsRef.current.forEach((el, id) => {
      const selected = id === selectedHotelIdRef.current;
      el.style.width = selected ? "52px" : "36px";
      el.style.height = selected ? "52px" : "36px";
      el.style.background = selected
        ? ORANGE
        : "rgba(255, 107, 53, 0.78)";
      el.style.fontSize = selected ? "22px" : "18px";
      el.style.boxShadow = selected
        ? "0 0 0 5px rgba(255, 107, 53, 0.25)"
        : "0 0 0 0 rgba(255, 107, 53, 0)";
    });
  }, [selectedHotelId]);

  useEffect(() => {
    let aborted = false;

    async function run() {
      try {
        setLoading(true);
        setFetchError(null);

        const res = await fetch("/api/hotels", { method: "GET" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = String(json?.error ?? "Unknown error");
          throw new Error(msg);
        }

        const list = Array.isArray(json) ? (json as Hotel[]) : [];
        if (!aborted) setHotels(list);
      } catch (e) {
        if (aborted) return;
        setHotels([]);
        setFetchError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, []);

  const distanceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of hotels) {
      m.set(h.id, haversineDistanceMeters(CONCERT.lat, CONCERT.lng, h.lat, h.lng));
    }
    return m;
  }, [hotels]);

  function renderHotelMarkers() {
    const map = mapRef.current;
    if (!map) return;

    hotelMarkersRef.current.forEach((marker) => marker.remove());
    hotelMarkersRef.current.clear();
    hotelMarkerElsRef.current.clear();

    for (const h of hotelsRef.current) {
      const selected = h.id === selectedHotelIdRef.current;
      const el = createHotelMarkerElement(selected);
      el.title = h.name;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Hotel ${h.name}`);

      el.addEventListener("click", () => {
        setSelectedHotelId(h.id);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([h.lng, h.lat])
        .addTo(map);

      hotelMarkerElsRef.current.set(h.id, el);
      hotelMarkersRef.current.set(h.id, marker);
    }
  }

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setFetchError("NEXT_PUBLIC_MAPBOX_TOKEN manquant dans les variables d'environnement.");
      setLoading(false);
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [CONCERT.lng, CONCERT.lat],
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    map.once("load", () => {
      mapLoadedRef.current = true;

      const concertEl = createConcertMarkerElement();
      new mapboxgl.Marker({ element: concertEl, anchor: "center" })
        .setLngLat([CONCERT.lng, CONCERT.lat])
        .addTo(map);

      renderHotelMarkers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapLoadedRef.current) return;
    renderHotelMarkers();
  }, [hotels]);

  const skeletonCards = useMemo(() => Array.from({ length: 6 }), []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 md:grid-cols-[40%_60%] md:grid-rows-1">
        <aside className="p-4 md:p-6 border-b border-white/10 md:border-b-0 md:border-r border-white/10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-lg md:text-xl font-semibold">
                Hôtels autour de {CONCERT.name}
              </h1>
              <p className="text-sm text-white/70 mt-1">
                Clique un hôtel pour mettre son marker en évidence.
              </p>
            </div>
            <div className="text-sm text-white/70 text-right">
              <div className="font-semibold text-white">{hotels.length ? hotels.length : "—"}</div>
              <div>hôtels</div>
            </div>
          </div>

          <div className="h-[60vh] md:h-screen overflow-y-auto pr-1">
            {loading && (
              <div className="space-y-3">
                {skeletonCards.map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3"
                  >
                    <div className="w-16 h-16 rounded-lg bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && fetchError && (
              <div className="rounded-xl border border-orange/40 bg-orange/10 p-3 text-orange mb-3">
                {fetchError}
              </div>
            )}

            {!loading && !fetchError && hotels.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/80">
                Aucun hôtel trouvé dans cette zone
              </div>
            )}

            {!loading &&
              hotels.map((h) => {
                const selected = h.id === selectedHotelId;
                const distM = distanceById.get(h.id) ?? null;

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHotelId(h.id)}
                    className={[
                      "w-full text-left rounded-xl border p-3 mb-3 transition",
                      selected
                        ? "border-orange bg-white/5"
                        : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-orange/60",
                    ].join(" ")}
                  >
                    <div className="flex gap-3">
                      {h.imageUrl ? (
                        // Using <img> to avoid Next Image domain config for this test project.
                        <img
                          src={h.imageUrl}
                          alt={h.name}
                          className="w-16 h-16 rounded-lg object-cover bg-gray-800"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white/10" />
                      )}

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-white leading-snug">
                            {h.name}
                          </div>
                          <div className="text-sm text-orange whitespace-nowrap">
                            {formatStars(h.stars)}★
                          </div>
                        </div>
                        <div className="text-sm text-white/70 mt-1 max-h-[2.75rem] overflow-hidden">
                          {h.address || "Adresse indisponible"}
                        </div>
                        <div className="text-sm text-white/70 mt-2">
                          {distM !== null ? `${distM} m` : "—"} depuis la salle
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        <main className="relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[60vh] md:h-screen"
          />
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur border border-white/10 rounded-xl px-3 py-2">
            <div className="text-sm font-semibold">{CONCERT.name}</div>
            <div className="text-xs text-white/70">
              Center marker: ⭐ rouge
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

