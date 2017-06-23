"use strict";

const clone = require("clone");
const extend = require("extend");
const markTime = require("mark-time");

/*
  * `dynamodb`: _Object_ Already created AWS.DynamoDB or AWS.DynamoDB.DocumentClient instance.
  * `version`: _String_ AWS module version.
  * `methods`: _Array_ Array of methods to instrument.
  * `logs`: _Object_ `telemetry-events-log` instance.
  * `metrics`: _Object_ `telemetry-events-quantify` instance.
  * `exportName`: _String_ _(Default: "DynamoDB")_ Export name to use in telemetry.
  Return: _Object_ AWS.DynamoDB instance with additional instrumented methods.
*/
const instrument = (dynamodb, version, methods, logs, metrics, exportName = "DynamoDB") =>
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
            if (logs)
            {
                logs.log(
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
            const startTime = markTime();
            dynamodb[method](params, (error, data) =>
            {
                const elapsedTime = markTime() - startTime;
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
                            `${exportName}.${method} failed`,
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

const main = instrument;
main.DocumentClient = (client, version, methods, logs, metrics) => instrument(client, version, methods, logs, metrics, "DynamoDB.DocumentClient");

module.exports = main;
