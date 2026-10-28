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

/** Lowercase Greek that CSS `text-transform: uppercase` would turn into capitals (σ → Σ). */
const PLAIN_GREEK = /[αβγδεζηθικλμνξοπρσςτυφχψω]/g;
const GREEK_TEX: Record<string, string> = {
  α: "\\alpha",
  β: "\\beta",
  γ: "\\gamma",
  δ: "\\delta",
  ε: "\\varepsilon",
  ζ: "\\zeta",
  η: "\\eta",
  θ: "\\theta",
  ι: "\\iota",
  κ: "\\kappa",
  λ: "\\lambda",
  μ: "\\mu",
  ν: "\\nu",
  ξ: "\\xi",
  ο: "o",
  π: "\\pi",
  ρ: "\\rho",
  σ: "\\sigma",
  ς: "\\varsigma",
  τ: "\\tau",
  υ: "\\upsilon",
  φ: "\\varphi",
  χ: "\\chi",
  ψ: "\\psi",
  ω: "\\omega",
};

function pushPlainWithGreek(parts: ReactNode[], plain: string, keyPrefix: string) {
  if (!plain) return;
  let last = 0;
  let greekCount = 0;
  for (const match of plain.matchAll(PLAIN_GREEK)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push(plain.slice(last, index));
    }
    const ch = match[0];
    const texSource = GREEK_TEX[ch] ?? ch;
    parts.push(<InlineMath key={`${keyPrefix}-g${greekCount}`} tex={texSource} />);
    greekCount += 1;
    last = index + ch.length;
  }
  if (last < plain.length) {
    parts.push(plain.slice(last));
  }
}

/**
 * Parse a string with $...$ inline math segments.
 * Pass String.raw`...` (or the tex`` helper) so `\frac` / `\mathbf` keep their backslashes.
 * Bare lowercase Greek (e.g. σ in a kicker) is rendered as KaTeX so CSS uppercase cannot turn it into Σ.
 */
export function MathText({ text }: { text: string }): ReactNode {
  const nodes = useMemo(() => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let mathCount = 0;
    for (const match of text.matchAll(INLINE_MATH)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        pushPlainWithGreek(parts, text.slice(lastIndex, index), `p${index}`);
      }
      parts.push(<InlineMath key={`m${mathCount}`} tex={match[1]} />);
      mathCount += 1;
      lastIndex = index + match[0].length;
    }
    if (lastIndex < text.length) {
      pushPlainWithGreek(parts, text.slice(lastIndex), `p${lastIndex}`);
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
