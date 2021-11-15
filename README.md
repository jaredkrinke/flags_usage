# flags_usage
Adds "--help" to Deno's std/flags module, for printing out command line usage/option information.

# Example
main.ts:
```typescript
import { processFlags } from "https://deno.land/x/flags_usage/mod.ts";

const options = {
    description: { output: "Output directory" }, // New: Description of flag
    argument: { output: "dir" },                 // New: "<dir>" in the output below
    string: [ "output" ],
    default: { output: "out" },
};

// `processFlags` parses normally, except it will print usage and exit on `--help`
const { output } = processFlags(Deno.args, options);
```

Output:
```
$ deno run main.ts --help
Options:
  --output <dir>  Output directory (default: "out")
  -h, -?, --help  Display usage information
```

Note that `parseFlags`, `logUsage`, etc. (see API) can be used if automatically exiting on `--help` is not desirable.

# API
## Options
All `options` arguments follow std/flags's interface, with the following new, *optional* properties:

* `description`: An object mapping flags to descriptions that will be displayed on `--help`
* `argument`: An object mapping flags to names for their arguments to be displayed on `--help` (e.g. mapping `out` to `path` will display `--out <path> ...` instead of the generic `--out <str>` for string arguments)

## `processFlags(Deno.args, options)`
Parse options as usual, but add `--help` and automatically print usage and exit if `--help`/`-h`/`-?` are specified.

## `parseFlags(Deno.args, options)`
Parse options as usual, with `--help`/`-h`/`-?` added as a Boolean flag (note: with this function, the caller must decide what to do if the `help` flag is set to true--use `processFlags` to automatically print usage and exit).

## `formatUsage(options)`
Format usage information as a string.

## `logUsage(options)`
Format usage information and print to the console.
