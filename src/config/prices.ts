export const pricesConfig = {
  quoteCacheTtl: 30 * 60 * 1000, // 30 minutes
  /**
   * Trainline journey-search sits behind DataDome, which answers 403 to server
   * IPs (Vercel, curl). Off unless `TRAINLINE_LIVE_PRICES=true`: the route then
   * goes straight to the SNCF fare grids instead of a wasted call per request.
   */
  trainlineLivePrices: process.env.TRAINLINE_LIVE_PRICES === "true",
  /** Set of stations present in the SNCF fare grids (changes a few times a year). */
  tariffStationsTtl: 24 * 60 * 60 * 1000, // 24 hours
  fuelCacheTtl: 24 * 60 * 60 * 1000, // 24 hours
  timeoutMs: 8000,
  sncfOpenDataUrl: "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets",
  fuelUrl:
    "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records",
  /** Used when the fuel API is unreachable (€/L, average SP95/gazole). */
  fallbackFuelPrice: 1.85,
  carConsumptionL100: 6.5,
  /** Average French motorway toll (€/km), applied to the car distance beyond `tollFreeKm`. */
  tollPerKm: 0.09,
  tollFreeKm: 50,
  /** Max distance (km) between a leg end and the SNCF station used for the tariff lookup. */
  stationRadiusKm: 15,
  stationCandidates: 5,
  /**
   * On a multimodal plane/bus trip, ignore shorter rail hops (airport shuttles, RER)
   * for Trainline deep-links and fares — they are not sold as long-distance tickets.
   */
  minBookableTrainKm: 80,
  minBookableBusKm: 30,
} as const;
