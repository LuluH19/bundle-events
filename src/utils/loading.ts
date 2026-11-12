export function loadingCopy(roundTrip: boolean, withHotel: boolean) {
  const messages = ["On cherche ton trajet aller…"];
  if (withHotel) messages.push("On trouve un hôtel près de la salle…");
  if (roundTrip) messages.push("On cherche ton trajet retour…");
  return { title: roundTrip ? "On prépare ton aller-retour" : "On prépare ton aller simple", messages };
}
