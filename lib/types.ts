import type { InvestigationEngineResult } from "@/lib/engine/types";

export type ExtractedInput = {
  itemType: string;
  lastSeenLocation: string;
  lastSeenTime: string;
  placesVisited: string[];
  emotionalContext: string;
  freeText: string;
  selectedHints?: OptionalDetailInputs;
};

export type OptionalDetailInputs = {
  selectedItemType?: string;
  selectedPlace?: string;
  selectedDateMode?: "today" | "yesterday" | "pick_date" | "not_sure";
  selectedDate?: string;
  selectedTimeMode?:
    | "early_morning"
    | "morning"
    | "afternoon"
    | "evening"
    | "night"
    | "late_night"
    | "approximate_hour"
    | "not_sure";
  selectedHour?: string;
};

export type AnalyzeCluesInput = {
  freeText: string;
  details?: OptionalDetailInputs;
};

export type TimeHints = {
  approximateTimeWindow:
    | "early_morning"
    | "morning"
    | "afternoon"
    | "evening"
    | "night"
    | "late_night"
    | null;
  approximateHour: number | null;
  localDate: string | null;
  canUseTimeWisdom: boolean;
};

export type ItemCategory =
  | "keys"
  | "wallet"
  | "audio"
  | "jewelry"
  | "phone"
  | "documents"
  | "glasses"
  | "bag"
  | "general";

export type EngineCandidate = {
  location: string;
  weight: number;
  reason: string;
  hiddenSpots: string[];
  tags: string[];
};

export type MemoryResult = {
  timeline: string[];
  transitionMoments: string[];
  routeSummary: string[];
  timeGapLabel: string;
  handoffRisk: string;
  candidates: EngineCandidate[];
};

export type BehaviorPattern = EngineCandidate & {
  itemCategory: ItemCategory;
};

export type WisdomResult = {
  signal: string;
  directionHint: string;
  cues: string[];
  candidates: EngineCandidate[];
};

export type ProbabilityLocation = {
  location: string;
  score: number;
  memoryScore: number;
  behaviorScore: number;
  wisdomScore: number;
  reasons: string[];
  hiddenSpots: string[];
  tags: string[];
};

export type SearchStep = {
  area: string;
  instruction: string;
  reason: string;
  score: number;
};

export type SearchPlanResult = {
  mostLikelyArea: string;
  prioritySearchOrder: string[];
  hiddenSpots: string[];
  wisdomSignal: string;
  whyThisMakesSense: string;
  ifNotFound: string;
  searchSteps: SearchStep[];
};

export type LocalAnalysis = {
  input: ExtractedInput;
  itemCategory: ItemCategory;
  timeHints: TimeHints;
  investigationEngine: InvestigationEngineResult;
  memory: MemoryResult;
  behavior: BehaviorPattern[];
  wisdom: WisdomResult;
  probabilities: ProbabilityLocation[];
  searchPlan: SearchPlanResult;
};

export type ReportSections = {
  mostLikelyArea: string;
  prioritySearchOrder: string[];
  hiddenSpots: string[];
  wisdomSignal: string;
  whyThisMakesSense: string;
  ifNotFound: string;
};

export type NarrationResult = {
  diagnostics?: {
    model: string;
    statusCode: number | null;
    responseBodyOnFailure: string | null;
    errorMessage: string | null;
    fallbackReason: string | null;
    debugResponse?: unknown;
  };
  usedFallback: boolean;
  report: ReportSections;
};
