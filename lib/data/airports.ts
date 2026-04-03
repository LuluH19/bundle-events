import type { Airport } from "@/lib/types";

export const airports: Airport[] = [
  {
    id: "cdg",
    name: "Paris Charles de Gaulle",
    coords: { lat: 49.0097, lng: 2.5479 },
    iataCode: "CDG",
    city: "Paris",
  },
  {
    id: "ory",
    name: "Paris Orly",
    coords: { lat: 48.7262, lng: 2.3652 },
    iataCode: "ORY",
    city: "Paris",
  },
  {
    id: "lys",
    name: "Lyon Saint-Exupéry",
    coords: { lat: 45.7256, lng: 5.0811 },
    iataCode: "LYS",
    city: "Lyon",
  },
  {
    id: "mrs",
    name: "Marseille Provence",
    coords: { lat: 43.4393, lng: 5.2214 },
    iataCode: "MRS",
    city: "Marseille",
  },
  {
    id: "bod",
    name: "Bordeaux-Mérignac",
    coords: { lat: 44.8283, lng: -0.7153 },
    iataCode: "BOD",
    city: "Bordeaux",
  },
  {
    id: "lil",
    name: "Lille-Lesquin",
    coords: { lat: 50.5633, lng: 3.0897 },
    iataCode: "LIL",
    city: "Lille",
  },
  {
    id: "tls",
    name: "Toulouse-Blagnac",
    coords: { lat: 43.6293, lng: 1.3678 },
    iataCode: "TLS",
    city: "Toulouse",
  },
  {
    id: "nce",
    name: "Nice Côte d'Azur",
    coords: { lat: 43.6584, lng: 7.2159 },
    iataCode: "NCE",
    city: "Nice",
  },
  {
    id: "sxb",
    name: "Strasbourg-Entzheim",
    coords: { lat: 48.5383, lng: 7.6282 },
    iataCode: "SXB",
    city: "Strasbourg",
  },
  {
    id: "nte",
    name: "Nantes Atlantique",
    coords: { lat: 47.1532, lng: -1.6107 },
    iataCode: "NTE",
    city: "Nantes",
  },
];
