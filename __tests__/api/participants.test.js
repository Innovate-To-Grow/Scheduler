jest.mock("@/lib/db", () => {
  const Database = require("better-sqlite3");
  const fs = require("fs");
  const path = require("path");
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib/schema.sql"), "utf8"));
  return { db, initDatabase: jest.fn() };
});

import { GET as getParticipants, POST as joinEvent } from "@/app/api/events/participants/route";
import {
  DELETE as deleteParticipant,
  PUT as updateParticipant,
} from "@/app/api/events/participants/update/route";
import { generateEventCode, hashPassword } from "@/lib/crypto";
import { DAYS_PER_WEEK } from "@/lib/constants";

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
  const res = db
    .prepare(
      "INSERT INTO event (code, name, password_hash, start_hour, end_hour) VALUES (?, ?, ?, ?, ?)"
    )
    .run(eventCode, "Test Event", hashPassword("pw"), 9, 17);
  eventId = res.lastInsertRowid;
});

// ── GET /api/events/participants?code= ─────────────────────────────────────

describe("GET /api/events/participants?code=", () => {
  test("returns empty array when no participants exist", async () => {
    const res = await getParticipants(
      new Request(`http://localhost/api/events/participants?code=${eventCode}`)
    );
    expect(res.status).toBe(200);
    const { participants } = await res.json();
    expect(participants).toEqual([]);
  });

  test("returns participants ordered by name ascending", async () => {
    const defaultSched = JSON.stringify(Array(56).fill(1));
    db.prepare(
      "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
    ).run(eventId, "Zach", defaultSched, defaultSched);
    db.prepare(
      "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
    ).run(eventId, "Alice", defaultSched, defaultSched);

    const res = await getParticipants(
      new Request(`http://localhost/api/events/participants?code=${eventCode}`)
    );
    const { participants } = await res.json();
    expect(participants).toHaveLength(2);
    expect(participants[0].name).toBe("Alice");
    expect(participants[1].name).toBe("Zach");
  });

  test("returns 404 for unknown event code", async () => {
    const res = await getParticipants(
      new Request(`http://localhost/api/events/participants?code=NOTFOUND`)
    );
    expect(res.status).toBe(404);
  });
});

// ── POST /api/events/participants?code= ────────────────────────────────────

describe("POST /api/events/participants?code=", () => {
  function makeReq(body) {
    return new Request(`http://localhost/api/events/participants?code=${eventCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("creates participant with correct default schedule length", async () => {
    const res = await joinEvent(makeReq({ name: "Alice" }));
    expect(res.status).toBe(201);
    const { participant } = await res.json();
    expect(participant.name).toBe("Alice");
    // (17 - 9) * DAYS_PER_WEEK = 56 slots, all 0 (unset/busy by default)
    const sched = JSON.parse(participant.schedule_inperson);
    expect(sched).toHaveLength(56);
    expect(sched.every((v) => v === 0)).toBe(true);
  });

  test("is idempotent — returns existing participant on duplicate name", async () => {
    const body = { name: "Bob" };
    const res1 = await joinEvent(makeReq(body));
    const res2 = await joinEvent(makeReq(body));

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(200);

    const d1 = await res1.json();
    const d2 = await res2.json();
    expect(d1.participant.id).toBe(d2.participant.id);
  });

  test("does not create duplicate DB rows for same name", async () => {
    await joinEvent(makeReq({ name: "Carol" }));
    await joinEvent(makeReq({ name: "Carol" }));
    const rows = db
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
      .all(eventId, "Carol");
    expect(rows).toHaveLength(1);
  });

  test("returns 400 when name is missing", async () => {
    const res = await joinEvent(makeReq({}));
    expect(res.status).toBe(400);
  });

  test("returns 404 for unknown event code", async () => {
    const res = await joinEvent(
      new Request(`http://localhost/api/events/participants?code=BADCODE`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice" }),
      })
    );
    expect(res.status).toBe(404);
  });
});

// ── PUT /api/events/participants/update?code=&name= ───────────────────────────────────────────────

describe("PUT /api/events/participants/update?code=&name=", () => {
  const participantName = "Charlie";

  beforeEach(() => {
    const numSlots = (17 - 9) * DAYS_PER_WEEK;
    const defaultSched = JSON.stringify(Array(numSlots).fill(1));
    db.prepare(
      "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
    ).run(eventId, participantName, defaultSched, defaultSched);
  });

  function makeReq(body, name = participantName) {
    return new Request(
      `http://localhost/api/events/participants/update?code=${eventCode}&name=${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  }

  test("updates submitted flag to 1", async () => {
    const res = await updateParticipant(makeReq({ submitted: 1 }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.submitted).toBe(1);
  });

  test("updates in-person schedule", async () => {
    const newSched = JSON.stringify(Array(56).fill(0.5));
    const res = await updateParticipant(makeReq({ scheduleInperson: newSched }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.schedule_inperson).toBe(newSched);
  });

  test("updates virtual schedule", async () => {
    const newSched = JSON.stringify(Array(56).fill(0));
    const res = await updateParticipant(makeReq({ scheduleVirtual: newSched }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.schedule_virtual).toBe(newSched);
  });

  test("returns participant unchanged when no fields provided", async () => {
    const res = await updateParticipant(makeReq({}));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.submitted).toBe(0);
  });

  test("returns 404 for unknown participant name", async () => {
    const res = await updateParticipant(makeReq({ submitted: 1 }, "NoSuchPerson"));
    expect(res.status).toBe(404);
  });

  test("returns 404 for unknown event code", async () => {
    const res = await updateParticipant(
      new Request(
        `http://localhost/api/events/participants/update?code=BADCODE&name=${participantName}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submitted: 1 }),
        }
      )
    );
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/events/participants/update?code=&name= ────────────────────────────

describe("DELETE /api/events/participants/update?code=&name=", () => {
  const participantName = "Dana";

  beforeEach(() => {
    const numSlots = (17 - 9) * DAYS_PER_WEEK;
    const defaultSched = JSON.stringify(Array(numSlots).fill(0));
    db.prepare(
      "INSERT INTO participant (event_id, name, schedule_inperson, schedule_virtual) VALUES (?, ?, ?, ?)"
    ).run(eventId, participantName, defaultSched, defaultSched);
    db.prepare(
      "INSERT INTO participant_weight (event_id, participant_name, weight, included) VALUES (?, ?, ?, ?)"
    ).run(eventId, participantName, 0.8, 1);
  });

  function makeReq(name = participantName) {
    return new Request(
      `http://localhost/api/events/participants/update?code=${eventCode}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
  }

  test("deletes participant and associated participant_weight", async () => {
    const res = await deleteParticipant(makeReq());
    expect(res.status).toBe(200);

    const removed = db
      .prepare("SELECT * FROM participant WHERE event_id = ? AND name = ?")
      .get(eventId, participantName);
    expect(removed).toBeUndefined();

    const removedWeight = db
      .prepare("SELECT * FROM participant_weight WHERE event_id = ? AND participant_name = ?")
      .get(eventId, participantName);
    expect(removedWeight).toBeUndefined();
  });

  test("returns 404 for unknown participant name", async () => {
    const res = await deleteParticipant(makeReq("NoSuchPerson"));
    expect(res.status).toBe(404);
  });
});
