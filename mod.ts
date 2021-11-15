import { Args, ArgParsingOptions, parse } from "https://deno.land/std@0.114.0/flags/mod.ts";

// TODO: Parameter names
export interface ArgProcessingOptions extends ArgParsingOptions {
    description?: Record<string, string>;
}

function addHelpFlagIfNeeded(options: ArgProcessingOptions): ArgProcessingOptions {
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

export function formatUsage(options: ArgProcessingOptions): string {
    const o = addHelpFlagIfNeeded(options);

    // Normalize aliases to arrays
    const flagToAliases: { [flag: string]: string[] } = {};
    if (o.alias) {
        for (const key of Object.keys(o.alias)) {
            const value = o.alias[key];
            flagToAliases[key] = Array.isArray(value) ? value : [value];
        }
    }

    // Enumerate all flags
    const flagSet: { [name: string]: boolean } = {};
    const descriptions = o.description ?? {};
    const defaults = o.default ?? {};
    const booleanFlags: string[] = Array.isArray(o.boolean) ? o.boolean : ((typeof(o.boolean) === "string") ? [o.boolean] : []);
    const stringFlags: string[] = Array.isArray(o.string) ? o.string : ((typeof(o.string) === "string") ? [o.string] : []);
    Object.keys(descriptions).forEach(flag => flagSet[flag] = true);
    Object.keys(defaults).forEach(flag => flagSet[flag] = true);
    booleanFlags.forEach(flag => flagSet[flag] = true);
    stringFlags.forEach(flag => flagSet[flag] = true);

    // Remove any aliases
    for (const key of Object.keys(flagToAliases)) {
        const aliases = flagToAliases[key];
        aliases.forEach(flag => {
            delete flagSet[flag];
        });
    }

    // Format defaults
    const defaultStrings: { [flag: string]: string } = {};
    Object.keys(defaults).forEach(flag => {
        const value = defaults[flag];
        let str: string;
        switch (typeof(value)) {
            case "string": str = value; break;
            case "number": str = "" + value; break;
            case "boolean": str = "" + value; break;
            default: str = typeof(value); break;
        }
        defaultStrings[flag] = str;
    });

    // Create a display string for each flag
    const flagStrings = Object.keys(flagSet)
    .map(flag => ({
        description: descriptions[flag] ?? "",
        default: defaultStrings[flag] ?? "",
        flagString: [flag, ...(flagToAliases[flag] ?? [])]
            .sort((a, b) => a.length - b.length)
            .map(f => `-${f.length > 1 ? "-" : ""}${f}`)
            .join(", "),
    }));

    const flagStringMaxLength = flagStrings.reduce<number>((max, str) => Math.max(max, str.flagString.length), 0);

    // TODO: Anything reasonable to print for the program name? Without too many dependencies?
    // TODO: parameters
    return`Options:\n${
        flagStrings
            .map(f => `  ${f.flagString}${" ".repeat(flagStringMaxLength - f.flagString.length)}  ${f.description}${f.default ? ` (default: "${f.default}")` : ""}`)
            .join("\n")
    }`;
}

export function logUsage(options: ArgProcessingOptions): void {
    console.log(formatUsage(options));
}

export function parseArgs(args: string[], options: ArgProcessingOptions): Args {
    return parse(args, addHelpFlagIfNeeded(options));
}

export function processArgs(args: string[], options: ArgProcessingOptions): Args {
    const o = addHelpFlagIfNeeded(options);

    // Check for unknown flags
    const unknownFlags: string[] = [];
    o.unknown = (arg, key, value) => (unknownFlags.push(arg), (options.unknown ? options.unknown(arg, key, value) : undefined));

    const parsedArgs = parseArgs(args, o);

    const hasUnknownFlags = unknownFlags.length > 0;
    if (parsedArgs.help || hasUnknownFlags) {
        // Print help and exit
        if (hasUnknownFlags) {
            console.log(`Unknown arguments: ${unknownFlags.join(" ")}\n`);
        }

        logUsage(o);
        Deno.exit(-1);
    }

    return parsedArgs;
}
