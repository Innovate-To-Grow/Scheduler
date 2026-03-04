import { NextResponse } from "next/server";
import { DAYS_PER_WEEK } from "@/lib/constants";
import { schedulerStore } from "@/lib/store";
import { toApiParticipant } from "@/lib/store/types";

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const participants = await schedulerStore.listParticipants(code);

    return NextResponse.json({ participants: participants.map(toApiParticipant) });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { name } = await req.json();
    const trimmedName = (name || "").trim();
    if (!trimmedName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (trimmedName.length > 100)
      return NextResponse.json({ error: "Name too long (max 100)" }, { status: 400 });

    const numSlots = (event.endHour - event.startHour) * DAYS_PER_WEEK;
    const defaultSchedule = JSON.stringify(Array(numSlots).fill(0));

    const { participant, created } = await schedulerStore.createParticipantIfAbsent({
      eventCode: code,
      eventId: event.eventId,
      participantName: trimmedName,
      scheduleInperson: defaultSchedule,
      scheduleVirtual: defaultSchedule,
    });

    return NextResponse.json(
      { participant: toApiParticipant(participant) },
      { status: created ? 201 : 200 }
    );
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
