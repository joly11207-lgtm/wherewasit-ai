import { HeuristicWeights } from "@/lib/engine/types";
import { HeuristicContext } from "@/lib/engine/heuristics/types";

export function lostSongHeuristic(context: HeuristicContext): HeuristicWeights {
  const { input, objectProfile, sceneProfile } = context;
  const place = input.place.toLowerCase();
  const item = input.item.toLowerCase();

  return {
    source: "lostSong",
    directionWeights: {
      East: /hotel|home|bedroom|living room/.test(place) ? 12 : 6,
      South: /bathroom|kitchen|gym/.test(place) ? 11 : 5,
      West: /car|garage|parking/.test(place) ? 10 : 4
    },
    environmentWeights: {
      containerZone: sceneProfile.profile.commonContainers.length > 0 ? 12 : 6,
      hiddenCorner: sceneProfile.profile.hiddenAreas.length > 0 ? 11 : 5,
      electronicArea: /phone|airpods|earbuds/.test(item) ? 7 : 0,
      documentZone: objectProfile.key === "documents" ? 10 : 0,
      warmArea: /home|hotel|bedroom|living room/.test(place) ? 6 : 0
    },
    behaviorWeights: {
      placedTemporarily: 12,
      routineInterruption: 9,
      taskSwitching: 7
    },
    confidence: 0.7,
    reasonTags: [
      ...(sceneProfile.profile.hiddenAreas.length > 0 ? ["hidden"] : []),
      ...(sceneProfile.profile.commonContainers.length > 0 ? ["container"] : []),
      ...(objectProfile.key === "documents" ? ["paper"] : []),
      ...(objectProfile.key === "audio" ? ["electronics"] : []),
      "surface"
    ].slice(0, 5)
  };
}
