/**
 * Text formatting utility for cleaning and structuring raw product descriptions from HTML / CSV
 */

export function cleanHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&copy;/gi, "©")
    .replace(/&reg;/gi, "®");
}

export function formatProductStory(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") {
    return "Authentic archival piece curated for the hours around the match.";
  }

  // 1. Remove style and script tags with content
  let text = raw
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // 2. Convert structural HTML tags to newlines
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    // 3. Strip remaining HTML tags
    .replace(/<[^>]+>/g, " ");

  // 4. Decode HTML entities
  text = cleanHtmlEntities(text);

  // 5. Structure clumped labels and numbered items (e.g. "Material : Velvet Instruction: 1) Place...")
  text = text
    // Put newlines before Key: Value headers
    .replace(
      /\s*(Quantity\s*:|Material\s*:|Instruction\s*(\([^)]*\))?\s*:|NOTE\s*:|Care\s*:|Application\s*:|Warning\s*:|Important\s*:)/gi,
      "\n\n$1 "
    )
    // Put newlines before numbered list items like 1), 2), 3) or 1., 2.
    .replace(/([^\n])\s*(\b\d{1,2}[\)\.]\s+)/g, "$1\n$2")
    // Put newlines before closing notes like "Any inquiry..."
    .replace(/([^\n])\s*(Any inquiry[^\n]*)/gi, "$1\n\n$2")
    // Clean up excessive spaces and blank lines
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || "Authentic archival piece curated for the hours around the match.";
}

export interface StructuredDescription {
  isTechnical: boolean;
  editorial: string;
  specs: Array<{ label: string; value: string }>;
  instructions: string[];
  instructionTitle?: string;
  notes: string[];
}

export function parseStructuredDescription(text: string): StructuredDescription {
  const cleaned = formatProductStory(text);
  const lines = cleaned.split("\n").map(l => l.trim()).filter(Boolean);

  const specs: Array<{ label: string; value: string }> = [];
  const instructions: string[] = [];
  let instructionTitle: string | undefined;
  const notes: string[] = [];
  const editorialLines: string[] = [];

  let inInstructions = false;

  for (const line of lines) {
    const specMatch = line.match(/^(Quantity|Material|Color|Size|Weight|Fit|Fabric)\s*:\s*(.+)$/i);
    if (specMatch) {
      specs.push({ label: specMatch[1], value: specMatch[2].trim() });
      continue;
    }

    const instrHeaderMatch = line.match(/^Instruction\s*(\([^)]*\))?\s*:\s*(.*)$/i);
    if (instrHeaderMatch) {
      inInstructions = true;
      instructionTitle = line.replace(/:.*$/, "").trim();
      if (instrHeaderMatch[2]?.trim()) {
        const extra = instrHeaderMatch[2].trim();
        if (/^\d+[\)\.]/.test(extra)) {
          instructions.push(extra);
        } else {
          editorialLines.push(extra);
        }
      }
      continue;
    }

    const numberedStepMatch = line.match(/^\d+[\)\.]\s+(.+)$/);
    if (numberedStepMatch) {
      instructions.push(line);
      continue;
    }

    const noteMatch = line.match(/^(NOTE|Warning|Important|Perhatian)\s*:\s*(.+)$/i);
    if (noteMatch) {
      inInstructions = false;
      notes.push(line);
      continue;
    }

    if (/^Any inquiry/i.test(line)) {
      notes.push(line);
      continue;
    }

    if (inInstructions && instructions.length > 0) {
      instructions.push(line);
    } else {
      editorialLines.push(line);
    }
  }

  const isTechnical = specs.length > 0 || instructions.length > 0 || notes.length > 0;

  return {
    isTechnical,
    editorial: editorialLines.join("\n\n"),
    specs,
    instructions,
    instructionTitle,
    notes,
  };
}

export type RichTextSegment = { text: string; href?: string };
export interface DescriptionSection {
  title: string;
  /** Each item is one bullet, split into plain text and link segments. */
  items: RichTextSegment[][];
}

const LINK_MARKER = /\u0001(.*?)\u0002(.*?)\u0003/g;
const HEADING_MARK = "\u0004";
const ITEM_MARK = "\u0005";

/** "☑️ CONDITION :" -> "Condition" */
function cleanSectionTitle(raw: string): string {
  const title = raw.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9)]+$/, "").trim();
  const isShouting = title === title.toUpperCase();
  return isShouting ? title.charAt(0) + title.slice(1).toLowerCase() : title;
}

function toSegments(line: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let cursor = 0;
  for (const match of Array.from(line.matchAll(LINK_MARKER))) {
    const before = line.slice(cursor, match.index);
    if (before) segments.push({ text: before });
    const [, href, label] = match;
    // Only real web links are kept clickable; anything else renders as plain text.
    segments.push(/^https?:\/\//i.test(href) ? { text: label, href } : { text: label });
    cursor = (match.index ?? 0) + match[0].length;
  }
  const rest = line.slice(cursor);
  if (rest) segments.push({ text: rest });
  return segments;
}

/**
 * Reads a product description written as headings followed by bullet lists
 * (the format of the imported shirt catalog) into titled sections.
 * Returns an empty list for descriptions that are not structured that way.
 */
export function parseDescriptionSections(html: string | null | undefined): DescriptionSection[] {
  if (!html || !/<h[1-6]/i.test(html)) return [];

  const marked = html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, label: string) =>
      `\u0001${href}\u0002${label.replace(/<[^>]+>/g, "")}\u0003`
    )
    .replace(/<h[1-6][^>]*>/gi, `\n${HEADING_MARK}`)
    .replace(/<li[^>]*>/gi, `\n${ITEM_MARK}`)
    .replace(/<\/(h[1-6]|li|p|div|ul|ol)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  const sections: DescriptionSection[] = [];
  for (const rawLine of cleanHtmlEntities(marked).split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    if (line.startsWith(HEADING_MARK)) {
      const title = cleanSectionTitle(line.slice(1));
      if (title) sections.push({ title, items: [] });
      continue;
    }

    const text = line.startsWith(ITEM_MARK) ? line.slice(1).trim() : line;
    const current = sections[sections.length - 1];
    if (text && current) current.items.push(toSegments(text));
  }

  return sections.filter(section => section.items.length > 0);
}
