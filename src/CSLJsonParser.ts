import { type CSLJson, type CSLJsonResponse, type DateObject } from "./types"; // eslint-disable-line import/no-unresolved

const Citeproc = require("citeproc");
const { XMLHttpRequest } = require("xmlhttprequest");
const { JSDOM } = require("jsdom");
const { FONT, RESULT, uid } = require("./common");

type Options = {
    logErrors: boolean;
};

type ToBibliographyOptions = {
    style: string;
    locale: string;
    format: "text" | "html" | "rtf" | "asciidoc";
};

type OpenLibraryResponse = {
    numFound: number;
    start: number;
    numFoundExact: boolean;
    docs: Array<{
        title?: string;
        number_of_pages_median?: number;
        author_name?: string[];
        editions?: {
            docs: Array<{ publisher?: string[]; publish_place?: string[]; publish_date?: string[]; isbn?: string[] }>;
        };
    }>;
    num_found: number;
    q: string;
    offset: unknown;
};

type CrossRefResponse = CSLJson & {
    "container-title": [string];
    title: [string];
};

/**
 * Class to manage CSL-JSON (Citation Style Language) data and convert it to various formats.
 */
class CSLJsonParser {
    private cslJson: CSLJson[];
    private options: Options;

    private CORS_PROXY = "https://corsproxy.io/?";

    /**
     * Constructs a new instance of CSLJson.
     * @param {CSLJson} cslJson - The CSL-JSON data.
     * @param {Options} [options={ logErrors: false }] - Configuration options.
     */
    constructor(cslJson: CSLJson[] = [], options: Options = { logErrors: false }) {
        this.cslJson = cslJson;
        this.options = options;
    }

    /**
     * Generates an error template string in a styled format.
     * @param {Error} error - The error to format.
     * @returns {string} The formatted error string.
     */
    private errorTemplate(error: Error): string {
        return `\n${RESULT.ERROR} ${FONT.RED}${error.toString().replace("Error: ", "")}${FONT.RESET}\n\n`;
    }

    /**
     * Fetches a CSL style file.
     * @param {string} style - The style identifier (e.g., "apa").
     * @returns {string} The CSL file content.
     */
    private getCslFile(style: string): string {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `https://raw.githubusercontent.com/citation-style-language/styles/master/${style}.csl`, false);
        xhr.send(null);
        const text = xhr.responseText;

        if (text.startsWith("404:")) {
            throw new Error(`Failed to retrieve style "${style}"`);
        }

