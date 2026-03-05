import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("../../lib/store/index.js", () => ({
  schedulerStore: {
    getEvent: jest.fn(),
    createEvent: jest.fn(),
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    listUserEvents: jest.fn(),
    createUserEvent: jest.fn(),
  },
}));

const { schedulerStore } = await import("../../lib/store/index.js");
const { default: app } = await import("../../server.js");

describe("POST /api/auth/signup", () => {
  beforeEach(() => jest.clearAllMocks());

  test("creates a new user and returns 201 with cookie", async () => {
    schedulerStore.getUserByEmail.mockResolvedValue(null);
    schedulerStore.createUser.mockResolvedValue(undefined);

    const res = await request(app).post("/api/auth/signup").send({
      email: "test@example.com",
      password: "secret123",
      displayName: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.displayName).toBe("Test User");
    expect(res.body.user.id).toBeTruthy();
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(schedulerStore.createUser).toHaveBeenCalledTimes(1);
  });

  test("returns 409 for duplicate email", async () => {
    schedulerStore.getUserByEmail.mockResolvedValue({ userId: "existing" });

    const res = await request(app).post("/api/auth/signup").send({
      email: "test@example.com",
      password: "secret123",
      displayName: "Test User",
    });

    expect(res.status).toBe(409);
  });

  test("returns 400 for invalid email", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: "notanemail",
      password: "secret123",
      displayName: "Test",
    });

    expect(res.status).toBe(400);
  });

  test("returns 400 for short password", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: "test@example.com",
      password: "12345",
      displayName: "Test",
    });

    expect(res.status).toBe(400);
  });

  test("returns 400 for missing display name", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      email: "test@example.com",
      password: "secret123",
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns 401 for wrong email", async () => {
    schedulerStore.getUserByEmail.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "secret123",
    });

    expect(res.status).toBe(401);
  });

  test("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/logout", () => {
  test("clears cookie and returns success", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/auth/me", () => {
  test("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/settings", () => {
  test("returns 401 without token", async () => {
    const res = await request(app)
      .put("/api/auth/settings")
      .send({ displayName: "New Name" });
    expect(res.status).toBe(401);
  });
});
