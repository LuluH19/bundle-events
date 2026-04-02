"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Location, TransportMode, RouteResult, LocationType, LatLng, FlightInfo, HotelMapItem } from "@/lib/types";
import { computeRoute } from "@/lib/algorithms/routing";
import { airports } from "@/lib/data/airports";
import { stations } from "@/lib/data/stations";
import { findNearestByDistance } from "@/lib/algorithms/dijkstra";
import { venues } from "@/lib/data/venues";
import { searchLocation, reverseGeocode } from "@/lib/services/geocoding";

const TravelMap = dynamic(() => import("@/app/_components/TravelMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
      <p className="text-gray-500">Chargement de la carte...</p>
    </div>
  ),
});

const ALL_MODES: { mode: TransportMode; label: string; icon: string }[] = [
  { mode: "walking", label: "A pied", icon: "🚶" },
  { mode: "car", label: "Voiture", icon: "🚗" },
  { mode: "bus", label: "Bus", icon: "🚌" },
  { mode: "train", label: "Train", icon: "🚄" },
  { mode: "plane", label: "Avion", icon: "✈️" },
];

const RADIUS_OPTIONS = [5, 10, 20, 25, 50];

function formatDuration(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const MODE_ICONS: Record<TransportMode, string> = {
  walking: "🚶", car: "🚗", bus: "🚌", train: "🚄", plane: "✈️",
};

function toggleMode(current: TransportMode[], mode: TransportMode): TransportMode[] {
  if (current.includes(mode)) {
    const next = current.filter((m) => m !== mode);
    return next.length > 0 ? next : current;
  }
  return [...current, mode];
}

interface TrainInfo {
  durationMinutes: number;
  departureAt: string;
  arrivalAt: string;
  transfers: number;
  trainType: string;
  trainLabel: string;
  co2Kg?: number;
  price?: number;
}

async function fetchTrainInfo(from: LatLng, to: LatLng): Promise<TrainInfo[]> {
  const depStation = findNearestByDistance(from, stations);
  const arrStation = findNearestByDistance(to, stations);
  if (depStation.id === arrStation.id) return [];

  try {
    const res = await fetch(`/api/trains/search?from=${depStation.sncfId}&to=${arrStation.sncfId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.journeys || [];
  } catch {
    return [];
  }
}

async function fetchFlightInfo(from: LatLng, to: LatLng): Promise<FlightInfo[]> {
  const depAirport = findNearestByDistance(from, airports);
  const arrAirport = findNearestByDistance(to, airports);
  if (depAirport.id === arrAirport.id) return [];

  try {
    const res = await fetch(`/api/flights/search?origin=${depAirport.iataCode}&destination=${arrAirport.iataCode}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.flights || [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [departure, setDeparture] = useState<Location | null>(null);
  const [hotel, setHotel] = useState<Location | null>(null);
  const [venue, setVenue] = useState<Location | null>(null);

  const [legAModes, setLegAModes] = useState<TransportMode[]>(["car"]);
  const [legBModes, setLegBModes] = useState<TransportMode[]>(["walking"]);

  const [legARoute, setLegARoute] = useState<RouteResult | null>(null);
  const [legBRoute, setLegBRoute] = useState<RouteResult | null>(null);
  const [legALoading, setLegALoading] = useState(false);
  const [legBLoading, setLegBLoading] = useState(false);
  const [legAError, setLegAError] = useState("");
  const [legBError, setLegBError] = useState("");

  // Transport info
  const [legAFlights, setLegAFlights] = useState<FlightInfo[]>([]);
  const [legBFlights, setLegBFlights] = useState<FlightInfo[]>([]);
  const [legATrains, setLegATrains] = useState<TrainInfo[]>([]);
  const [legBTrains, setLegBTrains] = useState<TrainInfo[]>([]);

  const [depSearch, setDepSearch] = useState("");
  const [depResults, setDepResults] = useState<{ displayName: string; address: string; coords: LatLng }[]>([]);

  const [hotelRadius, setHotelRadius] = useState(10);
  const [hotelResults, setHotelResults] = useState<HotelMapItem[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [selectedHotelInfo, setSelectedHotelInfo] = useState<HotelMapItem | null>(null);

  const [mapClickTarget, setMapClickTarget] = useState<LocationType | null>(null);

  // Departure search (Mapbox Geocoding)
  useEffect(() => {
    if (depSearch.length < 3) { setDepResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await searchLocation(depSearch);
        setDepResults(res.map(r => ({ displayName: r.displayName, address: r.address, coords: r.coords })));
      } catch { setDepResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [depSearch]);

  // Hotels around venue (debounced to avoid Overpass 429)
  useEffect(() => {
    if (!venue?.id) { setHotelResults([]); return; }
    let cancelled = false;
    setHotelLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/hotels/search?lat=${venue.coords.lat}&lng=${venue.coords.lng}&radius=${hotelRadius}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (!cancelled) setHotelResults(data); })
        .catch(() => { if (!cancelled) setHotelResults([]); })
        .finally(() => { if (!cancelled) setHotelLoading(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [venue, hotelRadius]);

  // Leg A
  useEffect(() => {
    if (!departure?.id || !hotel?.id) { setLegARoute(null); setLegAFlights([]); setLegATrains([]); return; }
    let cancelled = false;
    setLegALoading(true); setLegAError(""); setLegAFlights([]); setLegATrains([]);
    const from = { name: departure.name, coords: departure.coords };
    const to = { name: hotel.name, coords: hotel.coords };
    computeRoute(from, to, legAModes)
      .then(r => {
        if (cancelled) return;
        setLegARoute(r);
        if (r.segments.some(s => s.mode === "plane")) {
          fetchFlightInfo(departure.coords, hotel.coords).then(f => { if (!cancelled) setLegAFlights(f); });
        }
        if (r.segments.some(s => s.mode === "train")) {
          fetchTrainInfo(departure.coords, hotel.coords).then(t => { if (!cancelled) setLegATrains(t); });
        }
      })
      .catch(e => { if (!cancelled) { setLegAError(e.message); setLegARoute(null); } })
      .finally(() => { if (!cancelled) setLegALoading(false); });
    return () => { cancelled = true; };
  }, [departure, hotel, legAModes]);

  // Leg B
  useEffect(() => {
    if (!hotel?.id || !venue?.id) { setLegBRoute(null); setLegBFlights([]); setLegBTrains([]); return; }
    let cancelled = false;
    setLegBLoading(true); setLegBError(""); setLegBFlights([]); setLegBTrains([]);
    const from = { name: hotel.name, coords: hotel.coords };
    const to = { name: venue.name, coords: venue.coords };
    computeRoute(from, to, legBModes)
      .then(r => {
        if (cancelled) return;
        setLegBRoute(r);
        if (r.segments.some(s => s.mode === "plane")) {
          fetchFlightInfo(hotel.coords, venue.coords).then(f => { if (!cancelled) setLegBFlights(f); });
        }
        if (r.segments.some(s => s.mode === "train")) {
          fetchTrainInfo(hotel.coords, venue.coords).then(t => { if (!cancelled) setLegBTrains(t); });
        }
      })
      .catch(e => { if (!cancelled) { setLegBError(e.message); setLegBRoute(null); } })
      .finally(() => { if (!cancelled) setLegBLoading(false); });
    return () => { cancelled = true; };
  }, [hotel, venue, legBModes]);

  const handleMapClick = useCallback(async (coords: LatLng) => {
    if (!mapClickTarget) return;
    const name = await reverseGeocode(coords).catch(() => `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    const loc: Location = { id: `${mapClickTarget}-${Date.now()}`, name: name.split(",")[0], coords, type: mapClickTarget, address: name };
    if (mapClickTarget === "departure") { setDeparture(loc); setDepSearch(name); }
    else if (mapClickTarget === "hotel") setHotel(loc);
    else if (mapClickTarget === "venue") setVenue(loc);
    setMapClickTarget(null);
  }, [mapClickTarget]);

  const handleHotelSelect = useCallback((h: HotelMapItem) => {
    setHotel({ id: h.id, name: h.name, coords: h.coords, type: "hotel", address: h.locationName });
    setSelectedHotelInfo(h);
  }, []);

  function renderSegments(route: RouteResult, flights: FlightInfo[], trains: TrainInfo[]) {
    return (
      <div className="mt-2 space-y-1">
        {route.segments.map((seg, i) => (
          <div key={i} className="p-2 bg-gray-50 rounded text-xs flex items-start gap-2">
            <span className="text-base">{MODE_ICONS[seg.mode]}</span>
            <div className="flex-1">
              <p className="font-medium">{seg.from.name} → {seg.to.name}</p>
              <p className="text-gray-500">
                {formatDistance(seg.distanceKm)} · {formatDuration(seg.durationMinutes)}
                {seg.co2Kg > 0 && <span className="text-amber-600"> · {seg.co2Kg < 1 ? `${Math.round(seg.co2Kg * 1000)} g` : `${seg.co2Kg.toFixed(1)} kg`} CO2</span>}
              </p>
            </div>
          </div>
        ))}
        {/* Flight details */}
        {flights.length > 0 && (
          <div className="p-2 bg-purple-50 rounded text-xs space-y-1.5">
            <p className="font-semibold text-purple-700">Vols disponibles :</p>
            {flights.slice(0, 3).map((f, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{f.airline} {f.flightNumber}</span>
                  {f.transfers > 0 ? <span className="text-gray-500"> ({f.transfers} escale{f.transfers > 1 ? "s" : ""})</span> : <span className="text-green-600"> direct</span>}
                  {f.departureAt && <p className="text-gray-400">{new Date(f.departureAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} a {new Date(f.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{f.durationMinutes > 0 && ` · ${formatDuration(f.durationMinutes)}`}</p>}
                </div>
                <span className="font-bold text-green-700 whitespace-nowrap">{f.price} €</span>
              </div>
            ))}
          </div>
        )}
        {/* Train details */}
        {trains.length > 0 && (
          <div className="p-2 bg-indigo-50 rounded text-xs space-y-1.5">
            <p className="font-semibold text-indigo-700">Trains disponibles :</p>
            {trains.slice(0, 3).map((t, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{t.trainType} {t.trainLabel}</span>
                  {t.transfers > 0 && <span className="text-gray-500"> ({t.transfers} corresp.)</span>}
                  {t.departureAt && <p className="text-gray-400">Dep. {new Date(t.departureAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → Arr. {new Date(t.arrivalAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {formatDuration(t.durationMinutes)}</p>}
                </div>
                {t.price != null && <span className="font-bold text-green-700 whitespace-nowrap">{t.price.toFixed(0)} €</span>}
              </div>
            ))}
          </div>
        )}
        {/* Total with CO2 */}
        <div className="p-2 bg-blue-50 rounded text-xs font-medium flex justify-between">
          <span>Total : {formatDistance(route.totalDistanceKm)} · {formatDuration(route.totalDurationMinutes)}</span>
          <span className="text-amber-700">{route.totalCo2Kg < 1 ? `${Math.round(route.totalCo2Kg * 1000)} g` : `${route.totalCo2Kg.toFixed(1)} kg`} CO2</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-[380px] overflow-y-auto border-r border-gray-200 p-4 space-y-4 bg-white">
        <h1 className="text-lg font-bold">Bundle Events</h1>

        {/* Depart */}
        <div>
          <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Depart
            <button onClick={() => setMapClickTarget(mapClickTarget === "departure" ? null : "departure")}
              className={`ml-auto text-xs ${mapClickTarget === "departure" ? "text-blue-600 font-bold" : "text-gray-400"}`}>
              📍 Carte
            </button>
          </label>
          <input value={depSearch} onChange={e => setDepSearch(e.target.value)}
            placeholder="Saisir une adresse de depart..."
            className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" />
          {depResults.length > 0 && (
            <ul className="border rounded-lg mt-1 max-h-40 overflow-y-auto text-sm">
              {depResults.map((r, i) => (
                <li key={i}><button className="w-full px-3 py-1.5 text-left hover:bg-blue-50"
                  onClick={() => {
                    setDeparture({ id: `dep-${Date.now()}`, name: r.displayName.split(",")[0], coords: r.coords, type: "departure", address: r.address });
                    setDepSearch(r.address); setDepResults([]);
                  }}>{r.displayName}</button></li>
              ))}
            </ul>
          )}
          {departure?.id && <p className="text-xs text-green-600 mt-1">✓ {departure.address || departure.name}</p>}
        </div>

        {/* Venue */}
        <div>
          <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Evenement
          </label>
          <select value={venue?.id || ""} onChange={e => {
            const v = venues.find(v => v.id === e.target.value);
            if (v) {
              setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
              setHotel(null);
            }
          }} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg">
            <option value="">Choisir un lieu</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
          </select>
          {venue?.id && <p className="text-xs text-gray-500 mt-1">📍 {venue.address}</p>}
        </div>

        {/* Hotel */}
        <div>
          <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Hotel
          </label>
          {!venue?.id && <p className="text-xs text-gray-400 mt-1">Selectionnez d&apos;abord un evenement</p>}
          {venue?.id && (
            <>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 whitespace-nowrap">Rayon :</span>
                <select value={hotelRadius} onChange={e => { setHotelRadius(Number(e.target.value)); }}
                  className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                  {RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
              {hotelLoading && <p className="text-xs text-gray-400 mt-1">Recherche d&apos;hotels...</p>}
              {!hotelLoading && hotelResults.length === 0 && !hotel?.id && <p className="text-xs text-gray-400 mt-1">Aucun hotel trouve</p>}
              {!hotelLoading && hotelResults.length > 0 && !hotel?.id && (
                <p className="text-xs text-amber-600 mt-1">{hotelResults.length} hotels sur la carte — cliquez pour selectionner</p>
              )}
              {hotel?.id && (
                <div className="mt-1 p-2 bg-amber-50 rounded-lg text-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{hotel.name}</p>
                      {selectedHotelInfo?.stars && (
                        <p className="text-xs text-amber-600">{"★".repeat(selectedHotelInfo.stars)}{"☆".repeat(5 - selectedHotelInfo.stars)}</p>
                      )}
                      {selectedHotelInfo?.type && (
                        <p className="text-xs text-gray-400 capitalize">{selectedHotelInfo.type === "guest_house" ? "Maison d'hotes" : selectedHotelInfo.type === "hostel" ? "Auberge" : "Hotel"}</p>
                      )}
                      {hotel.address && <p className="text-xs text-gray-500">{hotel.address}</p>}
                    </div>
                    <button onClick={() => { setHotel(null); setSelectedHotelInfo(null); }} className="text-xs text-gray-400 hover:text-red-500 ml-2">✕</button>
                  </div>
                  {(selectedHotelInfo?.website || selectedHotelInfo?.phone) && (
                    <div className="mt-1 flex gap-3 text-xs">
                      {selectedHotelInfo.website && (
                        <a href={selectedHotelInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Site web</a>
                      )}
                      {selectedHotelInfo.phone && (
                        <a href={`tel:${selectedHotelInfo.phone}`} className="text-blue-600 hover:underline">{selectedHotelInfo.phone}</a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Leg A */}
        {departure?.id && hotel?.id && (
          <div className="pt-3 border-t">
            <p className="text-sm font-semibold text-blue-600 mb-1">Trajet A : Depart → Hotel</p>
            <p className="text-xs text-gray-400 mb-2">Cliquez plusieurs modes pour du multimodal</p>
            <div className="flex flex-wrap gap-1">
              {ALL_MODES.map(({ mode, label, icon }) => (
                <button key={mode} onClick={() => setLegAModes(prev => toggleMode(prev, mode))}
                  className={`px-2.5 py-1 text-xs rounded-full border ${legAModes.includes(mode) ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:border-blue-400"}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
            {legAModes.length > 1 && (
              <p className="text-xs text-blue-500 mt-1">Multimodal : {legAModes.map(m => MODE_ICONS[m]).join(" + ")}</p>
            )}
            {legALoading && <p className="text-xs text-gray-400 mt-2">Calcul de l&apos;itineraire...</p>}
            {legAError && <p className="text-xs text-red-500 mt-2">{legAError}</p>}
            {legARoute && !legALoading && renderSegments(legARoute, legAFlights, legATrains)}
          </div>
        )}

        {/* Leg B */}
        {hotel?.id && venue?.id && (
          <div className="pt-3 border-t">
            <p className="text-sm font-semibold text-orange-600 mb-1">Trajet B : Hotel → Evenement</p>
            <p className="text-xs text-gray-400 mb-2">Cliquez plusieurs modes pour du multimodal</p>
            <div className="flex flex-wrap gap-1">
              {ALL_MODES.map(({ mode, label, icon }) => (
                <button key={mode} onClick={() => setLegBModes(prev => toggleMode(prev, mode))}
                  className={`px-2.5 py-1 text-xs rounded-full border ${legBModes.includes(mode) ? "bg-orange-500 text-white border-orange-500" : "border-gray-300 hover:border-orange-400"}`}>
                  {icon} {label}
                </button>
              ))}
            </div>
            {legBModes.length > 1 && (
              <p className="text-xs text-orange-500 mt-1">Multimodal : {legBModes.map(m => MODE_ICONS[m]).join(" + ")}</p>
            )}
            {legBLoading && <p className="text-xs text-gray-400 mt-2">Calcul de l&apos;itineraire...</p>}
            {legBError && <p className="text-xs text-red-500 mt-2">{legBError}</p>}
            {legBRoute && !legBLoading && renderSegments(legBRoute, legBFlights, legBTrains)}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        <TravelMap
          departure={departure}
          hotel={hotel}
          venue={venue}
          legARoute={legARoute}
          legBRoute={legBRoute}
          onMapClick={handleMapClick}
          mapClickTarget={mapClickTarget}
          hotelResults={hotelResults}
          selectedHotelId={hotel?.id || null}
          onHotelSelect={handleHotelSelect}
          hotelRadius={hotelRadius}
        />
      </div>
    </div>
  );
}