        return text;
    }

    /**
     * Fetches a locale file for CSL formatting.
     * @param {string} lang - The locale identifier (e.g., "en-US").
     * @returns {string} The locale file content.
     */
    private getLocaleFile(lang: string): string {
        const xhr = new XMLHttpRequest();
        xhr.open(
            "GET",
            `https://raw.githubusercontent.com/citation-style-language/locales/master/locales-${lang}.xml`,
            false
        );
        xhr.send(null);
        const text = xhr.responseText;

        if (text.startsWith("404:")) {
            throw new Error(`Failed to retrieve locale "${lang}"`);
        }

        return text;
    }

    /**
     * Creates an array of author objects from an array of author names.
     * @param {string[]} authors - Array of author names.
     * @returns {Array<{ given: string; family: string }>} An array of author objects with given and family names.
     */
    private createAuthorsArray(authors: string[]): Array<{ given: string; family: string }> {
        return authors.map((author) => {
            const names = author.split(/\s+/);
            const given = names.shift() || "";
            const family = names.join(" ");
            return { given, family };
        });
    }

    /**
     * Creates a date object in CSL format.
     * @param {number | Date} yearOrDate - The year or Date object.
     * @param {number} [month] - The month of the date.
     * @param {number} [day] - The day of the date.
     * @returns {DateObject} A CSL-compliant date object.
     */
    private createDateObject(yearOrDate: number | Date, month?: number, day?: number): DateObject {
        let year: number;
        let adjustedMonth: number | undefined;
        let adjustedDay: number | undefined;

        if (yearOrDate instanceof Date) {
            year = yearOrDate.getFullYear();
            adjustedMonth = yearOrDate.getMonth() + 1;
            adjustedDay = yearOrDate.getDate();
        } else {
            year = yearOrDate;
            adjustedMonth = month;
            adjustedDay = day;
        }

        const dateParts = [year];
        if (adjustedMonth) dateParts.push(adjustedMonth);
        if (adjustedDay) dateParts.push(adjustedDay);

        return { "date-parts": [dateParts] };
    }

    /**
     * Retrieves CSL-JSON data for a given DOI.
     * @param {string} doi - The DOI to fetch data for.
     * @returns {Promise<CSLJsonResponse>} The response object with citation data.
     */
    public async fromDOI(doi: string): Promise<CSLJsonResponse> {
        try {
            const response = await fetch(`${this.CORS_PROXY}https://api.crossref.org/works/${doi}`);

            if (response.status === 404) {
                throw new Error(
                    `Unable to retrieve data for DOI "${doi}". API responded with: ${JSON.stringify(response)}`
                );
            }

            const data = await response.json();
            const { message } = data as Record<string, CrossRefResponse>;

            const newCslJsonObject = {
                id: uid(),
                DOI: message.DOI,
                URL: message.URL || (message.DOI ? `https://doi.org/${message.DOI}` : undefined),
                ISSN: message.ISSN,
                "container-title": message["container-title"][0],
                issue: message.issue,
                issued: message.issued,
                page: message.page,
                publisher: message.publisher,
                "publisher-place": message["publisher-place"],
                source: message.source,
                title: message.title[0],
                volume: message.volume,
                type: message.type,
                accessed: this.createDateObject(new Date()),
                author: message.author,
            };

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
            return { id: uid(), identifier: doi, type: "DOI", status: "failed" };
        }
    }

    /**
     * Retrieves CSL-JSON data from a given URL.
     * @param {string} url - The URL to fetch data from.
     * @returns {Promise<CSLJsonResponse>} The response object with citation data.
     */
    public async fromURL(url: string): Promise<CSLJsonResponse> {
        /* eslint-disable quotes, indent */

        try {
            if (!/^https?:\/\//i.test(url)) {
                url = `https://${url}`;
            }

            const response = await fetch(`${this.CORS_PROXY}${url}`);

            if (response.status === 403) {
                throw new Error(
                    `Unable to retrieve data for URL "${url}". API responded with: ${JSON.stringify(response)}`
                );
            }

            const text = await response.text();
            const dom = new JSDOM(text);
            const { document } = dom.window;

            const extractAuthors = () => {
                const authors: string[] = [];
                document
                    .querySelectorAll('meta[name="author"], meta[name="article:author"]')
                    .forEach((meta: unknown) => {
                        authors.push((meta as any).getAttribute("content") || ""); // eslint-disable-line @typescript-eslint/no-explicit-any
                    });
                return this.createAuthorsArray(authors);
            };

            const extractContent = (selector: string, attr?: string): string => {
                const element = document.querySelector(selector);
                return element ? (attr ? element.getAttribute(attr) || "" : element.textContent || "") : "";
            };

            const getAvailableIdentifiers = () => {
                let pmidMatch;
                let pmcidMatch;
                let doiMatch;

                if ((url as string).startsWith("https://pubmed.ncbi.nlm.nih.gov")) {
                    const keywords = extractContent('meta[name="keywords"]', "content");

                    pmidMatch = keywords.match(/pmid:\d+/);
                    pmcidMatch = keywords.match(/PMC\d+/);
                    doiMatch = keywords.match(/doi:[^,]+/);
                }

                const doi =
                    extractContent('meta[name="publication_doi"], meta[name="citation_doi"]', "content") ||
                    (doiMatch && doiMatch[0] ? doiMatch[0].replace("doi:", "") : undefined);

                const pmid =
                    extractContent('meta[name="ncbi_uid"]', "content") ||
                    (pmidMatch && pmidMatch[0] ? pmidMatch[0].replace("pmid:", "") : undefined);

                const pmcid = pmcidMatch && pmcidMatch[0] ? pmcidMatch[0] : undefined;

                return { doi, pmid, pmcid };
            };

            const { doi, pmid, pmcid } = getAvailableIdentifiers();
            const prioritizeIdentifiers = ["DOI", "PMID", "PMCID"];

            for (let i = 0; i < prioritizeIdentifiers.length; i += 1) {
                switch (prioritizeIdentifiers[i]) {
                    case "DOI":
                        if (doi) return await this.fromDOI(doi);
                        continue;
                    case "PMID":
                        if (pmid) return await this.fromPMID(pmid);
                        continue;
                    case "PMCID":
                        if (pmcid) return await this.fromPMCID(pmcid);
                        continue;
                    default:
                        continue;
                }
            }

            const newCslJsonObject = {
                id: uid(),
                type: "webpage",
                title: extractContent("title"),
                author: extractAuthors(),
                "container-title": extractContent('meta[property="og:site_name"]', "content"),
                publisher: extractContent('meta[property="article:publisher"]', "content"),
                accessed: this.createDateObject(new Date()),
                issued: this.createDateObject(new Date(extractContent('meta[name="date"]', "content") || "")),
                URL: extractContent('meta[property="og:url"]', "content") || url,
            };

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
            /* eslint-disable quotes, indent */
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
            return { id: uid(), identifier: url, type: "URL", status: "failed" };
        }
    }

    /**
     * Retrieves CSL-JSON data for a given ISBN.
     * @param {string} isbn - The ISBN to fetch data for.
     * @returns {Promise<CSLJsonResponse>} The response object with citation data.
     */
    public async fromISBN(isbn: string): Promise<CSLJsonResponse> {
        try {
            const response = await fetch(
                `https://openlibrary.org/search.json?q=isbn:${isbn}&mode=everything&fields=*,editions`
            );

            const data = (await response.json()) as OpenLibraryResponse;

            if (data.numFound === 0) {
                throw new Error(
                    `Unable to retrieve data for ISBN "${isbn}". API responded with: ${JSON.stringify(data)}`
                );
            }

            const docs = data.docs[0];
            const edition = docs?.editions?.docs[0];

            const publishDate = edition?.publish_date?.[0] ? new Date(edition.publish_date[0]) : undefined;

            const newCslJsonObject = {
                id: uid(),
                type: "book",
                title: docs?.title,
                "number-of-pages": docs?.number_of_pages_median,
                author: this.createAuthorsArray(docs?.author_name as string[]),
                publisher: edition?.publisher?.[0],
                "publisher-place": edition?.publish_place?.[0],
                ISBN: edition?.isbn?.[0] || isbn,
                issued: publishDate ? this.createDateObject(publishDate) : undefined,
                accessed: this.createDateObject(new Date()),
            };

            this.cslJson.push(newCslJsonObject);
            return newCslJsonObject;
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
            return { id: uid(), identifier: isbn, type: "ISBN", status: "failed" };
        }
    }

    /**
     * Retrieves CSL-JSON data for a given PMCID.
     * @param {string} pmcid - The PMCID to fetch data for.
     * @returns {Promise<CSLJsonResponse>} The response object with citation data.
     */
    public async fromPMCID(pmcid: string): Promise<CSLJsonResponse> {
        /* eslint-disable indent */
        const pmcIdWithoutPrefix = pmcid.replace(/^PMC/, "");

        try {
            const response = await fetch(
                `${this.CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=${pmcIdWithoutPrefix}`
            );

            const data: CSLJson = await response.json();

            if ("status" in data && data.status === "error") {
                throw new Error(
                    `Unable to retrieve data for PMCID "${pmcid}". API responded with: ${JSON.stringify(data)}`
                );
            }

            let newCslJsonObject;

            if (data?.DOI) {
                newCslJsonObject = await this.fromDOI(data.DOI);
            } else {
                newCslJsonObject = {
                    id: uid(),
                    URL: data?.URL,
                    ISSN: data?.ISSN,
                    "container-title": data?.["container-title"],
                    issue: data?.issue,
                    issued: data?.issued,
                    page: data?.page,
                    "publisher-place": data?.["publisher-place"],
                    source: data?.source,
                    title: data?.title,
                    type: data?.type,
                    volume: data?.volume,
                    accessed: this.createDateObject(new Date()),
                    author: data?.author,
                };

                this.cslJson.push(newCslJsonObject);
            }

            return newCslJsonObject;
            /* eslint-enable indent */
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
            return { id: uid(), identifier: pmcid, type: "PMCID", status: "failed" };
        }
    }

    /**
     * Retrieves CSL-JSON data for a given PMID.
     * @param {string} pmid - The PMID to fetch data for.
     * @returns {Promise<CSLJsonResponse>} The response object with citation data.
     */
    public async fromPMID(pmid: string): Promise<CSLJsonResponse> {
        /* eslint-disable indent */
        try {
            const response = await fetch(
                `${this.CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=${pmid}`
            );

            const data: CSLJson = await response.json();

            if ("status" in data && data.status === "error") {
                throw new Error(
                    `Unable to retrieve data for PMID "${pmid}". API responded with: ${JSON.stringify(data)}`
                );
            }

            let newCslJsonObject;

            if (data?.DOI) {
                newCslJsonObject = await this.fromDOI(data.DOI);
            } else {
                newCslJsonObject = {
                    id: uid(),
                    URL: data?.URL,
                    ISSN: data?.ISSN,
                    "container-title": data?.["container-title"],
                    issue: data?.issue,
                    issued: data?.issued,
                    page: data?.page,
                    "publisher-place": data?.["publisher-place"],
                    source: data?.source,
                    title: data?.title,
                    type: data?.type,
                    volume: data?.volume,
                    accessed: this.createDateObject(new Date()),
                    author: data?.author,
                };

                this.cslJson.push(newCslJsonObject);
            }

            return newCslJsonObject;
            /* eslint-enable indent */
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
            return { id: uid(), identifier: pmid, type: "PMID", status: "failed" };
        }
    }

    /**
     * Generates a formatted bibliography from the CSL-JSON data.
     * @param {ToBibliographyOptions} options - The style, locale, and format for formatting.
     * @returns {Promise<string | null>} A promise that resolves to the formatted bibliography string or null if an error occurs.
     */
    public async toBibliography(options: ToBibliographyOptions): Promise<string | null> {
        return new Promise((resolve) => {
            try {
                const { style = "apa", locale = "en-US", format = "text" } = options;

                const citations: Record<string, CSLJson> = {};
                const itemIDs: string[] = [];
                for (let i = 0, length = this.cslJson.length; i < length; i += 1) {
                    const item = this.cslJson[i];
                    const id = item.id;
                    citations[id] = item;
                    itemIDs.push(id);
                }

                const processorFunctions = {
                    retrieveLocale: () => this.getLocaleFile(locale),
                    retrieveItem: (id: string) => citations[id],
                };

                const getFormattedCitations = (): string => {
                    const cslFile = this.getCslFile(style);
                    const citeproc = new Citeproc.Engine(processorFunctions, cslFile);
                    citeproc.setOutputFormat(format.toLowerCase());
                    citeproc.updateItems(itemIDs);
                    const references = citeproc.makeBibliography();
                    return references[1].join(format.toLowerCase() === "rtf" ? "\n" : "");
                };

                resolve(getFormattedCitations());
            } catch (error) {
                if (this.options.logErrors) process.stderr.write(this.errorTemplate(error as Error));
                resolve(null);
            }
        });
    }
}

module.exports = CSLJsonParser;
