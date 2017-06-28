# telemetry-events-aws-dynamodb

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/telemetry-events-aws-dynamodb.png)](http://npmjs.org/package/telemetry-events-aws-dynamodb)

[telemetry-events](https://github.com/tristanls/telemetry-events) instrumentation for AWS SDK DynamoDB module.

## Contributors

[@tristanls](https://github.com/tristanls)

## Contents

  * [Installation](#installation)
  * [Usage](#usage)
  * [Tests](#tests)
  * [Documentation](#documentation)
  * [Releases](#releases)

## Installation

    npm install telemetry-events-aws-dynamodb

## Usage

To run the below example run:

    npm run readme

```javascript
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

```

## Tests

    npm test

## Documentation

  * [instrument](#instrumentdynamodb-version-methods-telemetry)
  * [instrument.DocumentClient](#instrumentdocumentclientclient-version-methods-telemetry)
  * [instrumentedMethod](#instrumentedmethodparams-context-callback)

### instrument(dynamodb, version, methods, telemetry)

  * `dynamodb`: _Object_ Already created AWS.DynamoDB instance.
  * `version`: _String_ AWS module version (use `AWS`'s `VERSION` parameter).
  * `methods`: _Array_ Array of methods to instrument.
  * `telemetry`: _Object_ Telemetry helpers.
    * `logs`: _Object_ `telemetry-events-log` instance.
    * `metrics`: _Object_ `telemetry-events-quantify` instance.
    * `tracing`: _Object_ `telemetry-events-trace` instance.
  * Return: _Object_ AWS.DynamoDB instance with additional instrumented methods.

For every specified `method` in `methods` creates an instrumented variant on the passed in `dynamodb` instance. For example, if `methods = ["getItem"]`, the returned `dynamodb` object will have a `dynamodb.instrumentedGetItem` method.

### instrument.DocumentClient(client, version, methods, telemetry)

  * `client`: _Object_ Already created AWS.DynamoDB.DocumentClient instance.
  * `version`: _String_ AWS module version (use `AWS`'s `VERSION` parameter).
  * `methods`: _Array_ Array of methods to instrument.
  * `telemetry`: _Object_ Telemetry helpers.
    * `logs`: _Object_ `telemetry-events-log` instance.
    * `metrics`: _Object_ `telemetry-events-quantify` instance.
    * `tracing`: _Object_ `telemetry-events-trace` instance.
  * Return: _Object_ AWS.DynamoDB.DocumentClient instance with additional instrumented methods.

For every specified `method` in `methods` creates an instrumented variant on the passed in `client` instance. For example, if `methods = ["get"]`, the returned `client` object will have a `client.instrumentedGet` method.

### instrumentedMethod(params, context, callback)

  * `params`: _Object_ Parameters to call the instrumented method with.
  * `context` _Object_ Call context.
    * `metadata`: _Object_ _(Default: `undefined`)_ Metadata to include in events.
    * `parentSpan`: _Object_ _(Default: `undefined`)_ `telemetry-events-tracing` parent span to create a child tracing span from.
    * `paramsToLog`: _Object_ _(Default: `params`)_ Parameters to log instead of `params`.
  * `callback`: _Function_ `function (error, data, context){}` Callback that will be called with the results of the instrumented method.
    * `error`: _Error_ Error from instrumented method result, if any.
    * `data`: _Object_ Data form instrumented method result, if any.
    * `context`: _Object_ Result context containing target (instrumented method) metadata.
      * `targetMetadata`: _Object_ Target (instrumented method) metadata.

This is an example of an instrumented method signature (actual method names would be `instrumentedGetItem`, `instrumentedPutItem`, etc.).

## Releases

We follow semantic versioning policy (see: [semver.org](http://semver.org/)):

> Given a version number MAJOR.MINOR.PATCH, increment the:
>
>MAJOR version when you make incompatible API changes,<br/>
>MINOR version when you add functionality in a backwards-compatible manner, and<br/>
>PATCH version when you make backwards-compatible bug fixes.
