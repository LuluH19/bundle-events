import { describe, expect, it } from "vitest";
import {
  addMinutesToIso,
  diffMinutesIso,
  getLegTiming,
  resolveTimedSegments,
} from "@/src/utils/algorithms/timed-segments";
import { timeOf } from "@/src/utils/format";
import type { RouteOption, TrainJourney } from "@/src/types";

describe("addMinutesToIso & diffMinutesIso", () => {
  it("ajoute des minutes à un ISO sans décalage de fuseau", () => {
    expect(addMinutesToIso("2026-11-20T08:30:00", 45)).toBe("2026-11-20T09:15:00");
    expect(addMinutesToIso("2026-11-20T08:30:00", -30)).toBe("2026-11-20T08:00:00");
  });

  it("calcule la différence en minutes entre deux ISO", () => {
    expect(diffMinutesIso("2026-11-20T10:30:00", "2026-11-20T11:15:00")).toBe(45);
    expect(diffMinutesIso("2026-11-20T08:00:00", "2026-11-20T08:00:00")).toBe(0);
  });
});

describe("timeOf", () => {
  it("extrait l'heure exacte HH:mm d'un ISO", () => {
    expect(timeOf("2026-11-20T08:30:00")).toBe("08:30");
    expect(timeOf("2026-11-20T14:45")).toBe("14:45");
  });

  it("préserve un format HH:mm déjà formaté", () => {
    expect(timeOf("09:15")).toBe("09:15");
  });
});

