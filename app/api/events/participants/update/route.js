import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const code = sp.get("code");
    const name = sp.get("name");
    if (!code || !name)
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });

    const event = db.prepare("SELECT * FROM event WHERE code = ?").get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { scheduleInperson, scheduleVirtual, submitted } = await req.json();

    const existing = db
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
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
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
      .get(event.id, name);

    return NextResponse.json({ participant: updated });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req) {
  try {
    const sp = new URL(req.url).searchParams;
    const code = sp.get("code");
    const name = sp.get("name");
    if (!code || !name)
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });

    const event = db.prepare("SELECT * FROM event WHERE code = ?").get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const existing = db
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
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
    return NextResponse.json({ error: err.message }, { status });
  }
}
