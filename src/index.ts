#!/usr/bin/env node

import { CSLJson, type CSLJsonResponse } from "./types"; // eslint-disable-line import/no-unresolved

const fs = require("fs");
const path = require("path");
const os = require("os");

const CSLJsonParser = require("./CSLJsonParser");
const pkg = require("../package.json");
const { FONT, RESULT, HELP_MESSAGE } = require("./common");

type ParsedArguments = {
    identifiers: string[];
    style: string;
    locale: string;
    format: string;
    logErrors: boolean;
    showVersion: boolean;
};

type IdentifierType = "URL" | "DOI" | "PMCID" | "PMID" | "ISBN" | "undefined";

const configDir = path.join(os.homedir(), ".citease-cli");
const configFile = path.join(configDir, "config.json");

/**
 * Ensures the configuration directory exists and retrieves the configuration from the file.
 * If the configuration file does not exist, it initializes an empty configuration.
 *
 * @returns {Record<string, string>} The configuration as a key-value object.
 */
function getConfigFile(): Record<string, string> {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    if (fs.existsSync(configFile)) {
        try {
            return JSON.parse(fs.readFileSync(configFile, "utf-8"));
        } catch (error) {
            process.stderr.write(
                `${RESULT.ERROR} ${FONT.RED}Failed to parse configuration file: ${error}${FONT.RESET}\n\n`
            );
            process.exit(1);
        }
    }

    return {};
}

/**
 * Resets the configuration to its default state by clearing the configuration file.
 */
function resetConfig(): void {
    try {
        fs.writeFileSync(configFile, JSON.stringify({}, null, 2));
        process.stdout.write(`${FONT.YELLOW}All configurations have been reset to default.${FONT.RESET}\n\n`);
    } catch (error) {
        process.stderr.write(`${RESULT.ERROR} ${FONT.RED}Failed to reset configuration: ${error}${FONT.RESET}\n\n`);
    }
    process.exit(0);
}

/**
 * Updates a configuration key with a specified value, performing validation where necessary.
 *
 * @param {Record<string, string>} config - The current configuration object.
 * @param {string} key - The key to update.
 * @param {string} value - The value to set.
 */
function updateConfig(config: Record<string, string>, key: string, value: string): void {
    if (key === "format" && !/^(text|html|rtf|asciidoc)$/.test(value)) {
        process.stderr.write(
            `${FONT.RED}Invalid format. Allowed formats are: "text", "html", "rtf", or "asciidoc".${FONT.RESET}\n\n`
        );
        process.exit(1);
    }

    config[key] = value;

    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        process.stdout.write(`${FONT.YELLOW}Configuration updated: ${key} = ${value}${FONT.RESET}\n\n`);
    } catch (error) {
        process.stderr.write(`${RESULT.ERROR} ${FONT.RED}Failed to update configuration: ${error}${FONT.RESET}\n\n`);
    }
    process.exit(0);
}

/**
 * Retrieves and displays the value of a configuration key, or an error if the key is not found.
 *
 * @param {Record<string, string>} config - The current configuration object.
 * @param {string} key - The key to retrieve.
 */
function retrieveConfig(config: Record<string, string>, key: string): void {
    if (config[key]) {
        process.stdout.write(`${FONT.YELLOW}${key} = ${config[key]}${FONT.RESET}\n\n`);
    } else {
        process.stderr.write(`${FONT.RED}Key "${key}" not found.${FONT.RESET}\n\n`);
    }
    process.exit(0);
}

/**
 * Handles configuration commands passed via the command line. Supports setting, retrieving,
 * and resetting configuration keys and values.
 */
function handleConfig(): void {
    const config = getConfigFile();
    const [, , command, key, value, extra] = process.argv;

    /* eslint-disable quotes */
    const ERROR_USAGE_MESSAGE =
        `\n${FONT.RED}Invalid usage of the "config" command.\n` +
        `Usage:\n` +
        `  cite config <key> <value>  - Set a configuration key to a value.\n` +
        `  cite config <key>          - Retrieve the value of a configuration key.\n` +
        `  cite config reset          - Reset all configurations to defaults.${FONT.RESET}\n\n`;
    /* eslint-enable quotes */

    if (command !== "config") return;

    if (!key || extra || key.startsWith("-") || value?.startsWith("-")) {
        process.stderr.write(ERROR_USAGE_MESSAGE);
        process.exit(1);
    }

    const validKeys = /^(style|locale|format|reset)$/;
    if (!validKeys.test(key)) {
        process.stderr.write(
            `${FONT.RED}Invalid key. Allowed keys are "style", "locale", "format", or "reset".${FONT.RESET}\n\n`
        );
        process.exit(1);
    }

    if (key === "reset") {
        resetConfig();
    } else if (value) {
        updateConfig(config, key, value);
    } else {
        retrieveConfig(config, key);
    }
}

