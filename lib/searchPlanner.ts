import {
  ExtractedInput,
  ItemCategory,
  ProbabilityLocation,
  SearchPlanResult,
  SearchStep,
  WisdomResult
} from "@/lib/types";

function buildInstruction(entry: ProbabilityLocation, index: number): string {
  if (index === 0) {
    return "Start here and search slowly with your hands, not just your eyes.";
  }

  if (entry.tags.includes("enclosed")) {
    return "Open every pocket, sleeve, pouch, and container in this area before moving on.";
  }

  if (entry.tags.includes("car")) {
    return "Use a flashlight and check every seat gap, console edge, and door pocket.";
  }

  if (entry.tags.includes("fabric")) {
    return "Lift, shake, and separate fabric layers instead of scanning from above.";
  }

  return "Check this next before widening the search.";
}

function ifNotFoundMessage(itemCategory: ItemCategory): string {
  switch (itemCategory) {
    case "keys":
      return "If the first pass misses it, repeat the entryway, every pocket, and the full car interior before assuming it left the house.";
    case "wallet":
      return "If it is still missing, repeat your last errand route and check every bag, car gap, and paper stack one more time.";
    case "audio":
      return "If you still cannot find it, repeat the bedroom, commute containers, and desk area while checking fabric folds and cable clutter.";
    case "jewelry":
      return "If it is not there, pause and re-check bathroom, laundry, and clothing changes with extra attention to towels, drains, and fabric folds.";
    case "documents":
      return "If it is still missing, flatten every paper pile, folder, sleeve, and travel bag before expanding beyond your prep area.";
    case "glasses":
      return "If they are still missing, search from sitting height in the rooms where you relax, then repeat soft surfaces and bag pockets.";
    case "bag":
      return "If it is still missing, retrace the unload sequence from door to car to final room and look behind furniture as well as inside the vehicle.";
    default:
      return "If it is not there, pause for one minute, reset the timeline from the last confirmed moment, and repeat the top areas while checking bags, pockets, fabric folds, and seat gaps.";
  }
}

export function searchPlanner(
  input: ExtractedInput,
  itemCategory: ItemCategory,
  probabilities: ProbabilityLocation[],
  wisdom: WisdomResult
): SearchPlanResult {
  const topResults = probabilities.slice(0, 4);
  const searchSteps: SearchStep[] = topResults.map((entry, index) => ({
    area: entry.location,
    instruction: buildInstruction(entry, index),
    reason: entry.reasons[0] ?? "This area scored highly across the local clues.",
    score: entry.score
  }));

  const hiddenSpots = Array.from(
    new Set(topResults.flatMap((entry) => entry.hiddenSpots))
  ).slice(0, 6);

  const mostLikelyArea =
    topResults[0]?.location ?? `The area around ${input.lastSeenLocation} looks most likely.`;

  const prioritySearchOrder = searchSteps.map(
    (step, index) => `${index + 1}. ${step.area} (${step.score}/100) - ${step.instruction}`
  );

  const whyThisMakesSense = topResults[0]
    ? `The strongest score stays close to ${input.lastSeenLocation}, then expands through your transition points and the usual habits for ${input.itemType.toLowerCase()}. Memory signals carried ${topResults[0].memoryScore}/45, behavior patterns added ${topResults[0].behaviorScore}/35, and wisdom cues added ${topResults[0].wisdomScore}/20.`
    : `The strongest clues still gather around ${input.lastSeenLocation}, which is why that is the first place to retrace slowly.`;

  return {
    mostLikelyArea,
    prioritySearchOrder,
    hiddenSpots,
    wisdomSignal: `${wisdom.signal} Direction hint: ${wisdom.directionHint}.`,
    whyThisMakesSense,
    ifNotFound: ifNotFoundMessage(itemCategory),
    searchSteps
  };
}
