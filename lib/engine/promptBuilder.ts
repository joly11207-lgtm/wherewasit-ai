import { InvestigationEngineResult } from "@/lib/engine/types";

export function buildPrompt(result: InvestigationEngineResult): string {
  const engineJson = JSON.stringify(
    {
      confidenceScore: result.confidenceScore,
      topDirections: result.topDirections,
      directionBias: result.topDirections,
      timeline: result.timeline,
      objectProfile: {
        label: result.objectProfile.profile.label,
        commonBehaviors: result.objectProfile.profile.commonBehaviors,
        likelyContainers: result.objectProfile.profile.likelyContainers,
        riskZones: result.objectProfile.profile.riskZones,
        searchHints: result.objectProfile.profile.searchHints
      },
      sceneProfile: {
        label: result.sceneProfile.profile.label,
        zones: result.sceneProfile.profile.zones,
        transitionPoints: result.sceneProfile.profile.transitionPoints,
        hiddenAreas: result.sceneProfile.profile.hiddenAreas,
        commonContainers: result.sceneProfile.profile.commonContainers
      },
      heuristicSignals: result.heuristicSignals.map((signal) => ({
        directions: signal.directions,
        environmentTags: signal.environmentTags,
        objectTags: signal.objectTags,
        weight: signal.weight,
        reason: signal.reason
      })),
      heuristicWeights: result.heuristicWeights,
      behaviorAnalysis: result.heuristicWeights.map((entry) => ({
        source: entry.source,
        behaviorWeights: entry.behaviorWeights,
        confidence: entry.confidence
      })),
      reasonTags: result.heuristicWeights.flatMap((entry) => entry.reasonTags).filter((tag, index, array) => array.indexOf(tag) === index),
      searchPriority: result.searchPriority,
      environmentalClues: result.environmentalClues,
      missingMoments: result.missingMoments,
      calmSearchPlan: result.calmSearchPlan
    },
    null,
    2
  );

  return `You are writing a premium AI investigation report for a lost-item recovery assistant.

Use the engine JSON below as the source of truth.
Use searchPriority as the exact source of truth for the primary search zones and the recommended search order.
Anchor the Most Likely Area to searchPriority[0].
Do not invent new primary search areas outside searchPriority.
Do not mention internal heuristic systems.
Do not mention divination, fortune telling, astrology, tarot, oracle systems, feng shui, lunar calendars, or mystical concepts.

Write in a calm, confident, practical, premium tone with a slight sense of mystery, but not supernatural certainty.

Prefer language like:
- most likely
- higher priority
- based on the timeline
- based on object behavior
- start with
- check first

Avoid language like:
- definitely
- guaranteed
- certainly there
- the universe says
- the oracle says

Produce a polished investigation report in markdown with exactly these sections:

## Most Likely Area
## Why This Makes Sense
## Recommended Search Order
## Hidden Spots To Check
## Intuitive Signal
## If It Is Not There

Use:
- environmentalClues for Hidden Spots To Check
- missingMoments to support Why This Makes Sense
- calmSearchPlan to shape If It Is Not There
- topDirections as locked direction bias
- searchPriority as locked primary search areas

Engine JSON:
${engineJson}`;
}
