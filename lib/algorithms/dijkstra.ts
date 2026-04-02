import type {
  LatLng,
  TransportMode,
  DijkstraNode,
  DijkstraEdge,
  DijkstraPath,
} from "@/lib/types";
import { haversineDistance } from "./geodesic";

// Estimated speeds in km/h for duration estimation
const SPEED_KMH: Record<TransportMode, number> = {
  walking: 5,
  bus: 40,
  car: 80,
  train: 200,
  plane: 800,
};

// Maximum distance (km) for each mode to be considered viable
const MAX_DISTANCE: Record<TransportMode, number> = {
  walking: 5,
  bus: 100,
  car: 1000,
  train: 1500,
  plane: Infinity,
};

// Minimum distance (km) for each mode to make sense
const MIN_DISTANCE: Record<TransportMode, number> = {
  walking: 0,
  bus: 1,
  car: 2,
  train: 50,
  plane: 200,
};

function estimateDurationSeconds(
  distanceKm: number,
  mode: TransportMode
): number {
  const hours = distanceKm / SPEED_KMH[mode];
  let seconds = hours * 3600;

  // Add overhead for modes that require it
  if (mode === "plane") seconds += 3600; // 1h boarding/taxiing
  if (mode === "train") seconds += 900; // 15min station access

  return seconds;
}

function isViableMode(distanceKm: number, mode: TransportMode): boolean {
  return distanceKm >= MIN_DISTANCE[mode] && distanceKm <= MAX_DISTANCE[mode];
}

interface PriorityQueueItem {
  nodeId: string;
  cost: number;
}

function dijkstra(
  nodes: Map<string, DijkstraNode>,
  edges: DijkstraEdge[],
  startId: string,
  endId: string
): { path: string[]; totalCost: number; usedEdges: DijkstraEdge[] } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: DijkstraEdge } | null>();
  const visited = new Set<string>();

  // Build adjacency list
  const adjacency = new Map<string, DijkstraEdge[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from)!.push(edge);
  }

  for (const id of nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startId, 0);

  // Simple priority queue (sufficient for small graphs)
  const queue: PriorityQueueItem[] = [{ nodeId: startId, cost: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    if (current.nodeId === endId) break;

    const neighbors = adjacency.get(current.nodeId) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;

      const newCost = dist.get(current.nodeId)! + edge.weight;
      if (newCost < dist.get(edge.to)!) {
        dist.set(edge.to, newCost);
        prev.set(edge.to, { nodeId: current.nodeId, edge });
        queue.push({ nodeId: edge.to, cost: newCost });
      }
    }
  }

  if (dist.get(endId) === Infinity) return null;

  // Reconstruct path
  const path: string[] = [];
  const usedEdges: DijkstraEdge[] = [];
  let currentId: string | undefined = endId;

  while (currentId) {
    path.unshift(currentId);
    const prevEntry = prev.get(currentId);
    if (prevEntry) {
      usedEdges.unshift(prevEntry.edge);
      currentId = prevEntry.nodeId;
    } else {
      break;
    }
  }

  return { path, totalCost: dist.get(endId)!, usedEdges };
}

