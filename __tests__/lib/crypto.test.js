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
  test("returns salt:hash format (32-char hex salt + 64-char hex hash)", () => {
    const result = hashPassword("test");
    expect(result).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
  });

  test("same input produces different outputs (random salt)", () => {
    const h1 = hashPassword("password");
    const h2 = hashPassword("password");
    expect(h1).not.toBe(h2);
  });

  test("different inputs produce different hashes (same salt would differ)", () => {
    // With random salts both will differ, but verify they aren't identical
    expect(hashPassword("foo")).not.toBe(hashPassword("bar"));
  });

  test("is case-sensitive", () => {
    // Both will have different salts, so they'll always differ,
    // but verify via verifyPassword that "Secret" != "secret"
    const hash = hashPassword("Secret");
    expect(verifyPassword("secret", hash)).toBe(false);
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

  test("returns false for empty stored hash", () => {
    expect(verifyPassword("anything", "")).toBe(false);
  });

  test("returns false for null stored hash", () => {
    expect(verifyPassword("anything", null)).toBe(false);
  });

  test("returns false for undefined stored hash", () => {
    expect(verifyPassword("anything", undefined)).toBe(false);
  });

  test("returns false for legacy unsalted hash format", () => {
    // A plain 64-char hex string (no colon) should not verify
    const legacyHash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
    expect(verifyPassword("test", legacyHash)).toBe(false);
  });
});
