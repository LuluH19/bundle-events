import type { LatLng } from "@/lib/types";

export interface BusStation {
  id: string;
  name: string;
  coords: LatLng;
  city: string;
}

export const busStations: BusStation[] = [
  { id: "bus-paris-bercy", name: "Paris Bercy Seine (FlixBus)", coords: { lat: 48.8393, lng: 2.3829 }, city: "Paris" },
  { id: "bus-paris-gallieni", name: "Paris Gallieni", coords: { lat: 48.8636, lng: 2.4143 }, city: "Paris" },
  { id: "bus-paris-defense", name: "La Defense (Bus)", coords: { lat: 48.8920, lng: 2.2379 }, city: "Paris" },
  { id: "bus-lyon-perrache", name: "Lyon Perrache (Bus)", coords: { lat: 45.7488, lng: 4.8266 }, city: "Lyon" },
  { id: "bus-lyon-partdieu", name: "Lyon Part-Dieu (Bus)", coords: { lat: 45.7607, lng: 4.8601 }, city: "Lyon" },
  { id: "bus-marseille-st-charles", name: "Marseille Gare Routiere", coords: { lat: 43.3025, lng: 5.3815 }, city: "Marseille" },
  { id: "bus-bordeaux-st-jean", name: "Bordeaux Gare Routiere", coords: { lat: 44.8262, lng: -0.5558 }, city: "Bordeaux" },
  { id: "bus-lille-europe", name: "Lille Europe (Bus)", coords: { lat: 50.6385, lng: 3.0755 }, city: "Lille" },
  { id: "bus-toulouse-matabiau", name: "Toulouse Gare Routiere", coords: { lat: 43.6115, lng: 1.4540 }, city: "Toulouse" },
  { id: "bus-nice-vauban", name: "Nice Gare Routiere Vauban", coords: { lat: 43.7039, lng: 7.2609 }, city: "Nice" },
  { id: "bus-nice-aeroport", name: "Nice Aeroport (Bus)", coords: { lat: 43.6621, lng: 7.2100 }, city: "Nice" },
  { id: "bus-strasbourg", name: "Strasbourg Gare Routiere", coords: { lat: 48.5847, lng: 7.7350 }, city: "Strasbourg" },
  { id: "bus-nantes", name: "Nantes Gare Routiere", coords: { lat: 47.2170, lng: -1.5420 }, city: "Nantes" },
  { id: "bus-rennes", name: "Rennes Gare Routiere", coords: { lat: 48.1040, lng: -1.6720 }, city: "Rennes" },
  { id: "bus-montpellier", name: "Montpellier Sabines (Bus)", coords: { lat: 43.6040, lng: 3.8800 }, city: "Montpellier" },
  { id: "bus-grenoble", name: "Grenoble Gare Routiere", coords: { lat: 45.1912, lng: 5.7148 }, city: "Grenoble" },
  { id: "bus-dijon", name: "Dijon Gare Routiere", coords: { lat: 47.3234, lng: 5.0272 }, city: "Dijon" },
];
