const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

const SCHEDULE_SLOTS = 63;
const MAX_NAME_LENGTH = 200;

function isValidSchedule(schedule) {
    try {
        const parsed = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
        return Array.isArray(parsed) && parsed.length === SCHEDULE_SLOTS &&
            parsed.every(v => typeof v === 'number' && v >= 0 && v <= 1);
    } catch {
        return false;
    }
}

function normalizeSchedule(schedule) {
    if (typeof schedule === 'string') return schedule;
    return JSON.stringify(schedule);
}

// GET all attendees
router.get('/', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM attendee ORDER BY name ASC');
        const attendees = stmt.all();
        res.json({ attendees });
    } catch (err) {
        console.error('GET /attendees error:', err);
        res.status(500).json({ error: 'Failed to fetch attendees' });
    }
});

// GET attendee by name
router.get('/:name', (req, res) => {
    try {
        const { name } = req.params;
        const stmt = db.prepare('SELECT * FROM attendee WHERE name = ?');
        const attendee = stmt.get(name);

        if (attendee) {
            res.json(attendee);
        } else {
            res.status(404).json({ error: 'Attendee not found' });
        }
    } catch (err) {
        console.error('GET /attendees/:name error:', err);
        res.status(500).json({ error: 'Failed to fetch attendee' });
    }
});

// POST new attendee
router.post('/', (req, res) => {
    try {
        const { name, schedule, submitted } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Name is required and must be a string' });
        }

        if (name.length > MAX_NAME_LENGTH) {
            return res.status(400).json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` });
        }

        const defaultSchedule = JSON.stringify(Array(SCHEDULE_SLOTS).fill(1));
        let sched = defaultSchedule;

        if (schedule !== undefined) {
            if (!isValidSchedule(schedule)) {
                return res.status(400).json({ error: `Schedule must be a JSON array of ${SCHEDULE_SLOTS} numbers between 0 and 1` });
            }
            sched = normalizeSchedule(schedule);
        }

        const isSubmitted = (submitted === 1 || submitted === true) ? 1 : 0;

        const stmt = db.prepare(`
      INSERT INTO attendee (name, schedule, submitted)
      VALUES (?, ?, ?)
    `);

        const info = stmt.run(name, sched, isSubmitted);

        const newAttendee = db.prepare('SELECT * FROM attendee WHERE id = ?').get(info.lastInsertRowid);
        res.status(201).json(newAttendee);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            res.status(409).json({ error: 'Attendee already exists' });
        } else {
            console.error('POST /attendees error:', err);
            res.status(500).json({ error: 'Failed to create attendee' });
        }
    }
});

// PUT update attendee
router.put('/:name', (req, res) => {
    try {
        const { name } = req.params;
        const { schedule, submitted } = req.body;

        const existing = db.prepare('SELECT * FROM attendee WHERE name = ?').get(name);
        if (!existing) {
            return res.status(404).json({ error: 'Attendee not found' });
        }

        const clauses = [];
        const params = [];

        if (schedule !== undefined) {
            if (!isValidSchedule(schedule)) {
                return res.status(400).json({ error: `Schedule must be a JSON array of ${SCHEDULE_SLOTS} numbers between 0 and 1` });
            }
            clauses.push('schedule = ?');
            params.push(normalizeSchedule(schedule));
        }

        if (submitted !== undefined) {
            const val = (submitted === 1 || submitted === true) ? 1 : 0;
            clauses.push('submitted = ?');
            params.push(val);
        }

        if (clauses.length === 0) {
            return res.json(existing);
        }

        const updateQuery = `UPDATE attendee SET ${clauses.join(', ')} WHERE name = ?`;
        params.push(name);

        db.prepare(updateQuery).run(...params);

        const updated = db.prepare('SELECT * FROM attendee WHERE name = ?').get(name);
        res.json(updated);
    } catch (err) {
        console.error('PUT /attendees/:name error:', err);
        res.status(500).json({ error: 'Failed to update attendee' });
    }
});

module.exports = router;
