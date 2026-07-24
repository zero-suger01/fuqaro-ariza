// Verifies that messages/{uz,oz,ru,en}.json all declare the exact same set
// of keys (docs/03-kontraktlar.md §7: "kalit 4 faylga bir vaqtda qo'shiladi").
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const LOCALES = ["uz", "oz", "ru", "en"];
const messagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "messages");

function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value, fullKey);
    }
    return [fullKey];
  });
}

const keysByLocale = Object.fromEntries(
  LOCALES.map((locale) => {
    const filePath = path.join(messagesDir, `${locale}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return [locale, new Set(flattenKeys(data))];
  })
);

const referenceKeys = keysByLocale.uz;
let hasError = false;

for (const locale of LOCALES) {
  const missing = [...referenceKeys].filter((key) => !keysByLocale[locale].has(key));
  const extra = [...keysByLocale[locale]].filter((key) => !referenceKeys.has(key));

  if (missing.length > 0) {
    hasError = true;
    console.error(`[${locale}] missing keys:\n  ${missing.join("\n  ")}`);
  }
  if (extra.length > 0) {
    hasError = true;
    console.error(`[${locale}] extra keys not in uz.json:\n  ${extra.join("\n  ")}`);
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log(`i18n:check OK — ${referenceKeys.size} keys in sync across ${LOCALES.join(", ")}`);
}
