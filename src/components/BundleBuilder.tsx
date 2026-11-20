"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import type {
  BookedState,
  BookingKey,
  BundleSnapshot,
  DepartureSuggestion,
  FlightInfo,
  HotelMapItem,
  Location,
  PanelKind,
  RouteOption,
  Step,
  TrainJourney,
  TripPreference,
  TripSummary,
  Venue,
} from "@/src/types";
import { STEPS } from "@/src/types";
import { addDaysIso, dateOnly, formatDay, isSameDayTrip, outboundSearch, returnSearch } from "@/src/utils/date";
import { pickHotel, pickOption } from "@/src/utils/algorithms/recommend";
import { restoredHotelOptIn, stayNights, tripTotal } from "@/src/utils/trip";
import { searchLocation } from "@/src/services/geocoding";
import { searchEvents } from "@/src/services/events";
import { computeOptions, fetchFlightInfo, fetchTrainInfo } from "@/src/services/travel";
import { quoteOptions } from "@/src/services/prices";
import { createBundle, updateBundle, fetchBundle } from "@/src/services/bundles";
import { Header } from "@/src/components/layout/Header";
import { HomeView } from "@/src/components/views/HomeView";
import { TripView } from "@/src/components/views/TripView";
import { BookView } from "@/src/components/views/BookView";
import { TripPanels, type Panel } from "@/src/components/trip/TripPanels";
import { SaveBundleModal } from "@/src/components/SaveBundleModal";
import { LoadingScreen } from "@/src/components/LoadingScreen";
import { loadingCopy } from "@/src/utils/loading";
import { readTripCache, writeTripCache, type TripCache } from "@/src/utils/trip-cache";
import type { DateSelection } from "@/src/components/DateRangePicker";

