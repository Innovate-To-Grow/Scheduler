export function toApiEvent(event) {
  return {
    code: event.eventCode,
    name: event.name,
    startHour: event.startHour,
    endHour: event.endHour,
    days: Array.isArray(event.days) && event.days.length > 0 ? event.days : [1, 2, 3, 4, 5],
    mode: event.mode || "inperson",
    location: event.location || "",
    createdAt: event.createdAt,
  };
}

export function toApiParticipant(participant) {
  return {
    id: participant.participantId,
    event_id: participant.eventId,
    name: participant.participantName,
    schedule_inperson: participant.scheduleInperson,
    schedule_virtual: participant.scheduleVirtual,
    submitted: participant.submitted ? 1 : 0,
    created_at: participant.createdAt,
  };
}

export function toApiWeight(weight) {
  return {
    participant_name: weight.participantName,
    weight: Number(weight.weight),
    included: weight.included ? 1 : 0,
  };
}
