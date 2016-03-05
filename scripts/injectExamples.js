"use strict";

var fs = require("fs");
var path = require("path");

var readmeDoc = fs.readFileSync(path.join(__dirname, "..", "README.md"));
var readmeScript =
        fs.readFileSync(path.join(__dirname, "..", "examples", "readme.js"));

var useStrict = readmeScript.toString().match(/"use strict";/);
readmeScript = readmeScript.toString().slice(useStrict.index);

var replacement = [
  "## Usage",
  "",
  "To run the below example run:",
  "",
  "    npm run readme",
  "",
  "```javascript",
  readmeScript,
  "```"
].join('\n');

var usage = readmeDoc.toString().match(/## Usage/);
var tests = readmeDoc.toString().match(/## Tests/);

// some safety checks
if (!usage) {
    console.error("Unable to find ## Usage in README");
    process.exit(1);
}

if (!tests) {
    console.error("Unable to find ## Tests in README");
    process.exit(1);
}

if (tests.index < usage.index) {
    console.error("## Tests is after ## Usage, existing");
    process.exit(1);
}

var firstSlice = readmeDoc.toString().slice(0, usage.index);
var secondSlice = readmeDoc.toString().slice(tests.index);

readmeDoc = firstSlice + replacement + "\n\n" + secondSlice;

fs.writeFileSync(path.join(__dirname, "..", "README.md"), readmeDoc);
