export type DateObject = { "date-parts": Array<number[]> };

export type CSLJson = {
    id: string;
    DOI?: string;
    URL?: string;
    ISSN?: string[];
    ISBN?: string;
    PMID?: string;
    PMCID?: string;
    "container-title"?: string;
    issue?: string;
    issued?: DateObject;
    page?: string;
    "number-of-pages"?: number;
    "publisher-place"?: string;
    source?: string;
    title?: string;
    volume?: string;
    type?: string;
    accessed?: DateObject;
    publisher?: string;
    author?: Array<{ given: string; family: string }>;
    locator?: string;
    label?: string;
};

export type FailedCSLJson = {
    id: string;
    identifier: string;
    type: "DOI" | "ISBN" | "URL" | "PMID" | "PMCID";
    status: "failed";
};

export type CSLJsonResponse = CSLJson | FailedCSLJson;
