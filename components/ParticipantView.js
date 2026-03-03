"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { MdCheck, MdClose, MdLogin, MdRefresh, MdSend } from "react-icons/md";
import AppButton from "@/components/AppButton";
import EventContext from "@/components/EventContext";
import ScheduleGrid from "@/components/ScheduleGrid";
import { fetchParticipants, joinEvent, updateParticipant } from "@/lib/api/participants";
import "@material/web/slider/slider.js";
import "@material/web/dialog/dialog.js";
import "@material/web/textfield/outlined-text-field.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour) {
  const h = Number(hour);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

function formatMode(mode) {
  if (mode === "virtual") return "Virtual";
  return "In-Person";
}

function ParticipantView() {
  const { event, numSlots } = useContext(EventContext);
  const mode = event?.mode || "inperson";
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [scheduleInperson, setScheduleInperson] = useState([]);
  const [scheduleVirtual, setScheduleVirtual] = useState([]);
  const [sliderValue, setSliderValue] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingNames, setExistingNames] = useState([]);
  const [preJoinParticipants, setPreJoinParticipants] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [joinError, setJoinError] = useState("");

  const dialogRef = useRef(null);
  const paintModeRef = useRef(null);

  useEffect(() => {
    if (showDialog && dialogRef.current) dialogRef.current.show();
    else if (!showDialog && dialogRef.current) dialogRef.current.close();
  }, [showDialog]);

  useEffect(() => {
    if (!joined && event?.code) {
      fetchParticipants(event.code)
        .then((data) => {
          setExistingNames(data.participants.map((p) => p.name));
          setPreJoinParticipants(
            data.participants.map((p) => ({ name: p.name, submitted: !!p.submitted }))
          );
        })
        .catch(() => {});
    }
  }, [joined, event?.code]);

  useEffect(() => {
    if (joined && event?.code) {
      fetchParticipants(event.code)
        .then((data) => {
          const parsed = data.participants.map((p) => ({
            ...p,
            inpersonArray: JSON.parse(p.schedule_inperson).map(Number),
            virtualArray: JSON.parse(p.schedule_virtual).map(Number),
          }));
          setParticipants(parsed);
        })
        .catch(() => {});
    }
  }, [joined, event?.code, refreshKey]);

  const calculateAverage = (scheduleKey) => {
    if (!participants.length) return Array(numSlots).fill(0);
    const total = Array(numSlots).fill(0);
    let validCount = 0;
    participants.forEach((p) => {
      const schedule = p[scheduleKey];
      if (schedule.length !== numSlots) return;
      validCount++;
      schedule.forEach((val, idx) => {
        total[idx] += val;
      });
    });
    if (validCount === 0) return Array(numSlots).fill(0);
    return total.map((v) => parseFloat((v / validCount).toFixed(2)));
  };

  const avgInperson = calculateAverage("inpersonArray");
  const avgVirtual = calculateAverage("virtualArray");

  const suggestions =
    name.trim().length > 0
      ? existingNames.filter((n) => n.toLowerCase().startsWith(name.toLowerCase().trim()))
      : [];

  const handleJoin = async (joinName) => {
    const n = (joinName ?? name).trim();
    if (!n) {
      setJoinError("Name is required");
      return;
    }
    setJoinError("");
    try {
      const { participant } = await joinEvent(event.code, n);
      setName(n);
      const ip = JSON.parse(participant.schedule_inperson).map(Number);
      const vt = JSON.parse(participant.schedule_virtual).map(Number);
      setScheduleInperson(ip);
      setScheduleVirtual(vt);
      setSubmitted(!!participant.submitted);
      setJoined(true);
    } catch (err) {
      alert("Failed to join: " + err.message);
    }
  };

  const handleCellPaint = (idx, e) => {
    const setter = mode === "inperson" ? setScheduleInperson : setScheduleVirtual;
    const currentSchedule = mode === "inperson" ? scheduleInperson : scheduleVirtual;
    if (e.type === "mousedown") {
      paintModeRef.current = currentSchedule[idx] > 0 ? "erase" : "paint";
    }
    setter((prev) => {
      const next = [...prev];
      next[idx] = paintModeRef.current === "erase" ? 0 : sliderValue;
      return next;
    });
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateParticipant(event.code, name, {
        scheduleInperson: JSON.stringify(scheduleInperson),
        scheduleVirtual: JSON.stringify(scheduleVirtual),
        submitted: 1,
      });
      setSubmitted(true);
      setShowDialog(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert("Failed to submit: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Name entry screen
  if (!joined) {
    const dayText = Array.isArray(event?.days)
      ? event.days
          .map((d) => DAY_LABELS[d])
          .filter(Boolean)
          .join(", ")
      : "";

    return (
      <div
        className="page-pad"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 76px)",
        }}
      >
        <div
          className="md-card"
          style={{
            maxWidth: "760px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "var(--md-sys-color-primary)", margin: 0 }}>Join Event</h2>
            <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: "8px 0 0 0" }}>
              Enter your name to mark availability.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Event
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>{event?.name}</p>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Type
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>{formatMode(mode)}</p>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Time
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>
                {formatHour(event?.startHour)} - {formatHour(event?.endHour)}
              </p>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Days
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>{dayText || "Not set"}</p>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Location
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>{event?.location || "N/A"}</p>
            </div>
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--md-sys-color-surface-variant)",
                borderRadius: "12px",
                background: "var(--md-sys-color-surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--md-sys-color-outline)" }}>
                Event Code
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>{event?.code}</p>
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--md-sys-color-surface-variant)",
              borderRadius: "12px",
              padding: "12px",
              background: "var(--md-sys-color-surface)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              Participants ({preJoinParticipants.length})
            </p>
            {preJoinParticipants.length > 0 ? (
              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {preJoinParticipants.map((p) => (
                  <span
                    key={p.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid var(--md-sys-color-outline)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        color: p.submitted
                          ? "var(--md-sys-color-primary)"
                          : "var(--md-sys-color-outline)",
                      }}
                    >
                      {p.submitted ? "●" : "○"}
                    </span>
                    {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <p
                style={{
                  margin: "8px 0 0 0",
                  color: "var(--md-sys-color-on-surface-variant)",
                  fontSize: "0.9rem",
                }}
              >
                No participants yet.
              </p>
            )}
          </div>

          <md-outlined-text-field
            label="Your Name"
            value={name}
            onInput={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength="100"
            style={{ width: "100%" }}
          ></md-outlined-text-field>
          {joinError && (
            <p style={{ color: "var(--md-sys-color-error)", margin: 0, fontSize: "0.9rem" }}>
              {joinError}
            </p>
          )}
          {suggestions.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {suggestions.map((n) => (
                <button
                  key={n}
                  onClick={() => handleJoin(n)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    border: "1px solid var(--md-sys-color-outline)",
                    background: "var(--md-sys-color-surface-variant)",
                    color: "var(--md-sys-color-on-surface-variant)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <AppButton onClick={() => handleJoin()} fullWidth={true} icon={<MdLogin />}>
            Join
          </AppButton>
        </div>
      </div>
    );
  }

  // Schedule editing screen
  return (
    <div className="page-pad" style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2
            style={{
              color: "var(--md-sys-color-primary)",
              margin: "0 0 4px 0",
              fontSize: "1.8rem",
            }}
          >
            Welcome, {name}
            {submitted && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--md-sys-color-outline)",
                  marginLeft: "12px",
                }}
              >
                (submitted)
              </span>
            )}
          </h2>
          <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: 0 }}>
            Set your availability and see the group schedule.
          </p>
        </div>
        <AppButton
          onClick={() => setRefreshKey((k) => k + 1)}
          variant="outlined"
          icon={<MdRefresh />}
        >
          Refresh
        </AppButton>
      </div>

      <div className="two-pane">
        {/* Left pane: schedule editor */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            className="md-card"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontWeight: "500" }}>
                Availability Level:{" "}
                <span style={{ color: "var(--md-sys-color-primary)" }}>{sliderValue}</span>
              </label>
              <md-slider
                min="0"
                max="1"
                step="0.25"
                value={sliderValue}
                onInput={(e) => setSliderValue(Number(e.target.value))}
                style={{ width: "100%", maxWidth: "300px" }}
              ></md-slider>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--md-sys-color-on-surface-variant)",
                  margin: 0,
                }}
              >
                0 = Busy, 1 = Free
              </p>
            </div>

            {mode !== "virtual" && (
              <ScheduleGrid
                schedule={scheduleInperson}
                startHour={event.startHour}
                endHour={event.endHour}
                selectedDays={event.days}
                readOnly={submitted}
                showValues={false}
                onCellPaint={handleCellPaint}
              />
            )}
            {mode !== "inperson" && (
              <ScheduleGrid
                schedule={scheduleVirtual}
                startHour={event.startHour}
                endHour={event.endHour}
                selectedDays={event.days}
                readOnly={submitted}
                showValues={false}
                onCellPaint={handleCellPaint}
              />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <AppButton onClick={() => setShowDialog(true)} icon={<MdSend />}>
                {submitted ? "Update Schedule" : "Submit Schedule"}
              </AppButton>
            </div>
          </div>
        </div>

        {/* Right pane: Group Availability + Individual Schedules */}
        <div style={{ flex: "2 1 700px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="md-card" style={{ overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--md-sys-color-on-surface)" }}>
              Group Availability
            </h3>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {mode !== "virtual" && (
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                  <ScheduleGrid
                    schedule={avgInperson}
                    startHour={event.startHour}
                    endHour={event.endHour}
                    selectedDays={event.days}
                    readOnly={true}
                    showValues={true}
                    label="Availability"
                  />
                </div>
              )}
              {mode !== "inperson" && (
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                  <ScheduleGrid
                    schedule={avgVirtual}
                    startHour={event.startHour}
                    endHour={event.endHour}
                    selectedDays={event.days}
                    readOnly={true}
                    showValues={true}
                    label="Availability"
                  />
                </div>
              )}
            </div>
          </div>

          {participants.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--md-sys-color-on-surface)" }}>
                Individual Schedules
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {participants.map((p) => (
                  <div className="md-card" key={p.name} style={{ overflowX: "auto" }}>
                    <h4 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>{p.name}</h4>
                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                      {mode !== "virtual" && (
                        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                          <ScheduleGrid
                            schedule={p.inpersonArray}
                            startHour={event.startHour}
                            endHour={event.endHour}
                            selectedDays={event.days}
                            readOnly={true}
                            showValues={true}
                            label="Availability"
                          />
                        </div>
                      )}
                      {mode !== "inperson" && (
                        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                          <ScheduleGrid
                            schedule={p.virtualArray}
                            startHour={event.startHour}
                            endHour={event.endHour}
                            selectedDays={event.days}
                            readOnly={true}
                            showValues={true}
                            label="Availability"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <md-dialog ref={dialogRef} onClosed={() => setShowDialog(false)}>
        <div slot="headline">Confirm Submission</div>
        <div slot="content" style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
          Save your availability?
        </div>
        <div slot="actions" style={{ display: "flex", gap: "8px" }}>
          <AppButton onClick={() => setShowDialog(false)} variant="outlined" icon={<MdClose />}>
            Cancel
          </AppButton>
          <AppButton onClick={confirmSubmit} disabled={isSubmitting} icon={<MdCheck />}>
            {isSubmitting ? "Submitting..." : "Confirm"}
          </AppButton>
        </div>
      </md-dialog>
    </div>
  );
}

export default ParticipantView;
