export interface NavitiaJourneySummary {
  nb_transfers?: number;
  duration?: number;
}

export function representativeJourneyIndex(journeys: NavitiaJourneySummary[] | undefined): number {
  if (!journeys?.length) return -1;
  let best = 0;
  journeys.forEach((j, i) => {
    const b = journeys[best];
    const jt = j.nb_transfers ?? Infinity;
    const bt = b.nb_transfers ?? Infinity;
    if (jt < bt || (jt === bt && (j.duration ?? Infinity) < (b.duration ?? Infinity))) best = i;
  });
  return best;
}

export function geometrySearchDatetime(now: Date): string {
  const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T080000`;
}
