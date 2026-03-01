import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = db.prepare("SELECT * FROM event WHERE code = ?").get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const weights = db
      .prepare(
        "SELECT participant_name, weight, included FROM participant_weight WHERE event_id = ?"
      )
      .all(event.id);

    return NextResponse.json({ weights });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = db.prepare("SELECT * FROM event WHERE code = ?").get(code);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const { weights } = await req.json();
    if (!Array.isArray(weights)) {
      return NextResponse.json({ error: "weights must be an array" }, { status: 400 });
    }

    const participantNames = db
      .prepare("SELECT name FROM participant WHERE event_id = ?")
      .all(event.id)
      .map((r) => r.name);

    for (const item of weights) {
      const participantName = item.participantName ?? item.name;
      const w = Number(item.weight !== undefined ? item.weight : 1.0);
      if (!participantName || !Number.isFinite(w) || w < 0 || w > 1) {
        return NextResponse.json({ error: "Invalid weight entry" }, { status: 400 });
      }
      if (item.included !== undefined && item.included !== 0 && item.included !== 1) {
        return NextResponse.json({ error: "Invalid included value" }, { status: 400 });
      }
      if (!participantNames.includes(participantName)) {
        return NextResponse.json(
          { error: `Participant '${participantName}' not found` },
          { status: 400 }
        );
      }
    }

    const upsert = db.prepare(`
      INSERT INTO participant_weight (event_id, participant_name, weight, included)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id, participant_name)
      DO UPDATE SET weight = excluded.weight, included = excluded.included
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        const participantName = item.participantName ?? item.name;
        upsert.run(
          event.id,
          participantName,
          item.weight !== undefined ? item.weight : 1.0,
          item.included !== undefined ? item.included : 1
        );
      }
    });

    transaction(weights);

    const updated = db
      .prepare(
        "SELECT participant_name, weight, included FROM participant_weight WHERE event_id = ?"
      )
      .all(event.id);

    return NextResponse.json({ weights: updated });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
