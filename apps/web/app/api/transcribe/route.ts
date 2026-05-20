import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export async function POST(request: Request) {
  if (!env.openAiApiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }
  if (audio.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio exceeds 20 MB limit." }, { status: 413 });
  }

  const openai = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const result = await openai.audio.transcriptions.create({
      file: audio,
      model: TRANSCRIPTION_MODEL,
      // Plain text is fastest; we don't need timestamps for an intake brief.
      response_format: "text" as unknown as undefined,
    });

    const text = typeof result === "string" ? result : (result as { text?: string }).text ?? "";
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
