import { EngineInput, HeuristicSignal, TimelineResult } from "@/lib/engine/types";

const KEYWORD_TO_STEP: Array<{ pattern: RegExp; step: string; transition?: string; attention?: string }> = [
  { pattern: /\bshower|showered\b/i, step: "Shower or washing routine", transition: "Shower routine", attention: "Stopping to wash or reset" },
  { pattern: /\bpacked|packing|pack\b/i, step: "Packing sequence", transition: "Packing bags", attention: "Sorting items quickly" },
  { pattern: /\bchanged|changing clothes|got dressed\b/i, step: "Clothing change", transition: "Changing clothes", attention: "Switching outfits" },
  { pattern: /\bdrove|driving|car|parking\b/i, step: "Car movement", transition: "Driving", attention: "Entering or leaving the car" },
  { pattern: /\boffice|meeting|coworker|conference\b/i, step: "Work sequence", transition: "Arriving at work", attention: "Starting a task or meeting" },
  { pattern: /\bhome|arrived|came inside|entryway\b/i, step: "Arrival home", transition: "Coming home", attention: "Unloading and setting things down" },
  { pattern: /\bgym|locker\b/i, step: "Gym or locker routine", transition: "Locker transition", attention: "Changing or repacking" },
  { pattern: /\bbathroom\b/i, step: "Bathroom pause", transition: "Bathroom stop", attention: "Setting items near water" },
  { pattern: /\bkitchen\b/i, step: "Kitchen pause", transition: "Kitchen handoff", attention: "Unloading or setting down items" },
  { pattern: /\bpaid|checkout|store|grocery\b/i, step: "Checkout or errand stop", transition: "Paying or unloading after errands", attention: "Using wallet or bag under time pressure" },
  { pattern: /\bairport|hotel|restaurant|trip|travel\b/i, step: "Travel staging", transition: "Travel transition", attention: "Handling documents, bags, or room changes" },
  { pattern: /\bbag|pocket|jacket\b/i, step: "Carry-container handoff", transition: "Using a bag or pocket", attention: "Putting something away quickly" },
  { pattern: /\bleft\b/i, step: "Leaving one location", transition: "Leaving a space", attention: "Attention split while moving out" }
];

const NATURAL_RULES: Array<{ pattern: RegExp; step: string; transition?: string; attention?: string }> = [
  {
    pattern: /\bcheck(?:ing)? out|checkout\b/i,
    step: "Hotel checkout preparation",
    transition: "Checking out",
    attention: "Gathering everything before leaving the room"
  },
  {
    pattern: /\bpacking luggage|packed luggage|suitcase|luggage\b/i,
    step: "Packing luggage",
    transition: "Packing luggage",
    attention: "Moving items into travel layers"
  },
  {
    pattern: /\bpassport|documents|document|travel papers\b/i,
    step: "Document handling",
    transition: "Moving documents",
    attention: "Keeping track of travel papers"
  },
  {
    pattern: /\bnightstand|bedside\b/i,
    step: "Nightstand check",
    transition: "Collecting items from nightstand",
    attention: "Picking up small items from the bedside area"
  },
  {
    pattern: /\bsafe\b/i,
    step: "Safe check",
    transition: "Using hotel safe",
    attention: "Retrieving valuables from storage"
  },
  {
    pattern: /\bleft the room|leaving room\b/i,
    step: "Room exit",
    transition: "Leaving room",
    attention: "Final sweep before exiting"
  },
  {
    pattern: /\bfront desk|lobby\b/i,
    step: "Front desk pass",
    transition: "Passing front desk",
    attention: "Managing luggage and documents in a public handoff"
  },
  {
    pattern: /\btaxi|rideshare|uber|lyft\b/i,
    step: "Vehicle handoff",
    transition: "Entering taxi or rideshare",
    attention: "Holding multiple items while moving between spaces"
  },
  {
    pattern: /\bsecurity\b/i,
    step: "Security checkpoint",
    transition: "Security check",
    attention: "Separating small items during screening"
  },
  {
    pattern: /\btray|bin\b/i,
    step: "Tray placement",
    transition: "Placing items in tray",
    attention: "Spreading items across a temporary surface"
  },
  {
    pattern: /\bscreening|after security|after screening|collected my items\b/i,
    step: "Post-screening collection",
    transition: "Collecting items after screening",
    attention: "Repacking quickly after screening"
  },
  {
    pattern: /\bboarding|boarded\b/i,
    step: "Boarding sequence",
    transition: "Boarding",
    attention: "Compressing multiple actions into one movement"
  },
  {
    pattern: /\bgate\b/i,
    step: "Gate wait",
    transition: "Waiting at gate",
    attention: "Setting items down while waiting"
  },
  {
    pattern: /\bcharging|charger|outlet\b/i,
    step: "Charging stop",
    transition: "Charging device",
    attention: "Leaving items near electronics or cables"
  },
  {
    pattern: /\bmoving luggage|dragged my suitcase|rolled my suitcase\b/i,
    step: "Luggage movement",
    transition: "Moving luggage",
    attention: "Shifting hands and carry balance"
  },
  {
    pattern: /\bgot out of (?:the )?(?:taxi|car|rideshare)|exited the (?:taxi|car|rideshare)\b/i,
    step: "Vehicle exit",
    transition: "Getting out of taxi",
    attention: "Collecting items while stepping out"
  },
  {
    pattern: /\bchecking in|check-in\b/i,
    step: "Check-in process",
    transition: "Checking in",
    attention: "Handling documents during arrival"
  },
  {
    pattern: /\bchecking passport|showed my passport\b/i,
    step: "Passport check",
    transition: "Checking passport",
    attention: "Holding documents separately from the bag"
  },
  {
    pattern: /\bpassport holder|document sleeve|sleeve\b/i,
    step: "Document sleeve handoff",
    transition: "Placing documents in sleeve",
    attention: "Sliding papers into a thin container"
  },
  {
    pattern: /\btook out my id|taking out id|showed my id\b/i,
    step: "ID check",
    transition: "Taking out ID",
    attention: "Removing one document and not fully resecuring it"
  },
  {
    pattern: /\btravel papers\b/i,
    step: "Travel paper packing",
    transition: "Packing travel papers",
    attention: "Flattening papers into a larger travel layer"
  }
];

