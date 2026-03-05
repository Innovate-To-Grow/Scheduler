"use client";

import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { GoVerified, GoUnverified } from "react-icons/go";
import { MdDeleteOutline, MdLogin, MdRefresh, MdSave } from "react-icons/md";
import EventContext from "@/components/EventContext";
import AppButton from "@/components/AppButton";
import ScheduleGrid from "@/components/ScheduleGrid";
import {
  deleteParticipant,
  fetchParticipants,
  joinEvent,
  updateParticipant,
} from "@/lib/api/participants";
import { fetchWeights, updateWeights } from "@/lib/api/weights";
import "@material/web/checkbox/checkbox.js";
import "@material/web/slider/slider.js";
import "@material/web/dialog/dialog.js";
import "@material/web/textfield/outlined-text-field.js";
import EventDetailsGrid from "@/components/EventDetailsGrid";

function OrganizerView() {
  const { event, numSlots } = useContext(EventContext);
  const mode = event?.mode || "inperson";

  const [participants, setParticipants] = useState([]);
  const [weights, setWeights] = useState({}); // { name: { weight, included } }
  const [refreshKey, setRefreshKey] = useState(0);

  // Ref tracks latest weights synchronously to avoid stale closures in debounce
  const weightsRef = useRef({});
  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);
  const saveTimer = useRef(null);
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Organizer self-schedule state
  const [myName, setMyName] = useState("");
  const [myJoined, setMyJoined] = useState(false);
  const [myInperson, setMyInperson] = useState([]);
  const [myVirtual, setMyVirtual] = useState([]);
  const [mySaving, setMySaving] = useState(false);
  const [removingName, setRemovingName] = useState("");
  const [removeError, setRemoveError] = useState("");

  // Load participants and weights in parallel
  useEffect(() => {
    async function load() {
      try {
        const [participantsRes, weightsRes] = await Promise.all([
          fetchParticipants(event.code),
          fetchWeights(event.code),
        ]);

        const parsed = participantsRes.participants.map((p) => ({
          ...p,
          inpersonArray: JSON.parse(p.schedule_inperson).map(Number),
          virtualArray: JSON.parse(p.schedule_virtual).map(Number),
        }));
        setParticipants(parsed);

        const map = {};
        weightsRes.weights.forEach((w) => {
          map[w.participant_name] = { weight: w.weight, included: w.included };
        });
        setWeights(map);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    }
    load();
  }, [event.code, refreshKey]);

  const saveWeights = useCallback(
    async (newWeights) => {
      try {
        const arr = Object.entries(newWeights).map(([name, w]) => ({
          name,
          weight: w.weight,
          included: w.included,
        }));
        await updateWeights(event.code, arr);
      } catch (err) {
        console.error("Failed to save weights", err);
      }
    },
    [event.code]
  );

  const handleWeightChange = (name, val) => {
    const current = weightsRef.current[name] ?? { weight: 1.0, included: 1 };
    const next = { ...weightsRef.current, [name]: { ...current, weight: val } };
    weightsRef.current = next;
    setWeights(next);
    // Debounce: only send API call 500ms after user stops dragging
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveWeights(weightsRef.current), 500);
  };

  const handleIncludedChange = (name, val) => {
    const current = weightsRef.current[name] ?? { weight: 1.0, included: 1 };
    const next = { ...weightsRef.current, [name]: { ...current, included: val ? 1 : 0 } };
    weightsRef.current = next;
    setWeights(next);
    saveWeights(next); // checkbox fires once, save immediately
  };

  const handleMyJoin = async () => {
    if (!myName.trim()) return;
    try {
      const { participant } = await joinEvent(event.code, myName.trim());
      setMyInperson(JSON.parse(participant.schedule_inperson).map(Number));
      setMyVirtual(JSON.parse(participant.schedule_virtual).map(Number));
      setMyJoined(true);
    } catch (err) {
      console.error("Failed to join:", err);
    }
  };

  const handleMyInpersonPaint = (idx) => {
    setMyInperson((prev) => {
      const n = [...prev];
      n[idx] = n[idx] === 1 ? 0 : 1;
      return n;
    });
  };

  const handleMyVirtualPaint = (idx) => {
    setMyVirtual((prev) => {
      const n = [...prev];
      n[idx] = n[idx] === 1 ? 0 : 1;
      return n;
    });
  };

  const handleMySave = async () => {
    setMySaving(true);
    try {
      await updateParticipant(event.code, myName, {
        scheduleInperson: JSON.stringify(myInperson),
        scheduleVirtual: JSON.stringify(myVirtual),
        submitted: 1,
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setMySaving(false);
    }
  };

  const handleRemoveParticipant = async (participantName) => {
    if (!participantName) return;
    setRemoveError("");
    setRemovingName(participantName);
    try {
      await deleteParticipant(event.code, participantName);

      setParticipants((prev) => prev.filter((p) => p.name !== participantName));
      setWeights((prev) => {
        const next = { ...prev };
        delete next[participantName];
        return next;
      });

      if (myJoined && myName === participantName) {
        setMyJoined(false);
        setMyInperson([]);
        setMyVirtual([]);
      }
    } catch (err) {
      setRemoveError(`Failed to remove participant: ${err.message}`);
    } finally {
      setRemovingName("");
    }
  };

  // Calculate weighted average for a given schedule type
  const calculateWeightedAverage = (scheduleKey) => {
    if (!participants.length) return Array(numSlots).fill(0);
    const total = Array(numSlots).fill(0);
    let totalWeight = 0;

    participants.forEach((p) => {
      // Use defaults for participants not yet in the weights map
      const w = weights[p.name] ?? { weight: 1.0, included: 1 };
      if (!w.included) return;
      const weight = w.weight;
      if (weight <= 0) return;
      const schedule = p[scheduleKey];
      if (schedule.length !== numSlots) return;
      totalWeight += weight;
      schedule.forEach((val, idx) => {
        total[idx] += val * weight;
      });
    });

    if (totalWeight === 0) return Array(numSlots).fill(0);
    return total.map((v) => parseFloat((v / totalWeight).toFixed(2)));
  };

  const weightedInperson = calculateWeightedAverage("inpersonArray");
  const weightedVirtual = calculateWeightedAverage("virtualArray");
  const submittedCount = participants.filter((p) => p.submitted).length;

  return (
    <div className="page-pad" style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
            className="organizer-title"
            style={{
              color: "var(--md-sys-color-primary)",
              margin: "0 0 4px 0",
              fontSize: "1.8rem",
            }}
          >
            Organizer Dashboard
          </h2>
          <p style={{ color: "var(--md-sys-color-on-surface-variant)", margin: 0 }}>
            Manage participants and find the best meeting time.
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

      <div
        className="md-card"
        style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <h3 style={{ margin: 0, color: "var(--md-sys-color-on-surface)" }}>Event Details</h3>
        <EventDetailsGrid
          event={event}
          extraCards={[
            { label: "Participants", value: participants.length },
            { label: "Submitted", value: `${submittedCount} / ${participants.length}` },
          ]}
        />
      </div>

      <div className="two-pane">
        {/* Left pane: Participants + My Schedule */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* My Schedule */}
          <div className="md-card">
            <h3 style={{ margin: "0 0 16px 0", color: "var(--md-sys-color-on-surface)" }}>
              My Schedule
            </h3>
            {!myJoined ? (
              <div
                style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}
              >
                <md-outlined-text-field
                  label="Your Name"
                  value={myName}
                  onInput={(e) => setMyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMyJoin()}
                  style={{ flex: 1 }}
                ></md-outlined-text-field>
                <AppButton onClick={handleMyJoin} icon={<MdLogin />}>
                  Join
                </AppButton>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>
                  Editing as <strong>{myName}</strong>. Click cells to toggle availability.
                </p>
                {mode !== "virtual" && (
                  <ScheduleGrid
                    schedule={myInperson}
                    startHour={event.startHour}
                    endHour={event.endHour}
                    selectedDays={event.days}
                    readOnly={false}
                    showValues={false}
                    onCellPaint={handleMyInpersonPaint}
                  />
                )}
                {mode !== "inperson" && (
                  <ScheduleGrid
                    schedule={myVirtual}
                    startHour={event.startHour}
                    endHour={event.endHour}
                    selectedDays={event.days}
                    readOnly={false}
                    showValues={false}
                    onCellPaint={handleMyVirtualPaint}
                  />
                )}
                <AppButton onClick={handleMySave} disabled={mySaving} icon={<MdSave />}>
                  {mySaving ? "Saving..." : "Save My Schedule"}
                </AppButton>
              </div>
            )}
          </div>

          <div className="md-card">
            <h3 style={{ margin: "0 0 16px 0", color: "var(--md-sys-color-on-surface)" }}>
              Participants
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {participants.map((p) => {
                const w = weights[p.name] || { weight: 1, included: 1 };
                return (
                  <div
                    key={p.name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      padding: "16px",
                      border: "1px solid var(--md-sys-color-surface-variant)",
                      borderRadius: "12px",
                      backgroundColor: w.included
                        ? "var(--md-sys-color-surface-container-low)"
                        : "var(--md-sys-color-surface)",
                      opacity: w.included ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <md-checkbox
                          checked={w.included ? true : undefined}
                          onInput={(e) => handleIncludedChange(p.name, e.target.checked)}
                        ></md-checkbox>
                        <span style={{ fontWeight: "600", fontSize: "1.1rem" }}>{p.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            color: p.submitted
                              ? "var(--md-sys-color-primary)"
                              : "var(--md-sys-color-outline)",
                          }}
                          title={p.submitted ? "Submitted" : "Not submitted"}
                        >
                          {p.submitted ? <GoVerified size={20} /> : <GoUnverified size={20} />}
                        </span>
                        <AppButton
                          variant="outlined"
                          icon={<MdDeleteOutline />}
                          onClick={() => handleRemoveParticipant(p.name)}
                          disabled={removingName === p.name}
                          className="app-btn-danger"
                        >
                          {removingName === p.name ? "Removing..." : "Remove"}
                        </AppButton>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        paddingLeft: "40px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--md-sys-color-on-surface-variant)",
                        }}
                      >
                        Weight
                      </span>
                      <md-slider
                        min="0"
                        max="1"
                        step="0.01"
                        value={w.weight}
                        onInput={(e) => handleWeightChange(p.name, Number(e.target.value))}
                        style={{ flex: 1 }}
                      ></md-slider>
                      <span
                        style={{
                          minWidth: "36px",
                          textAlign: "right",
                          fontWeight: "500",
                          color: "var(--md-sys-color-primary)",
                        }}
                      >
                        {w.weight.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {participants.length === 0 && (
                <p
                  style={{
                    color: "var(--md-sys-color-outline)",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  No participants yet. Share the event link!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: Aggregate grids side by side */}
        <div style={{ flex: "2 1 700px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="md-card" style={{ overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 4px 0", color: "var(--md-sys-color-on-surface)" }}>
              Group Availability
            </h3>
            {event.location && (
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "0.9rem",
                  color: "var(--md-sys-color-on-surface-variant)",
                }}
              >
                {event.location}
              </p>
            )}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {mode !== "virtual" && (
                <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                  <ScheduleGrid
                    schedule={weightedInperson}
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
                    schedule={weightedVirtual}
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

          {/* Individual schedules */}
          {participants.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", color: "var(--md-sys-color-on-surface)" }}>
                Individual Schedules
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {participants.map((p) => {
                  const w = weights[p.name] || { weight: 1, included: 1 };
                  return (
                    <div className="md-card" key={p.name} style={{ overflowX: "auto" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "16px",
                        }}
                      >
                        <h4 style={{ margin: 0, fontSize: "1.2rem" }}>{p.name}</h4>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--md-sys-color-on-surface-variant)",
                            backgroundColor: "var(--md-sys-color-surface-variant)",
                            padding: "4px 8px",
                            borderRadius: "16px",
                          }}
                        >
                          Weight: <span style={{ fontWeight: "bold" }}>{w.weight.toFixed(2)}</span>
                        </div>
                      </div>
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
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {removeError && (
        <p
          style={{
            color: "var(--md-sys-color-error)",
            margin: "16px 0 0 0",
            fontSize: "0.9rem",
          }}
        >
          {removeError}
        </p>
      )}
    </div>
  );
}

export default OrganizerView;
