import { parseStructuredDescription } from "@/lib/textUtils";
import { AlertCircle, CheckCircle, Info, Sparkles } from "lucide-react";
import React from "react";

export function ProductDescription({ text }: { text: string }) {
  const parsed = parseStructuredDescription(text);

  if (!parsed.isTechnical) {
    return <p className="product-story">{parsed.editorial || text}</p>;
  }

  return (
    <div
      className="product-description-structured"
      style={{
        margin: "24px 0 32px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Editorial Intro if any */}
      {parsed.editorial && (
        <p
          className="product-story"
          style={{
            margin: "0 0 8px",
            fontSize: "1.05rem",
            lineHeight: 1.55,
          }}
        >
          {parsed.editorial}
        </p>
      )}

      {/* Specifications Grid */}
      {parsed.specs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
            backgroundColor: "var(--muted)",
            padding: "14px 16px",
            borderRadius: "4px",
            border: "1px solid var(--border)",
          }}
        >
          {parsed.specs.map((spec, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--muted-foreground)",
                  fontWeight: 600,
                }}
              >
                {spec.label}
              </span>
              <strong style={{ fontSize: "0.9rem", color: "var(--foreground)", fontWeight: 600 }}>
                {spec.value}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Instructions Card */}
      {parsed.instructions.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "16px 20px",
            backgroundColor: "var(--card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <Sparkles size={15} />
            <span>{parsed.instructionTitle || "Application & Care Instructions"}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {parsed.instructions.map((step, idx) => {
              // Format step content: highlight keywords like "Temperature:", "Time:", "Pressure:", "Peel:"
              const match = step.match(/^(\d+[\)\.]\s*)([A-Za-z\s]+:)?(.*)$/);
              const num = match ? match[1] : `${idx + 1}. `;
              const label = match?.[2] || "";
              const rest = match ? match[3] : step;

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    color: "var(--foreground)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "var(--muted)",
                      color: "var(--foreground)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    {num.replace(/[\)\.]/g, "")}
                  </span>
                  <div style={{ flex: 1 }}>
                    {label && <strong style={{ color: "var(--primary)" }}>{label} </strong>}
                    <span>{rest || step}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes / Warnings Box */}
      {parsed.notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {parsed.notes.map((note, idx) => {
            const isWarning = /NOTE|Warning|Important/i.test(note);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "4px",
                  backgroundColor: isWarning ? "rgba(234, 179, 8, 0.08)" : "var(--muted)",
                  borderLeft: isWarning ? "3px solid #eab308" : "3px solid var(--border)",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  color: isWarning ? "#854d0e" : "var(--muted-foreground)",
                }}
              >
                {isWarning ? <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} /> : <Info size={16} style={{ marginTop: "2px", flexShrink: 0 }} />}
                <span>{note}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
