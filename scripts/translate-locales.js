#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const localesDir = resolve(root, "i18n/locales");

const args = new Map(
  process.argv.slice(2).flatMap((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  })
);

const targetLocales = (args.get("locales") || "")
  .split(",")
  .map((locale) => locale.trim())
  .filter(Boolean);

const sourceLocale = args.get("source") || "en";
const model = args.get("model") || "gpt-5.4-mini";

if (!targetLocales.length) {
  console.error("Usage: node scripts/translate-locales.js --locales=ja,ko,es");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required to generate locale files.");
  process.exit(1);
}

const sourcePath = resolve(localesDir, `${sourceLocale}.json`);
const sourceMessages = JSON.parse(await readFile(sourcePath, "utf8"));
const supportedPath = resolve(localesDir, "supported.json");

function schemaFromValue(value) {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: schemaFromValue(value[0] ?? ""),
    };
  }

  if (value && typeof value === "object") {
    const properties = Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, schemaFromValue(child)])
    );

    return {
      type: "object",
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
  }

  return {
    type: "string",
  };
}

const localeSchema = {
  name: "locale_messages",
  strict: true,
  schema: schemaFromValue(sourceMessages),
};

function buildPrompt(targetLocale) {
  return [
    `Translate this UI locale JSON from ${sourceLocale} to ${targetLocale}.`,
    "Preserve the exact JSON object shape and every key.",
    "Preserve placeholders such as {vehicle}, {launchSite}, {returnSite}, {open}, {close}, {local}, {utc}, and {value}.",
    "Keep product names such as SpaceX, Starlink, GitHub, ICS, UTC, and API unchanged unless the target language normally keeps them unchanged.",
    "Return only valid JSON.",
    "",
    JSON.stringify(sourceMessages, null, 2),
  ].join("\n");
}

async function translateLocale(targetLocale) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(targetLocale),
      text: {
        format: {
          type: "json_schema",
          ...localeSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed for ${targetLocale}: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload.output_text;

  if (!content) {
    throw new Error(`OpenAI API returned no output_text for ${targetLocale}`);
  }

  const translated = JSON.parse(content);
  const outputPath = resolve(localesDir, `${targetLocale}.json`);
  await writeFile(outputPath, `${JSON.stringify(translated, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

for (const locale of targetLocales) {
  await translateLocale(locale);
}

const supportedLocales = JSON.parse(await readFile(supportedPath, "utf8"));
const nextSupportedLocales = Array.from(new Set([...supportedLocales, ...targetLocales]));
await writeFile(supportedPath, `${JSON.stringify(nextSupportedLocales, null, 2)}\n`);
console.log(`Updated ${supportedPath}`);
