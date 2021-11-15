import { processArgs } from "./mod.ts";

const result = processArgs(Deno.args, {
    description: {
        clean: "Clean output directory before processing",
        drafts: "Include drafts in output",
        input: "Input directory",
        output: "Output directory",
        serve: "Serve web site, with automatic reloading",
        watch: "Watch for changes and rebuild automatically",
    },
    string: [
        "input",
        "output",
    ],
    boolean: [
        "clean",
        "drafts",
        "serve",
        "watch",
        "noDescription",
        "really-none",
    ],
    alias: {
        clean: "c",
        drafts: "d",
        input: "i",
        output: "o",
        serve: "s",
        watch: "w",
        noDescription: "x",
    },
    argument: {
        // input: "dir",
        output: "dir",
        par: "param",
    },
    default: {
        input: "content",
        output: "out",
        clean: true,
    },
});

console.log(result);
