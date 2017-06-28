"use strict";

const events = require("events");
const LogTelemetryEvents = require("telemetry-events-log");
const pkg = require("./package.json");
const QuantifyTelemetryEvents = require("telemetry-events-quantify");
const TelemetryEvents = require("telemetry-events");
const TraceTelemetryEvents = require("telemetry-events-trace");

const instrument = require("./index.js").DocumentClient;

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
    const tracing = new TraceTelemetryEvents(
        {
            telemetry
        }
    );
    return (
        {
            telemetry: emitter,
            logs,
            metrics,
            tracing
        }
    );
};

test("calls instrumented method with original params", done =>
    {
        const emitters = createEmitters();
        const _params = {};
        const client = instrument(
            {
                get: params =>
                {
                    expect(params).toBe(_params);
                    done();
                }
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        client.instrumentedGet(_params, {}, () => {});
    }
);

test("logs call to instrumented method using paramsToLog", done =>
    {
        const emitters = createEmitters();
        const client = instrument(
            {
                get: () => {}
            },
            VERSION,
            [
                "get"
            ],
            emitters
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
                            export: "DynamoDB.DocumentClient",
                            method: "get",
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
        client.instrumentedGet({},
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
        const client = instrument(
            {
                get: () => {}
            },
            VERSION,
            [
                "get"
            ],
            emitters
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
                            export: "DynamoDB.DocumentClient",
                            method: "get",
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
        client.instrumentedGet(_params, {}, () => {});
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
        const client = instrument(
            {
                get: () => {}
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "info")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB.DocumentClient",
                            method: "get",
                            args:
                            [
                                _params
                            ]
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.message).toBe("attempting DynamoDB.DocumentClient.get");
                    done();
                }
            }
        );
        client.instrumentedGet(_params,
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
        const client = instrument(
            {
                get: (_, callback) => callback()
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "metric" && event.target_type == "gauge")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB.DocumentClient",
                            method: "get"
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.unit).toBe("ms");
                    expect(event.value).toBeGreaterThan(0);
                    done();
                }
            }
        );
        client.instrumentedGet(_params,
            {
                metadata: _metadata
            },
            () => {}
        );
    }
);

test("emits tracing telemetry", done =>
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
        const client = instrument(
            {
                get: (_, callback) => callback()
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        const tags =
        {
            tag: "my_tag"
        };
        const baggage =
        {
            baggage: "my_baggage"
        };
        const rootSpan = emitters.tracing.trace("test", tags, baggage);
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "trace")
                {
                    expect(event.traceId).toBe(rootSpan._traceId);
                    expect(event.tags).toEqual({});
                    expect(event.baggage).toEqual(baggage);
                    done();
                }
            }
        );
        client.instrumentedGet(_params,
            {
                metadata: _metadata,
                parentSpan: rootSpan
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
        const client = instrument(
            {
                get: (_, callback) => callback(new Error("boom"))
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        emitters.telemetry.on("telemetry", event =>
            {
                if (event.type == "log" && event.level == "error")
                {
                    expect(event.target).toEqual(
                        {
                            module: "aws-sdk",
                            version: VERSION,
                            export: "DynamoDB.DocumentClient",
                            method: "get",
                            args:
                            [
                                _params
                            ]
                        }
                    );
                    expect(event.some).toBe("metadata");
                    expect(event.message).toBe("DynamoDB.DocumentClient.get failed");
                    expect(event.error).toBeTruthy();
                    expect(event.stack).toBeTruthy();
                    done();
                }
            }
        );
        client.instrumentedGet(_params,
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
        const client = instrument(
            {
                get: (_, callback) => callback(null, _data)
            },
            VERSION,
            [
                "get"
            ],
            emitters
        );
        client.instrumentedGet(_params,
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
                        export: "DynamoDB.DocumentClient",
                        method: "get"
                    }
                );
                expect(context.targetMetadata.some).toBe("metadata");
                done();
            }
        );
    }
);
