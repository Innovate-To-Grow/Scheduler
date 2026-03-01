export async function createEvent({ name, password, startHour, endHour, days, mode, location }) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password, startHour, endHour, days, mode, location }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function fetchEvent(code) {
  const res = await fetch(`/api/events?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function verifyEvent(code, password) {
  const res = await fetch("/api/events/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
