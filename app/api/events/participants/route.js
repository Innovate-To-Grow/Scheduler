import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function getEvent(code) {
  return db.prepare("SELECT * FROM event WHERE code = ?").get(code);
}

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const participants = db
      .prepare("SELECT * FROM participant WHERE event_id = ? ORDER BY name ASC")
      .all(event.id);

    return NextResponse.json({ participants });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = getEvent(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { name } = await req.json();
    const trimmedName = (name || "").trim();
    if (!trimmedName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (trimmedName.length > 100)
      return NextResponse.json({ error: "Name too long (max 100)" }, { status: 400 });

    const numSlots = (event.end_hour - event.start_hour) * 7;
    const defaultSchedule = JSON.stringify(Array(numSlots).fill(0));

    const existing = db
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
      .get(event.id, trimmedName);

    if (existing) {
      return NextResponse.json({ participant: existing });
    }

    try {
      const info = db
        .prepare(
          "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
        )
        .run(event.id, trimmedName, defaultSchedule, defaultSchedule);

      const participant = db
        .prepare("SELECT * FROM participant WHERE id = ?")
        .get(info.lastInsertRowid);
      return NextResponse.json({ participant }, { status: 201 });
    } catch (insertErr) {
      if (insertErr.code === "SQLITE_CONSTRAINT_UNIQUE") {
        const found = db
          .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
          .get(event.id, trimmedName);
        return NextResponse.json({ participant: found });
      }
      throw insertErr;
    }
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
