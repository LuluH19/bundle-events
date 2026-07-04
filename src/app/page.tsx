"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  Location,
  Step,
  RouteOption,
  LatLng,
  FlightInfo,
  HotelMapItem,
  TrainJourney,
  Venue,
} from "@/src/types";
import { STEPS } from "@/src/types/step";
import { venues } from "@/src/utils/constants/venues";
import { searchLocation } from "@/src/services/geocoding";
import { searchEvents } from "@/src/services/events";
import {
  computeOptions,
  fetchFlightInfo,
  fetchTrainInfo,
} from "@/src/services/travel";
import { Header } from "@/src/components/layout/Header";
import { SideNav } from "@/src/components/layout/SideNav";
import { MobileTabBar } from "@/src/components/layout/MobileTabBar";
import { HomeView } from "@/src/components/views/HomeView";
import { RoutesView } from "@/src/components/views/RoutesView";
import { HotelsView } from "@/src/components/views/HotelsView";
import { BundleView } from "@/src/components/views/BundleView";

const idxOf = (s: Step) => STEPS.findIndex((x) => x.id === s);

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [maxStepIdx, setMaxStepIdx] = useState(0);

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

  const [venueSearch, setVenueSearch] = useState("");
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [venueFocus, setVenueFocus] = useState(false);

  // transport options
  const [outboundOptions, setOutboundOptions] = useState<RouteOption[]>([]);
  const [returnOptions, setReturnOptions] = useState<RouteOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [selectedOutboundId, setSelectedOutboundId] = useState<string | null>(null);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [trainJourneys, setTrainJourneys] = useState<TrainJourney[]>([]);
  const [flights, setFlights] = useState<FlightInfo[]>([]);

  // hotels
  const [hotelRadius, setHotelRadius] = useState(10);
  const [hotelResults, setHotelResults] = useState<HotelMapItem[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<HotelMapItem | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const selectedOption = useMemo(() => {
    if (step === "routes-outbound") {
      return outboundOptions.find((o) => o.id === selectedOutboundId) || null;
    }
    if (step === "routes-return") {
      return returnOptions.find((o) => o.id === selectedReturnId) || null;
    }
    return null;
  }, [step, outboundOptions, returnOptions, selectedOutboundId, selectedReturnId]);

  const hotelLocation: Location | null = useMemo(
    () => (selectedHotel ? { id: selectedHotel.id, name: selectedHotel.name, coords: selectedHotel.coords, type: "hotel", address: selectedHotel.locationName } : null),
    [selectedHotel]
  );

  const canReach = useCallback((s: Step) => idxOf(s) <= maxStepIdx, [maxStepIdx]);

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
    setOutboundOptions([]);
    setReturnOptions([]);
    setSelectedOutboundId(null);
    setSelectedReturnId(null);
    setTrainJourneys([]);
    setFlights([]);
    // le trajet change → itinéraires & bundle à refaire, les hôtels restent valides
    setMaxStepIdx((m) => Math.min(m, idxOf("hotels")));
    if (venue) {
      setOptionsLoading(true);
    }
  };

  const handleClearDeparture = () => {
    setDeparture(null);
    setDepSearch("");
    setOutboundOptions([]);
    setReturnOptions([]);
    setSelectedOutboundId(null);
    setSelectedReturnId(null);
    setTrainJourneys([]);
    setFlights([]);
    setMaxStepIdx((m) => Math.min(m, idxOf("hotels")));
  };

  const handleVenueSearchChange = (val: string) => {
    setVenueSearch(val);
    if (!val.trim()) {
      setVenueResults([]);
    }
  };

  const handlePickVenue = (id: string) => {
    const v = venues.find((x) => x.id === id);
    if (v) {
      setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
      setVenueSearch("");
      setVenueResults([]);
      setSelectedHotel(null);
      setOutboundOptions([]);
      setReturnOptions([]);
      setSelectedOutboundId(null);
      setSelectedReturnId(null);
      setTrainJourneys([]);
      setFlights([]);
      setHotelResults([]);
      setHotelError("");
      setHotelLoading(true);
      setMaxStepIdx((m) => Math.min(m, idxOf("home")));
      if (departure) {
        setOptionsLoading(true);
      }
    }
  };

  const handleClearVenue = () => {
    setVenue(null);
    setVenueSearch("");
    setVenueResults([]);
    setSelectedHotel(null);
    setOutboundOptions([]);
    setReturnOptions([]);
    setSelectedOutboundId(null);
    setSelectedReturnId(null);
    setTrainJourneys([]);
    setFlights([]);
    setHotelResults([]);
    setHotelError("");
    setMaxStepIdx((m) => Math.min(m, idxOf("home")));
  };

  const handleSelectMode = (id: string) => {
    const currentId = step === "routes-outbound" ? selectedOutboundId : selectedReturnId;
    if (currentId === id) return;

    if (step === "routes-outbound") setSelectedOutboundId(id);
    else setSelectedReturnId(id);
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

  useEffect(() => {
    if (!venueSearch.trim()) {
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchEvents(venueSearch);
      if (!cancelled) setVenueResults(r);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [venueSearch]);

  // compute transport options when both ends known
  useEffect(() => {
    if (!departure || !venue) {
      return;
    }
    let cancelled = false;
    Promise.all([
      computeOptions({ name: departure.name, coords: departure.coords }, { name: venue.name, coords: venue.coords }),
      computeOptions({ name: venue.name, coords: venue.coords }, { name: departure.name, coords: departure.coords })
    ])
      .then(([outOpts, retOpts]) => {
        if (cancelled) return;
        setOutboundOptions(outOpts);
        setReturnOptions(retOpts);
        setSelectedOutboundId(outOpts[0]?.id ?? null);
        setSelectedReturnId(retOpts[0]?.id ?? null);
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
    const origin = step === "routes-outbound" ? departure.coords : venue.coords;
    const dest = step === "routes-outbound" ? venue.coords : departure.coords;
    
    if (selectedOption.mode === "train") {
      fetchTrainInfo(origin, dest).then((j) => !cancelled && setTrainJourneys(j));
    } else if (selectedOption.mode === "plane") {
      fetchFlightInfo(origin, dest).then((f) => !cancelled && setFlights(f));
    }
    return () => {
      cancelled = true;
    };
  }, [selectedOption, departure, venue, step]);

  // live hotel search around the venue
  useEffect(() => {
    if (!venue) {
      return;
    }
    if (!checkin || !checkout) {
      const t = setTimeout(() => setHotelLoading(false), 0);
      return () => clearTimeout(t);
    }
    const stayCheckout = checkout;
    let cancelled = false;
    const params = new URLSearchParams({
      lat: String(venue.coords.lat),
      lng: String(venue.coords.lng),
      radius: String(hotelRadius),
      checkin,
      checkout: stayCheckout,
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

  const go = useCallback((s: Step) => {
    setStep(s);
    setMaxStepIdx((m) => Math.max(m, idxOf(s)));
  }, []);

  const pickEvent = (venueId: string) => {
    const v = venues.find((x) => x.id === venueId);
    if (!v) return;
    setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
    setSelectedHotel(null);
    setOutboundOptions([]);
    setReturnOptions([]);
    setSelectedOutboundId(null);
    setSelectedReturnId(null);
    setTrainJourneys([]);
    setFlights([]);
    setHotelResults([]);
    setHotelError("");
    setHotelLoading(true);
    setMaxStepIdx((m) => Math.min(m, idxOf("home")));
    if (departure) {
      setOptionsLoading(true);
    }
    document.getElementById("search-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const journeyRoute = selectedOption?.route ?? null;

  const showTabBar = step !== "home";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header step={step} go={go} canReach={canReach} />

      <main className={`flex flex-col flex-1 min-h-0 ${showTabBar ? "pb-16 lg:pb-0" : ""}`}>
        {step === "home" && (
          <div className="flex-1 overflow-y-auto">
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
              venueSearch={venueSearch}
              setVenueSearch={handleVenueSearchChange}
              venueResults={venueResults}
              venueFocus={venueFocus}
              setVenueFocus={setVenueFocus}

              dateLabel={dateLabel}
              checkin={checkin}
              checkout={checkout}
              setCheckin={setCheckin}
              setCheckout={setCheckout}
              onCompose={() => go(departure && venue ? "hotels" : "home")}
              pickEvent={pickEvent}
            />
          </div>
        )}

        {(step === "routes-outbound" || step === "routes-return") && (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            <SideNav step={step} go={go} canReach={canReach} venue={venue} roundTrip={true} />
            <div className="min-w-0 flex-1 flex flex-col">
              <RoutesView
                departure={departure}
                venue={venue}
                dateLabel={dateLabel}
                direction={step === "routes-outbound" ? "outbound" : "return"}
                setDirection={() => {}}
                options={step === "routes-outbound" ? outboundOptions : returnOptions}
                loading={optionsLoading}
                selectedModeId={step === "routes-outbound" ? selectedOutboundId : selectedReturnId}
                onSelectMode={handleSelectMode}
                trainJourneys={trainJourneys}
                flights={flights}
                journeyRoute={journeyRoute}
                onContinue={() => {
                  if (step === "routes-outbound") {
                    go("routes-return");
                  } else {
                    go("bundle");
                  }
                }}
                roundTrip={true}
              />
            </div>
          </div>
        )}

        {step === "hotels" && (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            <SideNav step={step} go={go} canReach={canReach} venue={venue} roundTrip={true} />
            <div className="min-w-0 flex-1 flex flex-col">
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
                mobileMapOpen={mobileMapOpen}
                setMobileMapOpen={setMobileMapOpen}
                onContinue={() => go("routes-outbound")}
              />
            </div>
          </div>
        )}

        {step === "bundle" && (
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">
            <SideNav step={step} go={go} canReach={canReach} venue={venue} roundTrip={true} />
            <div className="min-w-0 flex-1 flex flex-col overflow-y-auto">
              <BundleView
                departure={departure}
                venue={venue}
                dateLabel={dateLabel}
                outboundOption={outboundOptions.find((o) => o.id === selectedOutboundId) || null}
                returnOption={returnOptions.find((o) => o.id === selectedReturnId) || null}
                roundTrip={true}
                selectedHotel={selectedHotel}
                checkin={checkin}
                checkout={checkout}
                onEdit={go}
              />
            </div>
          </div>
        )}
      </main>

      {showTabBar && <MobileTabBar step={step} go={go} canReach={canReach} roundTrip={true} />}
    </div>
  );
}
