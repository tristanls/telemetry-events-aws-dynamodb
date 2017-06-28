"use strict";

const AWS = require("aws-sdk");
const events = require("events");
const LogTelemetryEvents = require("telemetry-events-log");
const pkg = require("../package.json");
const QuantifyTelemetryEvents = require("telemetry-events-quantify");
const TelemetryEvents = require("telemetry-events");
const TraceTelemetryEvents = require("telemetry-events-trace");

const instrument = require("../index.js");

const emitter = new events.EventEmitter();
const telemetryEmitter = new TelemetryEvents(
    {
        emitter: emitter,
        package: pkg
    }
);
const logs = new LogTelemetryEvents(
    {
        telemetry: telemetryEmitter
    }
);
const metrics = new QuantifyTelemetryEvents(
    {
        telemetry: telemetryEmitter
    }
);
const tracing = new TraceTelemetryEvents(
    {
        telemetry: telemetryEmitter
    }
);

let dynamodb = new AWS.DynamoDB(
{
    region: "us-east-1"
});

dynamodb = instrument(
    dynamodb,
    AWS.VERSION,
    [
        "getItem", "putItem", "deleteItem"
    ],
    {
        logs,
        metrics,
        tracing
    }
);

let documentClient = new AWS.DynamoDB.DocumentClient(
    {
        region: "us-east-1"
    }
);
documentClient = instrument.DocumentClient(
    documentClient,
    AWS.VERSION,
    [
        "createSet", "get"
    ],
    {
        logs,
        metrics,
        tracing
    }
);

console.log(typeof dynamodb.instrumentedGetItem);
// function
console.log(typeof dynamodb.instrumentedPutItem);
// function
console.log(typeof dynamodb.instrumentedDeleteItem);
// function

console.log(typeof documentClient.instrumentedCreateSet);
// function
console.log(typeof documentClient.instrumentedGet);
// function
