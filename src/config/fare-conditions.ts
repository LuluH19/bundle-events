export const fareConditionsConfig = {
  transport: {
    train: {
      carrier: "SNCF",
      url: "https://www.sncf-connect.com/aide/conditions-d-echange-d-annulation-et-de-remboursement-de-mon-billet-de-train",
    },
    bus: {
      carrier: "FlixBus",
      url: "https://www.flixbus.fr/services/modifier-annuler-reservation",
    },
  },
  hotelBoardLabels: {
    RO: "Chambre seule",
    BI: "Petit-déjeuner inclus",
    BB: "Petit-déjeuner inclus",
    HB: "Demi-pension",
    BD: "Demi-pension",
    FB: "Pension complète",
    AI: "Tout compris",
    TI: "Tout compris",
  } as Record<string, string>,
} as const;
