import { EngineCandidate, ExtractedInput, MemoryResult } from "@/lib/types";

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function detectTimeGap(lastSeenTime: string): { label: string; weight: number } {
  const value = lastSeenTime.toLowerCase();

  if (/just now/.test(value)) return { label: "very short", weight: 1 };
  if (/\b\d{1,2}(?::\d{2})?\s?(am|pm)\b/.test(value)) return { label: "medium", weight: 3 };
  if (/this morning|earlier today/.test(value)) return { label: "medium", weight: 3 };
  if (/this afternoon|this evening|tonight/.test(value)) return { label: "short", weight: 2 };
  if (/last night/.test(value)) return { label: "long", weight: 4 };
  if (/yesterday/.test(value)) return { label: "long", weight: 5 };

  return { label: "unclear", weight: 4 };
}

function detectTransitionMoments(input: ExtractedInput): string[] {
  const text = input.freeText.toLowerCase();
  const moments: string[] = [];

  if (hasAny(text, ["left home", "left the house", "rushed out", "headed out", "went out", "out the door"])) {
    moments.push("Leaving home");
  }
  if (hasAny(text, ["changed clothes", "got dressed", "jacket", "coat", "hoodie", "laundry", "hamper"])) {
    moments.push("Changing clothes");
  }
  if (hasAny(text, ["drove", "car", "garage", "parking"])) {
    moments.push("Driving");
  }
  if (hasAny(text, ["shower", "showered", "bath", "bathroom", "washed my hands", "sink"])) {
    moments.push("Showering or washing");
  }
  if (hasAny(text, ["work", "office", "desk", "meeting", "coworker"])) {
    moments.push("Working");
  }
  if (hasAny(text, ["airport", "flight", "train", "bus", "hotel", "travel", "trip"])) {
    moments.push("Traveling");
  }

  return moments;
}

function isRecentWithin24Hours(label: string): boolean {
  return label === "very short" || label === "short" || label === "medium";
}

function hasStrongTransition(moments: string[]): boolean {
  return moments.some((moment) =>
    ["Leaving home", "Changing clothes", "Driving", "Traveling"].includes(moment)
  );
}

function pushCandidate(
  collection: EngineCandidate[],
  location: string,
  weight: number,
  reason: string,
  hiddenSpots: string[],
  tags: string[]
): void {
  collection.push({
    location,
    weight,
    reason,
    hiddenSpots,
    tags
  });
}

export function memoryEngine(input: ExtractedInput): MemoryResult {
  const candidates: EngineCandidate[] = [];
  const timeGap = detectTimeGap(input.lastSeenTime);
  const transitionMoments = detectTransitionMoments(input);
  const lowerText = input.freeText.toLowerCase();

  const timeline = [
    `You last clearly remember the ${input.itemType.toLowerCase()} in ${input.lastSeenLocation} ${input.lastSeenTime.toLowerCase()}.`,
    ...input.placesVisited.map(
      (place, index) =>
        `After that, your route moved to ${place}${index === 0 ? ", which creates the first strong transition point." : "."}`
    )
  ];

  const routeSummary =
    input.placesVisited.length > 0
      ? input.placesVisited.map((place, index) =>
          index === 0 ? `First stop after last seen: ${place}` : `Later stop: ${place}`
        )
      : ["No clear route after the last seen location was detected."];

  pushCandidate(
    candidates,
    input.lastSeenLocation,
    10,
    "The last confirmed location is still the strongest memory anchor.",
    ["Under nearby items", "Beside chargers or clutter", "At the nearest furniture edge"],
    ["last-seen", "familiar"]
  );

  if (input.placesVisited[0]) {
    pushCandidate(
      candidates,
      `${input.lastSeenLocation} to ${input.placesVisited[0]} transition`,
      9,
      "The first move after the last clear memory is where many items get carried and set down by accident.",
      ["Doorway ledge", "Bag opening", "Floor near the path out"],
      ["transition", "threshold"]
    );
  }

  input.placesVisited.forEach((place, index) => {
    pushCandidate(
      candidates,
      place,
      Math.max(7 - index, 4),
      "This stop came after the last clear memory, so the item may have traveled with you before being released.",
      ["Chair seat", "Countertop", "Under nearby papers or clothing"],
      ["route", "familiar"]
    );
  });

  pushCandidate(
    candidates,
    "Pockets, bags, and enclosed carry spots",
    8,
    "Small and important items often survive the route by staying enclosed rather than visible.",
    ["Jacket pocket", "Bag organizer", "Inside a zip compartment"],
    ["enclosed", "fabric"]
  );

  if (hasAny(lowerText, ["car", "drove", "garage", "parking"]) || input.placesVisited.some((place) => /car|garage/i.test(place))) {
    pushCandidate(
      candidates,
      "Car seats, console, and floor gaps",
      8,
      "Driving adds a high-risk handoff where objects slide out of sight.",
      ["Between seat and console", "Under the seat rail", "Door pocket"],
      ["car", "transition", "enclosed"]
    );
  }

  if (hasAny(lowerText, ["laundry", "hamper", "changed clothes", "jacket", "coat", "hoodie"])) {
    pushCandidate(
      candidates,
      "Laundry area, hamper, and clothing pockets",
      8,
      "Clothing changes create a strong memory break and often trap items in fabric.",
      ["Hamper corner", "Pocket lining", "Under folded clothes"],
      ["laundry", "fabric", "enclosed"]
    );
  }

  if (hasAny(lowerText, ["shower", "bathroom", "sink", "washed my hands"])) {
    pushCandidate(
      candidates,
      "Bathroom sink, counter, and towel area",
      7,
      "Washing and shower routines create a pause where items get set down in small, covered spaces.",
      ["Behind toiletries", "Near the towel fold", "Beside the faucet"],
      ["water", "familiar", "covered"]
    );
  }

  if (hasAny(lowerText, ["work", "office", "desk", "meeting"])) {
    pushCandidate(
      candidates,
      "Work bag, desk edge, and chair area",
      7,
      "Work transitions often hide items right as attention switches to the next task.",
      ["Laptop sleeve", "Under papers", "Chair seat or under the desk"],
      ["work", "wood", "covered"]
    );
  }

  const handoffRisk =
    input.placesVisited.length === 0 && transitionMoments.length === 0
      ? "Low movement after the last clear memory keeps the search close to the last confirmed spot."
      : "The route includes one or more transition moments, so handoff zones matter almost as much as the last seen location.";

  const extraWeight = Math.min(timeGap.weight, 5);
  candidates.forEach((candidate) => {
    if (candidate.tags.includes("last-seen")) {
      candidate.weight += Math.max(0, 2 - Math.floor(extraWeight / 3));
    }

    if (candidate.tags.includes("transition") && extraWeight >= 3) {
      candidate.weight += 0.75;
    }

    if (candidate.tags.includes("enclosed") && extraWeight >= 4) {
      candidate.weight += 1;
    }

    if (candidate.tags.includes("transition")) {
      candidate.weight = Number((candidate.weight * 0.75).toFixed(2));
    }
  });

  if (isRecentWithin24Hours(timeGap.label) && !hasStrongTransition(transitionMoments)) {
    const lastSeenCandidate = candidates.find((candidate) => candidate.tags.includes("last-seen"));
    if (lastSeenCandidate) {
      lastSeenCandidate.weight += 4;
      lastSeenCandidate.reason =
        "The item was seen recently and there were no strong transition events, so the last confirmed location deserves extra trust.";
    }
  }

  return {
    timeline,
    transitionMoments,
    routeSummary,
    timeGapLabel: timeGap.label,
    handoffRisk,
    candidates
  };
}
