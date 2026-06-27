import { directionEngine } from "@/lib/engine/directionEngine";
import { fuseInvestigation } from "@/lib/engine/fusion/engine";
import { runHeuristicWeights } from "@/lib/engine/heuristics";
import { analyzeMemoryPatterns } from "@/lib/engine/memory/engine";
import { analyzeObjectProfile } from "@/lib/engine/object/engine";
import { buildPrompt } from "@/lib/engine/promptBuilder";
import { analyzeSceneProfile } from "@/lib/engine/scene/engine";
import { analyzeTimeline } from "@/lib/engine/timeline/engine";
import { EngineInput, InvestigationEngineResult } from "@/lib/engine/types";

function ensureStory(input: EngineInput): EngineInput {
  const story = input.story.trim() || `I lost my ${input.item} around ${input.place} during ${input.time}.`;
  return {
    ...input,
    story
  };
}

export function runInvestigationEngine(rawInput: EngineInput): InvestigationEngineResult {
  const input = ensureStory(rawInput);
  const objectProfile = analyzeObjectProfile(input);
  const sceneProfile = analyzeSceneProfile(input);
  const timelineAnalysis = analyzeTimeline(input);
  const memoryAnalysis = analyzeMemoryPatterns(input);
  const heuristicWeights = runHeuristicWeights({
    input,
    objectProfile,
    sceneProfile,
    timeline: timelineAnalysis.result,
    memory: memoryAnalysis.result
  });
  const heuristicSignals = [
    ...objectProfile.signals,
    ...sceneProfile.signals,
    ...timelineAnalysis.signals,
    ...memoryAnalysis.signals
  ];
  const directions = directionEngine(
    input,
    heuristicSignals,
    heuristicWeights,
    objectProfile,
    sceneProfile
  );
  const fused = fuseInvestigation({
    input,
    directions,
    objectProfile,
    sceneProfile,
    timeline: timelineAnalysis.result,
    memory: memoryAnalysis.result,
    heuristicSignals,
    heuristicWeights
  });

  const result: InvestigationEngineResult = {
    ...fused,
    heuristicWeights,
    promptContext: ""
  };

  result.promptContext = buildPrompt(result);

  return result;
}

export * from "@/lib/engine/types";
