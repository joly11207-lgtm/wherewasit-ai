export type Direction =
  | "North"
  | "Northeast"
  | "East"
  | "Southeast"
  | "South"
  | "Southwest"
  | "West"
  | "Northwest";

export type EngineInput = {
  item: string;
  place: string;
  time: string;
  date?: string;
  story: string;
};

export type HeightBand = "high" | "middle" | "low" | "unknown";
export type DistanceBand = "near" | "middle" | "far" | "unknown";
export type MovementState = "still" | "moved" | "uncertain";

export type KnowledgeReading = {
  method: string;
  resultKey: string;
  directions: Direction[];
  environments: string[];
  colors: string[];
  height: HeightBand;
  distance: DistanceBand;
  movement: MovementState;
  containerHints: string[];
  hiddenHints: string[];
  behaviorHints: string[];
  confidence: number;
};

export type KnowledgeResult = {
  readings: KnowledgeReading[];
  finalDirections: Direction[];
  finalEnvironments: string[];
  finalColors: string[];
  finalHeight: HeightBand;
  finalDistance: DistanceBand;
  finalMovement: MovementState;
  finalContainerHints: string[];
  finalHiddenHints: string[];
  finalBehaviorHints: string[];
};

export type HeuristicWeights = {
  source: string;
  directionWeights: Partial<Record<Direction, number>>;
  environmentWeights: Record<string, number>;
  behaviorWeights: Record<string, number>;
  confidence: number;
  reasonTags: string[];
  reading?: KnowledgeReading;
};

export type HeuristicSignal = {
  source: "liuren" | "lostSong" | "symbolic" | "object" | "scene" | "timeline" | "memory";
  directions: Direction[];
  environmentTags: string[];
  objectTags: string[];
  colorTags?: string[];
  weight: number;
  reason: string;
};

export type DirectionResult = {
  direction: Direction;
  score: number;
  tags: string[];
};

export type ObjectProfile = {
  label: string;
  physicalTraits: string[];
  commonBehaviors: string[];
  likelyContainers: string[];
  riskZones: string[];
  searchHints: string[];
};

export type ObjectProfileResult = {
  key: string;
  profile: ObjectProfile;
  signals: HeuristicSignal[];
  summaryTags: string[];
};

export type SceneProfile = {
  label: string;
  zones: string[];
  transitionPoints: string[];
  commonContainers: string[];
  hiddenAreas: string[];
  electronicAreas: string[];
  wetAreas?: string[];
  lowAreas?: string[];
  highAreas?: string[];
};

export type SceneProfileResult = {
  key: string;
  profile: SceneProfile;
  signals: HeuristicSignal[];
  environmentalClues: string[];
};

export type TimelineResult = {
  steps: string[];
  transitionPoints: string[];
  attentionShiftMoments: string[];
  missingMoments: string[];
};

export type MemoryPatternResult = {
  patterns: string[];
  calmProtocol: string[];
};

export type SearchPriorityItem = {
  label: string;
  score: number;
  why: string;
  direction?: Direction;
  relatedTags: string[];
};

export type InvestigationEngineResult = {
  confidenceScore: number;
  topDirections: DirectionResult[];
  timeline: TimelineResult;
  objectProfile: ObjectProfileResult;
  sceneProfile: SceneProfileResult;
  knowledgeResult: KnowledgeResult;
  heuristicSignals: HeuristicSignal[];
  heuristicWeights: HeuristicWeights[];
  searchPriority: SearchPriorityItem[];
  environmentalClues: string[];
  missingMoments: string[];
  calmSearchPlan: string[];
  promptContext: string;
};
