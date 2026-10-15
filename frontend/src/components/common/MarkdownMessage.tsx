import React, { useMemo } from "react";
import { AlertTriangle, ShieldCheck, Info, ChevronRight } from "lucide-react";

interface MarkdownMessageProps {
  content: string;
  isAi?: boolean;
}

// 1. Helper to render inline elements (Bold, Code, Italic) cleanly and minimally
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting on **bold**, `code`, or *italic*
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*)/g);

  return tokens.map((token, i) => {
    // A. Bold content **...**
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      const inner = token.slice(2, -2).trim();

      // Check for Danger / Emergency keywords to emphasize subtly with red text
      if (
        /DANGER|WARNING|URGENT|CRITICAL|MOVE UPHILL|NOT SAFE|EVACUATE|HAZARD|DO NOT STAY|FAILURE|IMMEDIATELY|ALERT/i.test(
          inner
        )
      ) {
        return (
          <strong key={i} className="font-semibold text-red-400">
            {inner}
          </strong>
        );
      }

      // Check for Safe keywords
      if (/SAFE|ALL CLEAR|PASSABLE|CLEAR BUFFER|STABLE/i.test(inner)) {
        return (
          <strong key={i} className="font-semibold text-emerald-400">
            {inner}
          </strong>
        );
      }

      // Standard clean bold text
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {inner}
        </strong>
      );
    }

    // B. Inline code `...`
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      const code = token.slice(1, -1);
      return (
        <code
          key={i}
          className="font-mono text-xs bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700/50 mx-0.5"
        >
          {code}
        </code>
      );
    }

    // C. Italic *...*
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      const italicContent = token.slice(1, -1);
      return (
        <em key={i} className="italic text-zinc-400">
          {italicContent}
        </em>
      );
    }

    // D. Normal text
    return <span key={i}>{token}</span>;
  });
}

/**
 * Rich Markdown Message Formatter
 * Accurately parses headers, emergency alerts, numbered action steps, bullet lists,
 * Nepali advisories, and metrics chips.
 */
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  content,
  isAi = true,
}) => {
  const blocks = useMemo(() => {
    if (!content) return [];
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];

    let currentList: { type: "ol" | "ul"; items: React.ReactNode[] } | null =
      null;

    const flushList = () => {
      if (!currentList) return;
      if (currentList.type === "ol") {
        elements.push(
          <div key={`ol-${elements.length}`} className="my-2.5 space-y-2 pl-0.5">
            {currentList.items}
          </div>
        );
      } else {
        elements.push(
          <div key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-0.5">
            {currentList.items}
          </div>
        );
      }
      currentList = null;
    };

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();

      // Empty line -> flush list and add soft spacing
      if (!line) {
        flushList();
        return;
      }

      // 1. Horizontal Rules (---, ***, ___)
      if (/^(\*\*\*|---|___)$/.test(line)) {
        flushList();
        elements.push(
          <div
            key={`hr-${idx}`}
            className="h-px bg-zinc-800 my-4"
          />
        );
        return;
      }

      // 2. High-Severity Warning Callout Line (e.g. **⚠️ DANGER...** or ⚠️ HAZARD)
      if (
        (line.startsWith("**") &&
          /⚠️|🚨|DANGER|HAZARD NEARBY|MOVE UPHILL/i.test(line)) ||
        line.startsWith("⚠️") ||
        line.startsWith("🚨") ||
        line.includes("URGENT GEOFENCE WARNING")
      ) {
        flushList();
        const cleanText = line
          .replace(/^\*\*/, "")
          .replace(/\*\*$/, "")
          .trim()
          .replace(/^[⚠️🚨]\s*/, "");

        elements.push(
          <div
            key={`alert-${idx}`}
            className="my-3 p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 text-red-200 text-sm flex items-start gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">
              {renderInline(cleanText)}
            </div>
          </div>
        );
        return;
      }

      // 3. Safe Status Callout (🟢 SAFE HAVEN ZONE...)
      if (
        line.includes("🟢 SAFE") ||
        line.includes("SAFE HAVEN ZONE") ||
        (line.startsWith("**") && line.includes("SAFE BASELINE"))
      ) {
        flushList();
        const cleanText = line
          .replace(/^\*\*/, "")
          .replace(/\*\*$/, "")
          .trim()
          .replace(/^🟢\s*/, "");

        elements.push(
          <div
            key={`safe-${idx}`}
            className="my-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-200 text-sm flex items-start gap-3"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">
              {renderInline(cleanText)}
            </div>
          </div>
        );
        return;
      }

      // 4. Section Headings (### Title or ## Title)
      if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
        flushList();
        const headingText = line.replace(/^#{1,4}\s*/, "").trim();
        elements.push(
          <div
            key={`heading-${idx}`}
            className="text-sm font-semibold text-zinc-100 pt-3 pb-1 border-b border-zinc-800"
          >
            {renderInline(headingText)}
          </div>
        );
        return;
      }

      // 5. Standalone Bold Directive Line (e.g. **DO NOT STAY WHERE YOU ARE.** or **This is not a drill.**)
      if (/^\*\*[^*]+\*\*\.?$/.test(line)) {
        flushList();
        const directiveText = line.slice(2, -2).trim();
        const isUrgent = /DO NOT|STAY|DRILL|ACT NOW|IMMEDIATE|CRITICAL/i.test(directiveText);
        elements.push(
          <div
            key={`directive-${idx}`}
            className={`my-2 py-1 text-sm font-semibold ${
              isUrgent ? "text-red-400" : "text-zinc-200"
            }`}
          >
            {directiveText}
          </div>
        );
        return;
      }

      // 6. Numbered Steps (e.g. 1.  **MOVE UPHILL NOW:** ...)
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        const num = numberedMatch[1];
        const stepBody = numberedMatch[2];

        if (!currentList || currentList.type !== "ol") {
          flushList();
          currentList = { type: "ol", items: [] };
        }

        currentList.items.push(
          <div key={`step-${idx}`} className="flex items-start gap-3 text-sm">
            <span className="w-5 text-zinc-500 font-mono text-sm shrink-0 mt-0.5">
              {num}.
            </span>
            <div className="flex-1 leading-relaxed text-zinc-300">
              {renderInline(stepBody)}
            </div>
          </div>
        );
        return;
      }

      // 7. Bullet Points (•, -, *)
      const bulletMatch = line.match(/^([•\-\*])\s+(.*)/);
      if (bulletMatch) {
        const bulletBody = bulletMatch[2];

        if (!currentList || currentList.type !== "ul") {
          flushList();
          currentList = { type: "ul", items: [] };
        }

        currentList.items.push(
          <div key={`bullet-${idx}`} className="flex items-start gap-2.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 shrink-0 mt-2" />
            <div className="flex-1 leading-relaxed text-zinc-300">
              {renderInline(bulletBody)}
            </div>
          </div>
        );
        return;
      }

      // 8. Nepali Advisory Block (Devanagari text check)
      const hasDevanagari = /[\u0900-\u097F]/.test(line);
      if (hasDevanagari) {
        flushList();
        elements.push(
          <div
            key={`nepali-${idx}`}
            className="my-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-sm leading-relaxed"
          >
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div className="flex-1">{renderInline(line)}</div>
            </div>
          </div>
        );
        return;
      }

      // 9. Standard Paragraph Line
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="leading-relaxed text-zinc-300 my-1.5 text-sm">
          {renderInline(line)}
        </p>
      );
    });

    flushList();
    return elements;
  }, [content]);

  return <div className="space-y-1.5">{blocks}</div>;
};

export default MarkdownMessage;
