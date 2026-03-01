"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import EventContext from "@/components/EventContext";
import EventHeader from "@/components/EventHeader";
import ParticipantView from "@/components/ParticipantView";
import OrganizerView from "@/components/OrganizerView";
import AppButton from "@/components/AppButton";
import { fetchEvent } from "@/lib/api/events";

function EventPage() {
  const searchParams = useSearchParams();
  const eventCode = searchParams.get("code");
  const managePassword = searchParams.get("manage");

  const [event, setEvent] = useState(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { event: ev } = await fetchEvent(eventCode);
        setEvent(ev);

        if (managePassword !== null) {
          setIsOrganizer(true);
        }
      } catch (err) {
        setError(err.message || "Event not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventCode, managePassword]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <p style={{ color: "var(--md-sys-color-on-surface-variant)", fontSize: "1.1rem" }}>
          Loading event...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div className="md-card" style={{ maxWidth: "400px", textAlign: "center" }}>
          <h2 style={{ color: "var(--md-sys-color-error)" }}>Event Not Found</h2>
          <p style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
            {error || "This event does not exist."}
          </p>
          <Link href="/"><AppButton>Create New Event</AppButton></Link>
        </div>
      </div>
    );
  }

  const numSlots = (event.endHour - event.startHour) * 7;

  return (
    <EventContext.Provider value={{ event, isOrganizer, numSlots }}>
      <EventHeader eventName={event.name} eventCode={event.code} />
      {isOrganizer ? <OrganizerView /> : <ParticipantView />}
    </EventContext.Provider>
  );
}

export default EventPage;
