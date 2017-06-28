"use strict";

const clone = require("clone");
const extend = require("extend");
const markTime = require("mark-time");

/*
  * `dynamodb`: _Object_ Already created AWS.DynamoDB or AWS.DynamoDB.DocumentClient instance.
  * `version`: _String_ AWS module version.
  * `methods`: _Array_ Array of methods to instrument.
  * `telemetry`: _Object_ Telemetry helpers.
    * `logs`: _Object_ `telemetry-events-log` instance.
    * `metrics`: _Object_ `telemetry-events-quantify` instance.
    * `tracing`: _Object_ `telemetry-events-tracing` instance.
  * `exportName`: _String_ _(Default: "DynamoDB")_ Export name to use in telemetry.
  Return: _Object_ AWS.DynamoDB instance with additional instrumented methods.
*/
const instrument = (dynamodb, version, methods, telemetry, exportName = "DynamoDB") =>
{
    methods.forEach(function(method)
    {
        const name = `instrumented${method[0].toUpperCase()}${method.slice(1)}`;
        dynamodb[name] = (params, context, callback) =>
        {
            const _targetMetadata = extend(true, clone(context.metadata),
            {
                target: {
                    module: "aws-sdk",
                    version: version,
                    export: exportName,
                    method: method
                }
            });
            if (telemetry.logs)
            {
                telemetry.logs.log(
                    "info",
                    `attempting ${exportName}.${method}`,
                    _targetMetadata,
                    {
                        target: {
                            args: [context.paramsToLog || params]
                        }
                    }
                );
            }
            let traceSpan;
            if (telemetry.tracing && context.parentSpan)
            {
                traceSpan = context.parentSpan.childSpan(`${exportName}.${method}`);
            }
            const startTime = markTime();
            dynamodb[method](params, (error, data) =>
            {
                const elapsedTime = markTime() - startTime;
                if (telemetry.metrics)
                {
                    telemetry.metrics.gauge("latency",
                    {
                        unit: "ms",
                        value: elapsedTime,
                        metadata: clone(_targetMetadata)
                    });
                }
                if (error)
                {
                    if (telemetry.logs)
                    {
                        telemetry.logs.log(
                            "error",
                            `${exportName}.${method} failed`,
                            _targetMetadata,
                        {
                            target: {
                                args: [context.paramsToLog || params]
                            },
                            error,
                            stack: error.stack
                        });
                    }
                    if (traceSpan)
                    {
                        traceSpan.tag("error", true);
                    }
                }
                if (traceSpan)
                {
                    traceSpan.finish();
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

const main = instrument;
main.DocumentClient = (client, version, methods, telemetry) => instrument(client, version, methods, telemetry, "DynamoDB.DocumentClient");

module.exports = main;
