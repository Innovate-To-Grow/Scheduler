#!/usr/bin/env node
/* eslint-disable no-console */

const path = require("path");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("Missing dependency: better-sqlite3");
  console.error("Install it temporarily for migration: npm i -D better-sqlite3");
  process.exit(1);
}

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const region = process.env.AWS_REGION || "us-west-2";
const eventsTable = process.env.DDB_EVENTS_TABLE || "scheduler-prod-events";
const participantsTable = process.env.DDB_PARTICIPANTS_TABLE || "scheduler-prod-participants";
const weightsTable = process.env.DDB_WEIGHTS_TABLE || "scheduler-prod-weights";
const sqlitePath = process.argv[2] || path.join(process.cwd(), "data", "scheduler.db");

async function main() {
  const sqlite = new Database(sqlitePath, { readonly: true });
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  const events = sqlite
    .prepare(
      "SELECT id, code, name, password_hash, start_hour, end_hour, days, mode, location, created_at FROM event"
    )
    .all();

  const eventCodeById = new Map();
  for (const event of events) {
    eventCodeById.set(event.id, event.code);

    const item = {
      eventCode: event.code,
      eventId: String(event.id),
      name: event.name,
      passwordHash: event.password_hash,
      startHour: Number(event.start_hour),
      endHour: Number(event.end_hour),
      days: safeParseDays(event.days),
      mode: event.mode || "inperson",
      location: event.location || "",
      createdAt: normalizeCreatedAt(event.created_at),
    };

    await client.send(
      new PutCommand({
        TableName: eventsTable,
        Item: item,
      })
    );
  }

  const participants = sqlite
    .prepare(
      "SELECT id, event_id, name, schedule_inperson, schedule_virtual, submitted, created_at FROM participant"
    )
    .all();

  for (const participant of participants) {
    const eventCode = eventCodeById.get(participant.event_id);
    if (!eventCode) {
      console.warn(
        `Skipping participant '${participant.name}' with missing event_id=${participant.event_id}`
      );
      continue;
    }

    await client.send(
      new PutCommand({
        TableName: participantsTable,
        Item: {
          eventCode,
          eventId: String(participant.event_id),
          participantName: participant.name,
          participantId: String(participant.id),
          scheduleInperson: participant.schedule_inperson,
          scheduleVirtual: participant.schedule_virtual,
          submitted: participant.submitted ? 1 : 0,
          createdAt: normalizeCreatedAt(participant.created_at),
        },
      })
    );
  }

  const weights = sqlite
    .prepare("SELECT event_id, participant_name, weight, included FROM participant_weight")
    .all();

  for (const weight of weights) {
    const eventCode = eventCodeById.get(weight.event_id);
    if (!eventCode) {
      console.warn(
        `Skipping weight for participant '${weight.participant_name}' with missing event_id=${weight.event_id}`
      );
      continue;
    }

    await client.send(
      new PutCommand({
        TableName: weightsTable,
        Item: {
          eventCode,
          participantName: weight.participant_name,
          weight: Number(weight.weight),
          included: weight.included ? 1 : 0,
        },
      })
    );
  }

  sqlite.close();

  console.log("SQLite to DynamoDB migration completed.");
  console.log(`Events migrated: ${events.length}`);
  console.log(`Participants migrated: ${participants.length}`);
  console.log(`Weights migrated: ${weights.length}`);
}

function safeParseDays(days) {
  if (!days) return [1, 2, 3, 4, 5];
  try {
    const parsed = JSON.parse(days);
    return Array.isArray(parsed) ? parsed.map(Number) : [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

function normalizeCreatedAt(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
