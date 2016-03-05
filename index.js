"use strict";

var clone = require("clone");
var extend = require("extend");
var markTime = require("mark-time");

/*
  * `dynamodb`: _Object_ Already created AWS.DynamoDB instance.
  * `version`: _String_ AWS module version.
  * `methods`: _Array_ Array of methods to instrument.
  * `logs`: _Object_ `telemetry-events-log` instance.
  * `metrics`: _Object_ `telemetry-events-quantify` instance.
  Return: _Object_ AWS.DynamoDB instance with additional instrumented methods.
*/
module.exports = function instrumented(dynamodb, version, methods, logs, metrics)
{
    methods.forEach(function(method)
    {
        var name = "instrumented" + method[0].toUpperCase() + method.slice(1);
        dynamodb[name] = function(params, context, callback)
        {
            var _targetMetadata = extend(true, clone(context.metadata),
            {
                target: {
                    module: "aws-sdk",
                    version: version,
                    export: "DynamoDB",
                    method: method
                }
            });
            if (logs)
            {
                logs.log(
                    "info", "attempting DynamoDB." + method, _targetMetadata,
                {
                    target: {
                        args: [context.paramsToLog || params]
                    }
                });
            }
            var startTime = markTime();
            dynamodb.getItem(params, function(error, data)
            {
                var elapsedTime = markTime() - startTime;
                if (metrics)
                {
                    metrics.gauge("latency",
                    {
                        unit: "ms",
                        value: elapsedTime,
                        metadata: clone(_targetMetadata)
                    });
                }
                if (error)
                {
                    if (logs)
                    {
                        logs.log(
                            "error",
                            "DynamoDB." + method + " failed",
                            _targetMetadata,
                        {
                            target: {
                                args: [context.paramsToLog || params]
                            },
                            error: error,
                            stack: error.stack
                        });
                    }
                }
                callback(error, data,
                {
                    targetMetadata: _targetMetadata
                });
            });
        }
    });
    return dynamodb;
};
