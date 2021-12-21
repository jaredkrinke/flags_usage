import { Args, ArgParsingOptions, parse } from "https://deno.land/std@0.115.1/flags/mod.ts";

export interface FlagProcessingOptions extends ArgParsingOptions {
    /** String to print prior to listing flags on `--help` */
    preamble?: string;

    /** An object mapping flags to descriptions that will be displayed on `--help` */
    description?: Record<string, string>;

    /** An object mapping flags to names for their arguments to be displayed on `--help` (e.g. mapping `out` to `path` will display `--out <path> ...` instead of the generic `--out <str>` for string arguments) */
    argument?: Record<string, string>;
}

interface FlagInfo {
    flag: string;
    default: boolean | string | number | unknown;
    aliases?: string[];
    description?: string;
    argumentName?: string;
}

function addHelpFlagIfNeeded(options: FlagProcessingOptions): FlagProcessingOptions {
    if (options?.description?.help) {
        return options;
    }
    else {
        const { alias, description, ...rest } = options;
        return {
            alias: {
                ...(alias ?? {}),
                help: ["h", "?"],
            },
    
            description: {
                ...(description ?? {}),
                help: "Display usage information",
            },
    
            ...rest,
        };
    }
}

function convertToFlagInfos(o: FlagProcessingOptions): FlagInfo[] {
    // Normalize aliases to arrays
    const flagToAliases: { [flag: string]: string[] } = {};
    if (o.alias) {
        for (const key of Object.keys(o.alias)) {
            const value = o.alias[key];
            flagToAliases[key] = Array.isArray(value) ? value : [value];
        }
    }

    // Enumerate all flags
    const flagSet = new Set<string>();
    const defaults = o.default ?? {};
    const descriptions = o.description ?? {};
    const flagArguments = o.argument ?? {};
    const booleanFlags: string[] = Array.isArray(o.boolean) ? o.boolean : ((typeof(o.boolean) === "string") ? [o.boolean] : []);
    const stringFlags: string[] = Array.isArray(o.string) ? o.string : ((typeof(o.string) === "string") ? [o.string] : []);

    // Order flags: as in the description array, then Booleans, strings, flags with arguments, flags with defaults, and finally --help
    Object.keys(descriptions).forEach(flag => flagSet.add(flag));
    booleanFlags.forEach(flag => flagSet.add(flag));
    stringFlags.forEach(flag => flagSet.add(flag));
    Object.keys(flagArguments).forEach(flag => flagSet.add(flag));
    Object.keys(defaults).forEach(flag => flagSet.add(flag));

    // Put --help last
    flagSet.delete("help");
    flagSet.add("help");

    // Remove any aliases
    for (const key of Object.keys(flagToAliases)) {
        const aliases = flagToAliases[key];
        aliases.forEach(flag => {
            flagSet.delete(flag);
        });
    }

    // Determine flag argument types
    const flagArgumentTypes: { [flag: string]: string } = {};
    Object.keys(defaults).forEach(flag => flagArgumentTypes[flag] = typeof(defaults[flag]));
    booleanFlags.forEach(flag => flagArgumentTypes[flag] = "boolean");
    stringFlags.forEach(flag => flagArgumentTypes[flag] = "string");

    // Format flag argument names
    const flagArgumentNames: { [flag: string]: string } = {};
    for (const flag of flagSet) {
        let str: string | undefined = flagArguments[flag];
        if (str === undefined && flagArgumentTypes[flag]) {
            switch (flagArgumentTypes[flag]) {
                case "string": str = "str"; break;
                case "number": str = "num"; break;
                case "boolean": break;
                default: str = "arg"; break;
            }
        }

        if (str) {
            flagArgumentNames[flag] = str;
        }
    }

    return Array.from(flagSet).map(flag => {
        const info: FlagInfo = {
            flag,
            aliases: flagToAliases[flag],
            description: descriptions[flag],
            argumentName: flagArgumentNames[flag],
            default: defaults[flag],
        };
        return info;
    });
}

