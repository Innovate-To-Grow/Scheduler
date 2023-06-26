// Import necessary modules and components
import React, { useState, useEffect, useContext } from "react";
import { GoVerified, GoUnverified } from "react-icons/go";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../db/supabaseClient";
import AttendeeContext from "../includes/AttendeeContext";

// Initialize arrays for storing attendee data
let AttendeeSchedule = [];
let Attendeename = [];
let AttendeeRelevence = [];
let AttendeeVerified = [];

function calculateAverageSchedule(schedules) {
  let averageSchedule = [];
  // have averageSchule same value as schedules
  for (let i = 0; i < schedules.length; i++) {
    averageSchedule.push(schedules[i]);
  }

  return averageSchedule;
}


// Function for adding a new user to the database and updating the local arrays
async function AddUser(name, setAttendeeDataChanged) {
  // Initialize variables
  let schedule = [];
  let verified = false;

  // Create an initial schedule array with default values
  for (let i = 0; i < 9 * 7; i++) {
    schedule.push(1);
  }
  let jsonschedule = JSON.stringify(schedule);

  // Insert the new user into the database
  const { data, error } = await supabase
    .from("attendee")
    .insert([{ name: name, schedule: jsonschedule, Submitted: verified }]);
  if (error) {
    console.log("error", error);
  } else {
    console.log("data", data);
    setAttendeeDataChanged(false);
  }

  // Update the global attendee data arrays with the new user's data  Attendeename.push(name);
  AttendeeSchedule.push(schedule);
  AttendeeRelevence.push(1);
  AttendeeVerified.push(verified);

  // Toggle attendeeDataChanged state
  setAttendeeDataChanged((prevState) => !prevState);
}

