import type { FlightInfo, RouteOption, RouteSegment, TrainJourney } from "@/src/types";
import { dateOnly, DEFAULT_OUTBOUND_TIME, DEFAULT_RETURN_TIME } from "@/src/utils/date";

export function addMinutesToIso(iso: string, minutes: number): string {
  if (!iso) return "";
  const [d, t = "00:00"] = iso.split("T");
  const [y, mo, day] = d.split("-").map(Number);
  const [h, mi, s = 0] = t.split(":").map(Number);
  if ([y, mo, day, h, mi].some((v) => Number.isNaN(v))) return iso;

  const dt = new Date(Date.UTC(y, mo - 1, day, h, mi, Number(s)));
  dt.setUTCMinutes(dt.getUTCMinutes() + Math.round(minutes));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
}

export function diffMinutesIso(isoStart: string, isoEnd: string): number {
  if (!isoStart || !isoEnd) return 0;
  const parse = (iso: string) => {
    const [d, t = "00:00"] = iso.split("T");
    const [y, mo, day] = d.split("-").map(Number);
    const [h, mi, s = 0] = t.split(":").map(Number);
    return Date.UTC(y, mo - 1, day, h, mi, Number(s));
  };
  const t1 = parse(isoStart);
  const t2 = parse(isoEnd);
  if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
  return Math.round((t2 - t1) / 60000);
}

export interface TimedSegmentsParams {
  option: RouteOption;
  journey?: TrainJourney;
  flights?: FlightInfo[];
  date?: string;
  arriveBy?: string;
  leaveAfter?: string;
  isReturn?: boolean;
}

export interface LegTiming {
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  segments: RouteSegment[];
  totalWaitMinutes: number;
}

