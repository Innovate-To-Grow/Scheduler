import React, { useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../db/supabaseClient";
import AttendeeContext from "../includes/AttendeeContext";

function Scheduler({ onAttendeeDataChanged }) {
 // set the color value of the GridSquare based on the value of schedule[i] using lerpColor
  const colorChange = (e) => {
    e.preventDefault();
    if (e.buttons === 1) {
      e.target.textContent = value;
      const color0 = "#E11B27";
      const color1 = "#ECF10E";
      const color2 = "#56A37A";
      const color = lerpColor(color0, color1, color2, value);
      e.target.style.backgroundColor = color;
    }
  };

  // lerpColor function to change the color of the GridSquare based on the value of schedule[i]
  function lerpColor(a, b, c, amount) {
    if (amount < 0.5) {
      const t = amount * 2;
      return RBG(a, b, t);
    } else {
      const t = (amount - 0.5) * 2;
      return RBG(b, c, t);
    }
  }

  // RBG function that returns the color value of the GridSquare
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

  // set up the grid for the scheduler
  let GridSquare = [];
  let GridLine = [];
  for (let j = 0; j < 7; j++) {
    GridSquare.push(
      <div
        className={`GridSquare`}
        onMouseMove={colorChange}
        onMouseDown={colorChange}
      >
        1
      </div>
    );
  }

  for (let i = 0; i < 9; i++) {
    GridLine.push(<div className={`GridLine`}>{GridSquare}</div>);
  }

  // set up the time labels for the scheduler
  let times = [];
  for (let i = 0; i < 9; i++) {
    // change this to be 9am to 5pm
    if (9 + i < 12) {
      times.push(<div className="time">{i + 9}:00 AM</div>);
    } else if (9 + i === 12) {
      times.push(<div className="time">{i + 9}:00 PM</div>);
    } else {
      times.push(<div className="time">{i + 9 - 12}:00 PM</div>);
    }
  }
  //  change the value of the slider
  const [value, setValue] = useState(1);
  const handleChange = (e) => {
    setValue(e.target.value);
  };

  // submit the form
  const location = useLocation();
  const searchParms = new URLSearchParams(location.search);
  const name = searchParms.get("name");


  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClick = () => {
    console.log("click");
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    console.log("confirm");
    setShowConfirmation(false);

    var schedulediv = document.querySelectorAll(".GridSquare");
    var schedule = [];
    for (let i = 0; i < schedulediv.length; i++) {
      schedule.push(schedulediv[i].innerHTML);
    }
    var jsonschedule = JSON.stringify(schedule);
    console.log(jsonschedule);

    const { data: existingAttendee } = await supabase
      .from("attendee")
      .select("*")
      .eq("name", name)
      .limit(1)
      .single();
      
    if (existingAttendee) {
      // Attendee exists in the database
      if (!existingAttendee.Submitted) {
        const { data: updatedAttendee, error: updateError } = await supabase
          .from("attendee")
          .update({ schedule: jsonschedule, Submitted: true })
          .eq("name", name);

        if (updateError) {
          console.log("error", updateError);
        } else {
          console.log("updated attendee", updatedAttendee);
          localStorage.setItem("attendeeDataChanged", Date.now()); // Store the timestamp in the local storage        
        }
      } else {
        console.log("Attendee already submitted schedule");
      }
    } else {
      // Attendee does not exist in the database
      const { data: newAttendee, error: insertError } = await supabase
        .from("attendee")
        .insert([{ name: name, schedule: jsonschedule, Submitted: true }]);

      if (insertError) {
        console.log("error", insertError);
      } else {
        console.log("new attendee", newAttendee);
        localStorage.setItem("attendeeDataChanged", Date.now()); // Store the timestamp in the local storage      
      }
    }
    // send back to homepage
    window.location.href = "/";
  };

  const handleCancel = () => {
    console.log("cancel");
    setShowConfirmation(false);
  };


  return (
    <>
        <label className="name-label">
          Name: {name}
        </label>
        <br />

        <input
          className="slider"
          type="range"
          min="0"
          max="1"
          step="0.25"
          value={value}
          onChange={handleChange}
        />
        <div className="slider-value">{value}</div>
        <div className="meeting-block">
          <div className="meeting-time">{times}</div>
          <div className="weekly" >
            <div className="days">
              <div className="day">Sun</div>
              <div className="day">Mon</div>
              <div className="day">Tue</div>
              <div className="day">Wed</div>
              <div className="day">Thu</div>
              <div className="day">Fri</div>
              <div className="day">Sat</div>
            </div>
            <div className="GridSlots">{GridLine}</div>
          </div>
        </div>
        <div className="submit-area">
      <button className="attendee-submit" onClick={handleClick}>Submit</button>
      {showConfirmation && (
        <div className="confirmation-box">
          <div className="confirmation-box-inner">
            <button className="confirmation-box-close" onClick={handleCancel}>
              &times;
            </button>
            <p className="confirmation-text">Confirm Submission</p>
            <div className="confirmation-button">
              <button className="attendee-submit" onClick={handleConfirm}>Yes</button>
              <button className="attendee-submit" onClick={handleCancel}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>

    </>
  );
}

function Attendee() {
  const { setAttendeeDataChanged } = useContext(AttendeeContext);

  const handleDataChange = () => {
    setAttendeeDataChanged(true);
  };

  return (
    <>
      <Scheduler onAttendeeDataChanged={handleDataChange} />
    </>
  );
}

export default Attendee;