// Scheduler component that displays the schedule and allows for attendee management
function Scheduler({ schedule, setAttendeeDataChanged, averageSchedule }) {
  let GridSquare = [];
  let GridLine = [];
  let AverageGridSquare = [];
  let AverageGridLine = [];
  const [sliderValues, setSliderValues] = useState([]);

  // Set up colors for the scheduler grid
  const color0 = "#E11B27";
  const color1 = "#ECF10E";
  const color2 = "#56A37A";
  // Function to interpolate between colors based on schedule values
  function lerpColor(a, b, c, amount) {
    if (amount < 0.5) {
      const t = amount * 2;
      return RBG(a, b, t);
    } else {
      const t = (amount - 0.5) * 2;
      return RBG(b, c, t);
    }
  }
  // Function to calculate RBG values for interpolated colors
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

  // Set up GridSquare elements based on schedule values and interpolated colors
  for (let i = 0; i < 9 * 7; i++) {
    if (GridSquare.length === 7) {
      GridLine.push(<div className={`GridLine`}>{GridSquare}</div>);
      GridSquare = [];
    }
    // Determine the color of the GridSquare based on the value of schedule[i] using lerpColor
    const color = lerpColor(color0, color1, color2, schedule[i]);
    GridSquare.push(
      <div className={`GridSquare`} style={{ backgroundColor: color }}>
        {schedule[i]}
      </div>
    );
  }
  // Push the final row of GridSquare elements into GridLine
  if (GridSquare.length > 0) {
    GridLine.push(<div className={`GridLine`}>{GridSquare}</div>);
    GridSquare = [];
  }

    // Set up GridSquare elements based on schedule values and interpolated colors
    for (let i = 0; i < 9 * 7; i++) {
      if (AverageGridSquare.length === 7) {
        AverageGridLine.push(<div className={`GridLine`}>{AverageGridSquare}</div>);
        AverageGridSquare = [];
      }
      // Determine the color of the GridSquare based on the value of schedule[i] using lerpColor
      const color = lerpColor(color0, color1, color2, averageSchedule[i]);
      AverageGridSquare.push(
        <div className={`GridSquare`} style={{ backgroundColor: color }}>
          {averageSchedule[i]}
        </div>
      );
    }
    // Push the final row of GridSquare elements into GridLine
    if (AverageGridSquare.length > 0) {
      AverageGridLine.push(<div className={`GridLine`}>{AverageGridSquare}</div>);
      AverageGridSquare = [];
    }
  

  // set up the time labels for the scheduler
  let times = [];
  for (let i = 0; i < 9; i++) {
    if (9 + i < 12) {
      times.push(`${i + 9}:00 AM`);
    } else if (9 + i === 12) {
      times.push(`${i + 9}:00 PM`);
    } else {
      times.push(`${i + 9 - 12}:00 PM`);
    }
  }

  // Clear the input field after adding an attendee
  const onClear = () => {
    document.getElementById("name").value = "";
  };

  // Manage the state of the confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Show the confirmation modal when the "Add Attendee" button is clicked
  const handleClick = () => {
    setShowConfirmation(true);
  };

  // Handle user confirmation and add the new attendee
  const handleConfirm = () => {
    // Do something here when the user confirms the action
    AddUser(document.getElementById("name").value, setAttendeeDataChanged); // Update this line
    onClear();
    setShowConfirmation(false);
  };

  // Handle user cancellation of the confirmation modal
  const handleCancel = () => {
    // Do something here when the user cancels the action
    setShowConfirmation(false);
  };

  // this is the function that is called when the slider is changed
  function multiplyScheduleItem(item, index, attendeeRelevance) {
    return item * attendeeRelevance;
  }

  function addScheduleItem(item, index, newSchedule) {
    return item + newSchedule[index];
  }

  function handleChange(
    e,
    index,
    sliderValues,
    setSliderValues,
    AttendeeRelevence,
    AttendeeSchedule,
    schedule
  ) {
    const newSliderValues = [...sliderValues];
    newSliderValues[index] = Number(e.target.value);
    setSliderValues(newSliderValues);
    AttendeeRelevence[index] = Number(e.target.value);
    // change the schedule in schedule-changer
    let totalSchedule = [];
    for (let i = 0; i < AttendeeSchedule.length; i++) {
      let scheduleArray = AttendeeSchedule[i];

      if (totalSchedule.length === 0) {
        totalSchedule = scheduleArray;
        totalSchedule = totalSchedule.map((item, index) =>
          multiplyScheduleItem(item, index, AttendeeRelevence[i])
        );
      } else {
        let newSchedule = scheduleArray;
        newSchedule = newSchedule.map((item, index) =>
          multiplyScheduleItem(item, index, AttendeeRelevence[i])
        );
        totalSchedule = totalSchedule.map((item, index) =>
          addScheduleItem(item, index, newSchedule)
        );
      }
    }
    let NumberOfRelevence = 0;
    for (let i = 0; i < AttendeeRelevence.length; i++) {
      if (AttendeeRelevence[i] > 0) {
        NumberOfRelevence++;
      }
    }
    totalSchedule = totalSchedule.map((item, index) => {
      return (item / NumberOfRelevence).toFixed(2);
    });
    for (let i = 0; i < 9 * 7; i++) {
      schedule[i] = totalSchedule[i];
    }
  }

  return (
    <div>
      <div className="schedule-changer">
        <div className="meeting-block">
          {/* create a for to add someone and after hitting submit it clears the input*/}
          <div className="features">
            <div className="relevence">
              <div className="titleSlider">
                <h3>Participants</h3>
                <hr></hr>
              </div>
              <div className="group-slider">
                {AttendeeRelevence.map((item, index) => {
                  return (
                    <div className="slider">
                      <label className="name-label">
                        {Attendeename[index]}
                      </label>
                      <input
                        className="relevanceSlider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={sliderValues[index] || AttendeeRelevence[index]}
                        onChange={(e) =>
                          handleChange(
                            e,
                            index,
                            sliderValues,
                            setSliderValues,
                            AttendeeRelevence,
                            AttendeeSchedule,
                            schedule
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <button className="attendee-submit" onClick={handleClick}>
                Add Attendee
              </button>
              {showConfirmation && (
                <div className="confirmation-box">
                  <div className="confirmation-box-inner">
                    <button
                      className="confirmation-box-close"
                      onClick={handleCancel}
                    >
                      &times;
                    </button>
                    <p>Create Attendee</p>
                    <div className="confirmation-button">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        placeholder="Add Attendee"
                      ></input>
                      <button
                        className="attendee-submit"
                        onClick={handleConfirm}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="attendee-block">
              {/* create multiple meeting blocks with each attendee schedule */}
              {AttendeeSchedule.map((item, index) => {
                let GridSquare = [];
                let GridLine = [];
                let marker;
                for (let i = 0; i < 9 * 7; i++) {
                  if (GridSquare.length === 7) {
                    GridLine.push(
                      <div className={`GridLine`}>{GridSquare}</div>
                    );
                    GridSquare = [];
                  }
                  const color = lerpColor(color0, color1, color2, item[i]);

                  GridSquare.push(
                    <div
                      className={`GridSquare`}
                      style={{ backgroundColor: color }}
                    >
                      {item[i]}
                    </div>
                  );
                }
                if (GridSquare.length > 0) {
                  GridLine.push(<div className={`GridLine`}>{GridSquare}</div>);
                  GridSquare = [];
                }
                if (AttendeeVerified[index] === true) {
                  // do a tooltip of the verified icon
                  marker = (
                    <div className="verified">
                      {<GoVerified />}
                      <div className="tooltiptext">Submitted</div>{" "}
                    </div>
                  );
                } else {
                  marker = (
                    <div className="verified">
                      {<GoUnverified />}
                      <div className="tooltiptext">Not submitted</div>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="AttendeeName">{Attendeename[index]}</div>
                    {marker}
                    <div className="meeting-block">
                      <div className="meeting-time">
                        {times.map((item, index) => {
                          return <div className="time">{item}</div>;
                        })}
                      </div>
                      <div className="weekly">
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
                  </>
                );
              })}
            </div>
          </div>
          <div className="spacer"></div>
          <div class="schedule-blocks">
            <div className="ogranizer-block">
              <h3>Weighted Average Schedule</h3>
              <hr></hr>
              <div className="meeting-time">
                {times.map((item, index) => {
                  return <div className="time">{item}</div>;
                })}
              </div>
              <div className="weekly">
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
            <div className="ogranizer-block-2">
              <h3>Average Schedule</h3>
              <hr></hr>
              <div className="meeting-time">
                {times.map((item, index) => {
                  return <div className="time">{item}</div>;
                })}
              </div>
              <div className="weekly">
                <div className="days">
                  <div className="day">Sun</div>
                  <div className="day">Mon</div>
                  <div className="day">Tue</div>
                  <div className="day">Wed</div>
                  <div className="day">Thu</div>
                  <div className="day">Fri</div>
                  <div className="day">Sat</div>
                </div>
                <div className="GridSlots">{AverageGridLine}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Organizer() {
  const { attendeeDataChanged, setAttendeeDataChanged } =
    useContext(AttendeeContext);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    async function getAttendee() {
      const attendee = await supabase.from("attendee").select("schedule");
      const name = await supabase.from("attendee").select("name");
      const verified = await supabase.from("attendee").select("Submitted");
      let totalSchedule = [];
      AttendeeSchedule = [];
      Attendeename = [];
      AttendeeRelevence = [];
      AttendeeVerified = [];
      // get all the schedule data from the database
      for (let i = 0; i < attendee.data.length; i++) {
        let scheduleData = attendee.data[i].schedule;
        let scheduleArray = JSON.parse(scheduleData);
        // add the name of the attendee to the attendeename
        Attendeename.push(name.data[i].name);
        AttendeeVerified.push(verified.data[i].Submitted);
        AttendeeRelevence.push(1);
        if (totalSchedule.length === 0) {
          totalSchedule = scheduleArray;
          AttendeeSchedule.push(scheduleArray);
        } else {
          totalSchedule = totalSchedule.map(
            (item, index) => Number(item) + Number(scheduleArray[index])
          );
          AttendeeSchedule.push(scheduleArray);
        }
      }
      // calculate the average schedule
      totalSchedule = totalSchedule.map((item) =>
        (item / attendee.data.length).toFixed(2)
      );
      setSchedule(totalSchedule);
      console.log(AttendeeSchedule);
      console.log(Attendeename);
      // Reset the attendeeDataChanged state after fetching data
      setAttendeeDataChanged(false);
    }
    getAttendee();
  }, [attendeeDataChanged, setAttendeeDataChanged]);
  const averageSchedule = calculateAverageSchedule(schedule);

  return (
    <Scheduler
      schedule={schedule}
      setAttendeeDataChanged={setAttendeeDataChanged}
      averageSchedule={averageSchedule}
    />
  );
}

export default Organizer;