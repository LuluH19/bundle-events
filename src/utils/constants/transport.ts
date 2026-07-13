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
