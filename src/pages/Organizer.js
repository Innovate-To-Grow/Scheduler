import React, { useState, useEffect, useContext, useRef } from "react";
import { GoVerified, GoUnverified } from "react-icons/go";
import AttendeeContext from "../includes/AttendeeContext";
import { fetchAttendees, createAttendee } from "../api/attendees";
import '@material/web/slider/slider.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/elevation/elevation.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

function Organizer() {
  const { attendeeDataChanged, setAttendeeDataChanged } = useContext(AttendeeContext);
  const [attendees, setAttendees] = useState([]);
  const [relevances, setRelevances] = useState({});
  const [showDialog, setShowDialog] = useState(false);

  const dialogRef = useRef(null);
  const newNameRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAttendees();
        if (data.attendees) {
          const parsedAttendees = data.attendees.map(a => ({
            ...a,
            scheduleArray: (JSON.parse(a.schedule) || Array(63).fill(1)).map(Number)
          }));
          setAttendees(parsedAttendees);

          setRelevances(prev => {
            const nextRev = { ...prev };
            parsedAttendees.forEach(a => {
              if (nextRev[a.name] === undefined) {
                nextRev[a.name] = 1; // default relevance 1
              }
            });
            return nextRev;
          });
          setAttendeeDataChanged(false);
        }
      } catch (err) {
        console.error("Failed to load attendees", err);
      }
    }
    loadData();
  }, [attendeeDataChanged, setAttendeeDataChanged]);

  useEffect(() => {
    if (showDialog && dialogRef.current) {
      dialogRef.current.show();
    } else if (!showDialog && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [showDialog]);

  const color0 = "#ffb4ab";
  const color1 = "#ffdea3";
  const color2 = "#82d3a2";

  function RBG(a, b, amount) {
    const ar = parseInt(a.substring(1, 3), 16);
    const ag = parseInt(a.substring(3, 5), 16);
    const ab = parseInt(a.substring(5, 7), 16);
    const br = parseInt(b.substring(1, 3), 16);
    const bg = parseInt(b.substring(3, 5), 16);
    const bb = parseInt(b.substring(5, 7), 16);
    const rr = Math.floor(ar * (1 - amount) + br * amount);
    const rg = Math.floor(ag * (1 - amount) + bg * amount);
    const rb = Math.floor(ab * (1 - amount) + bb * amount);
    return `rgb(${rr}, ${rg}, ${rb})`;
  }

  function lerpColor(a, b, c, amount) {
    if (amount < 0.5) {
      return RBG(a, b, amount * 2);
    } else {
      return RBG(b, c, (amount - 0.5) * 2);
    }
  }

  const times = [];
  for (let i = 0; i < 9; i++) {
    const hour = i + 9;
    times.push(hour < 12 ? `${hour}:00 AM` : hour === 12 ? `${hour}:00 PM` : `${hour - 12}:00 PM`);
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleAddAttendee = async () => {
    const name = newNameRef.current?.value;
    if (!name) return;
    try {
      await createAttendee({ name, schedule: JSON.stringify(Array(63).fill(1)), submitted: 0 });
      setAttendeeDataChanged(true);
      setShowDialog(false);
    } catch (err) {
      alert("Failed to create attendee. Maybe they already exist.");
    }
  };

  const handleRelevanceChange = (name, val) => {
    setRelevances(prev => ({ ...prev, [name]: val }));
  };

  // derived schedules
  const calculateAverage = () => {
    if (!attendees.length) return Array(63).fill(0);
    const total = Array(63).fill(0);
    attendees.forEach(a => {
      a.scheduleArray.forEach((val, idx) => total[idx] += val);
    });
    return total.map(v => (v / attendees.length).toFixed(2));
  };

  const calculateWeightedAverage = () => {
    if (!attendees.length) return Array(63).fill(0);
    const total = Array(63).fill(0);
    let totalWeight = 0;
    attendees.forEach(a => {
      const weight = relevances[a.name] || 0;
      if (weight > 0) totalWeight++;
      a.scheduleArray.forEach((val, idx) => total[idx] += val * weight);
    });
    if (totalWeight === 0) return Array(63).fill(0);
    return total.map(v => (v / totalWeight).toFixed(2));
  };

  const averageSchedule = calculateAverage();
  const weightedSchedule = calculateWeightedAverage();

  const renderGrid = (scheduleArr) => (
    <div style={{ display: 'flex', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '80px', paddingRight: '12px' }}>
        {times.map(t => (
          <div key={t} style={{ height: '32px', display: 'flex', alignItems: 'center', fontSize: '0.75rem', justifyContent: 'flex-end', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flex: 1, border: '1px solid var(--md-sys-color-surface-variant)', borderRadius: '8px', overflow: 'hidden' }}>
        {days.map((d, dayIndex) => (
          <div key={dayIndex} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {times.map((t, hourIndex) => {
              const idx = hourIndex * 7 + dayIndex;
              const val = parseFloat(scheduleArr[idx] || 0);
              return (
                <div key={idx} style={{
                  height: '32px',
                  backgroundColor: lerpColor(color0, color1, color2, val),
                  borderTop: hourIndex !== 0 ? '1px solid var(--md-sys-color-surface-variant)' : 'none',
                  borderLeft: dayIndex !== 0 ? '1px solid var(--md-sys-color-surface-variant)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface)',
                  fontWeight: '500'
                }}>
                  {val.toFixed(2).replace(/\.00$/, '')}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ color: 'var(--md-sys-color-primary)', margin: '0 0 8px 0', fontSize: '2rem' }}>Organizer Dashboard</h2>
        <p style={{ color: 'var(--md-sys-color-on-surface-variant)', margin: 0, fontSize: '1.1rem' }}>Manage attendees and analyze optimal meeting times.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        {/* Left pane: Participants */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="md-card">
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--md-sys-color-on-surface)' }}>Participants</h3>
            <md-filled-button onClick={() => setShowDialog(true)} style={{ width: '100%', marginBottom: '24px' }}>
              Add Attendee
            </md-filled-button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {attendees.map(a => (
                <div key={a.name} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '1px solid var(--md-sys-color-surface-variant)', borderRadius: '12px', backgroundColor: 'var(--md-sys-color-surface-container-low)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{a.name}</span>
                    <span style={{ color: a.submitted ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)' }} title={a.submitted ? "Submitted" : "Not submitted"}>
                      {a.submitted ? <GoVerified size={20} /> : <GoUnverified size={20} />}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)' }}>Relevance</span>
                    <md-slider min="0" max="1" step="0.01" value={relevances[a.name] || 0}
                      onInput={(e) => handleRelevanceChange(a.name, Number(e.target.value))}
                      style={{ flex: 1 }}></md-slider>
                    <span style={{ minWidth: '36px', textAlign: 'right', fontWeight: '500', color: 'var(--md-sys-color-primary)' }}>{relevances[a.name]?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))}
              {attendees.length === 0 && (
                <p style={{ color: 'var(--md-sys-color-outline)', fontStyle: 'italic', textAlign: 'center' }}>No attendees added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: Grids */}
        <div style={{ flex: '2 1 700px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div className="md-card" style={{ overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--md-sys-color-on-surface)' }}>Weighted Average Schedule</h3>
            <div style={{ minWidth: '600px' }}>
              <div style={{ display: 'flex', marginLeft: '80px', marginBottom: '8px' }}>
                {days.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: 'var(--md-sys-color-secondary)' }}>{d}</div>)}
              </div>
              {renderGrid(weightedSchedule)}
            </div>
          </div>

          <div className="md-card" style={{ overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--md-sys-color-on-surface)' }}>Average Schedule</h3>
            <div style={{ minWidth: '600px' }}>
              <div style={{ display: 'flex', marginLeft: '80px', marginBottom: '8px' }}>
                {days.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: 'var(--md-sys-color-secondary)' }}>{d}</div>)}
              </div>
              {renderGrid(averageSchedule)}
            </div>
          </div>

          {attendees.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'var(--md-sys-color-on-surface)' }}>Individual Schedules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {attendees.map(a => (
                  <div className="md-card" key={a.name} style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{a.name}</h4>
                      <div style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface-variant)', backgroundColor: 'var(--md-sys-color-surface-variant)', padding: '4px 8px', borderRadius: '16px' }}>
                        Relevance Weight: <span style={{ fontWeight: 'bold' }}>{relevances[a.name] || 0}</span>
                      </div>
                    </div>
                    <div style={{ minWidth: '600px' }}>
                      <div style={{ display: 'flex', marginLeft: '80px', marginBottom: '8px' }}>
                        {days.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--md-sys-color-secondary)' }}>{d}</div>)}
                      </div>
                      {renderGrid(a.scheduleArray)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <md-dialog ref={dialogRef} onClosed={() => setShowDialog(false)}>
        <div slot="headline">Add Attendee</div>
        <form slot="content" id="form-id" method="dialog" style={{ padding: '16px 0', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Select Existing User</label>
            <md-outlined-select
              label="Choose attendee"
              onInput={e => {
                if (newNameRef.current && e.target.value) {
                  newNameRef.current.value = e.target.value;
                }
              }}
              style={{ width: '100%' }}
            >
              <md-select-option value=""></md-select-option>
              {attendees.map(a => (
                <md-select-option key={a.name} value={a.name}>
                  <div slot="headline">{a.name}</div>
                </md-select-option>
              ))}
            </md-outlined-select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--md-sys-color-surface-variant)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-outline)', fontWeight: '500' }}>OR CREATE NEW</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--md-sys-color-surface-variant)' }}></div>
          </div>

          <md-outlined-text-field ref={newNameRef} label="New Attendee Name" type="text" style={{ width: '100%' }}></md-outlined-text-field>

        </form>
        <div slot="actions">
          <md-outlined-button form="form-id" onClick={() => setShowDialog(false)}>Cancel</md-outlined-button>
          <md-filled-button form="form-id" onClick={handleAddAttendee}>Add</md-filled-button>
        </div>
      </md-dialog>
    </div>
  );
}

export default Organizer;