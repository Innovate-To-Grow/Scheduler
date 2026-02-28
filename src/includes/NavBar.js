import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            height: '64px',
            backgroundColor: 'var(--md-sys-color-surface)',
            color: 'var(--md-sys-color-on-surface)',
            boxShadow: 'var(--md-sys-elevation-1)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <NavLink to="/" style={{ textDecoration: 'none', color: 'var(--md-sys-color-primary)', fontWeight: 'bold', fontSize: '20px', marginRight: '32px', letterSpacing: '-0.5px' }}>
                Scheduler
            </NavLink>
            <div style={{ display: 'flex', gap: '24px' }}>
                <NavLink to="/" style={({ isActive }) => ({ textDecoration: 'none', color: isActive ? 'var(--md-sys-color-primary)' : 'inherit', fontWeight: isActive ? 'bold' : '500' })}>Home</NavLink>
                <NavLink to="/organizer" style={({ isActive }) => ({ textDecoration: 'none', color: isActive ? 'var(--md-sys-color-primary)' : 'inherit', fontWeight: isActive ? 'bold' : '500' })}>Organizer</NavLink>
                <NavLink to="/attendee" style={({ isActive }) => ({ textDecoration: 'none', color: isActive ? 'var(--md-sys-color-primary)' : 'inherit', fontWeight: isActive ? 'bold' : '500' })}>Attendee</NavLink>
            </div>
        </nav>
    );
}

export default Navbar;