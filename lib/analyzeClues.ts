import { behaviorEngine, resolveItemCategory } from "@/lib/engines/behaviorEngine";
import { memoryEngine } from "@/lib/engines/memoryEngine";
import { probabilityEngine } from "@/lib/engines/probabilityEngine";
import { wisdomEngine } from "@/lib/engines/wisdomEngine";
import { extractInput } from "@/lib/extractInput";
import { searchPlanner } from "@/lib/searchPlanner";
import { LocalAnalysis } from "@/lib/types";

export function analyzeClues(freeText: string): LocalAnalysis {
  const input = extractInput(freeText);
  const itemCategory = resolveItemCategory(input.itemType);
  const memory = memoryEngine(input);
  const behavior = behaviorEngine(input);
  const wisdom = wisdomEngine(input);
  const probabilities = probabilityEngine(input, itemCategory, memory, behavior, wisdom);
  const searchPlan = searchPlanner(input, itemCategory, probabilities, wisdom);

  return {
    input,
    itemCategory,
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
