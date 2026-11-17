export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readTable(text) {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const index = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  return { rows, col: (row, name) => (index[name] === undefined ? "" : row[index[name]] ?? "") };
}

export function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isoDay(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function activeWeekdayMasks(calendar, calendarDates, from, days) {
  const window = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + i));
    window.push({ ymd: isoDay(d), weekday: (d.getUTCDay() + 6) % 7 });
  }
  const names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const active = new Map();
  const add = (service, ymd) => {
    if (!active.has(service)) active.set(service, new Set());
    active.get(service).add(ymd);
  };
  if (calendar) {
    for (const row of calendar.rows) {
      const service = calendar.col(row, "service_id");
      const start = calendar.col(row, "start_date");
      const end = calendar.col(row, "end_date");
      for (const { ymd, weekday } of window) {
        if (ymd >= start && ymd <= end && calendar.col(row, names[weekday]) === "1") add(service, ymd);
      }
    }
  }
  const inWindow = new Set(window.map((w) => w.ymd));
  if (calendarDates) {
    for (const row of calendarDates.rows) {
      const service = calendarDates.col(row, "service_id");
      const ymd = calendarDates.col(row, "date");
      if (!inWindow.has(ymd)) continue;
      if (calendarDates.col(row, "exception_type") === "1") add(service, ymd);
      else active.get(service)?.delete(ymd);
    }
  }
  const weekdayOf = new Map(window.map((w) => [w.ymd, w.weekday]));
  const masks = new Map();
  for (const [service, dates] of active) {
    let mask = 0;
    for (const ymd of dates) mask |= 1 << weekdayOf.get(ymd);
    if (mask) masks.set(service, mask);
  }
  return masks;
}

export function buildFeedLinks({ operator, stops, trips, stopTimes, masks, bbox, timezone }) {
  const inBox = (lat, lng) => lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
  const stopInfo = new Map();
  for (const row of stops.rows) {
    const lat = Number(stops.col(row, "stop_lat"));
    const lng = Number(stops.col(row, "stop_lon"));
    const locationType = stops.col(row, "location_type");
    if (locationType && locationType !== "0") continue;
    if (!inBox(lat, lng)) continue;
    const tz = stops.col(row, "stop_timezone");
    if (timezone && tz && tz !== timezone) continue;
    stopInfo.set(stops.col(row, "stop_id"), { name: stops.col(row, "stop_name").trim(), lat, lng });
  }

  const tripMask = new Map();
  for (const row of trips.rows) {
    const mask = masks.get(trips.col(row, "service_id"));
    if (mask) tripMask.set(trips.col(row, "trip_id"), mask);
  }

  const calls = new Map();
  for (const row of stopTimes.rows) {
    const trip = stopTimes.col(row, "trip_id");
    if (!tripMask.has(trip)) continue;
    const stop = stopTimes.col(row, "stop_id");
    if (!stopInfo.has(stop)) continue;
    if (!calls.has(trip)) calls.set(trip, []);
    calls.get(trip).push({
      seq: Number(stopTimes.col(row, "stop_sequence")),
      stop,
      dep: toMinutes(stopTimes.col(row, "departure_time") || stopTimes.col(row, "arrival_time")),
      arr: toMinutes(stopTimes.col(row, "arrival_time") || stopTimes.col(row, "departure_time")),
      pickup: stopTimes.col(row, "pickup_type") !== "1",
      dropOff: stopTimes.col(row, "drop_off_type") !== "1",
    });
  }

  const links = new Map();
  for (const [trip, list] of calls) {
    list.sort((a, b) => a.seq - b.seq);
    const mask = tripMask.get(trip);
    for (let i = 0; i < list.length; i++) {
      if (!list[i].pickup) continue;
      for (let j = i + 1; j < list.length; j++) {
        if (!list[j].dropOff || list[j].stop === list[i].stop) continue;
        const key = `${list[i].stop}|${list[j].stop}`;
        const dep = list[i].dep % 1440;
        const dur = list[j].arr - list[i].dep;
        if (dur <= 0) continue;
        if (!links.has(key)) links.set(key, new Map());
        const byTime = links.get(key);
        const slot = `${dep}|${dur}`;
        byTime.set(slot, (byTime.get(slot) ?? 0) | mask);
      }
    }
  }
  return { operator, stopInfo, links };
}

export function mergeNetwork(feeds, meta) {
  const operators = feeds.map((f) => f.operator);
  const stops = [];
  const stopIndex = new Map();
  const indexOf = (opIdx, id, info) => {
    const key = `${opIdx}:${id}`;
    if (!stopIndex.has(key)) {
      stopIndex.set(key, stops.length);
      stops.push([info.name, Math.round(info.lat * 1e5) / 1e5, Math.round(info.lng * 1e5) / 1e5, opIdx]);
    }
    return stopIndex.get(key);
  };
  const links = {};
  feeds.forEach((feed, opIdx) => {
    for (const [key, byTime] of feed.links) {
      const [a, b] = key.split("|");
      const k = `${indexOf(opIdx, a, feed.stopInfo.get(a))}-${indexOf(opIdx, b, feed.stopInfo.get(b))}`;
      links[k] = [...byTime]
        .map(([slot, mask]) => {
          const [dep, dur] = slot.split("|").map(Number);
          return [dep, dur, mask];
        })
        .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    }
  });
  return { ...meta, operators, stops, links };
}
