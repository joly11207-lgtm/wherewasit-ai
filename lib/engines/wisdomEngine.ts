import { EngineCandidate, ExtractedInput, TimeHints, WisdomResult } from "@/lib/types";

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function directionFromSeed(seed: string): string {
  const directions = ["East", "Southeast", "Northwest", "North", "South", "West"];
  const sum = seed
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return directions[sum % directions.length];
}

function pushCandidate(
  collection: EngineCandidate[],
  location: string,
  weight: number,
  reason: string,
  hiddenSpots: string[],
  tags: string[]
): void {
  collection.push({ location, weight, reason, hiddenSpots, tags });
}

function timeSignalFromHints(timeHints: TimeHints): {
  weight: number;
  location: string;
  reason: string;
  cue: string;
} | null {
  if (!timeHints.canUseTimeWisdom) {
    return null;
  }

  const hour = timeHints.approximateHour;
  const window = timeHints.approximateTimeWindow;

  if (window === "early_morning" || (hour !== null && hour >= 5 && hour < 8)) {
    return {
      weight: 4,
      location: "Covered area near where the day started",
      reason: "A time-based intuitive signal leans toward small covered spots used during the first routine of the day.",
      cue: "a covered area near the start of your routine"
    };
  }

  if (window === "morning" || (hour !== null && hour >= 8 && hour < 12)) {
    return {
      weight: 4,
      location: "Surface near a bag, desk, or getting-ready area",
      reason: "A time-based intuitive signal points toward the kind of surface used during morning transitions.",
      cue: "a transition surface near a bag or getting-ready area"
    };
  }

  if (window === "afternoon" || (hour !== null && hour >= 12 && hour < 17)) {
    return {
      weight: 4,
      location: "Work surface or carry spot used mid-day",
      reason: "A time-based intuitive signal points toward a practical mid-day handoff spot.",
      cue: "a work surface or carry spot from the middle of the day"
    };
  }

  if (window === "evening" || (hour !== null && hour >= 17 && hour < 21)) {
    return {
      weight: 4,
      location: "Comfort area near seating, counters, or bags",
      reason: "A time-based intuitive signal favors the area where the day started slowing down.",
      cue: "a comfort-zone area where things were being set down at the end of the day"
    };
  }

  if (window === "night" || (hour !== null && hour >= 21 && hour < 24)) {
    return {
      weight: 4,
      location: "Bedside area or partly covered soft surface",
      reason: "A time-based intuitive signal points toward a quieter, more covered night-time resting place.",
      cue: "a partly covered night-time resting spot"
    };
  }

  return {
    weight: 4,
    location: "Quiet indoor edge or tucked-away surface",
    reason: "A time-based intuitive signal suggests a quieter tucked-away place from the late-night routine.",
    cue: "a quiet tucked-away place from the late-night routine"
  };
}

export function wisdomEngine(input: ExtractedInput, timeHints: TimeHints): WisdomResult {
  const lowerText = input.freeText.toLowerCase();
  const directionHint = directionFromSeed(`${input.itemType}:${input.lastSeenLocation}`);
  const candidates: EngineCandidate[] = [];
  const cues: string[] = [];

  pushCandidate(
    candidates,
    `Familiar indoor zone around ${input.lastSeenLocation}`,
    7,
    "Traditional wisdom often pulls the search back toward the room that already holds your strongest memory of the item.",
    ["Nearest side table", "Room corner", "The side you usually enter from"],
    ["familiar", "indoor"]
  );
  cues.push("familiar indoor space");

  pushCandidate(
    candidates,
    `Covered area near ${input.lastSeenLocation}`,
    6,
    "Signals suggest the item may be half-hidden rather than truly far away.",
    ["Under fabric", "Behind a stack", "Inside an open-top bag"],
    ["covered", "hidden"]
  );
  cues.push("hidden or covered area");

  if (hasAny(lowerText, ["sink", "bathroom", "kitchen", "shower", "water"])) {
    pushCandidate(
      candidates,
      "Area near water or a sink",
      6,
      "A water-related pause often becomes the quiet place where small items get set down.",
      ["Beside soap", "Near a drying towel", "Counter edge by the sink"],
      ["water", "covered"]
    );
    cues.push("near water");
  }

  if (hasAny(lowerText, ["bed", "blanket", "couch", "sofa", "laundry", "jacket", "pocket"])) {
    pushCandidate(
      candidates,
      "Area near fabric or soft surfaces",
      6,
      "Fabric tends to swallow, soften, and visually hide the exact spot where an item rests.",
      ["Inside blankets", "Under a cushion edge", "In clothing folds"],
      ["fabric", "hidden"]
    );
    cues.push("near fabric");
  }

  if (
    hasAny(lowerText, [
      "desk",
      "table",
      "dresser",
      "nightstand",
      "chair",
      "shelf",
      "bedroom",
      "living room",
      "office"
    ])
  ) {
    pushCandidate(
      candidates,
      "Wood or furniture edge nearby",
      5,
      "Furniture edges hold many quiet drop points that feel invisible until searched slowly.",
      ["Under a table lip", "Beside a lamp", "At the back edge of a shelf"],
      ["wood", "familiar"]
    );
    cues.push("near wood or furniture");
  }

  pushCandidate(
    candidates,
    `${directionHint} side of ${input.lastSeenLocation}`,
    4,
    "The directional signal is a gentle nudge to search one side of the remembered space before widening out.",
    ["Closest corner on that side", "Wall edge", "Side table or basket there"],
    ["direction", "indoor"]
  );
  cues.push(`${directionHint.toLowerCase()} direction hint`);

  const timeSignal = timeSignalFromHints(timeHints);
  if (timeSignal) {
    pushCandidate(
      candidates,
      timeSignal.location,
      timeSignal.weight,
      timeSignal.reason,
      ["Under a cover layer", "Beside a routine-use object", "At the edge of a nearby surface"],
      ["time", "covered"]
    );
    cues.push("time-based intuitive signal");
  }

  const signal = timeSignal
    ? `Signals suggest starting in a familiar indoor space, especially where the scene feels covered, quiet, or slightly off to the ${directionHint.toLowerCase()}. A time-based intuitive signal also points toward ${timeSignal.cue}.`
    : `Signals suggest starting in a familiar indoor space, especially where the scene feels covered, quiet, or slightly off to the ${directionHint.toLowerCase()}.`;

  return {
    signal,
    directionHint,
    cues: cues
      .filter((cue, index) => cues.indexOf(cue) === index)
      .slice(0, 4),
    candidates
  };
}
