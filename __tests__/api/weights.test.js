jest.mock("@/lib/store", () => ({
  schedulerStore: {
    getEvent: jest.fn(),
    listWeights: jest.fn(),
    listParticipantNames: jest.fn(),
    upsertWeights: jest.fn(),
  },
}));

import { POST as verifyEvent } from "@/app/api/events/verify/route";
import { GET as getWeights, PUT as updateWeights } from "@/app/api/events/weights/route";
import { hashPassword } from "@/lib/crypto";
import { schedulerStore } from "@/lib/store";

const EVENT = {
  eventCode: "EVENT123",
  passwordHash: hashPassword("eventpass"),
};

describe("POST /api/events/verify", () => {
  function makeReq(body) {
    return new Request("http://localhost/api/events/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue(EVENT);
  });

  test("returns valid: true for correct password", async () => {
    const res = await verifyEvent(makeReq({ code: "EVENT123", password: "eventpass" }));
    expect(res.status).toBe(200);
    const { valid } = await res.json();
    expect(valid).toBe(true);
  });

  test("returns valid: false for wrong password", async () => {
    const res = await verifyEvent(makeReq({ code: "EVENT123", password: "wrongpass" }));
    expect(res.status).toBe(200);
    const { valid } = await res.json();
    expect(valid).toBe(false);
  });

  test("returns 404 for unknown event code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await verifyEvent(makeReq({ code: "XXXXXXXX", password: "eventpass" }));
    expect(res.status).toBe(404);
  });

  test("returns 400 when fields are missing", async () => {
    const res1 = await verifyEvent(makeReq({ code: "EVENT123" }));
    expect(res1.status).toBe(400);

    const res2 = await verifyEvent(makeReq({ password: "eventpass" }));
    expect(res2.status).toBe(400);
  });
});

describe("GET /api/events/weights?code=", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue({ eventCode: "EVENT123" });
  });

  test("returns weights array", async () => {
    schedulerStore.listWeights.mockResolvedValue([
      { participantName: "Alice", weight: 0.8, included: 1 },
      { participantName: "Bob", weight: 0.4, included: 0 },
    ]);

    const res = await getWeights(new Request("http://localhost/api/events/weights?code=EVENT123"));
    expect(res.status).toBe(200);
    const { weights } = await res.json();
    expect(weights).toHaveLength(2);
    expect(weights[0].participant_name).toBe("Alice");
  });

  test("returns 404 for unknown event code", async () => {
    schedulerStore.getEvent.mockResolvedValue(null);
    const res = await getWeights(new Request("http://localhost/api/events/weights?code=XXXXXXXX"));
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/events/weights?code=", () => {
  function makeReq(body) {
    return new Request("http://localhost/api/events/weights?code=EVENT123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerStore.getEvent.mockResolvedValue({ eventCode: "EVENT123" });
    schedulerStore.listParticipantNames.mockResolvedValue(["Alice", "Bob"]);
    schedulerStore.upsertWeights.mockResolvedValue(undefined);
    schedulerStore.listWeights.mockResolvedValue([
      { participantName: "Alice", weight: 0.8, included: 1 },
    ]);
  });

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
    expect(schedulerStore.upsertWeights).toHaveBeenCalledWith("EVENT123", [
      { participantName: "Alice", weight: 0.7, included: 1 },
    ]);
  });

  test("defaults weight to 1.0 and included to 1 when not provided", async () => {
    await updateWeights(makeReq({ weights: [{ name: "Bob" }] }));
    expect(schedulerStore.upsertWeights).toHaveBeenCalledWith("EVENT123", [
      { participantName: "Bob", weight: 1, included: 1 },
    ]);
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
    expect(res.status).toBe(200);
    expect(schedulerStore.upsertWeights).toHaveBeenCalledTimes(1);
  });

  test("returns 400 when weights is not an array", async () => {
    const res = await updateWeights(makeReq({ weights: "bad" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when a weight is out of range", async () => {
    const res = await updateWeights(makeReq({ weights: [{ name: "Alice", weight: 1.5 }] }));
    expect(res.status).toBe(400);
  });

  test("returns 400 when participant does not exist", async () => {
    const res = await updateWeights(makeReq({ weights: [{ name: "Ghost", weight: 0.5 }] }));
    expect(res.status).toBe(400);
  });
});
