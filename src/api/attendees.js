const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function fetchAttendees() {
    const response = await fetch(`${API_BASE}/attendees`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch attendees');
    }
    return response.json();
}

export async function fetchAttendee(name) {
    const response = await fetch(`${API_BASE}/attendees/${encodeURIComponent(name)}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch attendee');
    }
    return response.json();
}

export async function createAttendee({ name, schedule, submitted }) {
    const response = await fetch(`${API_BASE}/attendees`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, schedule, submitted }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create attendee');
    }
    return response.json();
}

export async function updateAttendee(name, { schedule, submitted }) {
    const response = await fetch(`${API_BASE}/attendees/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule, submitted }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update attendee');
    }
    return response.json();
}