/**
 * Creates a loading spinner in the console.
 * @returns {(message?: string) => void} - A function to stop the spinner and display a completion message.
 */
// eslint-disable-next-line no-unused-vars
function createLoadingSpinner(): (message?: string) => void {
    const loadingCharacters = "⣾⣽⣻⢿⡿⣟⣯⣷";
    let index = 0;

    const intervalId = setInterval(() => {
        process.stdout.write(`\r${loadingCharacters[index]} `);
        index = (index + 1) % loadingCharacters.length;
    }, 100);

    return function logDone(message = "Done") {
        clearInterval(intervalId);
        process.stdout.write(`\r${message}`);
    };
}

/**
 * Parses command-line arguments to extract identifiers, style, locale, and other options.
 * @param {string[]} args - Command-line arguments.
 * @returns {ParsedArguments} - The parsed arguments.
 */
function parseArguments(args: string[]): ParsedArguments {
    const config = getConfigFile();

    const identifiers: string[] = [];
    let style = config.style || "apa";
    let locale = config.locale || "en-US";
    let format = config.format || "text";
    let logErrors = false;
    let showVersion = false;

    const regexes = {
        showVersion: /^-{1,2}v(ersion)?$/,
        logErrors: /^-{1,2}e(rrors)?$/,
        style: /^-{1,2}s(tyle)?$/,
        locale: /^-{1,2}l(ocale)?$/,
        format: /^-{1,2}f(ormat)?$/,
    };

    for (let i = 0; i < args.length; i++) {
        if (regexes.showVersion.test(args[i])) {
            showVersion = true;
        } else if (regexes.logErrors.test(args[i])) {
            logErrors = true;
        } else if (regexes.style.test(args[i]) && args[i + 1]) {
            style = args[i + 1];
            i++;
        } else if (regexes.locale.test(args[i]) && args[i + 1]) {
            locale = args[i + 1];
            i++;
        } else if (regexes.format.test(args[i]) && args[i + 1]) {
            format = args[i + 1];
            i++;
        } else if (!args[i].startsWith("-")) {
            identifiers.push(args[i].replace("\\-", "-"));
        }
    }

    return { identifiers, style, locale, format, logErrors, showVersion };
}

/**
 * Recognizes the type of an identifier based on its format or prefix.
 * @param {string} input - The identifier to classify.
 * @returns {[IdentifierType, string]} - The identifier type and the trimmed identifier string.
 */
