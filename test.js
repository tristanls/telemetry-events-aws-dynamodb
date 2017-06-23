"use strict";

const events = require("events");
const LogTelemetryEvents = require("telemetry-events-log");
const pkg = require("./package.json");
const QuantifyTelemetryEvents = require("telemetry-events-quantify");
const TelemetryEvents = require("telemetry-events");

const instrument = require("./index.js");

const VERSION = "0.0.0";

function createEmitters()
{
    const emitter = new events.EventEmitter();
    const telemetry = new TelemetryEvents(
        {
            emitter,
            package: pkg
        }
    );
    const logs = new LogTelemetryEvents(
        {
            telemetry
        }
    );
    const metrics = new QuantifyTelemetryEvents(
        {
            telemetry
        }
    );
    return (
        {
            telemetry: emitter,
            logs,
            metrics
        }
    );
};

test("calls instrumented method with original params", done =>
    {
        const emitters = createEmitters();
        const _params = {};
        const dynamodb = instrument(
            {
                getItem: params =>
                {
                    expect(params).toBe(_params);
                    done();
                }
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        dynamodb.instrumentedGetItem(_params, {}, () => {});
    }
);

test("logs call to instrumented method using paramsToLog", done =>
    {
        const emitters = createEmitters();
        const dynamodb = instrument(
            {
                getItem: () => {}
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        const _paramsToLog = { log: "me" };
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "info")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB",
                            method: "getItem",
                            args:
                            [
                                _paramsToLog
                            ]
                        }
                    );
                    done();
                }
            }
        );
        dynamodb.instrumentedGetItem({},
            {
                paramsToLog: _paramsToLog
            },
            () => {}
        );
    }
);

test("logs call to instrumented method using original params if no paramsToLog", done =>
    {
        const emitters = createEmitters();
        const dynamodb = instrument(
            {
                getItem: () => {}
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        const _params = { original: "params" };
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "info")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB",
                            method: "getItem",
                            args:
                            [
                                _params
                            ]
                        }
                    );
                    done();
                }
            }
        );
        dynamodb.instrumentedGetItem(_params, {}, () => {});
    }
);

test("logs call to instrumented method extending metadata", done =>
    {
        const emitters = createEmitters();
        const _params =
        {
            original: "params"
        };
        const _metadata =
        {
            some: "metadata"
        };
        const dynamodb = instrument(
            {
                getItem: () => {}
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "info")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB",
                            method: "getItem",
                            args:
                            [
                                _params
                            ]
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.message).toBe("attempting DynamoDB.getItem");
                    done();
                }
            }
        );
        dynamodb.instrumentedGetItem(_params,
            {
                metadata: _metadata
            },
            () => {}
        );
    }
);

test("logs latency gauge of instrumented method", done =>
    {
        const emitters = createEmitters();
        const _params =
        {
            original: "params"
        };
        const _metadata =
        {
            some: "metadata"
        };
        const dynamodb = instrument(
            {
                getItem: (_, callback) => callback()
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "metric" && event.target_type == "gauge")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB",
                            method: "getItem"
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.unit).toBe("ms");
                    expect(event.value).toBeGreaterThan(0);
                    done();
                }
            }
        );
        dynamodb.instrumentedGetItem(_params,
            {
                metadata: _metadata
            },
            () => {}
        );
    }
);

test("logs error result of the instrumented method extending metadata", done =>
    {
        const emitters = createEmitters();
        const _params =
        {
            original: "params"
        };
        const _metadata =
        {
            some: "metadata"
        };
        const dynamodb = instrument(
            {
                getItem: (_, callback) => callback(new Error("boom"))
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "error")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB",
                            method: "getItem",
                            args:
                            [
                                _params
                            ]
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.message).toBe("DynamoDB.getItem failed");
                    expect(event.error).toBeTruthy();
                    expect(event.stack).toBeTruthy();
                    done();
                }
            }
        );
        dynamodb.instrumentedGetItem(_params,
            {
                metadata: _metadata
            },
            () => {}
        );
    }
);

test("calls callback with instrumented method results and includes target metadata in context", done =>
    {
        const emitters = createEmitters();
        const _params =
        {
            original: "params"
        };
        const _metadata =
        {
            some: "metadata"
        };
        const _data =
        {
            response: "data"
        };
        const dynamodb = instrument(
            {
                getItem: (_, callback) => callback(null, _data)
            },
            VERSION,
            [
                "getItem"
            ],
            emitters.logs,
            emitters.metrics
        );
        dynamodb.instrumentedGetItem(_params,
            {
                metadata: _metadata
            },
            (error, data, context) =>
            {
                expect(error).toBeFalsy();
                expect(data).toBe(_data);
                expect(context.targetMetadata.target).toEqual(
                    {
                        module: "aws-sdk",
                        version: VERSION,
                        export: "DynamoDB",
                        method: "getItem"
                    }
                );
                expect(context.targetMetadata.some).toBe("metadata");
                done();
            }
        );
    }
);
