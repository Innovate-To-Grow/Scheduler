const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');
const attendeesRouter = require('./routes/attendees');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow all origins for dev
app.use(express.json());

// Init DB
initDatabase();

// Routes
app.use('/api/attendees', attendeesRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
