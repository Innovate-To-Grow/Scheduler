import React from "react";
import { NavLink } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function Navbar() {
    return (
        // create a navbar with links to the home, organizer, and attendee pages that is responsive
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="container-fluid">
                <NavLink className="navbar-brand" to="/">
                    <span className="navbar-text">NavBar</span>
                </NavLink>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <NavLink className="nav-link" aria-current="page" to="/">Home</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" aria-current="page" to="/organizer">Organizer</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/attendee">Attendee</NavLink>
                        </li>
                        
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;