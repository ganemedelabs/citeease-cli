import crypto from "crypto";

export const FONT = {
    BOLD: "\x1b[1m",
    GREEN: "\x1b[38;5;48m",
    YELLOW: "\x1b[38;5;228m",
    BLUE: "\x1b[38;5;33m",
    RED: "\x1b[38;5;197m",
    GRAY: "\x1b[38;5;249m",
    BLACK: "\x1b[38;5;0m",
    BG_GREEN: "\x1b[48;5;48m",
    BG_RED: "\x1b[48;5;9m",
    RESET: "\x1b[0m",
};

export const RESULT = {
    SUCCESS: `${FONT.BG_GREEN}${FONT.BOLD}${FONT.BLACK} SUCCESS ${FONT.RESET}`,
    FAIL: `${FONT.BG_RED}${FONT.BOLD}${FONT.BLACK} FAIL ${FONT.RESET}`,
    ERROR: `${FONT.BG_RED}${FONT.BOLD}${FONT.BLACK} ERROR ${FONT.RESET}`,
};

export const HELP_MESSAGE = `
        Usage:

          cite <list of identifiers> [options]
          cite config <key> [value]

        Description:

          citeease-cli is a CLI tool that generates formatted citations (references) based on various
          unique identifiers, including URL, DOI, ISBN, PMID, and PMCID.
          It also allows you to manage configurations for citation style, locale, and output format.

        Commands:

          --style, -s <style>    Set the citation style (e.g., apa, modern-language-association, chicago-author-date)
          --locale, -l <locale>  Set the locale for the output (e.g., en-US, fr-FR, ar)
          --format, -f <format>  Set the output format (e.g., text, html, rtf, asciidoc). Default is "text".
          --intext, -i           Include in-text citations in the output (e.g., "(Author, Year)").
          --no-intext            Exclude in-text citations from the output.
          --log-errors, -e       Enable logging of errors for debugging purposes
          --version, -v          Display the current version of citeease-cli
          help                   Show help message
          config <key> [value]   Configure default settings. Keys: "style", "locale", "format", or "reset".

        Examples:

          cite identifier1 identifier2 identifier3 --locale ar --format html
          cite id1 id2 -s chicago-author-date -e -f rtf -i
          cite identifier --locale fr-FR --intext
          cite config style ieee      # Set default citation style to IEEE
          cite config locale es-MX   # Set default locale to es-MX (Spanish - Mexico)
          cite config reset          # Reset all configurations to defaults

        Notes:

          - By default, "intext" is set to false, meaning in-text citations are not included unless explicitly enabled with "--intext".
          - Use "--no-intext" only when the "intext" configuration is set to true and you wish to override it.
          - Identifiers are processed in the order provided.
          - Use "--log-errors" to output errors for troubleshooting.
          - The "config" command allows you to set default configurations or reset them.
          - Check available citation styles and locales at:
            - Styles: https://github.com/citation-style-language/styles
            - Locales: https://github.com/citation-style-language/locales

`;

/**
 * Generates a unique identifier of a specified length.
 *
 * This function creates a unique ID by generating a sequence of characters from a predefined alphabet.
 * It uses a pool of random bytes to select characters from the alphabet, ensuring uniqueness.
 *
 * @param {number} [length=16] - The desired length of the unique ID.
 * @returns {string} A unique identifier of the specified length.
 */
export function uid(length: number = 16): string {
    if (length <= 0) {
        throw new Error("Length must be a positive number");
    }

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let result = "";
    const array = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }

    return result;
}
