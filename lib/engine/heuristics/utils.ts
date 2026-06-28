import { Direction, EngineInput } from "@/lib/engine/types";

export type TimeBucket =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "late_night";

const TIME_BUCKET_ORDER: Record<TimeBucket, number> = {
  early_morning: 0,
  morning: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  late_night: 5
};

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function hasPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

export function hasAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

export function countPhraseMatches(text: string, phrases: string[]): number {
  return phrases.reduce((total, phrase) => total + (hasPhrase(text, phrase) ? 1 : 0), 0);
}

export function hashValue(seed: string): number {
  return seed.split("").reduce((total, char, index) => total + char.charCodeAt(0) * (index + 11), 0);
}

export function parseDateSeed(date?: string): { month: number; day: number; year: number; total: number } {
  if (!date) {
    return { month: 0, day: 0, year: 0, total: 0 };
  }

  const match = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const fallback = hashValue(date);
    return { month: 0, day: 0, year: 0, total: fallback };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return {
    year,
    month,
    day,
    total: year + month + day
  };
}

export function resolveTimeBucket(time: string): TimeBucket {
  const value = normalizeText(time);

  if (value.includes("early morning")) return "early_morning";
  if (value.includes("late night")) return "late_night";
  if (value.includes("morning")) return "morning";
  if (value.includes("afternoon")) return "afternoon";
  if (value.includes("evening")) return "evening";
  if (value.includes("night")) return "night";

  return "morning";
}

export function timeBucketIndex(bucket: TimeBucket): number {
  return TIME_BUCKET_ORDER[bucket];
}

export function buildDeterministicSeed(input: EngineInput): number {
  const dateSeed = parseDateSeed(input.date);
  const bucket = resolveTimeBucket(input.time);
  return (
    hashValue(`${input.item}|${input.place}|${input.story}`) +
    dateSeed.total * 7 +
    timeBucketIndex(bucket) * 19
  );
}

export const CARDINAL_TO_DIRECTION: Record<string, Direction> = {
  north: "North",
  northeast: "Northeast",
  east: "East",
  southeast: "Southeast",
  south: "South",
  southwest: "Southwest",
  west: "West",
  northwest: "Northwest"
};
