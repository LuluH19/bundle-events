export const busConfig = {
  maxAccessKm: 50,
  stopCandidates: 6,
  accessSpeedKmh: 50,
  accessDetourFactor: 1.3,
  operatorSites: {
    "BlaBlaCar Bus": "https://www.blablacar.fr/bus",
  } as Record<string, string>,
} as const;
