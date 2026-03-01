const { generateEventCode, hashPassword, verifyPassword } = require("@/lib/crypto");

describe("generateEventCode", () => {
  test("returns string of default length 8", () => {
    expect(generateEventCode()).toHaveLength(8);
  });

  test("contains only alphanumeric characters", () => {
    expect(generateEventCode()).toMatch(/^[A-Za-z0-9]+$/);
  });

  test("respects custom length", () => {
    expect(generateEventCode(4)).toHaveLength(4);
    expect(generateEventCode(16)).toHaveLength(16);
  });

  test("generates unique codes across many calls", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateEventCode()));
    expect(codes.size).toBeGreaterThan(190);
  });
});

describe("hashPassword", () => {
  test("returns a 64-character hex string (SHA-256)", () => {
    const hash = hashPassword("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  test("is deterministic for the same input", () => {
    expect(hashPassword("password")).toBe(hashPassword("password"));
  });

  test("different inputs produce different hashes", () => {
    expect(hashPassword("foo")).not.toBe(hashPassword("bar"));
  });

  test("is case-sensitive", () => {
    expect(hashPassword("Secret")).not.toBe(hashPassword("secret"));
  });
});

describe("verifyPassword", () => {
  test("returns true for correct password", () => {
    const hash = hashPassword("hunter2");
    expect(verifyPassword("hunter2", hash)).toBe(true);
  });

  test("returns false for wrong password", () => {
    const hash = hashPassword("hunter2");
    expect(verifyPassword("wrongpass", hash)).toBe(false);
  });

  test("is case-sensitive", () => {
    const hash = hashPassword("Password");
    expect(verifyPassword("password", hash)).toBe(false);
  });

  test("returns false for empty string against a real hash", () => {
    const hash = hashPassword("nonempty");
    expect(verifyPassword("", hash)).toBe(false);
  });
});
