export type Step = "home" | "trip" | "book";

export interface StepItem {
  id: Step;
  label: string;
  segment: string;
}

export const STEPS: StepItem[] = [
  { id: "home", label: "Recherche", segment: "" },
  { id: "trip", label: "Ton voyage", segment: "voyage" },
  { id: "book", label: "Réserver", segment: "reserver" },
];
