export type Step = "home" | "routes" | "hotels" | "bundle";

export interface StepItem {
  id: Step;
  n: string;
  label: string;
}

export const STEPS: StepItem[] = [
  { id: "home", n: "01", label: "Trajet" },
  { id: "hotels", n: "02", label: "Hôtels" },
  { id: "routes", n: "03", label: "Itinéraires" },
  { id: "bundle", n: "04", label: "Bundle" },
];
