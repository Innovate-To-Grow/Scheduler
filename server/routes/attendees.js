const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

// GET all attendees
router.get('/', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM attendee ORDER BY name ASC');
        const attendees = stmt.all();
        res.json({ attendees });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

// POST new attendee
router.post('/', (req, res) => {
    try {
        const { name, schedule, submitted } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const defaultSchedule = JSON.stringify(Array(63).fill(1));
        const sched = schedule !== undefined ? schedule : defaultSchedule;
        const isSubmitted = submitted !== undefined ? submitted : 0;

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
            res.status(500).json({ error: err.message });
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

        let updateQuery = 'UPDATE attendee SET ';
        const params = [];

        if (schedule !== undefined) {
            updateQuery += 'schedule = ?, ';
            params.push(schedule);
        }

        if (submitted !== undefined) {
            updateQuery += 'submitted = ?, ';
            params.push(submitted);
        }

        if (params.length === 0) {
            return res.json(existing);
        }

        updateQuery = updateQuery.slice(0, -2); // remove last comma
        updateQuery += ' WHERE name = ?';
        params.push(name);

        db.prepare(updateQuery).run(...params);

        const updated = db.prepare('SELECT * FROM attendee WHERE name = ?').get(name);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
