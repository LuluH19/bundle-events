import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { activeWeekdayMasks, buildFeedLinks, mergeNetwork, readTable } from "./lib/bus-network.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(resolve(root, "src/config/bus-gtfs.json"), "utf8"));

async function download(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

const wanted = ["stops.txt", "trips.txt", "stop_times.txt", "calendar.txt", "calendar_dates.txt"];

const today = new Date();
const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
const to = new Date(from.getTime() + (config.windowDays - 1) * 86400000);

const feeds = [];
for (const feed of config.feeds) {
  try {
    const files = unzipSync(await download(feed.url), { filter: (f) => wanted.includes(f.name) });
    const table = (name) => (files[name] ? readTable(strFromU8(files[name])) : null);
    const masks = activeWeekdayMasks(table("calendar.txt"), table("calendar_dates.txt"), from, config.windowDays);
    const built = buildFeedLinks({
      operator: feed.operator,
      stops: table("stops.txt"),
      trips: table("trips.txt"),
      stopTimes: table("stop_times.txt"),
      masks,
      bbox: config.bbox,
      timezone: config.timezone,
    });
    console.log(`${feed.operator}: ${built.stopInfo.size} stops, ${built.links.size} links`);
    feeds.push(built);
  } catch (err) {
    console.error(`${feed.operator}: skipped (${err.message})`);
  }
}

if (feeds.length === 0) {
  console.error("No feed could be processed, keeping the existing network file.");
  process.exit(1);
}

const network = mergeNetwork(feeds, {
  generatedAt: new Date().toISOString(),
  validFrom: from.toISOString().slice(0, 10),
  validTo: to.toISOString().slice(0, 10),
});
const usedStops = new Set(Object.keys(network.links).flatMap((k) => k.split("-").map(Number)));
const remap = new Map();
const stops = [];
network.stops.forEach((s, i) => {
  if (usedStops.has(i)) {
    remap.set(i, stops.length);
    stops.push(s);
  }
});
const links = Object.fromEntries(
  Object.entries(network.links).map(([k, v]) => {
    const [a, b] = k.split("-").map(Number);
    return [`${remap.get(a)}-${remap.get(b)}`, v];
  })
);

const out = resolve(root, config.output);
await writeFile(out, JSON.stringify({ ...network, stops, links }) + "\n");
console.log(`Wrote ${stops.length} stops and ${Object.keys(links).length} links to ${config.output}`);
