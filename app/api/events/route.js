import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateEventCode, hashPassword } from "@/lib/crypto";

export async function GET(req) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });

    const event = db
      .prepare(
        "SELECT code, name, start_hour, end_hour, days, mode, location, created_at FROM event WHERE code = ?"
      )
      .get(code);

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    return NextResponse.json({
      event: {
        code: event.code,
        name: event.name,
        startHour: event.start_hour,
        endHour: event.end_hour,
        days: JSON.parse(event.days || "[1,2,3,4,5]"),
        mode: event.mode || "inperson",
        location: event.location || "",
        createdAt: event.created_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, password, startHour, endHour, days, mode, location } = await req.json();

    const trimmedName = (name || "").trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (trimmedName.length > 200) {
      return NextResponse.json({ error: "Event name too long (max 200)" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    if (password.length > 200) {
      return NextResponse.json({ error: "Password too long (max 200)" }, { status: 400 });
    }

    if (mode && !["virtual", "inperson"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'inperson' or 'virtual'" },
        { status: 400 }
      );
    }

    const start = startHour !== undefined ? startHour : 9;
    const end = endHour !== undefined ? endHour : 17;

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      return NextResponse.json({ error: "Hours must be integers" }, { status: 400 });
    }

    const selectedDays = Array.isArray(days) && days.length > 0 ? days : [1, 2, 3, 4, 5];
    if (!selectedDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
      return NextResponse.json({ error: "Days must be integers 0-6" }, { status: 400 });
    }
    const eventMode = mode || "inperson";
    const eventLocation = eventMode !== "virtual" ? (location || "").trim() : "";

    if (start >= end || start < 0 || end > 24) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    }
    if (eventMode !== "virtual" && !eventLocation) {
      return NextResponse.json(
        { error: "Location is required for in-person events" },
        { status: 400 }
      );
    }

    const daysJson = JSON.stringify(selectedDays);
    const passwordHash = hashPassword(password);

    // Retry up to 3 times for code collision
    let code;
    for (let attempt = 0; attempt < 3; attempt++) {
      code = generateEventCode();
      const existing = db.prepare("SELECT id FROM event WHERE code = ?").get(code);
      if (!existing) break;
      if (attempt === 2) {
        return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
      }
    }

    db.prepare(
      "INSERT INTO event (code, name, password_hash, start_hour, end_hour, days, mode, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(code, trimmedName, passwordHash, start, end, daysJson, eventMode, eventLocation);

    return NextResponse.json(
      {
        event: {
          code,
          name: trimmedName,
          startHour: start,
          endHour: end,
          days: selectedDays,
          mode: eventMode,
          location: eventLocation,
        },
        password,
      },
      { status: 201 }
    );
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
