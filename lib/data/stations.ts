import type { Station } from "@/lib/types";

export const stations: Station[] = [
  {
    id: "gare-paris-lyon",
    name: "Paris Gare de Lyon",
    coords: { lat: 48.8443, lng: 2.3743 },
    sncfId: "stop_area:SNCF:87686006",
  },
  {
    id: "gare-paris-nord",
    name: "Paris Gare du Nord",
    coords: { lat: 48.8809, lng: 2.3553 },
    sncfId: "stop_area:SNCF:87271007",
  },
  {
    id: "gare-paris-montparnasse",
    name: "Paris Montparnasse",
    coords: { lat: 48.8408, lng: 2.3188 },
    sncfId: "stop_area:SNCF:87391003",
  },
  {
    id: "gare-lyon-part-dieu",
    name: "Lyon Part-Dieu",
    coords: { lat: 45.7606, lng: 4.8593 },
    sncfId: "stop_area:SNCF:87723197",
  },
  {
    id: "gare-lyon-perrache",
    name: "Lyon Perrache",
    coords: { lat: 45.7485, lng: 4.8267 },
    sncfId: "stop_area:SNCF:87722025",
  },
  {
    id: "gare-marseille-st-charles",
    name: "Marseille Saint-Charles",
    coords: { lat: 43.3028, lng: 5.3803 },
    sncfId: "stop_area:SNCF:87751008",
  },
  {
    id: "gare-bordeaux-st-jean",
    name: "Bordeaux Saint-Jean",
    coords: { lat: 44.8256, lng: -0.5561 },
    sncfId: "stop_area:SNCF:87581009",
  },
  {
    id: "gare-lille-flandres",
    name: "Lille Flandres",
    coords: { lat: 50.6365, lng: 3.0698 },
    sncfId: "stop_area:SNCF:87286005",
  },
  {
    id: "gare-lille-europe",
    name: "Lille Europe",
    coords: { lat: 50.6389, lng: 3.0758 },
    sncfId: "stop_area:SNCF:87223263",
  },
  {
    id: "gare-toulouse-matabiau",
    name: "Toulouse Matabiau",
    coords: { lat: 43.6113, lng: 1.4534 },
    sncfId: "stop_area:SNCF:87611004",
  },
  {
    id: "gare-nice-ville",
    name: "Nice Ville",
    coords: { lat: 43.7046, lng: 7.2619 },
    sncfId: "stop_area:SNCF:87756056",
  },
  {
    id: "gare-strasbourg",
    name: "Strasbourg",
    coords: { lat: 48.5851, lng: 7.7346 },
    sncfId: "stop_area:SNCF:87212027",
  },
  {
    id: "gare-nantes",
    name: "Nantes",
    coords: { lat: 47.2173, lng: -1.5418 },
    sncfId: "stop_area:SNCF:87481002",
  },
  {
    id: "gare-rennes",
    name: "Rennes",
    coords: { lat: 48.1035, lng: -1.6723 },
    sncfId: "stop_area:SNCF:87471003",
  },
  {
    id: "gare-montpellier",
    name: "Montpellier Saint-Roch",
    coords: { lat: 43.6047, lng: 3.8807 },
    sncfId: "stop_area:SNCF:87773002",
  },
];
