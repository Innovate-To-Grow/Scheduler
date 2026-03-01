jest.mock("@/lib/db", () => {
  const Database = require("better-sqlite3");
  const fs = require("fs");
  const path = require("path");
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib/schema.sql"), "utf8"));
  return { db, initDatabase: jest.fn() };
});

import { POST as createEvent, GET as getEvent } from "@/app/api/events/route";
import { generateEventCode, hashPassword } from "@/lib/crypto";

let db;

beforeAll(() => {
  db = jest.requireMock("@/lib/db").db;
});

beforeEach(() => {
  db.exec("DELETE FROM participant_weight");
  db.exec("DELETE FROM participant");
  db.exec("DELETE FROM event");
});

// ── POST /api/events ─────────────────────────────────────────────────────────

describe("POST /api/events", () => {
  function makeReq(body) {
    return new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("creates an event and returns 201 with event data", async () => {
    const res = await createEvent(
      makeReq({
        name: "Team Sync",
        startHour: 9,
        endHour: 17,
        location: "Room A",
      })
    );
    expect(res.status).toBe(201);
    const { event } = await res.json();
    expect(event.name).toBe("Team Sync");
    expect(event.startHour).toBe(9);
    expect(event.endHour).toBe(17);
    expect(event.code).toHaveLength(8);
    expect(event.code).toMatch(/^[A-Za-z0-9]+$/);
  });

  test("persists the event in the database", async () => {
    const res = await createEvent(
      makeReq({
        name: "Persisted",
        startHour: 8,
        endHour: 20,
        location: "HQ",
      })
    );
    const { event } = await res.json();
    const row = db.prepare("SELECT * FROM event WHERE code = ?").get(event.code);
    expect(row).not.toBeNull();
    expect(row.name).toBe("Persisted");
    expect(row.start_hour).toBe(8);
    expect(row.end_hour).toBe(20);
  });

  test("does not include a password in the response", async () => {
    const res = await createEvent(
      makeReq({
        name: "Secret",
        startHour: 9,
        endHour: 17,
        location: "Office",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.event.password).toBeUndefined();
  });

  test("uses default time range (9–17) when not provided", async () => {
    const res = await createEvent(makeReq({ name: "Defaults", location: "HQ" }));
    const { event } = await res.json();
    expect(event.startHour).toBe(9);
    expect(event.endHour).toBe(17);
  });

  test("returns 400 when name is missing", async () => {
    const res = await createEvent(makeReq({ startHour: 9, endHour: 17 }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  test("returns 400 when location is missing for in-person events", async () => {
    const res = await createEvent(
      makeReq({ name: "Meeting", startHour: 9, endHour: 17, mode: "inperson" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when startHour >= endHour", async () => {
    const res = await createEvent(
      makeReq({ name: "Bad Time", startHour: 17, endHour: 9, location: "HQ" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when startHour equals endHour", async () => {
    const res = await createEvent(
      makeReq({ name: "Equal", startHour: 10, endHour: 10, location: "HQ" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when endHour exceeds 24", async () => {
    const res = await createEvent(
      makeReq({ name: "Late", startHour: 0, endHour: 25, location: "HQ" })
    );
    expect(res.status).toBe(400);
  });
});

// ── GET /api/events?code= ─────────────────────────────────────────────────────

describe("GET /api/events?code=", () => {
  let code;

  beforeEach(() => {
    code = generateEventCode();
    db.prepare(
      "INSERT INTO event (code, name, password_hash, start_hour, end_hour) VALUES (?, ?, ?, ?, ?)"
    ).run(code, "Existing Event", hashPassword("pw"), 10, 18);
  });

  test("returns 200 with event metadata", async () => {
    const res = await getEvent(new Request(`http://localhost/api/events?code=${code}`));
    expect(res.status).toBe(200);
    const { event } = await res.json();
    expect(event.code).toBe(code);
    expect(event.name).toBe("Existing Event");
    expect(event.startHour).toBe(10);
    expect(event.endHour).toBe(18);
    expect(event.createdAt).toBeTruthy();
  });

  test("does not expose the password hash", async () => {
    const res = await getEvent(new Request(`http://localhost/api/events?code=${code}`));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("password");
  });

  test("returns 404 for an unknown code", async () => {
    const res = await getEvent(new Request(`http://localhost/api/events?code=XXXXXXXX`));
    expect(res.status).toBe(404);
  });
});