describe("resolveTimedSegments & getLegTiming", () => {
  const dummyCoords = { lat: 48.8566, lng: 2.3522 };

  it("calcule l'heure de départ, d'arrivée et les correspondances pour un trajet train SNCF multi-segments", () => {
    const journey: TrainJourney = {
      departureAt: "2026-11-20T08:30:00",
      arrivalAt: "2026-11-20T12:00:00",
      transfers: 1,
      trains: [
        {
          name: "TGV INOUI",
          number: "6601",
          departureStation: "Paris Gare de Lyon",
          arrivalStation: "Lyon Part-Dieu",
          departureTime: "2026-11-20T08:30:00",
          arrivalTime: "2026-11-20T10:30:00",
          waitTimeAfterMinutes: 30,
        },
        {
          name: "TER",
          number: "17755",
          departureStation: "Lyon Part-Dieu",
          arrivalStation: "Grenoble",
          departureTime: "2026-11-20T11:00:00",
          arrivalTime: "2026-11-20T12:00:00",
        },
      ],
    };

    const option: RouteOption = {
      id: "train-1",
      mode: "train",
      durationMin: 230,
      distanceKm: 550,
      price: 65,
      route: {
        totalDistanceKm: 550,
        totalDurationMinutes: 230,
        isMultimodal: true,
        segments: [
          {
            from: { name: "Domicile", coords: dummyCoords },
            to: { name: "Paris Gare de Lyon", coords: dummyCoords },
            mode: "walking",
            coordinates: [],
            distanceKm: 1.5,
            durationMinutes: 20,
          },
          {
            from: { name: "Paris Gare de Lyon", coords: dummyCoords },
            to: { name: "Grenoble", coords: dummyCoords },
            mode: "train",
            coordinates: [],
            distanceKm: 540,
            durationMinutes: 200,
          },
          {
            from: { name: "Grenoble", coords: dummyCoords },
            to: { name: "Alpexpo", coords: dummyCoords },
            mode: "walking",
            coordinates: [],
            distanceKm: 1,
            durationMinutes: 10,
          },
        ],
      },
    };

    const segments = resolveTimedSegments({
      option,
      journey,
      date: "2026-11-20",
    });

    // 1 access walk + 2 trains + 1 access walk = 4 segments
    expect(segments.length).toBe(4);

    // Segment 0: Marche jusqu'à la gare
    expect(segments[0].mode).toBe("walking");
    expect(timeOf(segments[0].departureTime!)).toBe("08:10");
    expect(timeOf(segments[0].arrivalTime!)).toBe("08:30");

    // Segment 1: Premier train TGV
    expect(segments[1].mode).toBe("train");
    expect(segments[1].from.name).toBe("Paris Gare de Lyon");
    expect(segments[1].to.name).toBe("Lyon Part-Dieu");
    expect(timeOf(segments[1].departureTime!)).toBe("08:30");
    expect(timeOf(segments[1].arrivalTime!)).toBe("10:30");
    expect(segments[1].waitTimeMinutes).toBe(30); // 30 min d'attente à Lyon Part-Dieu

    // Segment 2: Deuxième train TER
    expect(segments[2].mode).toBe("train");
    expect(segments[2].from.name).toBe("Lyon Part-Dieu");
    expect(segments[2].to.name).toBe("Grenoble");
    expect(timeOf(segments[2].departureTime!)).toBe("11:00");
    expect(timeOf(segments[2].arrivalTime!)).toBe("12:00");

    // Segment 3: Marche jusqu'à la salle
    expect(segments[3].mode).toBe("walking");
    expect(timeOf(segments[3].departureTime!)).toBe("12:00");
    expect(timeOf(segments[3].arrivalTime!)).toBe("12:10");

    // getLegTiming
    const timing = getLegTiming({ option, journey, date: "2026-11-20" });
    expect(timeOf(timing.departureTime!)).toBe("08:10");
    expect(timeOf(timing.arrivalTime!)).toBe("12:10");
    expect(timing.departureDate).toBe("2026-11-20");
    expect(timing.totalWaitMinutes).toBe(30);
  });

  it("gère l'aller et le retour avec dates et heures de départ distinctes", () => {
    const carOption: RouteOption = {
      id: "car-1",
      mode: "car",
      durationMin: 120,
      distanceKm: 150,
      price: 25,
      route: {
        totalDistanceKm: 150,
        totalDurationMinutes: 120,
        isMultimodal: false,
        segments: [
          {
            from: { name: "Paris", coords: dummyCoords },
            to: { name: "Orléans", coords: dummyCoords },
            mode: "car",
            coordinates: [],
            distanceKm: 150,
            durationMinutes: 120,
          },
        ],
      },
    };

    // Aller: arriver avant 18:00 -> départ à 16:00
    const outTiming = getLegTiming({
      option: carOption,
      date: "2026-11-20",
      arriveBy: "18:00",
      isReturn: false,
    });
    expect(outTiming.departureDate).toBe("2026-11-20");
    expect(timeOf(outTiming.departureTime!)).toBe("16:00");
    expect(timeOf(outTiming.arrivalTime!)).toBe("18:00");
    expect(outTiming.segments[0].departureTime).toBeDefined();
    expect(outTiming.segments[0].arrivalTime).toBeDefined();

    // Retour: partir après 14:00 -> départ à 14:00, arrivée à 16:00
    const retTiming = getLegTiming({
      option: carOption,
      date: "2026-11-22",
      leaveAfter: "14:00",
      isReturn: true,
    });
    expect(retTiming.departureDate).toBe("2026-11-22");
    expect(timeOf(retTiming.departureTime!)).toBe("14:00");
    expect(timeOf(retTiming.arrivalTime!)).toBe("16:00");
  });

  it("indique le temps d'attente en correspondance sur un trajet multimodal sans API live", () => {
    const multiOption: RouteOption = {
      id: "multi-1",
      mode: "bus",
      durationMin: 180,
      distanceKm: 120,
      price: 15,
      route: {
        totalDistanceKm: 120,
        totalDurationMinutes: 180,
        isMultimodal: true,
        segments: [
          {
            from: { name: "Arrêt A", coords: dummyCoords },
            to: { name: "Gare routière B", coords: dummyCoords },
            mode: "bus",
            coordinates: [],
            distanceKm: 60,
            durationMinutes: 80,
          },
          {
            from: { name: "Gare routière B", coords: dummyCoords },
            to: { name: "Destination C", coords: dummyCoords },
            mode: "bus",
            coordinates: [],
            distanceKm: 60,
            durationMinutes: 85,
          },
        ],
      },
    };

    const segments = resolveTimedSegments({
      option: multiOption,
      date: "2026-11-20",
    });

    expect(segments.length).toBe(2);
    // Segment 0
    expect(timeOf(segments[0].departureTime!)).toBe("08:00");
    expect(timeOf(segments[0].arrivalTime!)).toBe("09:20");
    expect(segments[0].waitTimeMinutes).toBe(15); // 15 min d'attente en correspondance

    // Segment 1 démarre après la correspondance (09:20 + 15m = 09:35)
    expect(timeOf(segments[1].departureTime!)).toBe("09:35");
    expect(timeOf(segments[1].arrivalTime!)).toBe("11:00");
  });
});

