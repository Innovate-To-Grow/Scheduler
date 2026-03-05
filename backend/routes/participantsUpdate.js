import { Router } from "express";
import { DAYS_PER_WEEK } from "../lib/constants.js";
import { schedulerStore } from "../lib/store/index.js";
import { toApiParticipant } from "../lib/store/types.js";

export const participantsUpdateRouter = Router();

participantsUpdateRouter.put("/", async (req, res) => {
  try {
    const code = req.query.code;
    const name = req.query.name;
    if (!code || !name)
      return res.status(400).json({ error: "code and name are required" });

    const event = await schedulerStore.getEvent(code);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const { scheduleInperson, scheduleVirtual, submitted } = req.body;
    const expectedLength = (event.endHour - event.startHour) * DAYS_PER_WEEK;

    function validateSchedule(schedule, label) {
      let arr = schedule;
      if (typeof arr === "string") {
        try {
          arr = JSON.parse(arr);
        } catch {
          return `Invalid ${label}: not valid JSON`;
        }
      }
      if (!Array.isArray(arr)) return `Invalid ${label}: must be an array`;
      if (arr.length !== expectedLength)
        return `Invalid ${label}: expected ${expectedLength} slots, got ${arr.length}`;
      if (!arr.every((v) => typeof v === "number" && v >= 0 && v <= 1))
        return `Invalid ${label}: values must be numbers between 0 and 1`;
      return null;
    }

    if (scheduleInperson !== undefined) {
      const err = validateSchedule(scheduleInperson, "scheduleInperson");
      if (err) return res.status(400).json({ error: err });
    }
    if (scheduleVirtual !== undefined) {
      const err = validateSchedule(scheduleVirtual, "scheduleVirtual");
      if (err) return res.status(400).json({ error: err });
    }

    const existing = await schedulerStore.getParticipant(code, name);
    if (!existing) {
      return res.status(404).json({ error: "Participant not found" });
    }

    const updates = {};
    if (scheduleInperson !== undefined) {
      updates.scheduleInperson = Array.isArray(scheduleInperson)
        ? JSON.stringify(scheduleInperson)
        : scheduleInperson;
    }
    if (scheduleVirtual !== undefined) {
      updates.scheduleVirtual = Array.isArray(scheduleVirtual)
        ? JSON.stringify(scheduleVirtual)
        : scheduleVirtual;
    }
    if (submitted !== undefined) {
      updates.submitted = submitted ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ participant: toApiParticipant(existing) });
    }

    const updated = await schedulerStore.updateParticipant(code, name, updates);
    return res.json({ participant: toApiParticipant(updated) });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return res.status(status).json({ error: message });
  }
});

participantsUpdateRouter.delete("/", async (req, res) => {
  try {
    const code = req.query.code;
    const name = req.query.name;
    if (!code || !name)
      return res.status(400).json({ error: "code and name are required" });

    const event = await schedulerStore.getEvent(code);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const existing = await schedulerStore.getParticipant(code, name);
    if (!existing) {
      return res.status(404).json({ error: "Participant not found" });
    }

    await schedulerStore.deleteParticipantAndWeight(code, name);
    return res.json({ success: true, removed: { name } });
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : 500;
    const message = status === 500 ? "Internal server error" : err.message;
    return res.status(status).json({ error: message });
  }
});
