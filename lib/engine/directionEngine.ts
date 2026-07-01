import {
  Direction,
  DirectionResult,
  EngineInput,
  HeuristicSignal,
  HeuristicWeights,
  ObjectProfileResult,
  SceneProfileResult
} from "@/lib/engine/types";

const DIRECTIONS: Direction[] = [
  "North",
  "Northeast",
  "East",
  "Southeast",
  "South",
  "Southwest",
  "West",
  "Northwest"
];

function hashValue(seed: string): number {
  return seed.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 17), 0);
}

function placeBias(place: string): Partial<Record<Direction, number>> {
  const value = place.toLowerCase();

  if (/bedroom|living room|home/.test(value)) {
    return { East: 8, Southeast: 6, Northeast: 3 };
  }
  if (/bathroom|kitchen/.test(value)) {
    return { South: 7, Southwest: 5, East: 2 };
  }
  if (/car|garage|parking/.test(value)) {
    return { West: 8, Northwest: 4, Southwest: 3 };
  }
  if (/office|work|school/.test(value)) {
    return { North: 7, Northeast: 5, West: 2 };
  }

  return { East: 3, North: 2 };
}

function itemBias(item: string): Partial<Record<Direction, number>> {
  const value = item.toLowerCase();

  if (/airpods|earbuds|phone|glasses/.test(value)) {
    return { East: 5, Southeast: 4 };
  }
  if (/ring|jewelry/.test(value)) {
    return { South: 5, Southwest: 5 };
  }
  if (/passport|documents|wallet/.test(value)) {
    return { Northeast: 5, North: 4 };
  }

  return { West: 2, East: 2 };
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function buildDirectionTags(
  input: EngineInput,
  objectProfile: ObjectProfileResult,
  sceneProfile: SceneProfileResult,
  heuristicWeights: HeuristicWeights[]
): string[] {
  const tags: string[] = [];
  const place = input.place.toLowerCase();
  const story = input.story.toLowerCase();
  const scene = sceneProfile.profile;
  const environmentTotals = heuristicWeights.reduce<Record<string, number>>((totals, heuristic) => {
    Object.entries(heuristic.environmentWeights).forEach(([key, value]) => {
      totals[key] = (totals[key] ?? 0) + value * heuristic.confidence;
    });
    return totals;
  }, {});

  if (scene.lowAreas?.length) {
    tags.push("low area");
  }
  if (scene.highAreas?.length) {
    tags.push("high area");
  }
  if (scene.wetAreas?.length && hasAny(`${place} ${story}`, ["bathroom", "sink", "shower", "water", "hotel", "gym", "kitchen"])) {
    tags.push("wet area");
  }
  if (
    scene.electronicAreas.length &&
    (/phone|airpods|earbuds|headphones/i.test(input.item) || hasAny(story, ["charging", "charger", "device", "desk", "outlet"]))
  ) {
    tags.push("electronic area");
  }
  if (scene.commonContainers.length) {
    tags.push("storage area", "container zone");
  }
  if (scene.hiddenAreas.length) {
    tags.push("hidden corner");
  }
  if (
    scene.transitionPoints.some((point) =>
      /packing|checking out|moving luggage|leaving|boarding|security|meeting|coming in|unloading/i.test(point)
    )
  ) {
    tags.push("transition path");
  }
  if (
    scene.zones.some((zone) => /entry|check-in|lobby|front desk/i.test(zone)) ||
    scene.transitionPoints.some((point) => /coming home|checking in|arriving/i.test(point))
  ) {
    tags.push("entry zone");
  }
  if (
    scene.zones.some((zone) => /checkout path|exit path/i.test(zone)) ||
    scene.transitionPoints.some((point) => /checking out|leaving room|boarding|standing up/i.test(point))
  ) {
    tags.push("exit path");
  }
  if (hasAny(place, ["home", "bedroom", "living room", "kitchen", "hotel"])) {
    tags.push("warm area");
  }
  if (objectProfile.key === "documents" || hasAny(`${place} ${story}`, ["passport", "document", "documents", "safe", "desk papers", "sleeve"])) {
    tags.push("document zone");
  }

  Object.entries(environmentTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .forEach(([key]) => {
      const mapped =
        key === "lowArea"
          ? "low area"
          : key === "highArea"
            ? "high area"
            : key === "wetArea"
              ? "wet area"
              : key === "electronicArea"
                ? "electronic area"
                : key === "storageArea"
                  ? "storage area"
                  : key === "containerZone"
                    ? "container zone"
                    : key === "transitionPath"
                      ? "transition path"
                      : key === "entryZone"
                        ? "entry zone"
                        : key === "exitPath"
                          ? "exit path"
                          : key === "hiddenCorner"
                            ? "hidden corner"
                            : key === "warmArea"
                              ? "warm area"
                              : key === "documentZone"
                                ? "document zone"
                                : null;

      if (mapped) {
        tags.push(mapped);
      }
    });

  return tags.filter((tag, index) => tags.indexOf(tag) === index).slice(0, 6);
}

export function directionEngine(
  input: EngineInput,
  heuristicSignals: HeuristicSignal[],
  heuristicWeights: HeuristicWeights[],
  objectProfile: ObjectProfileResult,
  sceneProfile: SceneProfileResult
): DirectionResult[] {
  const scores = new Map<Direction, { score: number; tags: string[] }>(
    DIRECTIONS.map((direction) => [direction, { score: 50, tags: [] }])
  );

  heuristicSignals.forEach((signal) => {
    const signalScale =
      signal.source === "object" || signal.source === "scene"
        ? 0.35
        : signal.source === "timeline" || signal.source === "memory"
          ? 0.6
          : 0.5;

    signal.directions.forEach((direction) => {
      const entry = scores.get(direction);
      if (!entry) {
        return;
      }

      entry.score += Number((signal.weight * signalScale).toFixed(2));
    });
  });

  heuristicWeights.forEach((heuristic) => {
    Object.entries(heuristic.directionWeights).forEach(([direction, weight]) => {
      const entry = scores.get(direction as Direction);
      if (!entry || typeof weight !== "number") {
        return;
      }

      const bounded = Math.min(weight, 12) * Math.min(Math.max(heuristic.confidence, 0.3), 0.9) * 0.8;
      entry.score += Number(bounded.toFixed(2));
    });
  });

  const combinedPlaceBias = placeBias(input.place);
  Object.entries(combinedPlaceBias).forEach(([direction, bonus]) => {
    const entry = scores.get(direction as Direction);
    if (entry && bonus) {
      entry.score += bonus;
    }
  });

  const combinedItemBias = itemBias(input.item);
  Object.entries(combinedItemBias).forEach(([direction, bonus]) => {
    const entry = scores.get(direction as Direction);
    if (entry && bonus) {
      entry.score += bonus;
    }
  });

  const seed = hashValue(`${input.story}|${input.time}|${input.date ?? ""}`);
  DIRECTIONS.forEach((direction, index) => {
    const entry = scores.get(direction);
    if (!entry) {
      return;
    }

    const variation = ((seed + index * 11) % 7) - 3;
    entry.score += variation;
  });

  const cleanTags = buildDirectionTags(input, objectProfile, sceneProfile, heuristicWeights);

  return Array.from(scores.entries())
    .map(([direction, entry]) => ({
      direction,
      score: Number(entry.score.toFixed(1)),
      tags: cleanTags
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}
