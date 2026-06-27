import { InvestigationEngineResult } from "@/lib/engine/types";
import { runInvestigationEngine } from "@/lib/engine";
import { behaviorEngine, resolveItemCategory } from "@/lib/engines/behaviorEngine";
import { memoryEngine } from "@/lib/engines/memoryEngine";
import { probabilityEngine } from "@/lib/engines/probabilityEngine";
import { wisdomEngine } from "@/lib/engines/wisdomEngine";
import { extractInput } from "@/lib/extractInput";
import { searchPlanner } from "@/lib/searchPlanner";
import { timeHints } from "@/lib/timeHints";
import { AnalyzeCluesInput, LocalAnalysis, SearchPlanResult, SearchStep } from "@/lib/types";

const ENGINE_PLACE_CANDIDATES: Array<{ label: string; patterns: RegExp[]; positive: RegExp[]; negative?: RegExp[] }> = [
  {
    label: "Hotel",
    patterns: [/\bhotel\b/i, /\bhotel room\b/i, /\bcheckout\b/i, /\bcheck out\b/i, /\bnightstand\b/i, /\bsafe\b/i],
    positive: [/\bin the hotel\b/i, /\bat the hotel\b/i, /\bof the hotel\b/i]
  },
  {
    label: "Travel",
    patterns: [/\btravel\b/i, /\bairport\b/i, /\bgate\b/i, /\bflight\b/i, /\bsecurity\b/i, /\bboarding\b/i],
    positive: [/\bat the gate\b/i, /\bat the airport\b/i, /\bduring travel\b/i]
  },
  {
    label: "Gym",
    patterns: [/\bgym\b/i, /\blocker\b/i, /\bbench\b/i, /\bchanging clothes\b/i],
    positive: [/\bat the gym\b/i, /\bin the gym\b/i]
  },
  {
    label: "Bathroom",
    patterns: [/\bbathroom\b/i, /\bsink\b/i, /\bshower\b/i, /\bwashing my hands\b/i, /\bvanity\b/i],
    positive: [/\bin the bathroom\b/i, /\bat the sink\b/i],
    negative: [/\bleft for the bathroom\b/i]
  },
  {
    label: "Office",
    patterns: [/\boffice\b/i, /\bmeeting\b/i, /\bdesk\b/i, /\bprinter\b/i, /\blaptop\b/i],
    positive: [/\bin the office\b/i, /\bat the office\b/i, /\bat my desk\b/i]
  },
  {
    label: "Home",
    patterns: [/\bhome\b/i, /\bhouse\b/i, /\bentryway\b/i, /\bcame inside\b/i, /\bwalked into the house\b/i],
    positive: [/\bat home\b/i, /\binside the house\b/i, /\bwalked into the house\b/i]
  },
  {
    label: "Bedroom",
    patterns: [/\bbedroom\b/i, /\bbed\b/i, /\bnightstand\b/i, /\bdresser\b/i],
    positive: [/\bin the bedroom\b/i, /\bat the bedside\b/i],
    negative: [/\bleft for the bedroom\b/i]
  },
  {
    label: "Kitchen",
    patterns: [/\bkitchen\b/i, /\bgroceries\b/i, /\bcounter\b/i, /\bisland\b/i],
    positive: [/\bin the kitchen\b/i, /\bon the kitchen counter\b/i]
  },
  {
    label: "Living Room",
    patterns: [/\bliving room\b/i, /\bcouch\b/i, /\bsofa\b/i, /\bcoffee table\b/i],
    positive: [/\bin the living room\b/i, /\bon the couch\b/i]
  },
  {
    label: "Car",
    patterns: [/\bcar\b/i, /\bparking\b/i, /\bgarage\b/i, /\bconsole\b/i, /\bseat\b/i],
    positive: [/\bin the car\b/i, /\bat the car\b/i],
    negative: [/\bheaded to the car\b/i, /\bfrom the car\b/i, /\bgot out of the car\b/i]
  }
];

