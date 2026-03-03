import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const code = sp.get("code");
    const name = sp.get("name");
    if (!code || !name)
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });

    const event = db
      .prepare("SELECT id, start_hour, end_hour FROM event WHERE code = ?")
      .get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { scheduleInperson, scheduleVirtual, submitted } = await req.json();
    const expectedLength = (event.end_hour - event.start_hour) * 7;

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

    const existing = db
      .prepare(
        "SELECT id, event_id, name, schedule_inperson, schedule_virtual, submitted, created_at FROM participant WHERE event_id = ? AND name = ?"
      )
      .get(event.id, name);

    if (!existing) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const updates = [];
    const queryParams = [];

    if (scheduleInperson !== undefined) {
      updates.push("schedule_inperson = ?");
      queryParams.push(
        Array.isArray(scheduleInperson) ? JSON.stringify(scheduleInperson) : scheduleInperson
      );
    }
    if (scheduleVirtual !== undefined) {
      updates.push("schedule_virtual = ?");
      queryParams.push(
        Array.isArray(scheduleVirtual) ? JSON.stringify(scheduleVirtual) : scheduleVirtual
      );
    }
    if (submitted !== undefined) {
      updates.push("submitted = ?");
      queryParams.push(submitted ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ participant: existing });
    }

    queryParams.push(event.id, name);
    db.prepare(`UPDATE participant SET ${updates.join(", ")} WHERE event_id = ? AND name = ?`).run(
      ...queryParams
    );

    const updated = db
      .prepare(
        "SELECT id, event_id, name, schedule_inperson, schedule_virtual, submitted, created_at FROM participant WHERE event_id = ? AND name = ?"
      )
      .get(event.id, name);

    return NextResponse.json({ participant: updated });
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

    const event = db.prepare("SELECT id FROM event WHERE code = ?").get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const existing = db
      .prepare("SELECT id FROM participant WHERE event_id = ? AND name = ?")
      .get(event.id, name);

    if (!existing) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const tx = db.transaction(() => {
      db.prepare("DELETE FROM participant_weight WHERE event_id = ? AND participant_name = ?").run(
        event.id,
        name
      );
      db.prepare("DELETE FROM participant WHERE event_id = ? AND name = ?").run(event.id, name);
    });

    tx();

    return NextResponse.json({ success: true, removed: { name } });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
