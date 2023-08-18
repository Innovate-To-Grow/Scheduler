import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import React, { useState } from "react";
import Home from "./pages/Home";
import Organizer from "./pages/Organizer";
import Attendee from "./pages/Attendee";
import { Routes, Route } from "react-router-dom";
import Navbar from "./includes/NavBar";
import AttendeeContext from "./includes/AttendeeContext";

function App() {
  const [attendeeDataChanged, setAttendeeDataChanged] = useState(false);

  return (
    <div className="App">
      <Navbar />
      <AttendeeContext.Provider
        value={{ attendeeDataChanged, setAttendeeDataChanged }}
      >
        <Routes>
          <Route path="/scheduler" element={<Home />} />
          <Route path="/scheduler/organizer" element={<Organizer />} />
          <Route path="/scheduler/attendee" element={<Attendee />} />
          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AttendeeContext.Provider>
    </div>
  );
}

export default App;
