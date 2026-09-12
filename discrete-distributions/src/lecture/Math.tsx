import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo, type ReactNode } from "react";
import styles from "./Lecture.module.css";

type MathProps = {
  tex: string;
  display?: boolean;
  className?: string;
};

/** Prefer String.raw`\frac{1}{2}` so TeX backslashes are not eaten by JS. */
export function tex(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values);
}

function renderTex(source: string, display: boolean): string {
  try {
    return katex.renderToString(source, {
      displayMode: display,
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
  } catch {
    return source;
  }
}

export function Math({ tex: source, display = false, className }: MathProps) {
  const html = useMemo(() => renderTex(source, display), [source, display]);
  return (
    <span
      className={`${display ? styles.mathDisplay : styles.mathInline} ${className ?? ""}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function DisplayMath({ tex: source, className }: { tex: string; className?: string }) {
  return <Math tex={source} display className={className} />;
}

export function InlineMath({ tex: source, className }: { tex: string; className?: string }) {
  return <Math tex={source} display={false} className={className} />;
}

const INLINE_MATH = /\$([^$]+)\$/g;

/**
 * Parse a string with $...$ inline math segments.
 * Pass String.raw`...` (or the tex`` helper) so `\frac` / `\mathbf` keep their backslashes.
 */
export function MathText({ text }: { text: string }): ReactNode {
  const nodes = useMemo(() => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    for (const match of text.matchAll(INLINE_MATH)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        parts.push(text.slice(lastIndex, index));
      }
      parts.push(<InlineMath key={index} tex={match[1]} />);
      lastIndex = index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  }, [text]);

  return <>{nodes}</>;
}

/** Dark formula strip with display KaTeX. */
export function Formula({ tex: source, className }: { tex: string; className?: string }) {
  return (
    <div className={`${styles.formula} ${className ?? ""}`.trim()}>
      <DisplayMath tex={source} />
    </div>
  );
}
