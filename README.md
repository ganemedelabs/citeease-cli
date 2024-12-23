# CiteEase CLI

![npm](https://img.shields.io/npm/v/citeease-cli)
![npm](https://img.shields.io/npm/dw/citeease-cli)
![License](https://img.shields.io/npm/l/citeease-cli)

`citeease` is a CLI tool that generates formatted citations (references) based on various unique identifiers, including URL, DOI, ISBN, PMID, and PMCID. Just pass in your identifiers, and `citeease` will handle the rest!

## 📋 Table of Contents

- [Installation](#-installation)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Supported Identifiers](#-supported-identifiers)
- [Data Sources](#-data-sources)
- [Output](#-output)
- [License](#-license)
- [Contact](#-contact)

## ⚙️ Installation

Install `citeease` globally via npm:

```bash
npm install -g citeease
```

Or use it directly with `npx` without global installation:

```bash
npx citeease cite <list of identifiers>
```

## 🚀 Usage

To generate citations, provide a list of unique identifiers as arguments. `citeease` will attempt to identify the type of each identifier automatically.

### Options

- `--style`, `-s <style>`: Choose the citation style for the output (e.g., `apa`, `modern-language-association`, `chicago-author-date`). The default is APA.
- `--locale`, `-l <locale>`: Set the locale for the citation language (e.g., `en-US` for U.S. English, `fr-FR` for French, `ar` for Arabic). The default is `en-US`.
- `--format`, `-f <format>`: Specify the output format. Options include `text` (default), `html`, `rtf`, and `asciidoc`.
- `--intext`, `-i`: Include in-text citations (e.g., `(Author, Year)`) in the output. By default, in-text citations are disabled.
- `--no-intext`: Exclude in-text citations from the output. This option is only necessary if the `intext` configuration is set to `true` by default.
- `--log-errors`, `-e`: Enable logging of errors for debugging purposes.
- `--version`, `-v`: Display the current version of `citeease`.

> **Note:** You can check available citation styles and locales at:
>
> - Styles: [https://github.com/citation-style-language/styles](https://github.com/citation-style-language/styles)
> - Locales: [https://github.com/citation-style-language/locales](https://github.com/citation-style-language/locales)

### Examples

```bash
# Using a globally installed package
cite 10.1000/xyz123 978-3-16-148410-0

# Specifying a citation style and locale
cite --style modern-language-association --locale en-GB 10.1000/xyz123

# Including in-text citations
cite --intext 10.1000/xyz123

# Excluding in-text citations when enabled by default
cite --no-intext 10.1000/xyz123

# Specifying an output format
cite --format html 10.1000/xyz123
```

Or with `npx`:

```bash
npx citeease cite --style chicago-author-date --locale fr-FR --format rtf https://example.com/article
```

### Specifying Identifier Types

If `citeease` misinterprets an identifier’s type or if you want to force a specific type, you can prefix it with the type and a colon, like so:

```bash
cite "url: https://doi.org/10.xyz123" "isbn: 978-3-16-148410-0"
```

This will force `citeease` to treat the first identifier as a URL and the second as an ISBN. This works for all identifier types: **url**, **doi**, **isbn**, **pmid**, and **pmcid**.

---

## 🔧 Configuration

`citeease` allows you to configure default settings for citation generation using the `config` command. This helps you avoid repeating options like style, locale, format, or in-text citations with every command.

### Configuration Options

- **`style`**: Set the default citation style (e.g., `apa`, `mla`, `chicago-author-date`).
- **`locale`**: Set the default locale (e.g., `en-US`, `fr-FR`, `ar`).
- **`format`**: Set the default output format (e.g., `text`, `HTML`, `rtf`, `asciidoc`).
- **`intext`**: Enable or disable in-text citations by default. The default value is `false`.
- **`reset`**: Reset all configurations to their default values.

### Examples

```bash
# Set default citation style to APA
cite config style apa

# Set default locale to en-US
cite config locale en-US

# Set default output format to HTML
cite config format html

# Enable in-text citations by default
cite config intext true

# Reset all configurations
cite config reset
```

Use the `config <KEY>` command without a value to view the current setting for a key.

## 🆔 Supported Identifiers

- **DOI**: e.g., `10.1093/ajae/aaq063`
- **URL**: e.g., `https://example.com`
- **ISBN**: e.g., `978-3-16-148410-0`
- **PMID**: e.g., `27097605`
- **PMCID**: e.g., `PMC6323133`

## 🌐 Data Sources

`citeease` uses the following free APIs to retrieve citation data:

- [CrossRef](https://www.crossref.org/documentation/retrieve-metadata/rest-api/): For DOI-based data, e.g., `https://api.crossref.org/works/<DOI>`
- [Open Library](https://openlibrary.org/developers/api): For ISBN-based data, e.g., `https://openlibrary.org/search.json?q=isbn:<ISBN>&mode=everything&fields=*,editions`
- [NCBI](https://api.ncbi.nlm.nih.gov/lit/ctxp/): For data from PubMed and PubMed Central, e.g., `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=<PMID>` and `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=<PMCID>`

These APIs provide open-access data for research and citation.

## 📄 Output

`citeease` generates a formatted citation (reference) for each identifier. The output is styled for easy copy-pasting into documents and includes all relevant citation details, formatted according to standard citation styles, locale settings, and output format.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganemedelabs@gmail.com](mailto:ganemedelabs@gmail.com).
