import { useT } from "@/i18n";
import { parseDescriptionSections, parseStructuredDescription, type RichTextSegment } from "@/lib/textUtils";
import { AlertCircle, Info, Sparkles } from "lucide-react";
import "./product-description.css";

type Props = {
  /** Plain-text story, already stripped of markup. */
  text: string;
  /** Original catalog HTML, when available; used to recover headings and bullet lists. */
  html?: string | null;
};

/** Splits "1) Temperature: 150C" into its number, optional "Label:" and remaining text. */
function parseInstructionStep(step: string, index: number) {
  const match = step.match(/^(\d+)[).]\s*([A-Za-z\s]+:)?(.*)$/);
  if (!match) return { number: String(index + 1), label: "", text: step };
  return { number: match[1], label: match[2] ?? "", text: match[3] || step };
}

const isWarningNote = (note: string) => /NOTE|Warning|Important/i.test(note);

function RichText({ segments }: { segments: RichTextSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.href ? (
          <a key={index} href={segment.href} target="_blank" rel="noopener noreferrer">
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

/**
 * Product story, rendered in the richest structure the source allows:
 * headed bullet sections (shirts), specs + instructions + notes (patches and
 * namesets), or a plain paragraph.
 */
export function ProductDescription({ text, html }: Props) {
  const t = useT();

  const sections = parseDescriptionSections(html);
  if (sections.length > 0) {
    return (
      <div className="product-description-structured">
        {sections.map(section => (
          <section className="pd-section" key={section.title}>
            <h3>{t(section.title)}</h3>
            <ul>
              {section.items.map((segments, index) => (
                <li key={index}>
                  <RichText segments={segments} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const parsed = parseStructuredDescription(text);
  if (!parsed.isTechnical) {
    return <p className="product-story">{parsed.editorial || text}</p>;
  }

  return (
    <div className="product-description-structured">
      {parsed.editorial && <p className="product-story">{parsed.editorial}</p>}

      {parsed.specs.length > 0 && (
        <dl className="pd-specs">
          {parsed.specs.map((spec, index) => (
            <div key={index}>
              <dt>{t(spec.label)}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {parsed.instructions.length > 0 && (
        <div className="pd-instructions">
          <div className="pd-instructions-title">
            <Sparkles size={15} />
            <span>{parsed.instructionTitle || t("Application & Care Instructions")}</span>
          </div>
          <ol>
            {parsed.instructions.map((step, index) => {
              const { number, label, text: stepText } = parseInstructionStep(step, index);
              return (
                <li key={index}>
                  <span className="pd-step-number">{number}</span>
                  <div>
                    {label && <strong>{label} </strong>}
                    <span>{stepText}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {parsed.notes.length > 0 && (
        <div className="pd-notes">
          {parsed.notes.map((note, index) => {
            const isWarning = isWarningNote(note);
            const Icon = isWarning ? AlertCircle : Info;
            return (
              <div key={index} className={`pd-note ${isWarning ? "is-warning" : ""}`}>
                <Icon size={16} />
                <span>{note}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