export function findOptimalRoute(
  departure: LatLng,
  hotel: LatLng,
  venue: LatLng,
  nearestStations: { departure: LatLng; hotel: LatLng; venue: LatLng },
  nearestAirports: { departure: LatLng; hotel: LatLng; venue: LatLng }
): DijkstraPath | null {
  const nodes = new Map<string, DijkstraNode>();
  const edges: DijkstraEdge[] = [];

  // Create nodes
  nodes.set("departure", { id: "departure", coords: departure, type: "departure", name: "Depart" });
  nodes.set("hotel", { id: "hotel", coords: hotel, type: "hotel", name: "Hotel" });
  nodes.set("venue", { id: "venue", coords: venue, type: "venue", name: "Evenement" });
  nodes.set("station-dep", { id: "station-dep", coords: nearestStations.departure, type: "station", name: "Gare depart" });
  nodes.set("station-hotel", { id: "station-hotel", coords: nearestStations.hotel, type: "station", name: "Gare hotel" });
  nodes.set("station-venue", { id: "station-venue", coords: nearestStations.venue, type: "station", name: "Gare evenement" });
  nodes.set("airport-dep", { id: "airport-dep", coords: nearestAirports.departure, type: "airport", name: "Aeroport depart" });
  nodes.set("airport-hotel", { id: "airport-hotel", coords: nearestAirports.hotel, type: "airport", name: "Aeroport hotel" });
  nodes.set("airport-venue", { id: "airport-venue", coords: nearestAirports.venue, type: "airport", name: "Aeroport evenement" });

  // Helper to add edges between two nodes for all viable modes
  function addDirectEdges(fromId: string, toId: string, modes: TransportMode[]) {
    const fromNode = nodes.get(fromId)!;
    const toNode = nodes.get(toId)!;
    const distKm = haversineDistance(fromNode.coords, toNode.coords);

    for (const mode of modes) {
      if (isViableMode(distKm, mode)) {
        edges.push({
          from: fromId,
          to: toId,
          mode,
          weight: estimateDurationSeconds(distKm, mode),
          distanceKm: distKm,
        });
      }
    }
  }

  // Direct routes (car, bus, walking) from departure to hotel
  addDirectEdges("departure", "hotel", ["car", "bus", "walking"]);

  // Direct routes from hotel to venue
  addDirectEdges("hotel", "venue", ["car", "bus", "walking"]);

  // Train: departure -> station -> station -> hotel
  addDirectEdges("departure", "station-dep", ["walking", "car", "bus"]);
  addDirectEdges("station-dep", "station-hotel", ["train"]);
  addDirectEdges("station-hotel", "hotel", ["walking", "car", "bus"]);

  // Train: hotel -> station -> station -> venue
  addDirectEdges("hotel", "station-hotel", ["walking", "car", "bus"]);
  addDirectEdges("station-hotel", "station-venue", ["train"]);
  addDirectEdges("station-venue", "venue", ["walking", "car", "bus"]);

  // Plane: departure -> airport -> airport -> hotel
  addDirectEdges("departure", "airport-dep", ["car", "bus"]);
  addDirectEdges("airport-dep", "airport-hotel", ["plane"]);
  addDirectEdges("airport-hotel", "hotel", ["car", "bus"]);

  // Plane: hotel -> airport -> airport -> venue
  addDirectEdges("hotel", "airport-hotel", ["car", "bus"]);
  addDirectEdges("airport-hotel", "airport-venue", ["plane"]);
  addDirectEdges("airport-venue", "venue", ["car", "bus"]);

  // Find optimal path departure -> hotel -> venue
  // We solve it as departure -> hotel, then hotel -> venue
  const legA = dijkstra(nodes, edges, "departure", "hotel");
  const legB = dijkstra(nodes, edges, "hotel", "venue");

  if (!legA || !legB) return null;

  const allNodes = [...legA.path, ...legB.path.slice(1)].map(
    (id) => nodes.get(id)!
  );
  const allEdges = [...legA.usedEdges, ...legB.usedEdges];

  return {
    nodes: allNodes,
    edges: allEdges,
    totalWeight: legA.totalCost + legB.totalCost,
  };
}

export function findNearestByDistance<T extends { coords: LatLng }>(
  point: LatLng,
  items: T[]
): T {
  let nearest = items[0];
  let minDist = Infinity;

  for (const item of items) {
    const dist = haversineDistance(point, item.coords);
    if (dist < minDist) {
      minDist = dist;
      nearest = item;
    }
  }

  return nearest;
}

export function findNearestByDistanceSorted<T extends { coords: LatLng }>(
  point: LatLng,
  items: T[],
  count: number = 3
): T[] {
  return [...items]
    .map((item) => ({ item, dist: haversineDistance(point, item.coords) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map((x) => x.item);
}
