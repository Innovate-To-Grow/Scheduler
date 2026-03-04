import { NextResponse } from "next/server";
import { schedulerStore } from "@/lib/store";
import { toApiWeight } from "@/lib/store/types";

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const weights = await schedulerStore.listWeights(code);

    return NextResponse.json({ weights: weights.map(toApiWeight) });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { weights } = await req.json();
    if (!Array.isArray(weights)) {
      return NextResponse.json({ error: "weights must be an array" }, { status: 400 });
    }

    const participantNames = await schedulerStore.listParticipantNames(code);
    const participantNameSet = new Set(participantNames);

    const normalizedWeights = [];
    for (const item of weights) {
      const participantName = item.participantName ?? item.name;
      const w = Number(item.weight !== undefined ? item.weight : 1.0);
      if (!participantName || !Number.isFinite(w) || w < 0 || w > 1) {
        return NextResponse.json({ error: "Invalid weight entry" }, { status: 400 });
      }
      if (item.included !== undefined && item.included !== 0 && item.included !== 1) {
        return NextResponse.json({ error: "Invalid included value" }, { status: 400 });
      }
      if (!participantNameSet.has(participantName)) {
        return NextResponse.json(
          { error: `Participant '${participantName}' not found` },
          { status: 400 }
        );
      }
      normalizedWeights.push({
        participantName,
        weight: item.weight !== undefined ? item.weight : 1.0,
        included: item.included !== undefined ? item.included : 1,
      });
    }

    await schedulerStore.upsertWeights(code, normalizedWeights);
    const updated = await schedulerStore.listWeights(code);

    return NextResponse.json({ weights: updated.map(toApiWeight) });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
