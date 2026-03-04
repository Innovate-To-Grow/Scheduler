import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/crypto";
import { schedulerStore } from "@/lib/store";

export async function POST(req) {
  try {
    const { code, password } = await req.json();

    if (!code || !password) {
      return NextResponse.json({ error: "code and password are required" }, { status: 400 });
    }

    const event = await schedulerStore.getEvent(code);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const valid = verifyPassword(password, event.passwordHash);
    return NextResponse.json({ valid });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}