/** Format flag processing options as a string, e.g.:
 * 
 * ```
 * Options:
 *   -c, --clean         Clean output directory before processing
 *   -o, --output <dir>  Output directory (default: "out")
 * ```
 */
export function formatUsage(options: FlagProcessingOptions): string {
    const o = addHelpFlagIfNeeded(options);
    const flagInfos = convertToFlagInfos(o);

    // Format defaults
    const flagDefaultStrings: { [flag: string]: string } = {};
    flagInfos.forEach(info => {
        const value = info.default;
        let str: string | undefined;
        switch (typeof(value)) {
            case "string": str = `"${value}"`; break;
            case "number": str = `${value}`; break;
            case "boolean": str = `${value}`; break;
            case "undefined": break;
            default: str = typeof(value); break;
        }
        if (str) {
            flagDefaultStrings[info.flag] = str;
        }
    });

    // Create a display string for each flag
    const flagStrings = flagInfos
        .map(info => ({
            descriptionString: info.description
                ? `${info.description}${flagDefaultStrings[info.flag] ? ` (default: ${flagDefaultStrings[info.flag]})` : ""}`
                : (flagDefaultStrings[info.flag] ? `Default: ${flagDefaultStrings[info.flag]}` : ""),

            flagString: [info.flag, ...(info.aliases ?? [])]
                .sort((a, b) => a.length - b.length)
                .map(f => `-${f.length > 1 ? "-" : ""}${f}`)
                .join(", ") + (info.argumentName ? ` <${info.argumentName}>` : ""),
        }));

    const flagStringMaxLength = flagStrings.reduce<number>((max, str) => Math.max(max, str.flagString.length), 0);

    return `${options.preamble ? `${options.preamble}\n\n` : ""}Options:\n${
        flagStrings
            .map(f => `  ${f.flagString}${" ".repeat(flagStringMaxLength - f.flagString.length)}  ${f.descriptionString}`)
            .join("\n")
    }`;
}

/** Format flag processing options as a string and write it to the `console.log`.
 * 
 * ```
 * Options:
 *   -c, --clean         Clean output directory before processing
 *   -o, --output <dir>  Output directory (default: "out")
 * ```
 */
 export function logUsage(options: FlagProcessingOptions): void {
    console.log(formatUsage(options));
}

/** Parse command line flags using the supplied options, along with an additional `--help` flag (aliased to `-h` and `-?`). */
export function parseFlags(args: string[], options: FlagProcessingOptions): Args {
    return parse(args, addHelpFlagIfNeeded(options));
}

/** Process command line flags using the supplied options, along with an additional `--help` flag (aliased to `-h` and `-?`).
 * 
 * This will automatically print out usage information and exit if either unknown flags are encountered or `--help` (or `-h`, `-?`) was requested.
 * 
 * Example usage information:
 * 
 * ```
 * Options:
 *   -c, --clean         Clean output directory before processing
 *   -o, --output <dir>  Output directory (default: "out")
 * ```
 */
export function processFlags(args: string[], options: FlagProcessingOptions): Args {
    const o = addHelpFlagIfNeeded(options);

    // Check for unknown flags
    const unknownFlags = new Set<string>();
    o.unknown = (arg, key, value) => {
        let fallback: boolean | undefined;
        if (arg.startsWith("-")) {
            unknownFlags.add(arg);
            fallback  = false;
        }
        return options.unknown ? options.unknown(arg, key, value) : fallback;
    };

    const parsedArgs = parseFlags(args, o);

    const hasUnknownFlags = unknownFlags.size > 0;
    if (parsedArgs.help || hasUnknownFlags) {
        // Print help and exit
        if (hasUnknownFlags) {
            console.log(`Unknown arguments: ${Array.from(unknownFlags).join(" ")}\n`);
        }

        logUsage(o);
        Deno.exit(-1);
    }

    return parsedArgs;
}
