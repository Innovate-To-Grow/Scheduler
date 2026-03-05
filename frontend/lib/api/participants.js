import { API_BASE } from "./config";

export async function fetchParticipants(code) {
  const res = await fetch(`${API_BASE}/api/events/participants?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function joinEvent(code, name) {
  const res = await fetch(`${API_BASE}/api/events/participants?code=${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateParticipant(code, name, data) {
  const res = await fetch(
    `${API_BASE}/api/events/participants/update?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteParticipant(code, name) {
  const res = await fetch(
    `${API_BASE}/api/events/participants/update?code=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