interface BundleBuilderProps {
  uuid?: string;
  step: Step;
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function BundleBuilder({ uuid, step }: BundleBuilderProps) {
  const router = useRouter();
  const [cached] = useState(() => readTripCache(uuid));
  const snap = cached?.snapshot;
  const [hydrated, setHydrated] = useState(!uuid || !!cached);
  // The saved bundle could not be read: never autosave the empty state over it.
  const [loadFailed, setLoadFailed] = useState(false);
  const [departure, setDeparture] = useState<Location | null>(snap?.departure ?? null);
  const [venue, setVenue] = useState<Location | null>(snap?.venue ?? null);
  const [checkin, setCheckin] = useState(snap?.checkin ?? "");
  const [checkout, setCheckout] = useState(snap?.checkout ?? "");
  const [roundTrip, setRoundTrip] = useState(snap?.roundTrip ?? true);
  const [arriveBy, setArriveBy] = useState(snap?.arriveBy ?? "");
  const [leaveAfter, setLeaveAfter] = useState(snap?.leaveAfter ?? "");
  const [preference, setPreference] = useState<TripPreference | null>(snap && snap.preference !== undefined ? snap.preference : "fast");
  const [booked, setBooked] = useState<BookedState>(snap?.booked ?? {});

  const [depSearch, setDepSearch] = useState("");
  const [depResults, setDepResults] = useState<DepartureSuggestion[]>([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueResults, setVenueResults] = useState<Venue[]>([]);

  const [outboundOptions, setOutboundOptions] = useState<RouteOption[]>(cached?.outboundOptions ?? []);
  const [returnOptions, setReturnOptions] = useState<RouteOption[]>(cached?.returnOptions ?? []);
  const [optionsLoading, setOptionsLoading] = useState(!!uuid && !cached?.optionsKey);
  const [selectedOutboundId, setSelectedOutboundId] = useState<string | null>(snap?.outboundOption?.id ?? null);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(snap?.returnOption?.id ?? null);
  const [outboundTrains, setOutboundTrains] = useState<TrainJourney[]>(cached?.outboundTrains ?? []);
  const [returnTrains, setReturnTrains] = useState<TrainJourney[]>(cached?.returnTrains ?? []);
  const [outboundFlights, setOutboundFlights] = useState<FlightInfo[]>(cached?.outboundFlights ?? []);
  const [returnFlights, setReturnFlights] = useState<FlightInfo[]>(cached?.returnFlights ?? []);
  const [outPricesLoading, setOutPricesLoading] = useState(false);
  const [retPricesLoading, setRetPricesLoading] = useState(false);

  const [hotelRadius, setHotelRadius] = useState(10);
  const [hotelResults, setHotelResults] = useState<HotelMapItem[]>(cached?.hotelResults ?? []);
  const [hotelFetching, setHotelFetching] = useState(false);
  const [hotelError, setHotelError] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<HotelMapItem | null>(snap?.selectedHotel ?? null);
  const [hotelOptIn, setHotelOptIn] = useState(() => (snap ? restoredHotelOptIn(snap) : false));

  const [panel, setPanel] = useState<Panel>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [composing, setComposing] = useState(false);

  const optionsKeyRef = useRef(cached?.optionsKey ?? "");
  const hotelsKeyRef = useRef(cached?.hotelsKey ?? "");
  const outTimesKeyRef = useRef(cached?.outTimesKey ?? "");
  const retTimesKeyRef = useRef(cached?.retTimesKey ?? "");
  const outPricesKeyRef = useRef(cached?.outPricesKey ?? "");
  const retPricesKeyRef = useRef(cached?.retPricesKey ?? "");
  const preferenceRef = useRef(preference);
  useEffect(() => {
    preferenceRef.current = preference;
  }, [preference]);

  const sameDay = isSameDayTrip(roundTrip, checkin, checkout);
  const withHotel = !sameDay || hotelOptIn;
  const stayCheckout = useMemo(() => {
    if (!checkin) return "";
    if (roundTrip && checkout && !sameDay) return dateOnly(checkout);
    return addDaysIso(checkin, 1);
  }, [checkin, checkout, roundTrip, sameDay]);
  const returnDate = roundTrip ? dateOnly(checkout) : "";
  const nights = stayNights(checkin, stayCheckout);

  const dateLabel = useMemo(() => {
    if (!checkin) return "";
    if (!roundTrip || !checkout) return capitalize(formatDay(checkin));
    if (sameDay) return `${capitalize(formatDay(checkin))}, aller-retour dans la journée`;
    return `${capitalize(formatDay(checkin))} → ${formatDay(checkout)}`;
  }, [checkin, checkout, roundTrip, sameDay]);

  const outbound = outboundOptions.find((o) => o.id === selectedOutboundId) || null;
  const ret = returnOptions.find((o) => o.id === selectedReturnId) || null;
  const hotelLoading = hotelFetching && !!venue && !!checkin;

  const buildSnapshot = useCallback(
    (): BundleSnapshot => ({
      departure,
      venue,
      checkin,
      checkout,
      roundTrip,
      outboundOption: outboundOptions.find((o) => o.id === selectedOutboundId) || null,
      returnOption: returnOptions.find((o) => o.id === selectedReturnId) || null,
      selectedHotel: withHotel ? selectedHotel : null,
      hotelOptIn: sameDay ? hotelOptIn : undefined,
      preference,
      arriveBy,
      leaveAfter,
      booked,
    }),
    [departure, venue, checkin, checkout, roundTrip, outboundOptions, selectedOutboundId, returnOptions, selectedReturnId, selectedHotel, hotelOptIn, sameDay, withHotel, preference, arriveBy, leaveAfter, booked]
  );

  useEffect(() => {
    if (!uuid || hydrated) return;
    let cancelled = false;
    fetchBundle(uuid)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          router.replace("/");
          return;
        }
        const d = record.data || ({} as BundleSnapshot);
        setDeparture(d.departure ?? null);
        setVenue(d.venue ?? null);
        setCheckin(d.checkin ?? "");
        setCheckout(d.checkout ?? "");
        setRoundTrip(d.roundTrip ?? true);
        setArriveBy(d.arriveBy ?? "");
        setLeaveAfter(d.leaveAfter ?? "");
        setPreference(d.preference === undefined ? "fast" : d.preference);
        setBooked(d.booked ?? {});
        const outOpt = d.outboundOption ?? null;
        const retOpt = d.returnOption ?? null;
        setOutboundOptions(outOpt ? [outOpt] : []);
        setReturnOptions(retOpt ? [retOpt] : []);
        setSelectedOutboundId(outOpt?.id ?? null);
        setSelectedReturnId(retOpt?.id ?? null);
        const optIn = restoredHotelOptIn({
          roundTrip: d.roundTrip ?? true,
          checkin: d.checkin ?? "",
          checkout: d.checkout ?? "",
          hotelOptIn: d.hotelOptIn,
          selectedHotel: d.selectedHotel ?? null,
        });
        const keepHotel = !isSameDayTrip(d.roundTrip ?? true, d.checkin ?? "", d.checkout ?? "") || optIn;
        setSelectedHotel(keepHotel ? (d.selectedHotel ?? null) : null);
        setHotelOptIn(optIn);
        setOptionsLoading(!!(d.departure && d.venue));
        setHotelFetching(!!(d.venue && d.checkin && keepHotel));
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsLoading(false);
          setLoadFailed(true);
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uuid, hydrated, router]);

  useEffect(() => {
    if (!uuid || !hydrated || loadFailed) return;
    const snapshot = buildSnapshot();
    const t = setTimeout(() => {
      updateBundle(uuid, snapshot).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [uuid, hydrated, loadFailed, buildSnapshot]);

  useEffect(() => {
    if (!depSearch.trim() || departure) return;
    const t = setTimeout(async () => {
      try {
        const r = await searchLocation(depSearch);
        setDepResults(r.map((x) => ({ displayName: x.displayName, address: x.address, coords: x.coords })));
      } catch {
        setDepResults([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [depSearch, departure]);

  useEffect(() => {
    if (!venueSearch.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchEvents(venueSearch);
        if (!cancelled) setVenueResults(r);
      } catch {
        if (!cancelled) setVenueResults([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [venueSearch]);

  useEffect(() => {
    if (!departure || !venue) return;
    const key = `${departure.coords.lat},${departure.coords.lng}|${venue.coords.lat},${venue.coords.lng}`;
    if (optionsKeyRef.current === key) return;
    let cancelled = false;
    Promise.all([
      computeOptions({ name: departure.name, coords: departure.coords }, { name: venue.name, coords: venue.coords }),
      computeOptions({ name: venue.name, coords: venue.coords }, { name: departure.name, coords: departure.coords }),
    ])
      .then(([outOpts, retOpts]) => {
        if (cancelled) return;
        const pref = preferenceRef.current ?? "fast";
        optionsKeyRef.current = key;
        setOutboundOptions(outOpts);
        setReturnOptions(retOpts);
        setSelectedOutboundId((prev) => (prev && outOpts.some((o) => o.id === prev) ? prev : pickOption(outOpts, pref)?.id ?? null));
        setSelectedReturnId((prev) => (prev && retOpts.some((o) => o.id === prev) ? prev : pickOption(retOpts, pref)?.id ?? null));
      })
      .finally(() => !cancelled && setOptionsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [departure, venue]);

  const onTripPages = step !== "home";

  useEffect(() => {
    if (!onTripPages || !departure || !venue || !outbound || !checkin) return;
    const key = `${outbound.id}|${checkin}|${arriveBy}`;
    if (outTimesKeyRef.current === key) return;
    let cancelled = false;
    const search = outboundSearch(checkin, arriveBy || undefined, new Date());
    const jobs: Promise<unknown>[] = [];
    if (outbound.route.segments.some((s) => s.mode === "train") && search) {
      jobs.push(fetchTrainInfo(departure.coords, venue.coords, search.iso, search.represents).then((j) => !cancelled && setOutboundTrains(j)));
    }
    if (outbound.mode === "plane") {
      jobs.push(fetchFlightInfo(departure.coords, venue.coords, checkin).then((f) => !cancelled && setOutboundFlights(f)));
    }
    Promise.all(jobs)
      .then(() => {
        if (!cancelled) outTimesKeyRef.current = key;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onTripPages, departure, venue, outbound, checkin, arriveBy]);

  useEffect(() => {
    if (!onTripPages || !departure || !venue || !ret || !returnDate) return;
    const key = `${ret.id}|${returnDate}|${leaveAfter}|${sameDay ? arriveBy : ""}`;
    if (retTimesKeyRef.current === key) return;
    let cancelled = false;
    const search = returnSearch(returnDate, leaveAfter || undefined, new Date(), sameDay ? arriveBy || undefined : undefined);
    const jobs: Promise<unknown>[] = [];
    if (ret.route.segments.some((s) => s.mode === "train") && search) {
      jobs.push(fetchTrainInfo(venue.coords, departure.coords, search.iso, search.represents).then((j) => !cancelled && setReturnTrains(j)));
    }
    if (ret.mode === "plane") {
      jobs.push(fetchFlightInfo(venue.coords, departure.coords, returnDate).then((f) => !cancelled && setReturnFlights(f)));
    }
    Promise.all(jobs)
      .then(() => {
        if (!cancelled) retTimesKeyRef.current = key;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onTripPages, departure, venue, ret, returnDate, leaveAfter, arriveBy, sameDay]);

  useEffect(() => {
    if (!onTripPages || !outboundOptions.length || !checkin) return;
    const search = outboundSearch(checkin, arriveBy || undefined, new Date());
    if (!search) return;
    const key = `${optionsKeyRef.current}|${search.iso}|${search.represents}`;
    if (outPricesKeyRef.current === key && outboundOptions.every((o) => o.quote)) return;
    let cancelled = false;
    setOutPricesLoading(true);
    quoteOptions(outboundOptions, search)
      .then((quoted) => {
        if (cancelled) return;
        outPricesKeyRef.current = key;
        setOutboundOptions(quoted);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOutPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote once per optionsKey + search window; options identity updates after quote
  }, [onTripPages, checkin, arriveBy, outboundOptions.length, optionsLoading]);

  useEffect(() => {
    if (!onTripPages || !roundTrip || !returnOptions.length || !returnDate) return;
    const search = returnSearch(returnDate, leaveAfter || undefined, new Date(), sameDay ? arriveBy || undefined : undefined);
    if (!search) return;
    const key = `${optionsKeyRef.current}|${search.iso}|${search.represents}`;
    if (retPricesKeyRef.current === key && returnOptions.every((o) => o.quote)) return;
    let cancelled = false;
    setRetPricesLoading(true);
    quoteOptions(returnOptions, search)
      .then((quoted) => {
        if (cancelled) return;
        retPricesKeyRef.current = key;
        setReturnOptions(quoted);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRetPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote once per optionsKey + search window; options identity updates after quote
  }, [onTripPages, roundTrip, returnDate, leaveAfter, arriveBy, sameDay, returnOptions.length, optionsLoading]);

  useEffect(() => {
    if (!venue || !checkin || !stayCheckout || !withHotel) return;
    const key = `${venue.coords.lat},${venue.coords.lng}|${dateOnly(checkin)}|${dateOnly(stayCheckout)}`;
    if (hotelsKeyRef.current === key) return;
    let cancelled = false;
    const params = new URLSearchParams({
      lat: String(venue.coords.lat),
      lng: String(venue.coords.lng),
      radius: "50",
      checkin: dateOnly(checkin),
      checkout: dateOnly(stayCheckout),
    });
    const t = setTimeout(() => {
      setHotelFetching(true);
      fetch(`/api/hotels/search?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
        .then((data: HotelMapItem[]) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : [];
          if (list.length) hotelsKeyRef.current = key;
          setHotelResults(list);
          setHotelError(list.length ? "" : "Aucun hôtel trouvé autour de la salle.");
          setSelectedHotel((prev) => prev ?? pickHotel(list, venue.coords, preferenceRef.current ?? "fast"));
        })
        .catch(() => {
          if (!cancelled) {
            setHotelResults([]);
            setHotelError("La recherche d'hôtels a échoué. Réessaie dans un instant.");
          }
        })
        .finally(() => !cancelled && setHotelFetching(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
      // The pending request is dropped (e.g. hotel unchecked): never leave the spinner on.
      setHotelFetching(false);
    };
  }, [venue, checkin, stayCheckout, withHotel]);

  const clearQuotes = (opts: RouteOption[]) =>
    opts.map((o) => {
      const next = { ...o };
      delete next.quote;
      delete next.modeQuotes;
      return next;
    });

  const resetRoutes = () => {
    optionsKeyRef.current = "";
    outTimesKeyRef.current = "";
    retTimesKeyRef.current = "";
    outPricesKeyRef.current = "";
    retPricesKeyRef.current = "";
    setOutboundOptions([]);
    setReturnOptions([]);
    setSelectedOutboundId(null);
    setSelectedReturnId(null);
    setOutboundTrains([]);
    setReturnTrains([]);
    setOutboundFlights([]);
    setReturnFlights([]);
    setOutPricesLoading(false);
    setRetPricesLoading(false);
    setBooked({});
  };

  const handleDepSearchChange = (val: string) => {
    setDepSearch(val);
    if (val.length < 3) setDepResults([]);
  };

  const handlePickDeparture = (r: DepartureSuggestion) => {
    posthog.capture("departure_selected", { source: "search" });
    setDeparture({ id: `dep-${Date.now()}`, name: r.displayName.split(",")[0], coords: r.coords, type: "departure", address: r.address });
    setDepSearch(r.displayName);
    setDepResults([]);
    resetRoutes();
    if (venue) setOptionsLoading(true);
  };

  const handleClearDeparture = () => {
    setDeparture(null);
    setDepSearch("");
    resetRoutes();
  };

  const handleVenueSearchChange = (val: string) => {
    setVenueSearch(val);
    if (!val.trim()) setVenueResults([]);
  };

  const handlePickVenue = (v: Venue) => {
    posthog.capture("venue_selected", { source: "search" });
    setVenue({ id: v.id, name: v.name, coords: v.coords, type: "venue", address: v.address });
    setVenueSearch("");
    setVenueResults([]);
    setSelectedHotel(null);
    resetRoutes();
    setHotelResults([]);
    setHotelError("");
    hotelsKeyRef.current = "";
    setHotelFetching(withHotel);
    if (departure) setOptionsLoading(true);
  };

  const handleClearVenue = () => {
    setVenue(null);
    setVenueSearch("");
    setVenueResults([]);
    setSelectedHotel(null);
    resetRoutes();
    setHotelResults([]);
    setHotelError("");
  };

  const handleRoundTrip = (v: boolean) => {
    setRoundTrip(v);
    if (!v) {
      setCheckout("");
      setLeaveAfter("");
    }
    setBooked({});
  };

  const handleDates = (d: DateSelection) => {
    const changed = d.checkin !== dateOnly(checkin) || d.checkout !== dateOnly(checkout);
    const timesChanged =
      changed || d.arriveBy !== arriveBy || d.leaveAfter !== leaveAfter;
    setCheckin(d.checkin);
    setCheckout(d.checkout);
    setArriveBy(d.arriveBy);
    setLeaveAfter(d.leaveAfter);
    setOutboundTrains([]);
    setReturnTrains([]);
    if (timesChanged) {
      outTimesKeyRef.current = "";
      retTimesKeyRef.current = "";
      outPricesKeyRef.current = "";
      retPricesKeyRef.current = "";
      setOutboundOptions((prev) => clearQuotes(prev));
      setReturnOptions((prev) => clearQuotes(prev));
    }
    if (changed) {
      const nextSameDay = isSameDayTrip(true, d.checkin, d.checkout);
      setSelectedHotel(null);
      setHotelResults([]);
      setHotelError("");
      setBooked({});
      hotelsKeyRef.current = "";
      if (nextSameDay) setHotelOptIn(false);
    }
  };

  const unbook = (keys: BookingKey[]) =>
    setBooked((b) => {
      const next = { ...b };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const handlePreference = (p: TripPreference) => {
    posthog.capture("preference_selected", { preference: p });
    setPreference(p);
    const out = pickOption(outboundOptions, p);
    const back = pickOption(returnOptions, p);
    const hotel = withHotel ? pickHotel(hotelResults, venue?.coords ?? null, p) : null;
    const changed: BookingKey[] = [];
    if (out && out.id !== selectedOutboundId) {
      setSelectedOutboundId(out.id);
      setOutboundTrains([]);
      changed.push("outbound");
    }
    if (back && back.id !== selectedReturnId) {
      setSelectedReturnId(back.id);
      setReturnTrains([]);
      changed.push("return");
    }
    if (hotel && hotel.id !== selectedHotel?.id) {
      setSelectedHotel(hotel);
      changed.push("hotel");
    }
    unbook(changed);
  };

  const handleSelectOutbound = (id: string) => {
    if (id === selectedOutboundId) return;
    posthog.capture("travel_option_selected", { direction: "outbound", transport_mode: outboundOptions.find((o) => o.id === id)?.mode });
    setSelectedOutboundId(id);
    setOutboundTrains([]);
    setOutboundFlights([]);
    setPreference(null);
    unbook(["outbound"]);
  };

  const handleSelectReturn = (id: string) => {
    if (id === selectedReturnId) return;
    posthog.capture("travel_option_selected", { direction: "return", transport_mode: returnOptions.find((o) => o.id === id)?.mode });
    setSelectedReturnId(id);
    setReturnTrains([]);
    setReturnFlights([]);
    setPreference(null);
    unbook(["return"]);
  };

  const handleChooseHotel = (h: HotelMapItem) => {
    posthog.capture("hotel_selected", { has_price: Boolean(h.pricePerNight), has_rating: Boolean(h.stars || h.rating) });
    setHotelOptIn(true);
    setSelectedHotel(h);
    setPreference(null);
    unbook(["hotel"]);
  };

  const handleAddHotel = () => {
    posthog.capture("hotel_opt_in", { enabled: true });
    setHotelOptIn(true);
    if (selectedHotel) return;
    const next = venue && hotelResults.length ? pickHotel(hotelResults, venue.coords, preferenceRef.current ?? "fast") : null;
    if (next) {
      setSelectedHotel(next);
      return;
    }
    hotelsKeyRef.current = "";
    setHotelFetching(true);
  };

  const handleRemoveHotel = () => {
    posthog.capture("hotel_opt_in", { enabled: false });
    setHotelOptIn(false);
    setSelectedHotel(null);
    unbook(["hotel"]);
  };

  const handleToggleBooked = (key: BookingKey) => {
    setBooked((b) => {
      const value = !b[key];
      posthog.capture("booking_marked", { item: key, booked: value });
      return { ...b, [key]: value };
    });
  };

  const pathFor = useCallback(
    (s: Step, id = uuid) => {
      const segment = STEPS.find((x) => x.id === s)?.segment ?? "";
      if (!id) return "/";
      return segment ? `/${id}/${segment}` : `/${id}`;
    },
    [uuid]
  );

  const liveTripRef = useRef<{ buildSnapshot: () => BundleSnapshot; cache: Omit<TripCache, "uuid" | "snapshot"> } | null>(null);
  useEffect(() => {
    liveTripRef.current = {
      buildSnapshot,
      cache: {
        outboundOptions,
        returnOptions,
        optionsKey: optionsKeyRef.current,
        hotelResults,
        hotelsKey: hotelsKeyRef.current,
        outboundTrains,
        returnTrains,
        outboundFlights,
        returnFlights,
        outTimesKey: outTimesKeyRef.current,
        retTimesKey: retTimesKeyRef.current,
        outPricesKey: outPricesKeyRef.current,
        retPricesKey: retPricesKeyRef.current,
      },
    };
  });

  const rememberTrip = useCallback((id: string): BundleSnapshot | null => {
    const live = liveTripRef.current;
    if (!live) return null;
    const snapshot = live.buildSnapshot();
    writeTripCache({ uuid: id, snapshot, ...live.cache });
    return snapshot;
  }, []);

  const go = useCallback(
    (s: Step) => {
      if (s !== "home" && !uuid) return;
      if (uuid && hydrated && !loadFailed) {
        const snapshot = rememberTrip(uuid);
        if (snapshot) updateBundle(uuid, snapshot).catch(() => {});
      }
      router.push(pathFor(s));
    },
    [uuid, hydrated, loadFailed, rememberTrip, router, pathFor]
  );

  const canCompose = !!(departure && venue && checkin && (!roundTrip || checkout));

  const handleCompose = useCallback(async () => {
    if (!canCompose) return;
    if (uuid) {
      go("trip");
      return;
    }
    setComposing(true);
    try {
      const snapshot = buildSnapshot();
      const id = await createBundle(snapshot);
      posthog.capture("bundle_composed", { round_trip: roundTrip });
      rememberTrip(id);
      router.push(pathFor("trip", id));
    } catch {
      setComposing(false);
    }
  }, [canCompose, uuid, go, buildSnapshot, rememberTrip, roundTrip, router, pathFor]);

  const total = tripTotal({ outbound, ret, hotel: selectedHotel, nights, roundTrip, withHotel });
  const pricesLoading = outPricesLoading || retPricesLoading;

  const trip: TripSummary = {
    departure,
    venue,
    dateLabel,
    checkin,
    stayCheckout,
    returnDate,
    roundTrip,
    sameDay,
    withHotel,
    nights,
    outbound,
    ret,
    hotel: withHotel ? selectedHotel : null,
    preference,
    total,
    outboundTrains,
    returnTrains,
    outboundFlights,
    returnFlights,
    optionsLoading,
    pricesLoading,
    hotelLoading,
    hotelError,
  };

  const openPanel = (p: PanelKind) => setPanel(p);

  if (uuid && !hydrated) {
    return <LoadingScreen />;
  }

  const missingSearch = step !== "home" && (!departure || !venue);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />

      <main className="flex-1">
        {step === "home" && (
          <HomeView
            departure={departure}
            venue={venue}
            depSearch={depSearch}
            setDepSearch={handleDepSearchChange}
            depResults={depResults}
            onPickDeparture={handlePickDeparture}
            onClearDeparture={handleClearDeparture}
            venueSearch={venueSearch}
            setVenueSearch={handleVenueSearchChange}
            venueResults={venueResults}
            onPickVenue={handlePickVenue}
            onClearVenue={handleClearVenue}
            dateLabel={dateLabel}
            onOpenDates={() => openPanel("dates")}
            canCompose={canCompose}
            composing={composing}
            onCompose={handleCompose}
          />
        )}

        {missingSearch && (
          <div className="mx-auto max-w-md px-6 py-24 text-center">
            <h1 className="font-display text-[28px] font-extrabold text-ink">Il manque ta recherche</h1>
            <p className="mt-2 text-slate-500">Indique ton départ et ton événement pour voir ton voyage.</p>
            <button
              type="button"
              onClick={() => go("home")}
              className="mt-6 rounded-xl bg-billet px-6 py-3 text-[15px] font-bold text-white hover:bg-billet-600"
            >
              Commencer une recherche
            </button>
          </div>
        )}

        {step === "trip" && !missingSearch && optionsLoading && !outbound && <LoadingScreen embedded {...loadingCopy(roundTrip, withHotel)} />}

        {step === "trip" && !missingSearch && !(optionsLoading && !outbound) && (
          <TripView trip={trip} onGo={go} onOpenPanel={openPanel} onPreference={handlePreference} onAddHotel={handleAddHotel} onRemoveHotel={handleRemoveHotel} />
        )}

        {step === "book" && !missingSearch && (
          <BookView
            trip={trip}
            booked={booked}
            onToggleBooked={handleToggleBooked}
            onGo={go}
            onOpenPanel={openPanel}
            onShare={() => setShareOpen(true)}
            onAddHotel={handleAddHotel}
            onRemoveHotel={handleRemoveHotel}
          />
        )}
      </main>

      <TripPanels
        panel={panel}
        onClose={() => setPanel(null)}
        roundTrip={roundTrip}
        onRoundTrip={step === "home" ? handleRoundTrip : undefined}
        dates={{ checkin, checkout, arriveBy, leaveAfter }}
        stayCheckout={stayCheckout}
        onDates={handleDates}
        outboundOptions={outboundOptions}
        returnOptions={returnOptions}
        selectedOutboundId={selectedOutboundId}
        selectedReturnId={selectedReturnId}
        optionsLoading={optionsLoading}
        pricesLoading={pricesLoading}
        onSelectOutbound={handleSelectOutbound}
        onSelectReturn={handleSelectReturn}
        hotels={hotelResults}
        venue={venue}
        selectedHotel={selectedHotel}
        preference={preference ?? "fast"}
        hotelRadius={hotelRadius}
        onHotelRadius={setHotelRadius}
        hotelLoading={hotelLoading}
        hotelError={hotelError}
        onChooseHotel={handleChooseHotel}
      />

      {shareOpen && uuid && <SaveBundleModal bundleId={uuid} onClose={() => setShareOpen(false)} />}

      {composing && <LoadingScreen overlay {...loadingCopy(roundTrip, withHotel)} />}
    </div>
  );
}
