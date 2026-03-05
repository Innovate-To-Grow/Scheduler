import crypto from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const DEFAULT_TABLES = {
  events: process.env.DDB_EVENTS_TABLE || "scheduler-prod-events",
  participants: process.env.DDB_PARTICIPANTS_TABLE || "scheduler-prod-participants",
  weights: process.env.DDB_WEIGHTS_TABLE || "scheduler-prod-weights",
};

function isConditionalCheckFailed(err) {
  return err?.name === "ConditionalCheckFailedException";
}

function mapEvent(item) {
  if (!item) return null;
  return {
    eventCode: item.eventCode,
    eventId: item.eventId,
    name: item.name,
    passwordHash: item.passwordHash,
    startHour: Number(item.startHour),
    endHour: Number(item.endHour),
    days: Array.isArray(item.days) ? item.days.map(Number) : [1, 2, 3, 4, 5],
    mode: item.mode || "inperson",
    location: item.location || "",
    createdAt: item.createdAt,
  };
}

function mapParticipant(item) {
  if (!item) return null;
  return {
    eventCode: item.eventCode,
    eventId: item.eventId,
    participantName: item.participantName,
    participantId: item.participantId,
    scheduleInperson: item.scheduleInperson,
    scheduleVirtual: item.scheduleVirtual,
    submitted: Number(item.submitted) ? 1 : 0,
    createdAt: item.createdAt,
  };
}

function mapWeight(item) {
  if (!item) return null;
  return {
    eventCode: item.eventCode,
    participantName: item.participantName,
    weight: Number(item.weight),
    included: Number(item.included) ? 1 : 0,
  };
}

export class DynamoSchedulerStore {
  constructor({ docClient, tables = DEFAULT_TABLES } = {}) {
    const region = process.env.AWS_REGION || "us-west-2";
    if (docClient && typeof docClient.send === "function") {
      this.doc = docClient;
    } else {
      const client = new DynamoDBClient({ region });
      this.doc = DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
    this.tables = tables;
  }

  async getEvent(eventCode) {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tables.events,
        Key: { eventCode },
      })
    );
    return mapEvent(res.Item);
  }

  async createEvent(event) {
    const item = {
      eventCode: event.eventCode,
      eventId: event.eventId || crypto.randomUUID(),
      name: event.name,
      passwordHash: event.passwordHash,
      startHour: event.startHour,
      endHour: event.endHour,
      days: event.days,
      mode: event.mode,
      location: event.location || "",
      createdAt: event.createdAt || new Date().toISOString(),
    };

    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tables.events,
          Item: item,
          ConditionExpression: "attribute_not_exists(eventCode)",
        })
      );
      return true;
    } catch (err) {
      if (isConditionalCheckFailed(err)) return false;
      throw err;
    }
  }

  async listParticipants(eventCode) {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tables.participants,
        KeyConditionExpression: "eventCode = :eventCode",
        ExpressionAttributeValues: {
          ":eventCode": eventCode,
        },
      })
    );
    return (res.Items || []).map(mapParticipant);
  }

  async listParticipantNames(eventCode) {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tables.participants,
        KeyConditionExpression: "eventCode = :eventCode",
        ProjectionExpression: "participantName",
        ExpressionAttributeValues: {
          ":eventCode": eventCode,
        },
      })
    );
    return (res.Items || []).map((item) => item.participantName);
  }

  async getParticipant(eventCode, participantName) {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tables.participants,
        Key: { eventCode, participantName },
      })
    );
    return mapParticipant(res.Item);
  }

  async createParticipantIfAbsent({
    eventCode,
    eventId,
    participantName,
    scheduleInperson,
    scheduleVirtual,
  }) {
    const item = {
      eventCode,
      eventId,
      participantName,
      participantId: crypto.randomUUID(),
      scheduleInperson,
      scheduleVirtual,
      submitted: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.tables.participants,
          Item: item,
          ConditionExpression:
            "attribute_not_exists(eventCode) AND attribute_not_exists(participantName)",
        })
      );
      return { participant: mapParticipant(item), created: true };
    } catch (err) {
      if (!isConditionalCheckFailed(err)) throw err;
      const existing = await this.getParticipant(eventCode, participantName);
      return { participant: existing, created: false };
    }
  }

  async updateParticipant(eventCode, participantName, updates) {
    const existing = await this.getParticipant(eventCode, participantName);
    if (!existing) return null;

    const next = {
      ...existing,
      ...(updates.scheduleInperson !== undefined
        ? { scheduleInperson: updates.scheduleInperson }
        : {}),
      ...(updates.scheduleVirtual !== undefined
        ? { scheduleVirtual: updates.scheduleVirtual }
        : {}),
      ...(updates.submitted !== undefined ? { submitted: updates.submitted ? 1 : 0 } : {}),
    };

    await this.doc.send(
      new PutCommand({
        TableName: this.tables.participants,
        Item: next,
      })
    );

    return mapParticipant(next);
  }

  async deleteParticipantAndWeight(eventCode, participantName) {
    await this.doc.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: this.tables.participants,
              Key: { eventCode, participantName },
            },
          },
          {
            Delete: {
              TableName: this.tables.weights,
              Key: { eventCode, participantName },
            },
          },
        ],
      })
    );
  }

  async listWeights(eventCode) {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tables.weights,
        KeyConditionExpression: "eventCode = :eventCode",
        ExpressionAttributeValues: {
          ":eventCode": eventCode,
        },
      })
    );
    return (res.Items || []).map(mapWeight);
  }

  async upsertWeights(eventCode, weights) {
    for (const item of weights) {
      await this.doc.send(
        new PutCommand({
          TableName: this.tables.weights,
          Item: {
            eventCode,
            participantName: item.participantName,
            weight: item.weight,
            included: item.included,
          },
        })
      );
    }
  }
}

export function createDefaultSchedulerStore() {
  return new DynamoSchedulerStore();
}