function toSentenceList(values: string[], limit: number): string {
  const items = values.map((value) => value.replace(/\.$/, "").trim()).filter(Boolean).slice(0, limit);

  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function normalizeMissingMoment(moment: string): string {
  return moment
    .replace(/^The item may have been released during /i, "")
    .replace(/\.$/, "")
    .trim();
}

function buildWhyThisMakesSense(engine: InvestigationEngineResult): string {
  const confidence = engine.confidenceScore;
  const missingMoments = engine.missingMoments.map(normalizeMissingMoment).slice(0, 3);
  const transitions = engine.timeline.transitionPoints.slice(0, 3);
  const behaviors = engine.objectProfile.profile.commonBehaviors.slice(0, 2).map((value) => value.toLowerCase());
  const sceneAnchors = [
    ...engine.sceneProfile.profile.hiddenAreas.slice(0, 1),
    ...engine.sceneProfile.profile.commonContainers.slice(0, 1)
  ];

  const confidenceLine = `Search confidence is ${confidence}/100 based on how clearly the timeline, scene, and object behavior line up.`;
  const transitionLine =
    transitions.length > 0
      ? `Based on your timeline, the highest-risk transition moments were ${toSentenceList(transitions, 3)}.`
      : "Based on your timeline, the highest-risk moment was the last routine shift before the item went missing.";
  const missingLine =
    missingMoments.length > 0
      ? `The most likely release points were ${toSentenceList(missingMoments, 3)}.`
      : "The release point still looks closest to the last reliable handoff in the timeline.";
  const behaviorLine =
    behaviors.length > 0
      ? `This fits the way ${engine.objectProfile.profile.label.toLowerCase()} often ${toSentenceList(behaviors, 2)}.`
      : `This fits the way ${engine.objectProfile.profile.label.toLowerCase()} often behaves during routine movement.`;
  const sceneLine =
    sceneAnchors.length > 0
      ? `That is why the search stays close to scene anchors like ${toSentenceList(sceneAnchors, 2)} before widening out.`
      : `That is why the search stays close to the strongest scene anchors before widening out.`;

  return [confidenceLine, transitionLine, missingLine, behaviorLine, sceneLine].join(" ");
}

function buildSpatialSignal(engine: InvestigationEngineResult): string {
  const directions = engine.topDirections.map((entry) => entry.direction).slice(0, 2);
  const directionTags = engine.topDirections.flatMap((entry) => entry.tags).filter((tag, index, array) => array.indexOf(tag) === index).slice(0, 4);
  const clues = engine.environmentalClues.slice(0, 3);
  const priorities = engine.searchPriority.slice(0, 2).map((entry) => entry.label);

  const directionText =
    directions.length > 0 ? toSentenceList(directions, 2) : "the strongest nearby search zones";
  const tagText = directionTags.length > 0 ? toSentenceList(directionTags, 4) : "the strongest scene patterns";
  const clueText = clues.length > 0 ? toSentenceList(clues, 3) : "the closest scene clues";
  const priorityText = priorities.length > 0 ? toSentenceList(priorities, 2) : "the first two search areas";

  return `The strongest spatial signal points toward ${directionText}, especially around ${tagText}. The clearest environmental pattern stays close to ${clueText}, with the search zone signal strongest around ${priorityText}.`;
}

function resolveEnginePlace(freeText: string, extractedPlace: string): string {
  if (extractedPlace && extractedPlace !== "Last known area") {
    const lowerExtracted = extractedPlace.toLowerCase();
    if (!["car", "bedroom", "office", "desk", "work"].includes(lowerExtracted)) {
      return extractedPlace;
    }
  }

  let bestLabel = extractedPlace && extractedPlace !== "Last known area" ? extractedPlace : "Home";
  let bestScore = 0;

  ENGINE_PLACE_CANDIDATES.forEach((candidate) => {
    const patternScore = candidate.patterns.reduce(
      (total, pattern) => (pattern.test(freeText) ? total + 2 : total),
      0
    );
    const positiveScore = candidate.positive.reduce(
      (total, pattern) => (pattern.test(freeText) ? total + 4 : total),
      0
    );
    const negativeScore = (candidate.negative ?? []).reduce(
      (total, pattern) => (pattern.test(freeText) ? total + 3 : total),
      0
    );
    const score = patternScore + positiveScore - negativeScore;

    if (score > bestScore) {
      bestScore = score;
      bestLabel = candidate.label;
    }
  });

  return bestLabel;
}

function mapEngineToSearchPlan(engine: InvestigationEngineResult): SearchPlanResult {
  const topDirection = engine.topDirections[0]?.direction;
  const topPriority = engine.searchPriority[0];
  const searchSteps: SearchStep[] = engine.searchPriority.slice(0, 5).map((entry, index) => ({
    area: entry.label,
    instruction:
      engine.calmSearchPlan[index] ??
      (index === 0
        ? "Start here first and search slowly before widening out."
        : "Check this area next before moving farther away."),
    reason: entry.why,
    score: entry.score
  }));

  const prioritySearchOrder = searchSteps.map((step, index) => {
    const summary =
      index === 0
        ? "Start here first."
        : index === 1
          ? "Check this next."
          : "Then continue here.";

    return `${index + 1}. ${step.area} (${step.score}/100) - ${summary} ${step.instruction}`;
  });

  const ifNotFound = engine.calmSearchPlan.join(" ");

  return {
    mostLikelyArea: topPriority
      ? `${topPriority.label}${topDirection ? ` is the strongest starting area, with a ${topDirection.toLowerCase()} directional lean.` : " is the strongest starting area."}`
      : "Start with the nearest likely zone and widen only after the first pass.",
    prioritySearchOrder,
    hiddenSpots: engine.environmentalClues.slice(0, 6),
    wisdomSignal: buildSpatialSignal(engine),
    whyThisMakesSense: buildWhyThisMakesSense(engine),
    ifNotFound,
    searchSteps
  };
}

export function analyzeClues(payload: string | AnalyzeCluesInput): LocalAnalysis {
  const request = typeof payload === "string" ? { freeText: payload } : payload;
  const input = extractInput(request.freeText, request.details);
  const itemCategory = resolveItemCategory(input.itemType);
  const derivedTimeHints = timeHints(request.details);
  const enginePlace = resolveEnginePlace(input.freeText, input.lastSeenLocation);
  const investigationEngine = runInvestigationEngine({
    item: input.itemType,
    place: enginePlace,
    time: input.lastSeenTime,
    date: derivedTimeHints.localDate ?? undefined,
    story: input.freeText
  });
  const memory = memoryEngine(input);
  const behavior = behaviorEngine(input);
  const wisdom = wisdomEngine(input, derivedTimeHints);
  const probabilities = probabilityEngine(input, itemCategory, memory, behavior, wisdom);
  const legacySearchPlan = searchPlanner(input, itemCategory, probabilities, wisdom);
  const searchPlan = {
    ...legacySearchPlan,
    ...mapEngineToSearchPlan(investigationEngine)
  };

  return {
    input,
    itemCategory,
    timeHints: derivedTimeHints,
    investigationEngine,
    memory,
    behavior,
    wisdom,
    probabilities,
    searchPlan
  };
}

/*
Sample test cases for quick sanity checks:
1. AirPods lost between bedroom, car, and office
   "I lost my AirPods. I last used them in my bedroom this morning, then drove to work and sat at my desk."
2. Wedding ring lost at home
   "I misplaced my wedding ring. I took it off in the bathroom before showering, then changed clothes in the bedroom."
3. Wallet lost after grocery shopping
   "I can't find my wallet. I used it at the grocery store, drove home, carried bags inside, and dropped things on the kitchen counter."
4. Passport lost before travel
   "I lost my passport while packing for a trip. I had it on my desk last night, then put things into my travel bag and jacket."
5. Glasses lost around couch and bedroom
   "I misplaced my glasses after watching TV on the couch and going to bed. I remember them in the living room earlier tonight."
*/
