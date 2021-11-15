import { Args, ArgParsingOptions, parse } from "https://deno.land/std@0.114.0/flags/mod.ts";

export interface ArgProcessingOptions extends ArgParsingOptions {
    description?: Record<string, string>;
    argument?: Record<string, string>;
}

export interface FlagInfo {
    flag: string;
    aliases?: string[];
    type?: "string" | "boolean" | string; // TODO: Something more specific?
    description?: string;
    argumentName?: string;
    default?: unknown;
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

function convertToFlagInfos(o: ArgProcessingOptions): FlagInfo[] {
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

    return Array.from(flagSet).map(flag => ({
        flag,
        aliases: flagToAliases[flag],
        type: flagArgumentTypes[flag],
        description: descriptions[flag],
        argumentName: flagArgumentNames[flag],
        default: defaults[flag],
    }));
}

export function formatUsage(options: ArgProcessingOptions): string {
    // TODO: Check all usages of info properites for null!
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

    return`Options:\n${
        flagStrings
            .map(f => `  ${f.flagString}${" ".repeat(flagStringMaxLength - f.flagString.length)}  ${f.descriptionString}`)
            .join("\n")
    }`;
}

export function logUsage(options: ArgProcessingOptions): void {
    console.log(formatUsage(options));
}

export function parseFlags(args: string[], options: ArgProcessingOptions): Args {
    return parse(args, addHelpFlagIfNeeded(options));
}

export function processFlags(args: string[], options: ArgProcessingOptions): Args {
    const o = addHelpFlagIfNeeded(options);

    // Check for unknown flags
    const unknownFlags: string[] = [];
    o.unknown = (arg, key, value) => (unknownFlags.push(arg), (options.unknown ? options.unknown(arg, key, value) : undefined));

    const parsedArgs = parseFlags(args, o);

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
