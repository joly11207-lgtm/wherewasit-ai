import { NextRequest, NextResponse } from "next/server";

import { analyzeClues } from "@/lib/analyzeClues";
import { aiNarrator } from "@/lib/aiNarrator";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { input?: string };
    const freeText = body.input?.trim();

    if (!freeText) {
      return NextResponse.json({ error: "Please describe what you lost first." }, { status: 400 });
    }

    const analysis = analyzeClues(freeText);
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