function recognizeIdentifierType(input: string): [IdentifierType, string] {
    const trimmed = input.trim();
    const identifierPrefixes = { "url:": "URL", "doi:": "DOI", "pmcid:": "PMCID", "pmid:": "PMID", "isbn:": "ISBN" };

    for (const [prefix, type] of Object.entries(identifierPrefixes)) {
        if (trimmed.startsWith(prefix)) return [type as IdentifierType, trimmed.slice(prefix.length).trim()];
    }

    const patterns: Record<IdentifierType, RegExp> = {
        DOI: /^((https?:\/\/)?(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/,
        URL: /^(https?:\/\/)[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/,
        PMCID: /^PMC\d+$/,
        PMID: /^\d{7,10}$/,
        ISBN: /^(97[89])\d{9}(\d|X)$/,
        undefined: /.^/,
    };

    const cleaned = trimmed.replace(/-/g, "");
    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(cleaned)) return [type as IdentifierType, trimmed];
    }
    return ["undefined", trimmed];
}

/**
 * Retrieves CSL-JSON content for each identifier.
 * @param {[IdentifierType, string][]} identifiers - Array of identifier types and values.
 * @param {boolean} logErrors - Whether to log errors to stderr.
 * @returns {Promise<CSLJsonResponse[]>} - Array of CSL-JSON responses.
 */
async function retrieveContent(
    identifiers: [IdentifierType, string][],
    logErrors: boolean
): Promise<CSLJsonResponse[]> {
    const parser = new CSLJsonParser([], { logErrors });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    const fetchers: Record<IdentifierType, (id: string) => Promise<any>> = {
        URL: parser.fromURL.bind(parser),
        DOI: parser.fromDOI.bind(parser),
        PMCID: parser.fromPMCID.bind(parser),
        PMID: parser.fromPMID.bind(parser),
        ISBN: parser.fromISBN.bind(parser),
        undefined: async () => null,
    };

    return Promise.all(identifiers.map(([type, id]) => fetchers[type](id)));
}

/**
 * Displays a list of identifiers along with a message, using a specified color.
 * @param {Array<[IdentifierType, string]>} identifiers - Array of identifier types and values.
 * @param {string} message - The message to display above the identifiers.
 * @param {string} color - The color code for console output.
 */
function displayIdentifiers(identifiers: Array<[IdentifierType, string]>, message: string, color: string = FONT.RESET) {
    process.stdout.write(
        `${color + FONT.BOLD}${message}:${FONT.RESET}\n${identifiers.map(([type, id]) => `${color}[${type}]${FONT.RESET} ${id}\n`).join("")}\n`
    );
}

/**
 * Formats CSL-JSON content into a bibliography using a specified style, locale, and format.
 * @param {CSLJson[]} content - The CSL-JSON content to format.
 * @param {string} options - The options for formatting.
 * @returns {string | null} - The formatted bibliography or null if formatting fails.
 */
function formatBibliography(
    content: CSLJson[],
    options: { style: string; locale: string; format: string; logErrors: boolean }
): string | null {
    const { style, locale, format, logErrors } = options;
    const parser = new CSLJsonParser(content, { logErrors });
    const references = parser.toBibliography({ style, locale, format });
    return references
        ? `${RESULT.SUCCESS} ${FONT.GREEN}Successfully generated references:${FONT.RESET}\n${references}\n`
        : null;
}

/**
 * Main function to execute the script.
 * Parses arguments, retrieves content, formats bibliography, and displays results.
 * @returns {Promise<boolean | undefined>} - A promise that resolves when the script completes.
 */
async function main(): Promise<boolean | undefined> {
    const { identifiers, style, locale, format, logErrors, showVersion } = parseArguments(process.argv.slice(2));

    if (showVersion) return process.stdout.write(`${pkg.version}\n`);
    if (!identifiers.length) return process.stdout.write(HELP_MESSAGE);

    const parsedIdentifiers = identifiers.map(recognizeIdentifierType);
    const [definedIdentifiers, undefinedIdentifiers] = parsedIdentifiers.reduce(
        ([defined, nonDefined], id) =>
            id[0] === "undefined" ? [[...defined], [...nonDefined, id]] : [[...defined, id], [...nonDefined]],
        [[], []] as [[IdentifierType, string][], [IdentifierType, string][]]
    );

    if (undefinedIdentifiers.length) displayIdentifiers(undefinedIdentifiers, "Unable to determine the type", FONT.RED);
    if (!definedIdentifiers.length) return;

    displayIdentifiers(definedIdentifiers, "Retrieving data", FONT.BLUE);

    const logDone = createLoadingSpinner();
    const contentArray = (await retrieveContent(definedIdentifiers, logErrors)).filter(
        (content): content is CSLJsonResponse => content != null
    );
    logDone("");

    const [failed, successful] = contentArray.reduce(
        ([failures, successes], content) =>
            "status" in content && content?.status === "failed"
                ? [[...failures, content], successes]
                : [failures, [...successes, content]],
        [[], []] as [Array<{ type: IdentifierType; identifier: string }>, CSLJsonResponse[]]
    );

    if (failed.length) {
        displayIdentifiers(
            failed.map(({ type, identifier }) => [type, identifier]),
            "Failed to retrieve",
            FONT.RED
        );
    }

    if (successful.length) {
        const bibliography = formatBibliography(successful, { style, locale, format, logErrors });
        bibliography
            ? process.stdout.write(bibliography)
            : process.stdout.write(`${RESULT.FAIL} ${FONT.RED}Failed to format references!${FONT.RESET}\n\n`);
    }
}

handleConfig();
main();
