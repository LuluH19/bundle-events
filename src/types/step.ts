export type Step = "home" | "hotels" | "routes-outbound" | "routes-return" | "bundle";

export interface StepItem {
  id: Step;
  n: string;
  label: string;
}

export const STEPS: StepItem[] = [
  { id: "home", n: "01", label: "Trajet" },
  { id: "hotels", n: "02", label: "Hôtels" },
  { id: "routes-outbound", n: "03", label: "Aller" },
  { id: "routes-return", n: "04", label: "Retour" },
  { id: "bundle", n: "05", label: "Bundle" },
];
