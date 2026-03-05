import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { schedulerStore } from "../lib/store/index.js";
import { toApiEvent } from "../lib/store/types.js";

export const dashboardRouter = Router();

dashboardRouter.get("/events", requireAuth, async (req, res) => {
  try {
    const userEvents = await schedulerStore.listUserEvents(req.userId);

    const organized = [];
    const participating = [];

    for (const ue of userEvents) {
      const event = await schedulerStore.getEvent(ue.eventCode);
      if (!event) continue;
      const apiEvent = toApiEvent(event);
      if (ue.role === "organizer") {
        organized.push(apiEvent);
      } else {
        participating.push(apiEvent);
      }
    }

    return res.json({ organized, participating });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});
