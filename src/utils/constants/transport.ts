import { TransportMode } from "@/src/types";

export const MODE_META: Record<
  TransportMode,
  { label: string; provider: string; co2: "Bas" | "Moyen" | "Élevé" }
> = {
  train: { label: "Train", provider: "SNCF", co2: "Bas" },
  plane: { label: "Avion", provider: "Air France", co2: "Élevé" },
  car: { label: "Voiture personnelle", provider: "Itinéraire routier", co2: "Élevé" },
  bus: { label: "Bus", provider: "Autocar longue distance", co2: "Bas" },
  walking: { label: "À pied", provider: "Marche", co2: "Bas" },
};

export const MODE_COLOR: Record<TransportMode, string> = {
  train: "#1f5bea",
  bus: "#0b7f58",
  plane: "#7340e0",
  car: "#a66300",
  walking: "#5a5b78",
};

export const MODE_SHORT: Record<TransportMode, string> = {
  train: "Train",
  bus: "Bus",
  plane: "Avion",
  car: "Voiture",
  walking: "Marche",
};

export const CO2_GRAMS_PER_KM: Record<TransportMode, number> = {
  walking: 0,
  train: 3,
  bus: 30,
  car: 120,
  plane: 230,
};
