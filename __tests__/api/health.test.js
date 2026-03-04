import { GET as healthHandler } from "@/app/api/health/route";

describe("GET /api/health", () => {
  test("returns status ok", async () => {
    const res = await healthHandler();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
