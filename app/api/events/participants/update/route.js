import { NextResponse } from "next/server";
import { DAYS_PER_WEEK } from "@/lib/constants";
import { schedulerStore } from "@/lib/store";
import { toApiParticipant } from "@/lib/store/types";

export async function PUT(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const code = sp.get("code");
    const name = sp.get("name");
    if (!code || !name)
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { scheduleInperson, scheduleVirtual, submitted } = await req.json();
    const expectedLength = (event.endHour - event.startHour) * DAYS_PER_WEEK;

    function validateSchedule(schedule, label) {
      let arr = schedule;
      if (typeof arr === "string") {
        try {
          arr = JSON.parse(arr);
        } catch {
          return `Invalid ${label}: not valid JSON`;
        }
      }
      if (!Array.isArray(arr)) return `Invalid ${label}: must be an array`;
      if (arr.length !== expectedLength)
        return `Invalid ${label}: expected ${expectedLength} slots, got ${arr.length}`;
      if (!arr.every((v) => typeof v === "number" && v >= 0 && v <= 1))
        return `Invalid ${label}: values must be numbers between 0 and 1`;
      return null;
    }

    if (scheduleInperson !== undefined) {
      const err = validateSchedule(scheduleInperson, "scheduleInperson");
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
    if (scheduleVirtual !== undefined) {
      const err = validateSchedule(scheduleVirtual, "scheduleVirtual");
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const existing = await schedulerStore.getParticipant(code, name);

    if (!existing) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const updates = {};

    if (scheduleInperson !== undefined) {
      updates.scheduleInperson = Array.isArray(scheduleInperson)
        ? JSON.stringify(scheduleInperson)
        : scheduleInperson;
    }
    if (scheduleVirtual !== undefined) {
      updates.scheduleVirtual = Array.isArray(scheduleVirtual)
        ? JSON.stringify(scheduleVirtual)
        : scheduleVirtual;
    }
    if (submitted !== undefined) {
      updates.submitted = submitted ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ participant: toApiParticipant(existing) });
    }

    const updated = await schedulerStore.updateParticipant(code, name, updates);

    return NextResponse.json({ participant: toApiParticipant(updated) });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const code = sp.get("code");
    const name = sp.get("name");
    if (!code || !name)
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });

    const event = await schedulerStore.getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const existing = await schedulerStore.getParticipant(code, name);

    if (!existing) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    await schedulerStore.deleteParticipantAndWeight(code, name);

    return NextResponse.json({ success: true, removed: { name } });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
