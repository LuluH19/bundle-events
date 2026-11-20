import { NextRequest } from "next/server";
import { findEventCategory, searchEventIdeas, searchEventsAndVenues } from "@/src/services/event-search";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const cities = (sp.get("cities") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (cities.length > 0) {
    const category = findEventCategory(sp.get("category"));
    return Response.json({ venues: await searchEventIdeas(cities, category), eventSource: null });
  }

  const q = sp.get("q")?.trim() ?? "";
  if (!q) return Response.json({ venues: [], eventSource: null });
  return Response.json(await searchEventsAndVenues(q));
}
