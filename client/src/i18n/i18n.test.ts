import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { TRANSLATION_TABLES, translate } from "./index";

const SOURCE_ROOT = path.resolve(import.meta.dirname, "..");
const placeholders = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort();

/** Every string literal passed to `t(...)` in the storefront source, including both arms of a ternary. */
function collectSourceKeys(): Map<string, string> {
  const keys = new Map<string, string>();

  const collect = (expression: ts.Expression, file: string) => {
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      keys.set(expression.text, file);
    } else if (ts.isConditionalExpression(expression)) {
      collect(expression.whenTrue, file);
      collect(expression.whenFalse, file);
    } else if (ts.isParenthesizedExpression(expression)) {
      collect(expression.expression, file);
    }
  };

  const scan = (file: string) => {
    const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      const isTranslateCall = ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t";
      if (isTranslateCall && node.arguments[0]) collect(node.arguments[0], path.relative(SOURCE_ROOT, file));
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  };

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) scan(full);
    }
  };
  walk(SOURCE_ROOT);
  return keys;
}

const allEntries = Object.entries(TRANSLATION_TABLES).flatMap(([table, entries]) =>
  Object.entries(entries).map(([key, translations]) => ({ table, key, translations }))
);

describe("storefront translations", () => {
  it("translates every text the storefront renders", () => {
    const translated = new Set(allEntries.map(entry => entry.key));
    const missing = Array.from(collectSourceKeys())
      .filter(([key]) => !translated.has(key))
      .map(([key, file]) => `${file}: ${JSON.stringify(key)}`);
    expect(missing).toEqual([]);
  });

  it("defines each text once", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const { table, key } of allEntries) {
      if (seen.has(key)) duplicates.push(`${JSON.stringify(key)} in ${seen.get(key)} and ${table}`);
      seen.set(key, table);
    }
    expect(duplicates).toEqual([]);
  });

  it("provides Indonesian and Chinese for every text, keeping its placeholders", () => {
    const broken = allEntries
      .filter(({ key, translations }) =>
        translations.some(translation => !translation.trim() || placeholders(translation).join() !== placeholders(key).join())
      )
      .map(entry => entry.key);
    expect(broken).toEqual([]);
  });

  it("fills placeholders and falls back to English for unknown text", () => {
    expect(translate("id", "Welcome, {name}", { name: "Nadia" })).toBe("Selamat datang, Nadia");
    expect(translate("zh", "Add to bag")).toBe("加入购物袋");
    expect(translate("en", "Add to bag")).toBe("Add to bag");
    expect(translate("id", "Text nobody translated yet")).toBe("Text nobody translated yet");
  });
});
