import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import headerImg from "../imgs/header-image.png";

function Home() {
  const [showInput, setShowInput] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [isAttendee, setIsAttendee] = useState(false);

  const handleClick = (isAttendee) => {
    setIsAttendee(isAttendee);
    setShowInput(true);
    setShowButton(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = event.target.elements.name.value;
    if (name === "") {
      alert("Please enter your name");
    } else {
      const path = isAttendee ? "/attendee" : "/organizer";
      window.location.href = `${path}?name=${name}`;
    }
  };

  return (
    <div className="header">
      <div className="header-text">
        <h1>Relevance Weighted Meeting Scheduler</h1>
        <form onSubmit={handleSubmit}>
          {showButton && (
            <button className="goAttendee" onClick={() => handleClick(true)}>
              Attendee
            </button>
          )}
          {showButton && (
            <NavLink to="/organizer">
              <button className="goOrganizer">Organizer</button>
            </NavLink>
          )}
          {showInput && (
            <div className="attendee-input">
              <label>
                <input
                  className="Input"
                  type="text"
                  name="name"
                  placeholder="Name"
                />
              </label>
              <button type="submit" className="winAtt">
                Submit
              </button>
            </div>
          )}
        </form>
      </div>
      <img
        className="headerImg"
        src={headerImg}
        alt="An illustration of people on the phone and computer."
      />
    </div>
  );
}

export default Home;
