import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin"; // eslint-disable-line import/no-unresolved
import _import from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tsParser from "@typescript-eslint/parser"; // eslint-disable-line import/no-unresolved
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url); // eslint-disable-line no-redeclare
const __dirname = path.dirname(__filename); // eslint-disable-line no-redeclare
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    {
        ignores: ["**/node_modules/", "**/dist/"],
    },
    ...fixupConfigRules(
        compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:import/errors",
            "plugin:prettier/recommended"
        )
    ),
    {
        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
            import: fixupPluginRules(_import),
            prettier: fixupPluginRules(prettier),
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.commonjs,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "commonjs",
        },

        rules: {
            indent: ["warn", 4],
            quotes: ["warn", "double"],
            "no-unused-vars": "warn",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    },
];
