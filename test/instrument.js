"use strict";

var events = require("events");
var LogTelemetryEvents = require("telemetry-events-log");
var pkg = require("../package.json");
var QuantifyTelemetryEvents = require("telemetry-events-quantify");
var TelemetryEvents = require("telemetry-events");

var instrument = require("../index.js");

var VERSION = "0.0.0";

function createEmitters()
{
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
    return {
        telemetry: emitter,
        logs: logs,
        metrics: metrics
    };
};

var tests = module.exports = {};

tests["calls instrumented method with original params"] = function(test)
{
    test.expect(1);
    var emitters = createEmitters();
    var _params = {};
    var dynamodb = instrument(
    {
        getItem: function(params, _)
        {
            test.strictEqual(params, _params);
            test.done();
        }
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    dynamodb.instrumentedGetItem(_params, {}, function(){});
};

tests["logs call to instrumented method using paramsToLog"] = function(test)
{
    test.expect(1);
    var emitters = createEmitters();
    var dynamodb = instrument(
    {
        getItem: function(){}
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    var _paramsToLog = {log: "me"};
    emitters.telemetry.on("telemetry", function(event)
    {
        if (event.type == "log" && event.level == "info")
        {
            test.deepEqual(event.target,
            {
                module: "aws-sdk",
                version: VERSION,
                export: "DynamoDB",
                method: "getItem",
                args: [_paramsToLog]
            });
            test.done();
        }
    });
    dynamodb.instrumentedGetItem({},
    {
        paramsToLog: _paramsToLog
    },
    function(){});
};

tests["logs call to instrumented method using original params if no paramsToLog"] = function(test)
{
    test.expect(1);
    var emitters = createEmitters();
    var _params = {original: "params"};
    var dynamodb = instrument(
    {
        getItem: function(){}
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    emitters.telemetry.on("telemetry", function(event)
    {
        if (event.type == "log" && event.level == "info")
        {
            test.deepEqual(event.target,
            {
                module: "aws-sdk",
                version: VERSION,
                export: "DynamoDB",
                method: "getItem",
                args: [_params]
            });
            test.done();
        }
    });
    dynamodb.instrumentedGetItem(_params, {}, function(){});
};

tests["logs call to instrumented method extending metadata"] = function(test)
{
    test.expect(3);
    var emitters = createEmitters();
    var _params = {original: "params"};
    var _metadata = {
        some: "metadata"
    };
    var dynamodb = instrument(
    {
        getItem: function(){}
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    emitters.telemetry.on("telemetry", function(event)
    {
        if (event.type == "log" && event.level == "info")
        {
            test.deepEqual(event.target,
            {
                module: "aws-sdk",
                version: VERSION,
                export: "DynamoDB",
                method: "getItem",
                args: [_params]
            });
            test.equal(event.some, "metadata");
            test.equal(event.message, "attempting DynamoDB.getItem");
            test.done();
        }
    });
    dynamodb.instrumentedGetItem(_params,
    {
        metadata: _metadata
    },
    function(){});
};

tests["logs latency gauge of instrumented method"] = function(test)
{
    test.expect(4);
    var emitters = createEmitters();
    var _params = {original: "params"};
    var _metadata = {
        some: "metadata"
    };
    var dynamodb = instrument(
    {
        getItem: function(_, callback)
        {
            callback();
        }
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    emitters.telemetry.on("telemetry", function(event)
    {
        if (event.type == "metric" && event.target_type == "gauge")
        {
            test.deepEqual(event.target,
            {
                module: "aws-sdk",
                version: VERSION,
                export: "DynamoDB",
                method: "getItem"
            });
            test.equal(event.some, "metadata");
            test.equal(event.unit, "ms");
            test.ok(event.value > 0);
            test.done();
        }
    });
    dynamodb.instrumentedGetItem(_params,
    {
        metadata: _metadata
    },
    function(){});
};

tests["logs error result of the instrumented method extending metadata"] = function(test)
{
    test.expect(5);
    var emitters = createEmitters();
    var _params = {original: "params"};
    var _metadata = {
        some: "metadata"
    };
    var dynamodb = instrument(
    {
        getItem: function(_, callback)
        {
            callback(new Error("boom"));
        }
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    emitters.telemetry.on("telemetry", function(event)
    {
        if (event.type == "log" && event.level == "error")
        {
            test.deepEqual(event.target,
            {
                module: "aws-sdk",
                version: VERSION,
                export: "DynamoDB",
                method: "getItem",
                args: [_params]
            });
            test.equal(event.some, "metadata");
            test.equal(event.message, "DynamoDB.getItem failed");
            test.ok(event.error);
            test.ok(event.stack);
            test.done();
        }
    });
    dynamodb.instrumentedGetItem(_params,
    {
        metadata: _metadata
    },
    function(){});
};

tests["calls callback with instrumented method results and includes target metadata in context"] = function(test)
{
    test.expect(4);
    var emitters = createEmitters();
    var _params = {original: "params"};
    var _metadata = {
        some: "metadata"
    };
    var _data = {response: "data"};
    var dynamodb = instrument(
    {
        getItem: function(_, callback)
        {
            callback(null, _data);
        }
    },
    VERSION, ["getItem"], emitters.logs, emitters.metrics);
    dynamodb.instrumentedGetItem(_params,
    {
        metadata: _metadata
    },
    function(error, data, context)
    {
        test.ok(!error);
        test.strictEqual(data, _data);
        test.deepEqual(context.targetMetadata.target,
        {
            module: "aws-sdk",
            version: VERSION,
            export: "DynamoDB",
            method: "getItem"
        });
        test.equal(context.targetMetadata.some, "metadata");
        test.done();
    });
};
