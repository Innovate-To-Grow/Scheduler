jest.mock("@/lib/store", () => ({
  schedulerStore: {
    getEvent: jest.fn(),
    createEvent: jest.fn(),
  },
}));

import { GET as getEventHandler, POST as createEventHandler } from "@/app/api/events/route";
import { schedulerStore } from "@/lib/store";

describe("POST /api/events", () => {
  function makeReq(body) {
    return new Request("http://localhost/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.createEvent.mockResolvedValue(true);
  });

  test("creates an event and returns 201 with event data", async () => {
    const res = await createEventHandler(
      makeReq({
        name: "Team Sync",
        password: "secret123",
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

  test("hashes password before storing", async () => {
    await createEventHandler(
      makeReq({
        name: "Persisted",
        password: "mypass",
        startHour: 8,
        endHour: 20,
        location: "HQ",
      })
    );

    expect(schedulerStore.createEvent).toHaveBeenCalledTimes(1);
    const payload = schedulerStore.createEvent.mock.calls[0][0];
    expect(payload.passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(payload.passwordHash).not.toContain("mypass");
  });

  test("returns password in response for redirect", async () => {
    const res = await createEventHandler(
      makeReq({
        name: "WithPass",
        password: "secret123",
        startHour: 9,
        endHour: 17,
        location: "Office",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.password).toBe("secret123");
    expect(body.event.password).toBeUndefined();
  });

  test("uses default time range (9-17) when not provided", async () => {
    const res = await createEventHandler(
      makeReq({ name: "Defaults", password: "pw", location: "HQ" })
    );
    const { event } = await res.json();
    expect(event.startHour).toBe(9);
    expect(event.endHour).toBe(17);
  });

  test("returns 400 when name is missing", async () => {
    const res = await createEventHandler(makeReq({ password: "pw", startHour: 9, endHour: 17 }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toBeTruthy();
  });

  test("returns 400 when password is missing", async () => {
    const res = await createEventHandler(
      makeReq({ name: "NoPass", startHour: 9, endHour: 17, location: "HQ" })
    );
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/password/i);
  });

  test("returns 400 when location is missing for in-person events", async () => {
    const res = await createEventHandler(
      makeReq({ name: "Meeting", password: "pw", startHour: 9, endHour: 17, mode: "inperson" })
    );
    expect(res.status).toBe(400);
  });

  test("rejects mode 'both'", async () => {
    const res = await createEventHandler(
      makeReq({
        name: "Hybrid",
        password: "pw",
        startHour: 9,
        endHour: 17,
        mode: "both",
        location: "HQ",
      })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when startHour >= endHour", async () => {
    const res = await createEventHandler(
      makeReq({ name: "Bad Time", password: "pw", startHour: 17, endHour: 9, location: "HQ" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 400 when endHour exceeds 24", async () => {
    const res = await createEventHandler(
      makeReq({ name: "Late", password: "pw", startHour: 0, endHour: 25, location: "HQ" })
    );
    expect(res.status).toBe(400);
  });

  test("returns 500 when code collisions exceed retry limit", async () => {
    schedulerStore.createEvent.mockResolvedValue(false);
    const res = await createEventHandler(
      makeReq({ name: "Collision", password: "pw", startHour: 9, endHour: 10, location: "HQ" })
    );
    expect(res.status).toBe(500);
    expect(schedulerStore.createEvent).toHaveBeenCalledTimes(3);
  });
});

describe("GET /api/events?code=", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 with event metadata", async () => {
    schedulerStore.getEvent.mockResolvedValue({
      eventCode: "ABC12345",
      name: "Existing Event",
      startHour: 10,
      endHour: 18,
      days: [1, 2, 3],
      mode: "inperson",
      location: "Office",
      createdAt: "2026-03-03T00:00:00.000Z",
    });

    const res = await getEventHandler(new Request("http://localhost/api/events?code=ABC12345"));
    expect(res.status).toBe(200);
    const { event } = await res.json();
    expect(event.code).toBe("ABC12345");
    expect(event.name).toBe("Existing Event");
    expect(event.startHour).toBe(10);
    expect(event.endHour).toBe(18);
    expect(event.days).toEqual([1, 2, 3]);
    expect(event.mode).toBe("inperson");
    expect(event.createdAt).toBeTruthy();
  });

  test("does not expose password hash", async () => {
    schedulerStore.getEvent.mockResolvedValue({
      eventCode: "ABC12345",
      name: "Existing Event",
      passwordHash: "secret-hash",
      startHour: 10,
      endHour: 18,
      days: [1, 2, 3],
      mode: "inperson",
      location: "Office",
      createdAt: "2026-03-03T00:00:00.000Z",
    });
    const res = await getEventHandler(new Request("http://localhost/api/events?code=ABC12345"));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("password");
  });

  test("returns 404 for unknown code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await getEventHandler(new Request("http://localhost/api/events?code=XXXXXXXX"));
    expect(res.status).toBe(404);
  });
});
