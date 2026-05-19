import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Trigger gateway ready",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ trigger?: string[] }> },
) {
  const { trigger } = await params;
  const taskId = trigger?.join("/");

  if (!taskId) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const handle = await tasks.trigger(taskId, payload);

  return NextResponse.json({
    ok: true,
    taskId,
    handle,
  });
}