export function resolveTimedSegments(params: TimedSegmentsParams): RouteSegment[] {
  const { option, journey, flights, date, arriveBy, leaveAfter, isReturn } = params;
  const rawSegments = option.route.segments || [];
  if (rawSegments.length === 0) return [];

  // 1. Train option with SNCF journey details
  if (option.mode === "train" && journey?.trains && journey.trains.length > 0) {
    const trains = journey.trains;
    const firstTrainIndex = rawSegments.findIndex((s) => s.mode === "train");
    const lastTrainIndex = rawSegments.length - 1 - [...rawSegments].reverse().findIndex((s) => s.mode === "train");

    const beforeAccess = firstTrainIndex > 0 ? rawSegments.slice(0, firstTrainIndex) : [];
    const afterAccess = lastTrainIndex >= 0 && lastTrainIndex < rawSegments.length - 1 ? rawSegments.slice(lastTrainIndex + 1) : [];

    const firstTrainDep = trains[0].departureTime || journey.departureAt;
    const beforeDuration = beforeAccess.reduce((s, seg) => s + seg.durationMinutes, 0);

    // Origin departure works backward from the first train departure
    let current = addMinutesToIso(firstTrainDep, -beforeDuration);
    const timedBefore: RouteSegment[] = beforeAccess.map((seg) => {
      const dep = current;
      const arr = addMinutesToIso(current, seg.durationMinutes);
      current = arr;
      return { ...seg, departureTime: dep, arrivalTime: arr };
    });

    // Build or align train segments
    const timedTrains: RouteSegment[] = trains.map((t, i) => {
      const nextT = trains[i + 1];
      const waitTime =
        t.waitTimeAfterMinutes ??
        (nextT?.departureTime && t.arrivalTime ? Math.max(0, diffMinutesIso(t.arrivalTime, nextT.departureTime)) : undefined);

      const existingSeg = rawSegments.filter((s) => s.mode === "train")[i];
      const duration =
        t.departureTime && t.arrivalTime ? Math.max(1, diffMinutesIso(t.departureTime, t.arrivalTime)) : existingSeg?.durationMinutes ?? 60;

      return {
        from: {
          name: t.departureStation || existingSeg?.from.name || "Gare de départ",
          coords: existingSeg?.from.coords || { lat: 0, lng: 0 },
        },
        to: {
          name: t.arrivalStation || existingSeg?.to.name || "Gare d'arrivée",
          coords: existingSeg?.to.coords || { lat: 0, lng: 0 },
        },
        mode: "train" as const,
        coordinates: existingSeg?.coordinates || [],
        distanceKm: existingSeg?.distanceKm || 0,
        durationMinutes: duration,
        color: existingSeg?.color,
        label: `${t.name} ${t.number}`.trim() || existingSeg?.label || "Train SNCF",
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
        waitTimeMinutes: waitTime,
      };
    });

    const lastTrainArr = trains[trains.length - 1].arrivalTime || journey.arrivalAt;
    current = lastTrainArr;
    const timedAfter: RouteSegment[] = afterAccess.map((seg) => {
      const dep = current;
      const arr = addMinutesToIso(current, seg.durationMinutes);
      current = arr;
      return { ...seg, departureTime: dep, arrivalTime: arr };
    });

    return [...timedBefore, ...timedTrains, ...timedAfter];
  }

  // 2. Flight option with flight info
  if (option.mode === "plane" && flights && flights.length > 0 && flights[0].departureAt) {
    const flight = flights[0];
    const flightIndex = rawSegments.findIndex((s) => s.mode === "plane");
    const beforeAccess = flightIndex > 0 ? rawSegments.slice(0, flightIndex) : [];
    const afterAccess = flightIndex >= 0 && flightIndex < rawSegments.length - 1 ? rawSegments.slice(flightIndex + 1) : [];

    const airportWait = 90; // Recommended 1h30 airport buffer
    const beforeDuration = beforeAccess.reduce((s, seg) => s + seg.durationMinutes, 0) + airportWait;

    let current = addMinutesToIso(flight.departureAt, -beforeDuration);
    const timedBefore: RouteSegment[] = beforeAccess.map((seg, i) => {
      const dep = current;
      const arr = addMinutesToIso(current, seg.durationMinutes);
      current = arr;
      const isLastBefore = i === beforeAccess.length - 1;
      return {
        ...seg,
        departureTime: dep,
        arrivalTime: arr,
        waitTimeMinutes: isLastBefore ? airportWait : undefined,
      };
    });

    const flightArr = addMinutesToIso(flight.departureAt, flight.durationMinutes);
    const planeSeg = rawSegments[flightIndex] || {
      from: { name: "Aéroport", coords: { lat: 0, lng: 0 } },
      to: { name: "Aéroport", coords: { lat: 0, lng: 0 } },
      mode: "plane" as const,
      coordinates: [],
      distanceKm: option.distanceKm,
      durationMinutes: flight.durationMinutes,
    };

    const timedPlane: RouteSegment = {
      ...planeSeg,
      departureTime: flight.departureAt,
      arrivalTime: flightArr,
      label: `${flight.airline} ${flight.flightNumber}`.trim() || planeSeg.label,
      waitTimeMinutes: afterAccess.length > 0 ? 20 : undefined, // 20 min baggage wait
    };

    current = addMinutesToIso(flightArr, afterAccess.length > 0 ? 20 : 0);
    const timedAfter: RouteSegment[] = afterAccess.map((seg) => {
      const dep = current;
      const arr = addMinutesToIso(current, seg.durationMinutes);
      current = arr;
      return { ...seg, departureTime: dep, arrivalTime: arr };
    });

    return [...timedBefore, timedPlane, ...timedAfter];
  }

  // 3. General mode (car, bus, walking, or unlinked timetable)
  const baseDay = date ? dateOnly(date) : dateOnly(new Date().toISOString());
  let startTime: string;

  if (isReturn) {
    const time = leaveAfter || DEFAULT_RETURN_TIME;
    startTime = `${baseDay}T${time.length === 5 ? `${time}:00` : time}`;
  } else if (arriveBy) {
    const arrTime = `${baseDay}T${arriveBy.length === 5 ? `${arriveBy}:00` : arriveBy}`;
    startTime = addMinutesToIso(arrTime, -option.durationMin);
  } else {
    startTime = `${baseDay}T${DEFAULT_OUTBOUND_TIME}:00`;
  }

  let current = startTime;
  return rawSegments.map((seg, i) => {
    const next = rawSegments[i + 1];
    const isChange =
      !!next && seg.mode !== "walking" && next.mode !== "walking" && seg.mode !== "car" && next.mode !== "car";

    const waitTime = isChange ? 15 : undefined; // 15 min default transfer wait
    const dep = current;
    const arr = addMinutesToIso(current, seg.durationMinutes);
    current = waitTime ? addMinutesToIso(arr, waitTime) : arr;

    return {
      ...seg,
      departureTime: dep,
      arrivalTime: arr,
      waitTimeMinutes: waitTime,
    };
  });
}

export function getLegTiming(params: TimedSegmentsParams): LegTiming {
  const segments = resolveTimedSegments(params);
  const departureTime = segments[0]?.departureTime;
  const arrivalTime = segments[segments.length - 1]?.arrivalTime;
  const departureDate = departureTime ? dateOnly(departureTime) : params.date ? dateOnly(params.date) : undefined;
  const totalWaitMinutes = segments.reduce((sum, s) => sum + (s.waitTimeMinutes || 0), 0);

  return {
    departureTime,
    arrivalTime,
    departureDate,
    segments,
    totalWaitMinutes,
  };
}

