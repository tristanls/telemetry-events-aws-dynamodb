"use strict";

var AWS = require("aws-sdk");
var events = require("events");
var LogTelemetryEvents = require("telemetry-events-log");
var pkg = require("../package.json");
var QuantifyTelemetryEvents = require("telemetry-events-quantify");
var TelemetryEvents = require("telemetry-events");

var instrument = require("../index.js");

var emitter = new events.EventEmitter();
var telemetryEmitter = new TelemetryEvents(
{
    emitter: emitter,
    package: pkg
});
var logs = new LogTelemetryEvents(
{
    telemetry: telemetryEmitter
});
var metrics = new QuantifyTelemetryEvents(
{
    telemetry: telemetryEmitter
});

var dynamodb = new AWS.DynamoDB(
{
    region: "us-east-1"
});

dynamodb = instrument(
    dynamodb, AWS.VERSION, ["getItem", "putItem", "deleteItem"], logs, metrics);

console.log(typeof dynamodb.instrumentedGetItem);
// function
console.log(typeof dynamodb.instrumentedPutItem);
// function
console.log(typeof dynamodb.instrumentedDeleteItem);
// function
