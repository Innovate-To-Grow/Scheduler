"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdAdd, MdHourglassEmpty } from "react-icons/md";
import AppButton from "@/components/AppButton";
import { createEvent } from "@/lib/api/events";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import { DAY_LABELS } from "@/lib/constants";
const MODES = [
  { value: "inperson", label: "In-Person" },
  { value: "virtual", label: "Virtual" },
];

function ToggleChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: "20px",
        border: `2px solid ${active ? "var(--md-sys-color-primary)" : "var(--md-sys-color-outline)"}`,
        backgroundColor: active ? "var(--md-sys-color-primary)" : "transparent",
        color: active ? "var(--md-sys-color-on-primary)" : "var(--md-sys-color-on-surface-variant)",
        fontWeight: "500",
        fontSize: "0.9rem",
        cursor: "pointer",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function LabelRow({ children }) {
  return (
    <label
      style={{
        fontSize: "0.85rem",
        fontWeight: "500",
        color: "var(--md-sys-color-on-surface-variant)",
        marginBottom: "10px",
        display: "block",
      }}
    >
      {children}
    </label>
  );
}

function CreateEvent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState("inperson"); // "inperson" | "virtual"
  const [location, setLocation] = useState("");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hours = [];
  for (let i = 0; i <= 23; i++) {
    const label =
      i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
    hours.push({ value: i, label });
  }

  const toggleDay = (idx) => {
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  };

  const handleSubmit = async () => {
    setError("");
    const errors = [];
    if (!name.trim()) errors.push("Event name is required");
    if (!password) errors.push("Password is required");
    if (mode !== "virtual" && !location.trim()) errors.push("Location is required");
    if (startHour >= endHour) errors.push("End time must be after start time");
    if (selectedDays.length === 0) errors.push("Select at least one day");
    if (errors.length > 0) {
      setError(errors.join(" · "));
      return;
    }

    setLoading(true);
    try {
      const { event, password: pw } = await createEvent({
        name: name.trim(),
        password,
        startHour,
        endHour,
        days: selectedDays,
        mode,
        location: location.trim(),
      });
      router.replace(`/event?code=${event.code}&manage=${encodeURIComponent(pw)}`);
    } catch (err) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="md-card"
        style={{
          maxWidth: "640px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ color: "var(--md-sys-color-primary)", margin: 0, fontSize: "1.8rem" }}>
            Scheduler
          </h1>
        </div>

        {/* Event name */}
        <md-outlined-text-field
          label="Event Name"
          value={name}
          onInput={(e) => setName(e.target.value)}
          maxLength="200"
          style={{ width: "100%" }}
        ></md-outlined-text-field>

        {/* Organizer password */}
        <md-outlined-text-field
          label="Organizer Password"
          type="password"
          value={password}
          onInput={(e) => setPassword(e.target.value)}
          maxLength="200"
          style={{ width: "100%" }}
        ></md-outlined-text-field>

        {/* Mode */}
        <div>
          <LabelRow>Meeting Type</LabelRow>
          <div className="chip-row" style={{ display: "flex", gap: "8px" }}>
            {MODES.map((m) => (
              <ToggleChip
                key={m.value}
                label={m.label}
                active={mode === m.value}
                onClick={() => setMode(m.value)}
              />
            ))}
          </div>
        </div>

        {/* Location (only when inperson) */}
        {mode !== "virtual" && (
          <md-outlined-text-field
            label="Location / Address"
            value={location}
            onInput={(e) => setLocation(e.target.value)}
            style={{ width: "100%" }}
          ></md-outlined-text-field>
        )}

        {/* Days */}
        <div>
          <LabelRow>Days</LabelRow>
          <div className="chip-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DAY_LABELS.map((label, idx) => (
              <ToggleChip
                key={idx}
                label={label}
                active={selectedDays.includes(idx)}
                onClick={() => toggleDay(idx)}
              />
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="time-row" style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <LabelRow>Start Time</LabelRow>
            <md-outlined-select
              value={String(startHour)}
              onInput={(e) => setStartHour(Number(e.target.value))}
              style={{ width: "100%" }}
            >
              {hours.map((h) => (
                <md-select-option key={h.value} value={String(h.value)}>
                  <div slot="headline">{h.label}</div>
                </md-select-option>
              ))}
            </md-outlined-select>
          </div>
          <div style={{ flex: 1 }}>
            <LabelRow>End Time</LabelRow>
            <md-outlined-select
              value={String(endHour)}
              onInput={(e) => setEndHour(Number(e.target.value))}
              style={{ width: "100%" }}
            >
              {hours.map((h) => (
                <md-select-option key={h.value} value={String(h.value)}>
                  <div slot="headline">{h.label}</div>
                </md-select-option>
              ))}
            </md-outlined-select>
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--md-sys-color-error)", margin: 0, fontSize: "0.9rem" }}>
            {error}
          </p>
        )}

        <AppButton
          onClick={handleSubmit}
          disabled={loading}
          fullWidth={true}
          icon={loading ? <MdHourglassEmpty /> : <MdAdd />}
        >
          {loading ? "Creating..." : "Create Event"}
        </AppButton>
      </div>
    </div>
  );
}

export default CreateEvent;
