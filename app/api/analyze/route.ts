import { NextRequest, NextResponse } from "next/server";

import { analyzeClues } from "@/lib/analyzeClues";
import { aiNarrator } from "@/lib/aiNarrator";
import { OptionalDetailInputs } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { input?: string } & OptionalDetailInputs;
    const freeText = body.input?.trim();

    if (!freeText) {
      return NextResponse.json({ error: "Please describe what you lost first." }, { status: 400 });
    }

    const analysis = analyzeClues({
      freeText,
      details: {
        selectedItemType: body.selectedItemType,
        selectedPlace: body.selectedPlace,
        selectedDateMode: body.selectedDateMode,
        selectedDate: body.selectedDate,
        selectedTimeMode: body.selectedTimeMode,
        selectedHour: body.selectedHour
      }
    });
    const narration = await aiNarrator(analysis);

    return NextResponse.json({
      analysis,
      ...narration
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while analyzing the clues." },
      { status: 500 }
    );
  }
}
