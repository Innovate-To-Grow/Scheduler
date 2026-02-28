import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import headerImg from "../imgs/header-image.png";
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/icon/icon.js';

function Home() {
  const [showInput, setShowInput] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [isAttendee, setIsAttendee] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const handleClick = (isAttendee) => {
    setIsAttendee(isAttendee);
    setShowInput(true);
    setShowButton(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = inputRef.current?.value;
    if (!name) {
      alert("Please enter your name");
    } else {
      const path = isAttendee ? "/attendee" : "/organizer";
      navigate(`${path}?name=${encodeURIComponent(name)}`);
    }
  };

  return (
    <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', alignContent: 'center', alignItems: 'center' }}>
      <div className="md-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'center', maxWidth: '1000px', width: '100%', padding: '48px' }}>

        <div className="header-text" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', margin: 0, color: 'var(--md-sys-color-on-surface)', lineHeight: '1.2' }}>
              Coordinate <span style={{ color: 'var(--md-sys-color-primary)' }}>effortlessly.</span>
            </h1>
            <p style={{ marginTop: '16px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.1rem', lineHeight: '1.5' }}>
              The Relevance Weighted Meeting Scheduler makes finding a time that works for everyone delightfully simple.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {showButton && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <md-filled-button type="button" onClick={() => handleClick(true)}>
                  Join as Attendee
                </md-filled-button>
                <md-outlined-button type="button" onClick={() => navigate('/organizer')}>
                  View as Organizer
                </md-outlined-button>
              </div>
            )}

            {showInput && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '300px' }}>
                <md-outlined-text-field
                  ref={inputRef}
                  label="What's your name?"
                  type="text"
                  required
                ></md-outlined-text-field>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <md-filled-button type="submit" style={{ flex: 1 }}>
                    Continue
                  </md-filled-button>
                  <md-outlined-button type="button" onClick={() => { setShowInput(false); setShowButton(true); }}>
                    Back
                  </md-outlined-button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center' }}>
          <img
            src={headerImg}
            alt="An illustration of people on the phone and computer."
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '16px', objectFit: 'cover' }}
          />
        </div>

      </div>
    </div>
  );
}

export default Home;
