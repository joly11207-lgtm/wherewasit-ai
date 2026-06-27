import {
  EngineInput,
  HeuristicWeights,
  MemoryPatternResult,
  ObjectProfileResult,
  SceneProfileResult,
  TimelineResult
} from "@/lib/engine/types";

export type HeuristicContext = {
  input: EngineInput;
  objectProfile: ObjectProfileResult;
  sceneProfile: SceneProfileResult;
  timeline: TimelineResult;
  memory: MemoryPatternResult;
};

export type HeuristicModule = (context: HeuristicContext) => HeuristicWeights;
