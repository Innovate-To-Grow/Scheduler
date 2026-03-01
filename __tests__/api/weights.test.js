jest.mock("@/lib/db", () => {
  const Database = require("better-sqlite3");
  const fs = require("fs");
  const path = require("path");
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib/schema.sql"), "utf8"));
  return { db, initDatabase: jest.fn() };
});

import { POST as verifyEvent } from "@/app/api/events/verify/route";
import { GET as getWeights, PUT as updateWeights } from "@/app/api/events/weights/route";
import { generateEventCode, hashPassword } from "@/lib/crypto";

let db;
let eventCode;
let eventId;

beforeAll(() => {
  db = jest.requireMock("@/lib/db").db;
});

afterAll(() => {
  db.close();
});

beforeEach(() => {
  db.exec("DELETE FROM participant_weight");
  db.exec("DELETE FROM participant");
  db.exec("DELETE FROM event");

  eventCode = generateEventCode();
  const passwordHash = hashPassword("eventpass");
  const res = db
    .prepare(
      "INSERT INTO event (code, name, password_hash, start_hour, end_hour) VALUES (?, ?, ?, ?, ?)"
    )
    .run(eventCode, "Weighted Event", passwordHash, 9, 17);
  eventId = res.lastInsertRowid;

  // Seed two participants
  const sched = JSON.stringify(Array(56).fill(1));
  db.prepare(
    "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
  ).run(eventId, "Alice", sched, sched);
  db.prepare(
    "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
  ).run(eventId, "Bob", sched, sched);
});

// ── POST /api/events/verify ────────────────────────────────────────────────────────

describe("POST /api/events/verify", () => {
  function makeReq(body) {
    return new Request("http://localhost/api/events/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("returns valid: true for correct password", async () => {
    const res = await verifyEvent(makeReq({ code: eventCode, password: "eventpass" }));
    expect(res.status).toBe(200);
    const { valid } = await res.json();
    expect(valid).toBe(true);
  });

  test("returns valid: false for wrong password", async () => {
    const res = await verifyEvent(makeReq({ code: eventCode, password: "wrongpass" }));
    expect(res.status).toBe(200);
    const { valid } = await res.json();
    expect(valid).toBe(false);
  });

  test("returns 404 for unknown event code", async () => {
    const res = await verifyEvent(makeReq({ code: "XXXXXXXX", password: "eventpass" }));
    expect(res.status).toBe(404);
  });

  test("returns 400 when fields are missing", async () => {
    const res1 = await verifyEvent(makeReq({ code: eventCode }));
    expect(res1.status).toBe(400);

    const res2 = await verifyEvent(makeReq({ password: "eventpass" }));
    expect(res2.status).toBe(400);
  });
});

// ── GET /api/events/weights?code= ────────────────────────────────────────────

describe("GET /api/events/weights?code=", () => {
  test("returns weights array", async () => {
    const res = await getWeights(
      new Request(`http://localhost/api/events/weights?code=${eventCode}`)
    );
    expect(res.status).toBe(200);
    const { weights } = await res.json();
    expect(Array.isArray(weights)).toBe(true);
  });

  test("returns 404 for unknown event code", async () => {
    const res = await getWeights(
      new Request(`http://localhost/api/events/weights?code=XXXXXXXX`)
    );
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/events/weights?code= ────────────────────────────────────────────

describe("PUT /api/events/weights?code=", () => {
  function makeReq(body) {
    return new Request(`http://localhost/api/events/weights?code=${eventCode}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("upserts weights and returns updated list", async () => {
    const res = await updateWeights(
      makeReq({ weights: [{ name: "Alice", weight: 0.8, included: 1 }] })
    );
    expect(res.status).toBe(200);
    const { weights } = await res.json();
    expect(weights).toHaveLength(1);
    expect(weights[0].participant_name).toBe("Alice");
    expect(weights[0].weight).toBe(0.8);
    expect(weights[0].included).toBe(1);
  });

  test("accepts participantName key as well as name", async () => {
    const res = await updateWeights(
      makeReq({ weights: [{ participantName: "Alice", weight: 0.7, included: 1 }] })
    );
    expect(res.status).toBe(200);
    const { weights } = await res.json();
    expect(weights[0].participant_name).toBe("Alice");
    expect(weights[0].weight).toBe(0.7);
  });

  test("overwrites previous weight on second PUT (upsert behaviour)", async () => {
    await updateWeights(makeReq({ weights: [{ name: "Alice", weight: 0.5, included: 1 }] }));
    const res = await updateWeights(
      makeReq({ weights: [{ name: "Alice", weight: 0.9, included: 0 }] })
    );
    const { weights } = await res.json();
    expect(weights).toHaveLength(1);
    expect(weights[0].weight).toBe(0.9);
    expect(weights[0].included).toBe(0);
  });

  test("defaults weight to 1.0 and included to 1 when not provided", async () => {
    const res = await updateWeights(makeReq({ weights: [{ name: "Bob" }] }));
    const { weights } = await res.json();
    expect(weights[0].weight).toBe(1.0);
    expect(weights[0].included).toBe(1);
  });

  test("bulk-upserts multiple participants in one request", async () => {
    const res = await updateWeights(
      makeReq({
        weights: [
          { name: "Alice", weight: 0.6, included: 1 },
          { name: "Bob", weight: 0.4, included: 0 },
        ],
      })
    );
    const { weights } = await res.json();
    expect(weights).toHaveLength(2);
  });

  test("returns 400 when weights is not an array", async () => {
    const res = await updateWeights(makeReq({ weights: "bad" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when a weight is out of range", async () => {
    const res = await updateWeights(
      makeReq({ weights: [{ name: "Alice", weight: 1.5 }] })
    );
    expect(res.status).toBe(400);
  });
});
