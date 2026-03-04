jest.mock("@/lib/store", () => ({
  schedulerStore: {
    getEvent: jest.fn(),
    listParticipants: jest.fn(),
    createParticipantIfAbsent: jest.fn(),
    getParticipant: jest.fn(),
    updateParticipant: jest.fn(),
    deleteParticipantAndWeight: jest.fn(),
  },
}));

import { GET as getParticipants, POST as joinEvent } from "@/app/api/events/participants/route";
import {
  DELETE as deleteParticipant,
  PUT as updateParticipant,
} from "@/app/api/events/participants/update/route";
import { schedulerStore } from "@/lib/store";

const EVENT = {
  eventCode: "EVENT123",
  eventId: "evt-1",
  startHour: 9,
  endHour: 17,
};

describe("GET /api/events/participants?code=", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue(EVENT);
  });

  test("returns empty array when no participants exist", async () => {
    schedulerStore.listParticipants.mockResolvedValue([]);
    const res = await getParticipants(
      new Request("http://localhost/api/events/participants?code=EVENT123")
    );
    expect(res.status).toBe(200);
    const { participants } = await res.json();
    expect(participants).toEqual([]);
  });

  test("returns mapped participants", async () => {
    schedulerStore.listParticipants.mockResolvedValue([
      {
        participantId: "p-1",
        eventId: "evt-1",
        participantName: "Alice",
        scheduleInperson: "[0,1]",
        scheduleVirtual: "[1,1]",
        submitted: 1,
        createdAt: "2026-03-03T00:00:00.000Z",
      },
    ]);

    const res = await getParticipants(
      new Request("http://localhost/api/events/participants?code=EVENT123")
    );
    const { participants } = await res.json();
    expect(participants).toHaveLength(1);
    expect(participants[0].name).toBe("Alice");
    expect(participants[0].schedule_inperson).toBe("[0,1]");
    expect(participants[0].submitted).toBe(1);
  });

  test("returns 404 for unknown event code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await getParticipants(
      new Request("http://localhost/api/events/participants?code=NOTFOUND")
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/events/participants?code=", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue(EVENT);
  });

  function makeReq(body) {
    return new Request("http://localhost/api/events/participants?code=EVENT123", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("creates participant with correct default schedule length", async () => {
    schedulerStore.createParticipantIfAbsent.mockImplementation(async (payload) => {
      return {
        created: true,
        participant: {
          participantId: "p-1",
          eventId: EVENT.eventId,
          participantName: payload.participantName,
          scheduleInperson: payload.scheduleInperson,
          scheduleVirtual: payload.scheduleVirtual,
          submitted: 0,
          createdAt: "2026-03-03T00:00:00.000Z",
        },
      };
    });

    const res = await joinEvent(makeReq({ name: "Alice" }));
    expect(res.status).toBe(201);
    const { participant } = await res.json();
    expect(participant.name).toBe("Alice");
    const sched = JSON.parse(participant.schedule_inperson);
    expect(sched).toHaveLength(56);
    expect(sched.every((v) => v === 0)).toBe(true);
  });

  test("is idempotent and returns existing participant on duplicate name", async () => {
    schedulerStore.createParticipantIfAbsent.mockResolvedValue({
      created: false,
      participant: {
        participantId: "p-2",
        eventId: EVENT.eventId,
        participantName: "Bob",
        scheduleInperson: JSON.stringify(Array(56).fill(0)),
        scheduleVirtual: JSON.stringify(Array(56).fill(0)),
        submitted: 0,
        createdAt: "2026-03-03T00:00:00.000Z",
      },
    });

    const res = await joinEvent(makeReq({ name: "Bob" }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.id).toBe("p-2");
  });

  test("returns 400 when name is missing", async () => {
    const res = await joinEvent(makeReq({}));
    expect(res.status).toBe(400);
  });

  test("returns 404 for unknown event code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await joinEvent(makeReq({ name: "Alice" }));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/events/participants/update?code=&name=", () => {
  const existingParticipant = {
    participantId: "p-3",
    eventId: EVENT.eventId,
    participantName: "Charlie",
    scheduleInperson: JSON.stringify(Array(56).fill(1)),
    scheduleVirtual: JSON.stringify(Array(56).fill(1)),
    submitted: 0,
    createdAt: "2026-03-03T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue(EVENT);
    schedulerStore.getParticipant.mockResolvedValue(existingParticipant);
  });

  function makeReq(body, name = "Charlie") {
    return new Request(
      `http://localhost/api/events/participants/update?code=EVENT123&name=${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  }

  test("updates submitted flag", async () => {
    schedulerStore.updateParticipant.mockResolvedValue({ ...existingParticipant, submitted: 1 });
    const res = await updateParticipant(makeReq({ submitted: 1 }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.submitted).toBe(1);
  });

  test("updates in-person schedule", async () => {
    const newSched = JSON.stringify(Array(56).fill(0.5));
    schedulerStore.updateParticipant.mockResolvedValue({
      ...existingParticipant,
      scheduleInperson: newSched,
    });

    const res = await updateParticipant(makeReq({ scheduleInperson: newSched }));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.schedule_inperson).toBe(newSched);
  });

  test("returns participant unchanged when no fields provided", async () => {
    const res = await updateParticipant(makeReq({}));
    expect(res.status).toBe(200);
    const { participant } = await res.json();
    expect(participant.submitted).toBe(0);
    expect(schedulerStore.updateParticipant).not.toHaveBeenCalled();
  });

  test("returns 404 for unknown participant", async () => {
    schedulerStore.getParticipant.mockResolvedValue(null);
    const res = await updateParticipant(makeReq({ submitted: 1 }, "NoSuchPerson"));
    expect(res.status).toBe(404);
  });

  test("returns 404 for unknown event code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await updateParticipant(makeReq({ submitted: 1 }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/events/participants/update?code=&name=", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue(EVENT);
    schedulerStore.getParticipant.mockResolvedValue({ participantName: "Dana" });
    schedulerStore.deleteParticipantAndWeight.mockResolvedValue(undefined);
  });

  function makeReq(name = "Dana") {
    return new Request(
      `http://localhost/api/events/participants/update?code=EVENT123&name=${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
  }

  test("deletes participant and associated weight", async () => {
    const res = await deleteParticipant(makeReq());
    expect(res.status).toBe(200);
    expect(schedulerStore.deleteParticipantAndWeight).toHaveBeenCalledWith("EVENT123", "Dana");
  });

  test("returns 404 for unknown participant", async () => {
    schedulerStore.getParticipant.mockResolvedValue(null);
    const res = await deleteParticipant(makeReq("NoSuchPerson"));
    expect(res.status).toBe(404);
  });
});
