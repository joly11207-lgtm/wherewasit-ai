import { OptionalDetailInputs, TimeHints } from "@/lib/types";

const TIME_WINDOW_TO_HOUR: Record<
  NonNullable<OptionalDetailInputs["selectedTimeMode"]>,
  number | null
> = {
  early_morning: 6,
  morning: 9,
  afternoon: 14,
  evening: 19,
  night: 22,
  late_night: 1,
  approximate_hour: null,
  not_sure: null
};

function normalizeHourLabel(selectedHour?: string): number | null {
  if (!selectedHour) {
    return null;
  }

  const match = selectedHour.trim().match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const meridiem = match[2].toUpperCase();

  if (Number.isNaN(rawHour) || rawHour < 1 || rawHour > 12) {
    return null;
  }

  if (meridiem === "AM") {
    return rawHour === 12 ? 0 : rawHour;
  }

  return rawHour === 12 ? 12 : rawHour + 12;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveLocalDate(details?: OptionalDetailInputs): string | null {
  if (!details?.selectedDateMode || details.selectedDateMode === "not_sure") {
    return null;
  }

  if (details.selectedDateMode === "pick_date") {
    return details.selectedDate?.trim() || null;
  }

  const now = new Date();
  if (details.selectedDateMode === "today") {
    return formatLocalDate(now);
  }

  if (details.selectedDateMode === "yesterday") {
    const previous = new Date(now);
    previous.setDate(previous.getDate() - 1);
    return formatLocalDate(previous);
  }

  return null;
}

export function timeHints(details?: OptionalDetailInputs): TimeHints {
  const selectedTimeMode = details?.selectedTimeMode;
  const approximateTimeWindow =
    selectedTimeMode && selectedTimeMode !== "approximate_hour" && selectedTimeMode !== "not_sure"
      ? selectedTimeMode
      : null;

  const approximateHour =
    selectedTimeMode === "approximate_hour"
      ? normalizeHourLabel(details?.selectedHour)
      : selectedTimeMode
        ? TIME_WINDOW_TO_HOUR[selectedTimeMode]
        : null;

  const localDate = deriveLocalDate(details);

  return {
    approximateTimeWindow,
    approximateHour,
    localDate,
    canUseTimeWisdom: Boolean(localDate && (approximateTimeWindow || approximateHour !== null))
  };
}
