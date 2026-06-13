export type Step = "home" | "routes" | "hotels" | "bundle";

export interface StepItem {
  id: Step;
  n: string;
  label: string;
}

export const STEPS: StepItem[] = [
  { id: "home", n: "01", label: "Trajet" },
  { id: "routes", n: "02", label: "Itinéraires" },
  { id: "hotels", n: "03", label: "Hôtels" },
  { id: "bundle", n: "04", label: "Bundle" },
];
