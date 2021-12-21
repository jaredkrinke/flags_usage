import { assertEquals } from "https://deno.land/std@0.115.1/testing/asserts.ts";
import { formatUsage, processFlags } from "./mod.ts";

Deno.test({
    name: "Example from documentation",
    fn: () => {
        assertEquals(
            formatUsage({
                description: { output: "Output directory" },
                argument: { output: "dir" },
                string: [ "output" ],
                default: { output: "out" },
            }),
`Options:
  --output <dir>  Output directory (default: "out")
  -h, -?, --help  Display usage information`
        );
    },
});

Deno.test({
    name: "Example with preamble",
    fn: () => {
        assertEquals(
            formatUsage({
                preamble: "Usage: my-tool <options>",
                description: { output: "Output directory" },
                argument: { output: "dir" },
                string: [ "output" ],
                default: { output: "out" },
            }),
`Usage: my-tool <options>

Options:
  --output <dir>  Output directory (default: "out")
  -h, -?, --help  Display usage information`
        );
    },
});

Deno.test({
    name: "Allow non-flag arguments by default",
    fn: () => {
        const { _ } = processFlags(["foo"], {});
        assertEquals(_, ["foo"]);
    },
});