function normalizeStory(input: EngineInput): string {
  const fallback = `I lost my ${input.item} around ${input.place} during ${input.time}.`;
  const trimmed = input.story.trim();
  return trimmed || fallback;
}

function uniqueList(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function analyzeTimeline(input: EngineInput): {
  result: TimelineResult;
  signals: HeuristicSignal[];
} {
  const story = normalizeStory(input);
  const steps = story
    .split(/,| then | after | before | and then | while /i)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, 6);

  const inferredSteps: string[] = [];
  const transitionPoints: string[] = [];
  const attentionShiftMoments: string[] = [];

  NATURAL_RULES.forEach((rule) => {
    if (rule.pattern.test(story)) {
      inferredSteps.push(rule.step);
      if (rule.transition) {
        transitionPoints.push(rule.transition);
      }
      if (rule.attention) {
        attentionShiftMoments.push(rule.attention);
      }
    }
  });

  KEYWORD_TO_STEP.forEach((rule) => {
    if (rule.pattern.test(story)) {
      inferredSteps.push(rule.step);
      if (rule.transition) {
        transitionPoints.push(rule.transition);
      }
      if (rule.attention) {
        attentionShiftMoments.push(rule.attention);
      }
    }
  });

  const finalSteps = uniqueList([
    ...steps.map((step) => step.charAt(0).toUpperCase() + step.slice(1)),
    ...inferredSteps
  ]).slice(0, 6);

  const missingMoments = uniqueList(
    transitionPoints.slice(0, 3).map(
      (point) => `The item may have been released during ${point.toLowerCase()}.`
    )
  );

  const signal: HeuristicSignal = {
    source: "timeline",
    directions: /drove|car|parking/i.test(story) ? ["West", "Northwest"] : ["East", "Southeast"],
    environmentTags: ["transition path", "entry zone", "container zone"].slice(
      0,
      Math.max(1, Math.min(3, transitionPoints.length))
    ),
    objectTags: [],
    weight: 7,
    reason: "Timeline analysis highlights the movement path and the moments when attention most likely shifted."
  };

  return {
    result: {
      steps:
        finalSteps.length > 0
          ? finalSteps
          : [`Lost ${input.item}`, `Around ${input.place}`, `During ${input.time}`],
      transitionPoints: uniqueList(transitionPoints).slice(0, 5),
      attentionShiftMoments: uniqueList(attentionShiftMoments).slice(0, 5),
      missingMoments: missingMoments.length > 0 ? missingMoments : [`The most likely release moment was near ${input.place}.`]
    },
    signals: [signal]
  };
}
