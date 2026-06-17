"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  Location,
  TransportMode,
  RouteOption,
  LatLng,
  FlightInfo,
  HotelMapItem,
  TrainJourney,
  Step,
} from "@/src/types";
import { venues } from "@/src/utils/constants/venues";
import { searchLocation } from "@/src/services/geocoding";
import {
  computeOptions,
  fetchFlightInfo,
  fetchTrainInfo,
} from "@/src/services/travel";
import { Header } from "@/src/components/layout/Header";
import { SideNav } from "@/src/components/layout/SideNav";
import { HomeView } from "@/src/components/views/HomeView";
import { RoutesView } from "@/src/components/views/RoutesView";
import { HotelsView } from "@/src/components/views/HotelsView";
import { BundleView } from "@/src/components/views/BundleView";

export default function Home() {
  const [step, setStep] = useState<Step>("home");

  const [departure, setDeparture] = useState<Location | null>(null);
  const [venue, setVenue] = useState<Location | null>(null);
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const dateLabel = useMemo(() => {
    const fmt = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (!checkin && !checkout) return "Dates à définir";
    if (!checkout) return fmt(checkin);
    if (!checkin) return fmt(checkout);
    return `${fmt(checkin)} — ${fmt(checkout)}`;
  }, [checkin, checkout]);

  // departure search
  const [depSearch, setDepSearch] = useState("");
  const [depResults, setDepResults] = useState<{ displayName: string; address: string; coords: LatLng }[]>([]);
  const [depFocus, setDepFocus] = useState(false);

  // transport options
  const [options, setOptions] = useState<RouteOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TransportMode | null>(null);
  const [trainJourneys, setTrainJourneys] = useState<TrainJourney[]>([]);
  const [flights, setFlights] = useState<FlightInfo[]>([]);

  // hotels
  const [hotelRadius, setHotelRadius] = useState(10);
  const [hotelResults, setHotelResults] = useState<HotelMapItem[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<HotelMapItem | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const selectedOption = useMemo(() => options.find((o) => o.mode === selectedMode) || null, [options, selectedMode]);
  const hotelLocation: Location | null = useMemo(
    () => (selectedHotel ? { id: selectedHotel.id, name: selectedHotel.name, coords: selectedHotel.coords, type: "hotel", address: selectedHotel.locationName } : null),
    [selectedHotel]
  );

  const canReach = useCallback(
    (s: Step) => {
      if (s === "home") return true;
      if (s === "routes") return !!(departure && venue);
      if (s === "hotels") return !!venue;
      if (s === "bundle") return !!(departure && venue && selectedOption);
      return false;
    },
    [departure, venue, selectedOption]
  );

  // departure search input wrapper
  const handleDepSearchChange = (val: string) => {
    setDepSearch(val);
    if (val.length < 3) {
      setDepResults([]);
    }
  };

  const handlePickDeparture = (r: { displayName: string; address: string; coords: LatLng }) => {
    setDeparture({ id: `dep-${Date.now()}`, name: r.displayName.split(",")[0], coords: r.coords, type: "departure", address: r.address });
    setDepSearch(r.displayName);
    setDepResults([]);
    setOptions([]);
    setSelectedMode(null);
    setTrainJourneys([]);
    setFlights([]);
    if (venue) {
      setOptionsLoading(true);
    }
  };

  const handleClearDeparture = () => {
    setDeparture(null);
    setDepSearch("");
    setOptions([]);
    setSelectedMode(null);
    setTrainJourneys([]);
    setFlights([]);
  };

  const handlePickVenue = (id: string) => {
    const v = venues.find((x) => x.id === id);
    if (v) {
      setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
      setSelectedHotel(null);
      setOptions([]);
      setSelectedMode(null);
      setTrainJourneys([]);
      setFlights([]);
      setHotelResults([]);
      setHotelError("");
      setHotelLoading(true);
      if (departure) {
        setOptionsLoading(true);
      }
    }
  };

  const handleClearVenue = () => {
    setVenue(null);
    setSelectedHotel(null);
    setOptions([]);
    setSelectedMode(null);
    setTrainJourneys([]);
    setFlights([]);
    setHotelResults([]);
    setHotelError("");
  };

  const handleSelectMode = (mode: TransportMode) => {
    setSelectedMode(mode);
    setTrainJourneys([]);
    setFlights([]);
  };

  const handleHotelRadiusChange = (newRadius: number) => {
    setHotelRadius(newRadius);
    setHotelError("");
    setHotelLoading(true);
  };

  // departure autocomplete
  useEffect(() => {
    if (depSearch.length < 3) {
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchLocation(depSearch);
        setDepResults(r.map((x) => ({ displayName: x.displayName, address: x.address, coords: x.coords })));
      } catch {
        setDepResults([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [depSearch]);

  // compute transport options when both ends known
  useEffect(() => {
    if (!departure || !venue) {
      return;
    }
    let cancelled = false;
    computeOptions(
      { name: departure.name, coords: departure.coords },
      { name: venue.name, coords: venue.coords }
    )
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        const initialMode = opts[0]?.mode ?? null;
        setSelectedMode(initialMode);
        setTrainJourneys([]);
        setFlights([]);
      })
      .finally(() => !cancelled && setOptionsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [departure, venue]);

  // enrich selected option with live train / flights detail
  useEffect(() => {
    if (!departure || !venue || !selectedOption) return;
    let cancelled = false;
    if (selectedOption.mode === "train") {
      fetchTrainInfo(departure.coords, venue.coords).then((j) => !cancelled && setTrainJourneys(j));
    } else if (selectedOption.mode === "plane") {
      fetchFlightInfo(departure.coords, venue.coords).then((f) => !cancelled && setFlights(f));
    }
    return () => {
      cancelled = true;
    };
  }, [selectedOption, departure, venue]);

  // live hotel search around the venue
  useEffect(() => {
    if (!venue || !checkin || !checkout) {
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      lat: String(venue.coords.lat),
      lng: String(venue.coords.lng),
      radius: String(hotelRadius),
      checkin,
      checkout,
    });
    const t = setTimeout(() => {
      fetch(`/api/hotels/search?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
        .then((data: HotelMapItem[]) => {
          if (cancelled) return;
          setHotelResults(Array.isArray(data) ? data : []);
          if (!Array.isArray(data) || data.length === 0) setHotelError("Aucun hôtel trouvé dans ce rayon.");
        })
        .catch(() => {
          if (!cancelled) {
            setHotelResults([]);
            setHotelError("La recherche d'hôtels a échoué. Réessayez.");
          }
        })
        .finally(() => !cancelled && setHotelLoading(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [venue, hotelRadius, checkin, checkout]);

  const go = useCallback((s: Step) => setStep(s), []);

  const pickEvent = (venueId: string) => {
    const v = venues.find((x) => x.id === venueId);
    if (!v) return;
    setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
    setSelectedHotel(null);
    setOptions([]);
    setSelectedMode(null);
    setTrainJourneys([]);
    setFlights([]);
    setHotelResults([]);
    setHotelError("");
    setHotelLoading(true);
    if (departure) {
      setOptionsLoading(true);
    }
    document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const journeyRoute = selectedOption?.route ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header step={step} go={go} canReach={canReach} />

      <main className="flex-1 pb-16 md:pb-0">
        {step === "home" && (
          <HomeView
            departure={departure}
            venue={venue}
            depSearch={depSearch}
            setDepSearch={handleDepSearchChange}
            depResults={depResults}
            depFocus={depFocus}
            setDepFocus={setDepFocus}
            onPickDeparture={handlePickDeparture}
            onClearDeparture={handleClearDeparture}
            onPickVenue={handlePickVenue}
            onClearVenue={handleClearVenue}
            dateLabel={dateLabel}
            checkin={checkin}
            checkout={checkout}
            setCheckin={setCheckin}
            setCheckout={setCheckout}
            onCompose={() => go(departure && venue ? "routes" : "home")}
            pickEvent={pickEvent}
          />
        )}

        {step === "routes" && (
          <div className="lg:flex">
            <SideNav step={step} go={go} canReach={canReach} venue={venue} />
            <div className="min-w-0 flex-1">
              <RoutesView
                departure={departure}
                venue={venue}
                dateLabel={dateLabel}
                options={options}
                loading={optionsLoading}
                selectedMode={selectedMode}
                onSelectMode={handleSelectMode}
                trainJourneys={trainJourneys}
                flights={flights}
                journeyRoute={journeyRoute}
                onContinue={() => go("hotels")}
              />
            </div>
          </div>
        )}

        {step === "hotels" && (
          <div className="lg:flex">
            <SideNav step={step} go={go} canReach={canReach} venue={venue} />
            <div className="min-w-0 flex-1">
              <HotelsView
                venue={venue}
                hotelRadius={hotelRadius}
                setHotelRadius={handleHotelRadiusChange}
                hotelResults={hotelResults}
                hotelLoading={hotelLoading}
                hotelError={hotelError}
                selectedHotel={selectedHotel}
                onSelectHotel={setSelectedHotel}
                departure={departure}
                hotelLocation={hotelLocation}
                journeyRoute={journeyRoute}
                mobileMapOpen={mobileMapOpen}
                setMobileMapOpen={setMobileMapOpen}
                onContinue={() => go("bundle")}
              />
            </div>
          </div>
        )}

        {step === "bundle" && (
          <BundleView
            departure={departure}
            venue={venue}
            dateLabel={dateLabel}
            selectedOption={selectedOption}
            selectedHotel={selectedHotel}
            checkin={checkin}
            checkout={checkout}
            onEdit={go}
          />
        )}
      </main>
    </div>
  );
}
