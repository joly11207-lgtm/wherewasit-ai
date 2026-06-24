import { EngineCandidate, ExtractedInput, WisdomResult } from "@/lib/types";

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

export function wisdomEngine(input: ExtractedInput): WisdomResult {
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

  const signal = `Signals suggest starting in a familiar indoor space, especially where the scene feels covered, quiet, or slightly off to the ${directionHint.toLowerCase()}.`;

  return {
    signal,
    directionHint,
    cues: cues
      .filter((cue, index) => cues.indexOf(cue) === index)
      .slice(0, 4),
    candidates
  };
}
