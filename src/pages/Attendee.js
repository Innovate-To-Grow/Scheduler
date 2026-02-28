import React, { useState, useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AttendeeContext from "../includes/AttendeeContext";
import { fetchAttendee, createAttendee, updateAttendee } from "../api/attendees";
import '@material/web/slider/slider.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/dialog/dialog.js';

function Attendee() {
  const { setAttendeeDataChanged } = useContext(AttendeeContext);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const name = searchParams.get("name") || "";

  const [schedule, setSchedule] = useState(Array(63).fill(1));
  const [sliderValue, setSliderValue] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exists, setExists] = useState(false);

  const dialogRef = useRef(null);

  useEffect(() => {
    if (!name) {
      navigate("/");
      return;
    }

    async function loadAttendee() {
      try {
        const attendee = await fetchAttendee(name);
        if (attendee) {
          setExists(true);
          const parsed = JSON.parse(attendee.schedule);
          if (Array.isArray(parsed) && parsed.length === 63) {
            setSchedule(parsed.map(Number));
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendee", err);
      }
    }
    loadAttendee();
  }, [name, navigate]);

  useEffect(() => {
    if (showDialog && dialogRef.current) {
      dialogRef.current.show();
    } else if (!showDialog && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [showDialog]);

  // More compliant material UI tone variations for busy -> neutral -> free
  const color0 = "#ffb4ab"; // md-sys-color-error-container
  const color1 = "#ffdea3"; // custom warning tone
  const color2 = "#82d3a2"; // softer green / success tone

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

  const handleCellClickUpdate = (index, e) => {
    // If it's a mousedown event, update the cell.
    // If it's a mousemove event, only update if the left mouse button is held down.
    if (e.type === "mousedown" || (e.type === "mousemove" && e.buttons === 1)) {
      setSchedule(prev => {
        const newSchedule = [...prev];
        newSchedule[index] = sliderValue;
        return newSchedule;
      });
    }
  };

  const times = [];
  for (let i = 0; i < 9; i++) {
    const hour = i + 9;
    times.push(hour < 12 ? `${hour}:00 AM` : hour === 12 ? `${hour}:00 PM` : `${hour - 12}:00 PM`);
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = { schedule: JSON.stringify(schedule), submitted: 1 };
      if (exists) {
        await updateAttendee(name, data);
      } else {
        await createAttendee({ name, ...data });
      }
      setAttendeeDataChanged(true);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Failed to submit schedule");
    } finally {
      setIsSubmitting(false);
      setShowDialog(false);
    }
  };

  const handleSliderChange = (e) => {
    setSliderValue(Number(e.target.value));
  };

  return (
    <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div className="md-card" style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        <div>
          <h2 style={{ color: 'var(--md-sys-color-primary)', margin: '0 0 8px 0' }}>Welcome, {name}</h2>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
            Update your schedule availability for the week.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '500' }}>Availability Level: <span style={{ color: 'var(--md-sys-color-primary)' }}>{sliderValue}</span></label>
          <md-slider
            min="0"
            max="1"
            step="0.25"
            value={sliderValue}
            onInput={handleSliderChange}
            style={{ width: '100%', maxWidth: '300px' }}
          ></md-slider>
          <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', margin: 0 }}>
            Choose a level (0 = Busy, 1 = Free) and paint it onto the grid below.
          </p>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid var(--md-sys-color-outline)' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', minWidth: '600px' }}>
            <div style={{ display: 'flex', marginLeft: '80px', marginBottom: '8px' }}>
              {days.map(d => (
                <div key={d} style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--md-sys-color-secondary)' }}>
                  {d}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '80px', paddingRight: '8px' }}>
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
                      const val = schedule[idx];
                      return (
                        <div
                          key={idx}
                          onMouseDown={(e) => handleCellClickUpdate(idx, e)}
                          onMouseMove={(e) => handleCellClickUpdate(idx, e)}
                          style={{
                            height: '32px',
                            backgroundColor: lerpColor(color0, color1, color2, val),
                            borderTop: hourIndex !== 0 ? '1px solid var(--md-sys-color-surface-variant)' : 'none',
                            borderLeft: dayIndex !== 0 ? '1px solid var(--md-sys-color-surface-variant)' : 'none',
                            cursor: 'pointer',
                            touchAction: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            transition: 'background-color 0.1s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <md-filled-button onClick={() => setShowDialog(true)}>
            Submit Schedule
          </md-filled-button>
        </div>

        <md-dialog ref={dialogRef} onClosed={() => setShowDialog(false)}>
          <div slot="headline">Confirm Submission</div>
          <form slot="content" id="form-id" method="dialog" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            Are you sure you want to save your schedule?
          </form>
          <div slot="actions">
            <md-outlined-button form="form-id" onClick={() => setShowDialog(false)}>Cancel</md-outlined-button>
            <md-filled-button form="form-id" onClick={confirmSubmit} disabled={isSubmitting ? true : undefined}>
              {isSubmitting ? "Submitting..." : "Confirm"}
            </md-filled-button>
          </div>
        </md-dialog>
      </div>
    </div>
  );
}

export default Attendee;
