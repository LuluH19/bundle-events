export const EVENT_CATEGORIES = [
  { id: "concert", label: "Concerts", keywords: ["concert"], ticketmaster: "music" },
  { id: "festival", label: "Festivals", keywords: ["festival"] },
  { id: "spectacle", label: "Spectacles", keywords: ["spectacle", "théâtre", "humour"], ticketmaster: "arts & theatre" },
  { id: "sport", label: "Sport", keywords: ["match", "sport", "course"], ticketmaster: "sports" },
  { id: "caritatif", label: "Caritatif", keywords: ["solidarité", "caritatif", "bénévolat"] },
  { id: "politique", label: "Débats & politique", keywords: ["débat", "conférence", "politique", "citoyen"] },
  { id: "expo", label: "Expos", keywords: ["exposition"] },
] as const;
