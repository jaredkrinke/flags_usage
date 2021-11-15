import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import { formatUsage } from "./mod.ts";

Deno.test({
    name: "Example from documentation",
    fn: () => {
        assertEquals(
            formatUsage({
                description: { output: "Output directory" }, // New: Description of flag
                argument: { output: "dir" },                 // New: "<dir>" in the output below
                string: [ "output" ],
                default: { output: "out" },
            }),
`Options:
  --output <dir>  Output directory (default: "out")
  -h, -?, --help  Display usage information`
        );
    },
});
