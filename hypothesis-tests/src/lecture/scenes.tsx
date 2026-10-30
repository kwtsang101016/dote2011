import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  formatMoney,
  formatNum,
  formatP,
  mean,
  mulberry32,
  sampleNormal,
  sampleSd,
  stdNormalCdf,
  stdNormalPdf,
  stdNormalUpper,
  tPdf,
  tUpper,
  tUpperTail,
  zUpper,
} from "../utils";
import { Formula, InlineMath, MathText, tex } from "./Math";
import styles from "./Lecture.module.css";
import { LiveOnly, PrintOnly, usePrintMode } from "./printContext";

export type SceneDef = {
  id: string;
  chapter: string;
  label: string;
  Scene: () => ReactElement;
};

const COVER_HINT_LIVE =
  "Use ← → or the buttons above. Drag the sliders to move cutoffs and p-values. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

const SIGNIF_LEVELS = [0.1, 0.05, 0.01] as const;

/** Aircrew escape system: propellant burn rate (cm/s). */
const PROP = { mu0: 50, sigma: 2.5, n: 10, lo: 48.5, hi: 51.5, muAlt: 52 };
/** Power-supply output voltage example. */
const PSU = { mu0: 5, sigma: 0.25, n: 8, lo: 4.85, hi: 5.15 };
/** Battery-life example (σ known, one-sided). */
const BATTERY = { mu0: 40, sigma: 1.25, n: 10, xBar: 40.5 };
/** Catalyst yield data (Table 10-1). */
const CATALYST_1 = [91.5, 94.18, 92.18, 95.39, 91.79, 89.07, 94.72, 89.21];
const CATALYST_2 = [89.19, 90.95, 90.46, 93.21, 97.19, 97.04, 91.07, 92.75];
/** 40-yard-dash time differences for 24 girls (paired example). */
const PAIRED_W = [
  0.28, 0.01, 0.13, 0.33, -0.03, 0.07, -0.18, -0.14, -0.33, 0.01, 0.22, 0.29, -0.08, 0.23, 0.08, 0.04, -0.3, -0.08, 0.09, 0.7, 0.33, -0.34, 0.5, 0.06,
];

type Side = "two" | "upper" | "lower";

const SIDE_LABEL: Record<Side, string> = {
  two: "Two-sided (≠)",
  upper: "Upper-tail (>)",
  lower: "Lower-tail (<)",
};

const RED_FILL = "rgba(223, 74, 62, 0.35)";
const BLUE_FILL = "rgba(46, 113, 144, 0.38)";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function SceneFrame({
  kicker,
  title,
  tone = "cream",
  children,
}: {
  /** Plain text with optional $...$ KaTeX segments. */
  kicker: string;
  /** Plain text with optional $...$ KaTeX segments. */
  title: string;
  tone?: "cream" | "gold" | "white" | "dark";
  children: ReactNode;
}) {
  const toneClass = tone === "gold" ? styles.gold : tone === "white" ? styles.whiteScene : tone === "dark" ? styles.dark : "";
  return (
    <section className={`${styles.scene} ${toneClass}`}>
      <p className={styles.kicker}>
        <MathText text={kicker} />
      </p>
      <h1>
        <MathText text={title} />
      </h1>
      {children}
    </section>
  );
}

function AlphaPicker({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className={styles.tools}>
      {SIGNIF_LEVELS.map((level) => (
        <button key={level} type="button" className={level === value ? styles.toolBtnActive : styles.toolBtn} onClick={() => onChange(level)}>
          <MathText text={`α = ${level}`} />
        </button>
      ))}
    </div>
  );
}

function SidePicker({ value, onChange }: { value: Side; onChange: (next: Side) => void }) {
  return (
    <div className={styles.tools}>
      {(Object.keys(SIDE_LABEL) as Side[]).map((option) => (
        <button key={option} type="button" className={value === option ? styles.toolBtnActive : styles.toolBtn} onClick={() => onChange(option)}>
          {SIDE_LABEL[option]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

type Curve = { pdf: (x: number) => number; color: string; width?: number; dash?: string; label?: string };
/** `curve` picks which curve the area is shaded under (default: the first). */
type Shade = { from: number; to: number; color?: string; curve?: number };
type Mark = { x: number; text: string };
type Note = { x: number; y: number; text: string };
type VLine = { x: number; label: string; color?: string; dash?: string };

/** Density curves on a shared axis with shaded areas, tick marks, vertical reference lines and notes. */
function DensityPlot({
  curves,
  xMin,
  xMax,
  shades = [],
  marks = [],
  notes = [],
  vlines = [],
  label,
}: {
  curves: Curve[];
  xMin: number;
  xMax: number;
  shades?: Shade[];
  marks?: Mark[];
  /** y is a fraction of the plot height measured from the axis (0 = axis, 1 = top). */
  notes?: Note[];
  vlines?: VLine[];
  label: string;
}) {
  const W = 560;
  const H = 230;
  const pad = { l: 16, r: 16, t: vlines.length > 0 ? 40 : 14, b: 34 };
  const steps = 240;
  const xs = Array.from({ length: steps + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / steps);
  const peak = Math.max(...curves.flatMap((curve) => xs.map(curve.pdf)), 1e-9) * 1.1;
  const xOf = (x: number) => pad.l + ((Math.min(xMax, Math.max(xMin, x)) - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const yOf = (y: number) => H - pad.b - (Math.min(y, peak) / peak) * (H - pad.t - pad.b);
  const pathOf = (pdf: (x: number) => number) =>
    xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(pdf(x)).toFixed(2)}`).join(" ");
  const areaOf = (shade: Shade) => {
    const base = curves[shade.curve ?? 0] ?? curves[0];
    const lo = Math.max(shade.from, xMin);
    const hi = Math.min(shade.to, xMax);
    if (hi <= lo) return "";
    const inner = xs.filter((x) => x > lo && x < hi);
    const pts = [lo, ...inner, hi];
    return [
      `M ${xOf(lo).toFixed(2)} ${yOf(0).toFixed(2)}`,
      ...pts.map((x) => `L ${xOf(x).toFixed(2)} ${yOf(base.pdf(x)).toFixed(2)}`),
      `L ${xOf(hi).toFixed(2)} ${yOf(0).toFixed(2)} Z`,
    ].join(" ");
  };
  const legend = curves.filter((curve) => curve.label);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {shades.map((shade, i) => (
        <path key={i} d={areaOf(shade)} fill={shade.color ?? RED_FILL} stroke="none" />
      ))}
      {curves.map((curve, i) => (
        <path
          key={i}
          d={pathOf(curve.pdf)}
          fill="none"
          stroke={curve.color}
          strokeWidth={curve.width ?? 2.5}
          strokeDasharray={curve.dash}
        />
      ))}
      <line x1={pad.l} y1={yOf(0)} x2={W - pad.r} y2={yOf(0)} stroke="#16213c" strokeWidth="1.5" />
      {marks.map((mark) => (
        <g key={`${mark.x}-${mark.text}`}>
          <line x1={xOf(mark.x)} y1={yOf(0)} x2={xOf(mark.x)} y2={yOf(0) + 6} stroke="#16213c" strokeWidth="1.5" />
          <text x={xOf(mark.x)} y={H - 10} textAnchor="middle" fontSize="12" fill="#16213c">
            {mark.text}
          </text>
        </g>
      ))}
      {vlines.map((line, i) => (
        <g key={`${line.x}-${line.label}`}>
          <line
            x1={xOf(line.x)}
            x2={xOf(line.x)}
            y1={yOf(0)}
            y2={pad.t - 6 + (i % 2) * 14}
            stroke={line.color ?? "#16213c"}
            strokeWidth="2"
            strokeDasharray={line.dash}
          />
          <text x={xOf(line.x)} y={pad.t - 10 + (i % 2) * 14} textAnchor="middle" fontSize="12" fontWeight="700" fill={line.color ?? "#16213c"}>
            {line.label}
          </text>
        </g>
      ))}
      {notes.map((note) => (
        <text
          key={`${note.x}-${note.text}`}
          x={xOf(note.x)}
          y={H - pad.b - note.y * (H - pad.t - pad.b)}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#16213c"
        >
          {note.text}
        </text>
      ))}
      {legend.map((curve, i) => (
        <g key={curve.label}>
          <line
            x1={W - 150}
            x2={W - 126}
            y1={pad.t + 8 + i * 16}
            y2={pad.t + 8 + i * 16}
            stroke={curve.color}
            strokeWidth={curve.width ?? 2.5}
            strokeDasharray={curve.dash}
          />
          <text x={W - 120} y={pad.t + 12 + i * 16} fontSize="11" fill="#16213c">
            {curve.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const normalCurve = (mu: number, se: number) => (x: number) => stdNormalPdf((x - mu) / se) / se;

function rejectShades(side: Side, crit: number, lim: number, color: string): Shade[] {
  if (side === "two")
    return [
      { from: -lim, to: -crit, color },
      { from: crit, to: lim, color },
    ];
  if (side === "upper") return [{ from: crit, to: lim, color }];
  return [{ from: -lim, to: -crit, color }];
}

function pValueShades(side: Side, stat: number, lim: number, color: string): Shade[] {
  if (side === "two") {
    const a = Math.abs(stat);
    return [
      { from: -lim, to: -a, color },
      { from: a, to: lim, color },
    ];
  }
  if (side === "upper") return [{ from: stat, to: lim, color }];
  return [{ from: -lim, to: stat, color }];
}

/** p-value for a symmetric reference distribution, given its upper-tail function. */
function pValueOf(side: Side, stat: number, upperTail: (x: number) => number): number {
  if (side === "two") return Math.min(1, 2 * upperTail(Math.abs(stat)));
  if (side === "upper") return upperTail(stat);
  return upperTail(-stat);
}

/** Reference density (z or t) with the rejection region shaded and the observed statistic marked. */
function TestPlot({
  dist,
  df = 10,
  side,
  crit,
  stat,
  label,
  showP = false,
}: {
  dist: "z" | "t";
  df?: number;
  side: Side;
  crit: number;
  stat: number;
  label: string;
  showP?: boolean;
}) {
  const pdf = dist === "z" ? stdNormalPdf : (x: number) => tPdf(x, df);
  const lim = 5;
  const sym = dist === "z" ? "z₀" : "t₀";
  const critLines: VLine[] =
    side === "two"
      ? [
          { x: -crit, label: `−${formatNum(crit, 3)}`, dash: "5 4" },
          { x: crit, label: formatNum(crit, 3), dash: "5 4" },
        ]
      : side === "upper"
        ? [{ x: crit, label: formatNum(crit, 3), dash: "5 4" }]
        : [{ x: -crit, label: `−${formatNum(crit, 3)}`, dash: "5 4" }];
  const shades = [...rejectShades(side, crit, lim, RED_FILL), ...(showP ? pValueShades(side, stat, lim, BLUE_FILL) : [])];
  return (
    <DensityPlot
      curves={[{ pdf, color: "#16213c" }]}
      xMin={-5}
      xMax={5}
      shades={shades}
      marks={[{ x: 0, text: "0" }]}
      vlines={[...critLines, { x: stat, label: `${sym} = ${formatNum(stat, 3)}`, color: "#2e7190" }]}
      label={label}
    />
  );
}

/** Horizontal number line with an interval, its point estimate, and (optionally) the null value. */
function CiBar({
  lo,
  hi,
  point,
  domain,
  nullValue,
  digits = 2,
}: {
  lo: number;
  hi: number;
  point: number;
  domain: [number, number];
  nullValue?: number;
  digits?: number;
}) {
  const [min, max] = domain;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const left = Number.isFinite(lo) ? pct(lo) : 0;
  const right = Number.isFinite(hi) ? pct(hi) : 100;
  const show = (v: number) => (Number.isFinite(v) ? formatMoney(v, digits) : v > 0 ? "+∞" : "−∞");
  return (
    <div className={styles.ciBar}>
      <div className={styles.ciBarTrack} aria-hidden="true">
        <i className={styles.ciBarFill} style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }} />
        <i className={styles.ciBarPoint} style={{ left: `${pct(point)}%` }} />
        {nullValue != null ? <i className={styles.ciBarTruth} style={{ left: `${pct(nullValue)}%` }} /> : null}
      </div>
      <div className={styles.ciBarLabels}>
        <span>{formatMoney(min, digits)}</span>
        <span>
          interval [{show(lo)}, {show(hi)}]
          {nullValue != null ? ` · dashed line = null value ${formatMoney(nullValue, digits)}` : ""}
        </span>
        <span>{formatMoney(max, digits)}</span>
      </div>
    </div>
  );
}

/** Sampling distribution of x̄ for the propellant example, with optional H1 curve. */
function PropellantPlot({
  mode,
  side = "two",
  label,
  muAlt = PROP.muAlt,
}: {
  mode: "regions" | "alpha" | "beta";
  side?: Side;
  label: string;
  muAlt?: number;
}) {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const h0: Curve = { pdf: normalCurve(PROP.mu0, se), color: "#16213c", label: mode === "beta" ? "H0: μ = 50" : undefined };
  const curves: Curve[] = [h0];
  if (mode === "beta") curves.push({ pdf: normalCurve(muAlt, se), color: "#df4a3e", label: `H1: μ = ${muAlt}` });

  const tails: Shade[] =
    side === "two"
      ? [
          { from: 40, to: PROP.lo },
          { from: PROP.hi, to: 60 },
        ]
      : side === "upper"
        ? [{ from: PROP.hi, to: 60 }]
        : [{ from: 40, to: PROP.lo }];

  const acceptance: Shade | null =
    mode !== "beta"
      ? null
      : side === "two"
        ? { from: PROP.lo, to: PROP.hi, curve: 1, color: BLUE_FILL }
        : side === "upper"
          ? { from: 40, to: PROP.hi, curve: 1, color: BLUE_FILL }
          : { from: PROP.lo, to: 60, curve: 1, color: BLUE_FILL };

  const shades: Shade[] = acceptance ? [...tails, acceptance] : tails;

  const notes: Note[] =
    mode === "regions"
      ? [
          { x: 46.6, y: 0.18, text: "Reject H0" },
          { x: 50, y: 0.3, text: "Fail to reject H0" },
          { x: 53.4, y: 0.18, text: "Reject H0" },
        ]
      : mode === "alpha"
        ? side === "two"
          ? [
              { x: 47.4, y: 0.12, text: "α/2 = 0.0287" },
              { x: 52.6, y: 0.12, text: "α/2 = 0.0287" },
            ]
          : side === "upper"
            ? [{ x: 53.2, y: 0.12, text: "α = 0.0287" }]
            : [{ x: 46.8, y: 0.12, text: "α = 0.0287" }]
        : [
            {
              x: side === "lower" ? 51.2 : side === "upper" ? 49.6 : 50.2,
              y: 0.07,
              text: "β",
            },
          ];

  const markXs =
    side === "two"
      ? [PROP.lo, 50, PROP.hi, ...(mode === "beta" ? [muAlt] : [])]
      : side === "upper"
        ? [50, PROP.hi, ...(mode === "beta" ? [muAlt] : [])]
        : [PROP.lo, 50, ...(mode === "beta" ? [muAlt] : [])];

  return (
    <DensityPlot
      curves={curves}
      xMin={44}
      xMax={56}
      shades={shades}
      marks={markXs.map((x) => ({ x, text: String(x) }))}
      notes={notes}
      label={label}
    />
  );
}

// ---------------------------------------------------------------------------
// Procedure table (rejection region · p-value · confidence interval)
// ---------------------------------------------------------------------------

type ProcedureSpec = {
  stat: string;
  dist: string;
  critHalf: string;
  critOne: string;
  center: string;
  se: string;
  param: string;
  nullVal: string;
  /** End of the CI for H1: param > null (default `+∞)`). */
  ciUpperEnd?: string;
  /** Start of the CI for H1: param < null (default `(−∞,`). */
  ciLowerStart?: string;
  /** What the CI must not contain for rejection, in TeX (default: the null value). */
  ciNullNote?: string;
};

function ProcedureTable({ spec }: { spec: ProcedureSpec }) {
  const { stat, dist, critHalf, critOne, center, se, param, nullVal } = spec;
  const upEnd = spec.ciUpperEnd ?? tex`+\infty\right)`;
  const lowStart = spec.ciLowerStart ?? tex`\left(-\infty,\ `;
  const rows = [
    {
      h1: tex`H_1:\ ${param}\ne ${nullVal}`,
      crit: tex`|${stat}|>${critHalf}`,
      p: tex`2P(${dist}>|${stat}|)`,
      ci: tex`\left[${center}-${critHalf}\,${se},\ ${center}+${critHalf}\,${se}\right]`,
    },
    {
      h1: tex`H_1:\ ${param}>${nullVal}`,
      crit: tex`${stat}>${critOne}`,
      p: tex`P(${dist}>${stat})`,
      ci: tex`\left[${center}-${critOne}\,${se},\ ${upEnd}`,
    },
    {
      h1: tex`H_1:\ ${param}<${nullVal}`,
      crit: tex`${stat}<-${critOne}`,
      p: tex`P(${dist}<${stat})`,
      ci: tex`${lowStart}${center}+${critOne}\,${se}\right]`,
    },
  ];
  return (
    <>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Alternative</th>
              <th>
                Reject <MathText text="$H_0$" /> if (critical region)
              </th>
              <th>p-value</th>
              <th>Confidence-interval approach</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.h1}>
                <td>
                  <InlineMath tex={row.h1} />
                </td>
                <td>
                  <InlineMath tex={row.crit} />
                </td>
                <td>
                  <InlineMath tex={row.p} />
                </td>
                <td>
                  <InlineMath tex={row.ci} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        p-value approach: <MathText text="$H_0$" /> is rejected when p-value &lt; <MathText text="$\alpha$" />. CI approach: <MathText text="$H_0$" /> is
        rejected when the interval does NOT include <InlineMath tex={spec.ciNullNote ?? nullVal} />.
      </p>
    </>
  );
}

type Verdict = { name: string; calc: string; reject: boolean };

/** Three side-by-side decisions (critical region · p-value · CI) for one worked example. */
function VerdictCards({ rows }: { rows: Verdict[] }) {
  return (
    <div className={styles.three}>
      {rows.map((row) => (
        <article key={row.name} className={styles.card}>
          <p className={styles.kicker}>
            <MathText text={row.name} />
          </p>
          <p>
            <MathText text={row.calc} />
          </p>
          <p>
            <strong>
              <MathText text={row.reject ? tex`Reject $H_0$` : tex`Fail to reject $H_0$`} />
            </strong>
          </p>
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiz block
// ---------------------------------------------------------------------------

type QuizItem = { q: string; options: string[]; answer: number; why: string };

function QuizBlock({ items }: { items: QuizItem[] }) {
  const print = usePrintMode();
  const [picked, setPicked] = useState<Record<number, number>>({});
  const shown = Object.keys(picked).length;
  const score = items.reduce((acc, item, i) => acc + (picked[i] === item.answer ? 1 : 0), 0);
  const letter = (j: number) => String.fromCharCode(65 + j);

  if (print) {
    return (
      <div className={styles.promptList}>
        {items.map((item, i) => (
          <article key={item.q} className={styles.promptItem}>
            <strong>
              {i + 1}. <MathText text={item.q} />
            </strong>
            <p>
              {item.options.map((opt, j) => (
                <span key={opt}>
                  {letter(j)}. <MathText text={opt} />
                  {"   "}
                </span>
              ))}
            </p>
            <p className={styles.small}>
              <strong>Answer {letter(item.answer)}.</strong> <MathText text={item.why} />
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <p className={styles.muted}>Live Poll A–D</p>
      <div className={styles.promptList}>
        {items.map((item, i) => (
          <article key={item.q} className={styles.promptItem}>
            <strong>
              {i + 1}. <MathText text={item.q} />
            </strong>
            <div className={styles.tools}>
              {item.options.map((opt, j) => (
                <button
                  key={opt}
                  type="button"
                  className={picked[i] === j ? styles.toolBtnActive : styles.toolBtn}
                  onClick={() => setPicked((m) => ({ ...m, [i]: j }))}
                >
                  {letter(j)}. <MathText text={opt} />
                </button>
              ))}
            </div>
            {picked[i] != null ? (
              <p className={styles.small}>
                {picked[i] === item.answer ? `Correct (${letter(item.answer)}). ` : `Not that one — answer is ${letter(item.answer)}. `}
                <MathText text={item.why} />
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <p className={styles.small}>
        Score {score} / {items.length}
        {shown < items.length ? ` · ${items.length - shown} still open` : ""}.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1 · Opening
// ---------------------------------------------------------------------------

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id={print ? undefined : "cover"}>
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Hypothesis Testing</h1>
        <p className={styles.lead}>
          Turn data into a decision: null and alternative hypotheses, test statistics and critical regions, Type I and Type II errors, significance level, the
          p-value, and tests for one mean, two means, and proportions.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function RoadmapScene() {
  return (
    <SceneFrame kicker="Roadmap" title="What this lecture covers.">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Set up the test</p>
          <p>
            <MathText text={tex`$H_0$ versus $H_1$, the test statistic and the critical region. “Reject” or “fail to reject”.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Errors</p>
          <p>
            <MathText text={tex`Type I ($\alpha$) and Type II ($\beta$) errors, and how the significance level is chosen.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · The p-value</p>
          <p>How surprising is the data if the null hypothesis is true? Compare it with α.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>4 · Eight-step procedure</p>
          <p>Three equivalent ways to decide: rejection region, p-value, confidence interval.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>5 · Means</p>
          <p>
            <MathText text={tex`One mean ($\sigma$ known / unknown) and two means (known variances, pooled $t$, Welch $t$, paired $t$).`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>6 · Proportions</p>
          <p>One proportion and the equality of two proportions, using the normal approximation.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function AircrewScene() {
  const [xBar, setXBar] = useState(51.2);
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const z = (xBar - PROP.mu0) / se;
  return (
    <SceneFrame kicker="Motivating example · Aircrew escape system" title="Is the mean burn rate really 50 cm/s?">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>The system</p>
          <p>Aircrew escape systems are powered by a solid propellant inside the rocket motor.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>The specification</p>
          <p>
            To eject the seat properly, the mean burn rate must be <MathText text={tex`$50$`} /> cm/s. Burning too slowly <em>or</em> too fast is unsafe.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>The data</p>
          <p>
            <MathText text={tex`$n=10$`} /> motors are tested to decide whether the mean burn rate is 50. The burn rate is a random variable, so{" "}
            <MathText text={tex`$\bar{x}$`} /> will never be exactly 50.
          </p>
        </article>
      </div>
      <article className={`${styles.card} ${styles.bigCard}`}>
        <p className={styles.kicker}>A sample outcome</p>
        <LiveOnly>
          <label className={styles.slider}>
            Suppose the sample mean is <MathText text={tex`$\bar{x}=${formatNum(xBar, 1)}$`} /> cm/s
            <input type="range" min={46} max={54} step={0.1} value={xBar} onChange={(e) => setXBar(Number(e.target.value))} />
          </label>
        </LiveOnly>
        <PrintOnly>
          <p>
            Suppose the sample mean is <MathText text={tex`$\bar{x}=51.2$`} /> cm/s.
          </p>
        </PrintOnly>
        <p>
          That is <strong>{formatNum(Math.abs(z), 2)}</strong> standard errors {z >= 0 ? "above" : "below"} 50 (with <MathText text={tex`$\sigma=2.5$`} />,{" "}
          <MathText text={tex`$\sigma/\sqrt{n}=0.79$`} />). Is that “too far”?
        </p>
      </article>
      <p className={styles.small}>
        A procedure that uses the data to reach a decision about a particular hypothesis is called a <strong>test of a hypothesis</strong>. The rest of the
        lecture shows how to decide how far is too far.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 2 · Hypotheses, test statistic, regions
// ---------------------------------------------------------------------------

function HypothesesScene() {
  return (
    <SceneFrame kicker="Hypotheses" title={tex`Null hypothesis $H_0$ versus alternative hypothesis $H_1$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Null hypothesis</p>
          <p>
            <MathText text={tex`$H_0$`} />: the initial belief, claim, or assumption. We keep it unless the data give strong evidence against it.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Alternative hypothesis</p>
          <p>
            <MathText text={tex`$H_1$`} /> (or <MathText text={tex`$H_a$`} />): the competing belief, claim, or assumption.
          </p>
        </article>
      </div>
      <Formula tex={tex`H_0:\ \mu=50\ \text{cm/s}\qquad\text{versus}\qquad H_1:\ \mu\neq 50\ \text{cm/s}`} />
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>Population</p>
          <Formula tex={tex`N(\mu,\sigma^2)`} />
          <p className={styles.small}>
            Is <MathText text={tex`$\mu=\mu_0$`} />?
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample</p>
          <Formula tex={tex`X_1,X_2,\dots,X_n`} />
          <p className={styles.small}>Random sample from the population.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Conclusion</p>
          <p>
            <MathText text={tex`$H_0$`} /> is rejected, or <MathText text={tex`$H_0$`} /> is not rejected.
          </p>
        </article>
      </div>
      <p className={styles.small}>
        Key questions: How do we set up the test? How do we choose a test statistic? How do we determine the threshold? What can go wrong?
      </p>
    </SceneFrame>
  );
}

function PredeterminedCutoffScene() {
  return (
    <SceneFrame kicker="A predetermined rule" title={tex`Decide what “too far from 50” means before seeing $\bar{x}$.`}>
      <p className={styles.lead}>
        Under <MathText text={tex`$H_0:\mu=50$`} />, say we call <MathText text={tex`$\bar{x}$`} /> <strong>too far</strong> from 50 if{" "}
        <MathText text={tex`$|\bar{x}-50|\ge 1.5$`} />, i.e. <MathText text={tex`$\bar{x}\ge 51.5$`} /> or{" "}
        <MathText text={tex`$\bar{x}\le 48.5$`} />. Fix this threshold <strong>before</strong> observing{" "}
        <MathText text={tex`$\bar{X}$`} /> — do not redefine “too far” afterward to get a nicer conclusion.
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>
            Observe <MathText text={tex`$\bar{x}=52$`} />
          </p>
          <p>
            Too large for <MathText text={tex`$H_0$`} /> by the predetermined rule → <strong>reject</strong>{" "}
            <MathText text={tex`$H_0$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            Observe <MathText text={tex`$\bar{x}=47$`} />
          </p>
          <p>
            Too small for <MathText text={tex`$H_0$`} /> by the predetermined rule → <strong>reject</strong>{" "}
            <MathText text={tex`$H_0$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            Observe <MathText text={tex`$\bar{x}=51$`} />
          </p>
          <p>
            Acceptable under the rule → we <strong>cannot reject</strong> <MathText text={tex`$H_0$`} />.
          </p>
        </article>
      </div>
      <Formula tex={tex`\text{critical region}=\{\bar{x}:\ \bar{x}\le 48.5\text{ or }\bar{x}\ge 51.5\}`} />
      <p className={styles.small}>
        The <strong>critical region</strong> is the set of <MathText text={tex`$\bar{x}$`} /> values that lead to rejecting{" "}
        <MathText text={tex`$H_0$`} />. Once the sampling distribution of <MathText text={tex`$\bar{x}$`} /> is known,{" "}
        <MathText text={tex`$P(\text{reject }H_0)$`} /> is simply the probability that <MathText text={tex`$\bar{x}$`} /> falls in that region.
      </p>
    </SceneFrame>
  );
}

function TestStatisticScene() {
  return (
    <SceneFrame kicker="Testing a hypothesis" title="Take a sample, compute a test statistic, decide.">
      <p className={styles.lead}>
        Testing a hypothesis means taking a random sample, computing a <strong>test statistic</strong> from the data, and using it to make a decision about
        the null hypothesis. Here we take 10 motors and use <MathText text={tex`$\bar{x}$`} /> as the test statistic.
      </p>
      <figure className={styles.figure}>
        <PropellantPlot mode="regions" label="Sampling distribution of x-bar under H0 with acceptance and rejection regions" />
        <figcaption className={styles.small}>
          Distribution of <MathText text={tex`$\bar{x}$`} /> if <MathText text={tex`$H_0:\mu=50$`} /> is true. Acceptance region{" "}
          <MathText text={tex`$48.5\le\bar{x}\le 51.5$`} />; rejection (critical) region <MathText text={tex`$\bar{x}<48.5$`} /> or{" "}
          <MathText text={tex`$\bar{x}>51.5$`} />.
        </figcaption>
      </figure>
      <div className={styles.note}>
        <strong>Convention.</strong> We say we <em>reject</em> <MathText text={tex`$H_0$`} /> or we <em>fail to reject</em> <MathText text={tex`$H_0$`} />.
        Failing to reject is not proof that <MathText text={tex`$H_0$`} /> is true: the data simply did not contradict it strongly enough.
      </div>
    </SceneFrame>
  );
}

function HypothesisTypesScene() {
  return (
    <SceneFrame kicker="Types of hypothesis" title="Simple or composite? One-sided or two-sided?">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Simple hypothesis</p>
          <p>Specifies only one value of the parameter. Testing two possible values:</p>
          <Formula tex={tex`H_0:\ \mu=10\quad\text{vs.}\quad H_1:\ \mu=15`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Composite hypothesis</p>
          <p>
            Specifies a range of values, e.g. <MathText text={tex`$X$`} /> = customers’ waiting time in a bank.
          </p>
          <Formula tex={tex`H_0:\ \mu=10\quad\text{vs.}\quad H_1:\ \mu>10`} />
        </article>
      </div>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>One-sided tests</p>
          <Formula tex={tex`H_0:\ \mu=10,\ H_1:\ \mu>10`} />
          <Formula tex={tex`H_0:\ \mu=10,\ H_1:\ \mu<10`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Two-sided test</p>
          <Formula tex={tex`H_0:\ \mu=10,\ H_1:\ \mu\neq 10`} />
          <p className={styles.small}>Deviations in either direction count as evidence against H0.</p>
        </article>
      </div>
      <p className={styles.small}>
        The same idea applies to a variance: <MathText text={tex`$H_0:\sigma^2=\sigma_0^2$`} /> versus <MathText text={tex`$H_1:\sigma^2\neq\sigma_0^2$`} />.
      </p>
    </SceneFrame>
  );
}

const COIN_OPTIONS = [
  tex`$H_0:\ p=\tfrac12,\ H_1:\ p>\tfrac12$`,
  tex`$H_0:\ p=\tfrac12,\ H_1:\ p<\tfrac12$`,
  tex`$H_0:\ p=\tfrac12,\ H_1:\ p\neq\tfrac12$`,
  tex`$H_0:\ p\neq\tfrac12,\ H_1:\ p=\tfrac12$`,
];

const CLASS_ACTIVITY: QuizItem[] = [
  {
    q: tex`Is the coin fair? Suppose you doubt that $p=P(\text{Head})$ is greater than $\tfrac12$.`,
    options: COIN_OPTIONS,
    answer: 0,
    why: tex`A one-sided alternative in the direction of your doubt: $H_0:p=\tfrac12$ versus $H_1:p>\tfrac12$. Option D puts the equality in $H_1$, which is never done.`,
  },
  {
    q: tex`Is the coin fair? Suppose you initially have no doubts on the fairness of the coin.`,
    options: COIN_OPTIONS,
    answer: 2,
    why: tex`With no preferred direction, use the two-sided alternative: $H_0:p=\tfrac12$ versus $H_1:p\neq\tfrac12$.`,
  },
  {
    q: tex`Is the coin fair? Suppose you doubt that $p=P(\text{Head})$ is less than $\tfrac12$.`,
    options: COIN_OPTIONS,
    answer: 1,
    why: tex`Doubt that $p<\tfrac12$ means the alternative is lower-tailed: $H_0:p=\tfrac12$ versus $H_1:p<\tfrac12$.`,
  },
  {
    q: tex`Is the coin fair? Suppose you doubt that the coin is fair but are not sure about the direction.`,
    options: COIN_OPTIONS,
    answer: 2,
    why: tex`Unfair in an unknown direction ⇒ two-sided: $H_0:p=\tfrac12$ versus $H_1:p\neq\tfrac12$.`,
  },
  {
    q: tex`A machine produces items with variance $\sigma^2$. Is the variability under control (not too large)?`,
    options: [
      tex`$H_0:\ \sigma^2=\sigma_0^2,\ H_1:\ \sigma^2>\sigma_0^2$`,
      tex`$H_0:\ \sigma^2=\sigma_0^2,\ H_1:\ \sigma^2<\sigma_0^2$`,
      tex`$H_0:\ \sigma^2=\sigma_0^2,\ H_1:\ \sigma^2\neq\sigma_0^2$`,
      tex`$H_0:\ \sigma^2\neq\sigma_0^2,\ H_1:\ \sigma^2=\sigma_0^2$`,
    ],
    answer: 0,
    why: tex`“Out of control” means the variance is too large, so $H_1:\sigma^2>\sigma_0^2$. The null keeps the equality: $H_0:\sigma^2=\sigma_0^2$.`,
  },
  {
    q: tex`Do we support the claim that the machine produces items of a size larger than a known $\mu_0$?`,
    options: [
      tex`$H_0:\ \mu=\mu_0,\ H_1:\ \mu>\mu_0$`,
      tex`$H_0:\ \mu=\mu_0,\ H_1:\ \mu<\mu_0$`,
      tex`$H_0:\ \mu=\mu_0,\ H_1:\ \mu\neq\mu_0$`,
      tex`$H_0:\ \mu\neq\mu_0,\ H_1:\ \mu=\mu_0$`,
    ],
    answer: 0,
    why: tex`The claim to support goes in $H_1$: $\mu>\mu_0$. Hence $H_0:\mu=\mu_0$ (or $\mu\le\mu_0$) versus $H_1:\mu>\mu_0$.`,
  },
  {
    q: tex`Aircrew escape system: the mean burn rate must be $50$ cm/s. Burning too slowly or too fast is unsafe. Which hypotheses?`,
    options: [
      tex`$H_0:\ \mu=50,\ H_1:\ \mu>50$`,
      tex`$H_0:\ \mu=50,\ H_1:\ \mu<50$`,
      tex`$H_0:\ \mu=50,\ H_1:\ \mu\neq 50$`,
      tex`$H_0:\ \mu\neq 50,\ H_1:\ \mu=50$`,
    ],
    answer: 2,
    why: tex`Deviations in either direction are unsafe, so the alternative is two-sided: $H_0:\mu=50$ versus $H_1:\mu\neq 50$.`,
  },
];

function ClassActivityScene() {
  return (
    <SceneFrame kicker="Class activity" title="Which set of hypotheses should we use?" tone="gold">
      <QuizBlock items={CLASS_ACTIVITY} />
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 3 · Errors
// ---------------------------------------------------------------------------

type Truth = "h0" | "h1";
type Decision = "reject" | "keep";

function ErrorTableScene() {
  const [truth, setTruth] = useState<Truth>("h0");
  const [decision, setDecision] = useState<Decision>("reject");
  const outcome =
    truth === "h0" && decision === "reject"
      ? tex`Type I error: we reject $H_0$ although it is true. Probability $\alpha$.`
      : truth === "h1" && decision === "keep"
        ? tex`Type II error: we fail to reject $H_0$ although it is false. Probability $\beta$.`
        : truth === "h0"
          ? tex`Correct: $H_0$ is true and we do not reject it. Probability $1-\alpha$.`
          : tex`Correct: $H_0$ is false and we reject it. Probability $1-\beta$ (the power).`;
  const cellClass = (t: Truth, d: Decision) => (truth === t && decision === d ? styles.hlCell : undefined);
  return (
    <SceneFrame kicker="Errors in hypothesis testing" title="Two ways to be right, two ways to be wrong.">
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Reality</th>
              <th>
                Fail to reject <MathText text="$H_0$" />
              </th>
              <th>
                Reject <MathText text="$H_0$" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <MathText text="$H_0$ is true" />
              </td>
              <td className={cellClass("h0", "keep")}>
                Correct · <MathText text="$1-\alpha$" />
              </td>
              <td className={cellClass("h0", "reject")}>
                <strong>Type I error</strong> · <MathText text="$\alpha$" />
              </td>
            </tr>
            <tr>
              <td>
                <MathText text="$H_0$ is false" />
              </td>
              <td className={cellClass("h1", "keep")}>
                <strong>Type II error</strong> · <MathText text="$\beta$" />
              </td>
              <td className={cellClass("h1", "reject")}>
                Correct · <MathText text="$1-\beta$" /> (power)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Formula
        tex={tex`\alpha=P(\text{Type I error})=P(\text{reject }H_0\mid H_0\text{ true}),\qquad \beta=P(\text{Type II error})=P(\text{fail to reject }H_0\mid H_0\text{ false})`}
      />
      <LiveOnly>
        <div className={styles.tools}>
          <button type="button" className={truth === "h0" ? styles.toolBtnActive : styles.toolBtn} onClick={() => setTruth("h0")}>
            <MathText text="$H_0$ is true" />
          </button>
          <button type="button" className={truth === "h1" ? styles.toolBtnActive : styles.toolBtn} onClick={() => setTruth("h1")}>
            <MathText text="$H_0$ is false" />
          </button>
          <button type="button" className={decision === "keep" ? styles.toolBtnActive : styles.toolBtn} onClick={() => setDecision("keep")}>
            Fail to reject
          </button>
          <button type="button" className={decision === "reject" ? styles.toolBtnActive : styles.toolBtn} onClick={() => setDecision("reject")}>
            Reject
          </button>
        </div>
        <p>
          <MathText text={outcome} />
        </p>
      </LiveOnly>
      <p className={styles.small}>
        Courtroom analogy: <MathText text="$H_0$" /> = “innocent”. Convicting an innocent person is a Type I error; acquitting a guilty one is a Type II error.
      </p>
    </SceneFrame>
  );
}

function TypeIScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const exact = 2 * stdNormalUpper((PROP.hi - PROP.mu0) / se);
  return (
    <SceneFrame kicker="Example · Propellant · two-sided · Type I" title={tex`Probability of rejecting a true $H_0$.`}>
      <p className={styles.lead}>
        Two-sided rule: reject <MathText text={tex`$H_0:\mu=50$`} /> if <MathText text={tex`$\bar{x}<48.5$`} /> or{" "}
        <MathText text={tex`$\bar{x}>51.5$`} />. Suppose <MathText text={tex`$\sigma=2.5$`} /> cm/s and <MathText text={tex`$n=10$`} />, so{" "}
        <MathText text={tex`$\sigma/\sqrt{n}=2.5/\sqrt{10}=0.79$`} />.
      </p>
      <Formula tex={tex`\alpha=P(\bar{X}<48.5\mid\mu=50)+P(\bar{X}>51.5\mid\mu=50)`} />
      <Formula
        tex={tex`z_1=\dfrac{48.5-50}{0.79}=-1.90,\quad z_2=\dfrac{51.5-50}{0.79}=1.90\ \Rightarrow\ \alpha=P(Z<-1.90)+P(Z>1.90)=0.0287+0.0287=0.0574`}
      />
      <figure className={styles.figure}>
        <PropellantPlot mode="alpha" side="two" label="Two shaded tails of the null sampling distribution give alpha" />
        <figcaption className={styles.small}>
          About 5.7% of the time a perfectly good propellant (<MathText text={tex`$\mu=50$`} />) would be rejected. (Without rounding{" "}
          <MathText text={tex`$\sigma/\sqrt{n}$`} /> to 0.79, <MathText text={tex`$\alpha=${formatNum(exact, 4)}$`} />.)
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function TypeIIScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const exact = stdNormalCdf((PROP.hi - PROP.muAlt) / se) - stdNormalCdf((PROP.lo - PROP.muAlt) / se);
  return (
    <SceneFrame kicker="Example · Propellant · two-sided · Type II" title={tex`Probability of missing a false $H_0$.`}>
      <p className={styles.lead}>
        Same two-sided rule. Now suppose the truth is <MathText text={tex`$H_1:\mu=52$`} />. A Type II error occurs if{" "}
        <MathText text={tex`$\bar{x}$`} /> still lands in the acceptance region <MathText text={tex`$[48.5,\,51.5]$`} />.
      </p>
      <Formula tex={tex`\beta=P(48.5\le\bar{X}\le 51.5\mid\mu=52)`} />
      <Formula
        tex={tex`z_1=\dfrac{48.5-52}{0.79}=-4.43,\quad z_2=\dfrac{51.5-52}{0.79}=-0.63\ \Rightarrow\ \beta=P(-4.43\le Z\le-0.63)=0.2643-0.0000=0.2643`}
      />
      <figure className={styles.figure}>
        <PropellantPlot mode="beta" side="two" label="Null and alternative sampling distributions with beta shaded" />
        <figcaption className={styles.small}>
          Blue = <MathText text={tex`$\beta$`} /> (under <MathText text={tex`$\mu=52$`} />), red = <MathText text={tex`$\alpha$`} /> (under{" "}
          <MathText text={tex`$\mu=50$`} />). Unrounded: <MathText text={tex`$\beta=${formatNum(exact, 4)}$`} />. If the true mean is 52, we would still
          miss it about a quarter of the time with 10 motors.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function TypeIUpperScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const exact = stdNormalUpper((PROP.hi - PROP.mu0) / se);
  return (
    <SceneFrame kicker="Example · Propellant · upper-tail · Type I" title={tex`One-sided $H_1:\mu>50$ — computing $\alpha$.`}>
      <p className={styles.lead}>
        Upper-tail rule: reject <MathText text={tex`$H_0:\mu=50$`} /> only when <MathText text={tex`$\bar{x}>51.5$`} /> (same{" "}
        <MathText text={tex`$\sigma=2.5$`} />, <MathText text={tex`$n=10$`} />, <MathText text={tex`$\sigma/\sqrt{n}=0.79$`} />).
      </p>
      <Formula tex={tex`\alpha=P(\bar{X}>51.5\mid\mu=50)`} />
      <Formula tex={tex`z=\dfrac{51.5-50}{0.79}=1.90\ \Rightarrow\ \alpha=P(Z>1.90)=0.0287`} />
      <figure className={styles.figure}>
        <PropellantPlot mode="alpha" side="upper" label="Upper tail of the null sampling distribution gives alpha" />
        <figcaption className={styles.small}>
          Only the right rejection region contributes. Unrounded: <MathText text={tex`$\alpha=${formatNum(exact, 4)}$`} /> — half of the two-sided{" "}
          <MathText text={tex`$\alpha$`} /> when the cutoffs are the same distance from 50.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function TypeIIUpperScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const exact = stdNormalCdf((PROP.hi - PROP.muAlt) / se);
  return (
    <SceneFrame kicker="Example · Propellant · upper-tail · Type II" title={tex`One-sided $H_1:\mu>50$ — computing $\beta$.`}>
      <p className={styles.lead}>
        Keep the upper cutoff <MathText text={tex`$51.5$`} />. If the truth is <MathText text={tex`$\mu=52$`} />, a Type II error is failing to reject:{" "}
        <MathText text={tex`$\bar{x}\le 51.5$`} />.
      </p>
      <Formula tex={tex`\beta=P(\bar{X}\le 51.5\mid\mu=52)`} />
      <Formula tex={tex`z=\dfrac{51.5-52}{0.79}=-0.63\ \Rightarrow\ \beta=P(Z\le-0.63)=0.2643`} />
      <figure className={styles.figure}>
        <PropellantPlot mode="beta" side="upper" muAlt={52} label="Upper-tail test: beta is the area left of the cutoff under H1" />
        <figcaption className={styles.small}>
          Blue = <MathText text={tex`$\beta$`} />, red = <MathText text={tex`$\alpha$`} />. Unrounded:{" "}
          <MathText text={tex`$\beta=${formatNum(exact, 4)}$`} />. Same alternative as the two-sided example, but the acceptance region is now everything ≤ 51.5.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function TypeILowerScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const exact = stdNormalCdf((PROP.lo - PROP.mu0) / se);
  return (
    <SceneFrame kicker="Example · Propellant · lower-tail · Type I" title={tex`One-sided $H_1:\mu<50$ — computing $\alpha$.`}>
      <p className={styles.lead}>
        Lower-tail rule: reject <MathText text={tex`$H_0:\mu=50$`} /> only when <MathText text={tex`$\bar{x}<48.5$`} /> (same{" "}
        <MathText text={tex`$\sigma/\sqrt{n}=0.79$`} />).
      </p>
      <Formula tex={tex`\alpha=P(\bar{X}<48.5\mid\mu=50)`} />
      <Formula tex={tex`z=\dfrac{48.5-50}{0.79}=-1.90\ \Rightarrow\ \alpha=P(Z<-1.90)=0.0287`} />
      <figure className={styles.figure}>
        <PropellantPlot mode="alpha" side="lower" label="Lower tail of the null sampling distribution gives alpha" />
        <figcaption className={styles.small}>
          Mirror image of the upper-tail Type I calculation. Unrounded: <MathText text={tex`$\alpha=${formatNum(exact, 4)}$`} />.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function TypeIILowerScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const muAlt = 48;
  const exact = stdNormalUpper((PROP.lo - muAlt) / se);
  return (
    <SceneFrame kicker="Example · Propellant · lower-tail · Type II" title={tex`One-sided $H_1:\mu<50$ — computing $\beta$.`}>
      <p className={styles.lead}>
        Keep the lower cutoff <MathText text={tex`$48.5$`} />. If the truth is <MathText text={tex`$\mu=48$`} /> (too slow), a Type II error is{" "}
        <MathText text={tex`$\bar{x}\ge 48.5$`} /> — missing the low mean.
      </p>
      <Formula tex={tex`\beta=P(\bar{X}\ge 48.5\mid\mu=48)`} />
      <Formula tex={tex`z=\dfrac{48.5-48}{0.79}=0.63\ \Rightarrow\ \beta=P(Z\ge 0.63)=0.2643`} />
      <figure className={styles.figure}>
        <PropellantPlot mode="beta" side="lower" muAlt={muAlt} label="Lower-tail test: beta is the area right of the cutoff under H1" />
        <figcaption className={styles.small}>
          Blue = <MathText text={tex`$\beta$`} />, red = <MathText text={tex`$\alpha$`} />. Unrounded:{" "}
          <MathText text={tex`$\beta=${formatNum(exact, 4)}$`} />. Symmetric to the upper-tail case with alternative 52.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function CutoffGameScene() {
  const [side, setSide] = useState<Side>("upper");
  const [n, setN] = useState(10);
  const [cut, setCut] = useState(51);
  const [muAlt, setMuAlt] = useState(52);
  const se = PROP.sigma / Math.sqrt(n);
  const loCut = side === "two" ? 2 * PROP.mu0 - cut : cut;
  const alpha =
    side === "upper"
      ? stdNormalUpper((cut - PROP.mu0) / se)
      : side === "lower"
        ? stdNormalCdf((cut - PROP.mu0) / se)
        : stdNormalCdf((loCut - PROP.mu0) / se) + stdNormalUpper((cut - PROP.mu0) / se);
  const beta =
    side === "upper"
      ? stdNormalCdf((cut - muAlt) / se)
      : side === "lower"
        ? stdNormalUpper((cut - muAlt) / se)
        : Math.max(0, stdNormalCdf((cut - muAlt) / se) - stdNormalCdf((loCut - muAlt) / se));

  const chooseSide = (next: Side) => {
    setSide(next);
    if (next === "upper") {
      setCut(51);
      setMuAlt(52);
    } else if (next === "lower") {
      setCut(49);
      setMuAlt(48);
    } else {
      setCut(51.5);
      setMuAlt(52);
    }
  };

  const snapTo05 = () => {
    if (side === "upper") setCut(PROP.mu0 + zUpper(0.05) * se);
    else if (side === "lower") setCut(PROP.mu0 - zUpper(0.05) * se);
    else setCut(PROP.mu0 + zUpper(0.025) * se);
  };

  const altChoices = side === "lower" ? [47, 48, 49] : side === "upper" ? [51, 52, 53] : [48, 52];
  const cutMin = side === "lower" ? 46 : side === "two" ? 50.2 : 49;
  const cutMax = side === "lower" ? 51 : 54;
  const ruleTex =
    side === "upper"
      ? tex`\bar{x}>c`
      : side === "lower"
        ? tex`\bar{x}<c`
        : tex`\bar{x}<${formatNum(loCut, 2)}\ \text{ or }\ \bar{x}>c`;
  const alphaTex =
    side === "upper"
      ? tex`\alpha=P(\bar{X}>c\mid\mu=50)=${formatNum(alpha, 4)}`
      : side === "lower"
        ? tex`\alpha=P(\bar{X}<c\mid\mu=50)=${formatNum(alpha, 4)}`
        : tex`\alpha=P(\bar{X}<${formatNum(loCut, 2)}\mid\mu=50)+P(\bar{X}>c\mid\mu=50)=${formatNum(alpha, 4)}`;
  const betaTex =
    side === "upper"
      ? tex`\beta=P(\bar{X}\le c\mid\mu=${muAlt})=${formatNum(beta, 4)}`
      : side === "lower"
        ? tex`\beta=P(\bar{X}\ge c\mid\mu=${muAlt})=${formatNum(beta, 4)}`
        : tex`\beta=P(${formatNum(loCut, 2)}\le\bar{X}\le c\mid\mu=${muAlt})=${formatNum(beta, 4)}`;

  const shades: Shade[] =
    side === "upper"
      ? [
          { from: cut, to: 70, color: RED_FILL, curve: 0 },
          { from: 30, to: cut, color: BLUE_FILL, curve: 1 },
        ]
      : side === "lower"
        ? [
            { from: 30, to: cut, color: RED_FILL, curve: 0 },
            { from: cut, to: 70, color: BLUE_FILL, curve: 1 },
          ]
        : [
            { from: 30, to: loCut, color: RED_FILL, curve: 0 },
            { from: cut, to: 70, color: RED_FILL, curve: 0 },
            { from: loCut, to: cut, color: BLUE_FILL, curve: 1 },
          ];

  const vlines =
    side === "two"
      ? [
          { x: loCut, label: `c₋ = ${formatNum(loCut, 2)}`, color: "#2e7190" },
          { x: cut, label: `c₊ = ${formatNum(cut, 2)}`, color: "#2e7190" },
        ]
      : [{ x: cut, label: `c = ${formatNum(cut, 2)}`, color: "#2e7190" }];

  return (
    <SceneFrame kicker="Game" title="Cutoff explorer: α versus β." tone="gold">
      <p className={styles.lead}>
        <MathText text={tex`$H_0:\mu=50$`} />, <MathText text={tex`$\sigma=2.5$`} />. Reject when{" "}
        <InlineMath tex={ruleTex} />. Choose the alternative below, then slide <MathText text={tex`$c$`} /> and{" "}
        <MathText text={tex`$n$`} />.
      </p>
      <LiveOnly>
        <SidePicker value={side} onChange={chooseSide} />
        <div className={styles.tools}>
          {altChoices.map((value) => (
            <button key={value} type="button" className={value === muAlt ? styles.toolBtnActive : styles.toolBtn} onClick={() => setMuAlt(value)}>
              <MathText text={tex`$H_1:\mu=${value}$`} />
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <label className={styles.slider}>
            {side === "two" ? `Upper cutoff c₊ = ${formatNum(cut, 2)}` : `Cutoff c = ${formatNum(cut, 2)}`}
            <input type="range" min={cutMin} max={cutMax} step={0.05} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={1} max={40} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <button type="button" className={styles.toolBtn} onClick={snapTo05}>
            Set α = 0.05
          </button>
        </div>
      </LiveOnly>
      <Formula tex={alphaTex} />
      <Formula tex={tex`${betaTex},\quad 1-\beta=${formatNum(1 - beta, 4)}`} />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[
            { pdf: normalCurve(PROP.mu0, se), color: "#16213c", label: "H0: μ = 50" },
            { pdf: normalCurve(muAlt, se), color: "#df4a3e", label: `H1: μ = ${muAlt}` },
          ]}
          xMin={44}
          xMax={59}
          shades={shades}
          vlines={vlines}
          marks={[50, muAlt].map((x) => ({ x, text: String(x) }))}
          label="Null and alternative sampling distributions with movable cutoffs"
        />
        <figcaption className={styles.small}>
          Red = α (Type I under <MathText text={tex`$\mu=50$`} />), blue = β (Type II under the chosen alternative). For two-sided,{" "}
          <MathText text={tex`$c_-=2\cdot 50-c_+$`} /> stays symmetric about 50.
        </figcaption>
      </figure>
      <p className={styles.small}>
        Push the cutoff(s) toward the alternative: α falls but β rises. For a fixed rule, larger <MathText text={tex`$n$`} /> shrinks both sampling
        distributions, so <em>both</em> error probabilities fall.
      </p>
      <PrintOnly>
        <p className={styles.small}>
          On the website: toggle Two-sided / Upper-tail / Lower-tail, pick an alternative mean, and move <MathText text={tex`$c$`} /> and{" "}
          <MathText text={tex`$n$`} />.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function SignificanceScene() {
  const se = PROP.sigma / Math.sqrt(PROP.n);
  const rows = SIGNIF_LEVELS.map((alpha) => {
    const half = zUpper(alpha / 2);
    const lo = PROP.mu0 - half * se;
    const hi = PROP.mu0 + half * se;
    const beta = stdNormalCdf((hi - PROP.muAlt) / se) - stdNormalCdf((lo - PROP.muAlt) / se);
    return { alpha, half, lo, hi, beta };
  });
  return (
    <SceneFrame kicker="Significance level" title={tex`Fix $\alpha$ in advance, then live with $\beta$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Idea</p>
          <p>
            The statistician controls the Type I error probability <MathText text={tex`$\alpha$`} /> when choosing the critical values. The value she sets is
            the <strong>significance level</strong>; the corresponding Type II error <MathText text={tex`$\beta$`} /> is whatever results.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Typical values</p>
          <p>
            <MathText text={tex`$\alpha=0.1,\ 0.05,\ 0.01$`} /> (sometimes 0.001). Smaller <MathText text={tex`$\alpha$`} /> means we require stronger
            evidence before rejecting.
          </p>
        </article>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>
                <MathText text={tex`$\alpha$`} />
              </th>
              <th>
                <MathText text={tex`$z_{\alpha/2}$`} />
              </th>
              <th>Acceptance region for x̄ (propellant, n = 10)</th>
              <th>
                β at <MathText text={tex`$\mu=52$`} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.alpha}>
                <td>{row.alpha}</td>
                <td>{formatNum(row.half, 3)}</td>
                <td>
                  [{formatNum(row.lo, 2)}, {formatNum(row.hi, 2)}]
                </td>
                <td>{formatNum(row.beta, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        Shrinking <MathText text={tex`$\alpha$`} /> widens the acceptance region, which lets more false nulls slip through: <MathText text={tex`$\beta$`} /> grows.
        Only a larger sample can reduce both.
      </p>
    </SceneFrame>
  );
}

function TypeISimScene() {
  const [seed, setSeed] = useState(11);
  const [halfWidth, setHalfWidth] = useState(1.5);
  const [trueMu, setTrueMu] = useState(50);
  const [n, setN] = useState(10);
  const trials = 500;
  const shown = 80;
  const se = PROP.sigma / Math.sqrt(n);
  const theory = stdNormalCdf((PROP.mu0 - halfWidth - trueMu) / se) + stdNormalUpper((PROP.mu0 + halfWidth - trueMu) / se);

  const sim = useMemo(() => {
    const rng = mulberry32(seed * 104729 + n);
    let rejects = 0;
    const dots: { x: number; reject: boolean }[] = [];
    for (let i = 0; i < trials; i += 1) {
      const xBar = mean(Array.from({ length: n }, () => sampleNormal(trueMu, PROP.sigma, rng)));
      const reject = Math.abs(xBar - PROP.mu0) > halfWidth;
      if (reject) rejects += 1;
      if (i < shown) dots.push({ x: xBar, reject });
    }
    return { rate: rejects / trials, dots };
  }, [seed, n, trueMu, halfWidth]);

  const W = 560;
  const H = 150;
  const xMin = 44;
  const xMax = 58;
  const xOf = (x: number) => 16 + ((Math.min(xMax, Math.max(xMin, x)) - xMin) / (xMax - xMin)) * (W - 32);
  const binW = 0.2;
  const levels = new Map<number, number>();
  const placed = sim.dots.map((dot) => {
    const bin = Math.floor((dot.x - xMin) / binW);
    const level = levels.get(bin) ?? 0;
    levels.set(bin, level + 1);
    return { ...dot, level };
  });

  return (
    <SceneFrame kicker="Game" title="Simulate α: how often is a true H0 rejected?" tone="gold">
      <p className={styles.lead}>
        Each dot is the mean of <MathText text={tex`$n$`} /> simulated burn rates. Reject <MathText text={tex`$H_0:\mu=50$`} /> when{" "}
        <MathText text={tex`$|\bar{x}-50|>${formatNum(halfWidth, 2)}$`} />. Red dots are rejections.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          {[50, 51, 52].map((value) => (
            <button key={value} type="button" className={value === trueMu ? styles.toolBtnActive : styles.toolBtn} onClick={() => setTrueMu(value)}>
              <MathText text={value === 50 ? tex`True $\mu=50$ ($H_0$ true)` : tex`True $\mu=${value}$ ($H_0$ false)`} />
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <label className={styles.slider}>
            Half-width k = {formatNum(halfWidth, 2)}
            <input type="range" min={0.5} max={3} step={0.05} value={halfWidth} onChange={(e) => setHalfWidth(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={2} max={30} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <button type="button" className={styles.toolBtn} onClick={() => setSeed((s) => s + 1)}>
            New samples
          </button>
        </div>
      </LiveOnly>
      <p>
        {trueMu === 50 ? "Type I error rate α" : "Power 1 − β"}: simulated <strong>{formatNum(100 * sim.rate, 1)}%</strong> of {trials} samples · exact{" "}
        {formatNum(100 * theory, 1)}%.
      </p>
      <figure className={styles.figure}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Simulated sample means with the rejection cutoffs">
          <line x1={xOf(PROP.mu0 - halfWidth)} x2={xOf(PROP.mu0 - halfWidth)} y1={6} y2={H - 26} stroke="#16213c" strokeDasharray="6 4" strokeWidth="2" />
          <line x1={xOf(PROP.mu0 + halfWidth)} x2={xOf(PROP.mu0 + halfWidth)} y1={6} y2={H - 26} stroke="#16213c" strokeDasharray="6 4" strokeWidth="2" />
          <line x1={xOf(PROP.mu0)} x2={xOf(PROP.mu0)} y1={6} y2={H - 26} stroke="#2e7190" strokeWidth="2" />
          <line x1={16} x2={W - 16} y1={H - 26} y2={H - 26} stroke="#16213c" strokeWidth="1.5" />
          {placed.map((dot, i) => (
            <circle key={i} cx={xOf(dot.x)} cy={Math.max(8, H - 33 - dot.level * 7)} r={3.2} fill={dot.reject ? "#df4a3e" : "#2a7a4b"} />
          ))}
          {[44, 47, 50, 53, 56].map((x) => (
            <text key={x} x={xOf(x)} y={H - 8} textAnchor="middle" fontSize="12" fill="#16213c">
              {x}
            </text>
          ))}
        </svg>
        <figcaption className={styles.small}>First {shown} of {trials} simulated sample means. Dashed lines = rejection cutoffs.</figcaption>
      </figure>
      <PrintOnly>
        <p className={styles.small}>On the website: choose the true mean, move the cutoffs and the sample size, and watch the rejection rate.</p>
      </PrintOnly>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 4 · p-value
// ---------------------------------------------------------------------------

function PValueDefScene() {
  const z0 = 2.263;
  return (
    <SceneFrame kicker="p-value" title="How surprising is the data if H0 is true?">
      <p className={styles.lead}>
        A decision at a fixed <MathText text={tex`$\alpha$`} /> says only “reject” or “fail to reject”. The <strong>p-value</strong> reports how strong the
        evidence is, so readers can apply their own <MathText text={tex`$\alpha$`} />.
      </p>
      <div className={styles.note}>
        <strong>Definition.</strong> The p-value is the probability that the test statistic will take a value <em>at least as extreme</em> as the observed
        value when the null hypothesis <MathText text={tex`$H_0$`} /> is true.
      </div>
      <Formula tex={tex`\text{two-sided: }2P(Z>|Z_0|)\qquad\text{upper: }P(Z>Z_0)\qquad\text{lower: }P(Z<Z_0)`} />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: stdNormalPdf, color: "#16213c" }]}
          xMin={-4.5}
          xMax={4.5}
          shades={pValueShades("two", z0, 6, BLUE_FILL)}
          vlines={[
            { x: -z0, label: "−|z₀|", color: "#2e7190" },
            { x: z0, label: "|z₀|", color: "#2e7190" },
          ]}
          marks={[{ x: 0, text: "0" }]}
          notes={[{ x: 0, y: 0.35, text: "Distribution under H0" }]}
          label="Two-sided p-value as the tail area beyond the observed statistic"
        />
        <figcaption className={styles.small}>Blue area = p-value (both tails for a two-sided test).</figcaption>
      </figure>
      <p className={styles.small}>
        Decision rule: <MathText text={tex`$H_0$`} /> is rejected when p-value &lt; <MathText text={tex`$\alpha$`} />. A small p-value means the data would be
        very unusual if <MathText text={tex`$H_0$`} /> were true.
      </p>
    </SceneFrame>
  );
}

function PowerSupplySetupScene() {
  const se = PSU.sigma / Math.sqrt(PSU.n);
  const alpha = 2 * stdNormalUpper((PSU.hi - PSU.mu0) / se);
  return (
    <SceneFrame kicker="Example · Power supply" title="Output voltage of a PC power supply.">
      <p className={styles.lead}>
        Output voltage is normal with <MathText text={tex`$\sigma=0.25$`} /> V. Test <MathText text={tex`$H_0:\mu=5$`} /> V against{" "}
        <MathText text={tex`$H_1:\mu\ne5$`} /> V with <MathText text={tex`$n=8$`} /> units. Fail to reject <MathText text={tex`$H_0$`} /> if{" "}
        <MathText text={tex`$4.85\le\bar{x}\le5.15$`} />.
      </p>
      <Formula
        tex={tex`\alpha=P(\bar{X}\notin[4.85,5.15]\mid\mu=5)=1-P\!\left(\dfrac{4.85-5}{0.25/\sqrt{8}}\le Z\le\dfrac{5.15-5}{0.25/\sqrt{8}}\right)=1-\left[\Phi(1.697)-\Phi(-1.697)\right]=${formatNum(alpha, 4)}`}
      />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: normalCurve(PSU.mu0, se), color: "#16213c" }]}
          xMin={4.6}
          xMax={5.4}
          shades={[
            { from: 4, to: PSU.lo },
            { from: PSU.hi, to: 6 },
          ]}
          marks={[4.85, 5, 5.15].map((x) => ({ x, text: String(x) }))}
          notes={[
            { x: 4.78, y: 0.14, text: "α/2" },
            { x: 5.22, y: 0.14, text: "α/2" },
            { x: 5, y: 0.35, text: "Fail to reject H0" },
          ]}
          label="Null sampling distribution of x-bar for the power supply with rejection tails"
        />
      </figure>
      <p className={styles.small}>
        In R: <code>pnorm(x, 0, 1)</code> gives <MathText text={tex`$\Phi(x)$`} />. This is the critical-region approach; next, the p-value approach.
      </p>
    </SceneFrame>
  );
}

const PSU_CASES = [
  { xBar: 5.2, p: 0.024 },
  { xBar: 4.7, p: 0.0007 },
  { xBar: 5.1, p: 0.2579 },
];

function PowerSupplyPValuesScene() {
  const se = PSU.sigma / Math.sqrt(PSU.n);
  return (
    <SceneFrame kicker="Example · Power supply" title="p-values for three observed sample means.">
      <p className={styles.lead}>
        Two-sided test, so <MathText text={tex`$Z_0=\dfrac{\bar{x}-5}{0.25/\sqrt{8}}$`} /> and p-value = <MathText text={tex`$2P(Z>|Z_0|)$`} />.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Observed x̄</th>
              <th>
                <MathText text={tex`$Z_0$`} />
              </th>
              <th>p-value</th>
              <th>
                At <MathText text={tex`$\alpha=0.05$`} />
              </th>
            </tr>
          </thead>
          <tbody>
            {PSU_CASES.map((row) => {
              const z0 = (row.xBar - PSU.mu0) / se;
              return (
                <tr key={row.xBar}>
                  <td>{row.xBar}</td>
                  <td>{formatNum(z0, 3)}</td>
                  <td>{row.p}</td>
                  <td>
                    {row.p < 0.05 ? "Reject " : "Fail to reject "}
                    <MathText text="$H_0$" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Formula tex={tex`\bar{x}=5.2:\ p=2\left(1-\Phi\!\left(\tfrac{0.2}{0.25/\sqrt8}\right)\right)=0.024,\quad \bar{x}=4.7:\ p=0.0007,\quad \bar{x}=5.1:\ p=0.2579`} />
      <p className={styles.small}>
        In summary, at significance level <MathText text={tex`$\alpha=0.05$`} /> we reject <MathText text={tex`$H_0$`} /> in (a) and (b) and fail to reject in
        (c). The further <MathText text={tex`$\bar{x}$`} /> is from 5, the smaller the p-value.
      </p>
    </SceneFrame>
  );
}

function PValueExplorerScene() {
  const [xBar, setXBar] = useState(5.2);
  const [alpha, setAlpha] = useState<number>(0.05);
  const se = PSU.sigma / Math.sqrt(PSU.n);
  const z0 = (xBar - PSU.mu0) / se;
  const p = 2 * stdNormalUpper(Math.abs(z0));
  const gap = Math.abs(xBar - PSU.mu0);
  const cutHalf = zUpper(alpha / 2) * se;
  return (
    <SceneFrame kicker="Game" title="p-value explorer: the power supply." tone="gold">
      <p className={styles.lead}>
        <MathText text={tex`$H_0:\mu=5$ versus $H_1:\mu\neq5$`} />, <MathText text={tex`$\sigma=0.25$`} />, <MathText text={tex`$n=8$`} />. Drag the observed
        sample mean and watch the p-value.
      </p>
      <LiveOnly>
        <AlphaPicker value={alpha} onChange={setAlpha} />
        <label className={styles.slider}>
          Observed x̄ = {formatNum(xBar, 2)} V
          <input type="range" min={4.6} max={5.4} step={0.01} value={xBar} onChange={(e) => setXBar(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <Formula tex={tex`Z_0=${formatNum(z0, 3)},\qquad p\text{-value}=2P(Z>|Z_0|)=${formatP(p)}`} />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: normalCurve(PSU.mu0, se), color: "#16213c" }]}
          xMin={4.6}
          xMax={5.4}
          shades={[
            { from: 4, to: PSU.mu0 - gap, color: BLUE_FILL },
            { from: PSU.mu0 + gap, to: 6, color: BLUE_FILL },
          ]}
          vlines={[
            { x: PSU.mu0 - cutHalf, label: formatNum(PSU.mu0 - cutHalf, 3), dash: "5 4" },
            { x: PSU.mu0 + cutHalf, label: formatNum(PSU.mu0 + cutHalf, 3), dash: "5 4" },
            { x: xBar, label: `x̄ = ${formatNum(xBar, 2)}`, color: "#df4a3e" },
          ]}
          marks={[{ x: 5, text: "5" }]}
          label="p-value as tail area beyond the observed sample mean"
        />
        <figcaption className={styles.small}>
          Blue = p-value (tails beyond the distance |x̄ − 5|). Dashed lines = cutoffs for α = {alpha}.
        </figcaption>
      </figure>
      <p>
        <strong>
          p = {formatP(p)} {p < alpha ? "<" : "≥"} α = {alpha} ⇒ {p < alpha ? "reject" : "fail to reject"} H0.
        </strong>{" "}
        Equivalently, x̄ is {p < alpha ? "outside" : "inside"} the acceptance region [{formatNum(PSU.mu0 - cutHalf, 3)}, {formatNum(PSU.mu0 + cutHalf, 3)}].
      </p>
    </SceneFrame>
  );
}

const ERROR_QUIZ: QuizItem[] = [
  {
    q: tex`A Type I error means …`,
    options: [
      tex`rejecting $H_0$ when $H_0$ is true`,
      tex`failing to reject $H_0$ when $H_0$ is false`,
      tex`rejecting $H_0$ when $H_0$ is false`,
      tex`failing to reject $H_0$ when $H_0$ is true`,
    ],
    answer: 0,
    why: tex`Type I = false alarm, with probability $\alpha$.`,
  },
  {
    q: tex`The test does not reject $H_0$. The correct statement is …`,
    options: [
      tex`$H_0$ has been proven true`,
      tex`there is not enough evidence to reject $H_0$`,
      tex`$H_1$ has been proven false`,
      tex`$H_0$ and $H_1$ are equally likely`,
    ],
    answer: 1,
    why: tex`“Fail to reject” is not “accept”: absence of evidence against $H_0$ is not proof of $H_0$.`,
  },
  {
    q: tex`Keeping $n$ fixed, making $\alpha$ smaller (a narrower rejection region) typically …`,
    options: [tex`increases $\beta$`, tex`decreases $\beta$`, tex`leaves $\beta$ unchanged`, tex`sets $\beta=\alpha$`],
    answer: 0,
    why: tex`There is a trade-off: fewer false alarms means more missed detections, unless $n$ grows.`,
  },
  {
    q: tex`Which probability does the statistician fix in advance?`,
    options: [tex`$\alpha$ (significance level)`, tex`$\beta$`, tex`the power $1-\beta$`, tex`$P(H_0\text{ is true})$`],
    answer: 0,
    why: tex`We choose $\alpha$ when selecting the critical values and then deal with the resulting $\beta$.`,
  },
  {
    q: tex`What reduces both $\alpha$ and $\beta$ at the same time?`,
    options: [tex`moving the cutoff`, tex`a larger sample size $n$`, tex`choosing a smaller $\alpha$`, tex`choosing a larger $\alpha$`],
    answer: 1,
    why: tex`A larger $n$ shrinks $\sigma/\sqrt{n}$, so both sampling distributions become narrower and overlap less.`,
  },
  {
    q: tex`In the propellant example, a Type II error means …`,
    options: [
      tex`concluding $\mu\ne50$ when the true mean is 50`,
      tex`not rejecting $\mu=50$ when the true mean is, say, 52`,
      tex`measuring $\bar{x}$ incorrectly`,
      tex`choosing $\alpha=0.05$ instead of $0.01$`,
    ],
    answer: 1,
    why: tex`We fail to detect a mean that really is off specification; here $\beta=0.2643$ at $\mu=52$.`,
  },
];

function ErrorQuizScene() {
  return (
    <SceneFrame kicker="Concept check" title="Type I, Type II, and the language of tests." tone="gold">
      <QuizBlock items={ERROR_QUIZ} />
    </SceneFrame>
  );
}

const PVALUE_QUIZ: QuizItem[] = [
  {
    q: tex`The p-value is …`,
    options: [
      tex`$P(H_0\text{ is true}\mid\text{data})$`,
      tex`$P(\text{statistic at least this extreme}\mid H_0\text{ true})$`,
      tex`the probability of a Type II error`,
      tex`the significance level $\alpha$`,
    ],
    answer: 1,
    why: tex`It is computed assuming $H_0$ is true; it is not the probability that $H_0$ is true.`,
  },
  {
    q: tex`p-value $=0.03$ and $\alpha=0.05$. Decision?`,
    options: [tex`reject $H_0$`, tex`fail to reject $H_0$`, tex`cannot tell`, tex`accept $H_0$ as proven`],
    answer: 0,
    why: tex`$0.03<0.05$, so the data are unusual enough under $H_0$ to reject it.`,
  },
  {
    q: tex`Same p-value $0.03$, but now $\alpha=0.01$. Decision?`,
    options: [tex`reject $H_0$`, tex`fail to reject $H_0$`, tex`the p-value changes to 0.01`, tex`the test is invalid`],
    answer: 1,
    why: tex`$0.03\ge0.01$. The p-value depends on the data, not on $\alpha$; only the decision changes.`,
  },
  {
    q: tex`Two-sided z-test with $Z_0=2.00$. The p-value is about …`,
    options: [tex`$0.0228$`, tex`$0.0455$`, tex`$0.9772$`, tex`$0.05$`],
    answer: 1,
    why: tex`$2P(Z>2)=2(0.0228)=0.0455$.`,
  },
  {
    q: tex`A smaller p-value means …`,
    options: [
      tex`stronger evidence against $H_0$`,
      tex`$H_0$ is more likely to be true`,
      tex`a larger sample was used`,
      tex`a larger Type II error`,
    ],
    answer: 0,
    why: tex`A tiny p-value says the data would be very surprising if $H_0$ were true.`,
  },
  {
    q: tex`Upper-tail test $H_1:\mu>\mu_0$ with $Z_0=-1.2$. The p-value $P(Z>Z_0)$ is …`,
    options: [tex`$0.1151$`, tex`$0.8849$`, tex`$0.2302$`, tex`$0.05$`],
    answer: 1,
    why: tex`$P(Z>-1.2)=0.8849$: the sample mean is below $\mu_0$, which gives no evidence for $H_1:\mu>\mu_0$.`,
  },
];

function PValueQuizScene() {
  return (
    <SceneFrame kicker="Concept check" title="What does the p-value mean?" tone="gold">
      <QuizBlock items={PVALUE_QUIZ} />
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 5 · Procedure
// ---------------------------------------------------------------------------

const STEPS: { name: string; text: string }[] = [
  { name: "Parameter of interest", text: "From the problem context, identify the parameter of interest." },
  { name: tex`Null hypothesis $H_0$`, text: "State the null hypothesis: the initial belief, claim, or assumption." },
  { name: tex`Alternative $H_1$`, text: "Specify an appropriate alternative hypothesis." },
  { name: "Test statistic", text: "Determine an appropriate test statistic." },
  { name: tex`Reject $H_0$ if …`, text: "State the rejection criteria for the null hypothesis." },
  { name: "Computation", text: "Compute the sample quantities, substitute into the test statistic, and compute its value." },
  { name: "Conclusion", text: tex`Decide whether $H_0$ should be rejected and report it in the problem context.` },
  { name: "Report p-values", text: "Report the p-value as a measure of the strength of evidence." },
];

function EightStepsScene() {
  return (
    <SceneFrame kicker="Hypothesis testing procedure" title="Eight steps.">
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Step</th>
              <th>What to do</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((step, i) => (
              <tr key={step.name}>
                <td>{i + 1}</td>
                <td>
                  <MathText text={step.name} />
                </td>
                <td>
                  <MathText text={step.text} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>Steps 1–5 are done before looking at the data’s value; steps 6–8 use the sample.</p>
    </SceneFrame>
  );
}

function ThreeApproachesScene() {
  return (
    <SceneFrame kicker="Three ways to test" title="Rejection region, p-value, or confidence interval.">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Rejection region</p>
          <p>
            Direct method: compare the test statistic with the critical value(s). Reject <MathText text={tex`$H_0$`} /> if the statistic falls in the
            critical region.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · p-value</p>
          <p>
            Compute the p-value and compare it with <MathText text={tex`$\alpha$`} />. Reject <MathText text={tex`$H_0$`} /> if p-value &lt;{" "}
            <MathText text={tex`$\alpha$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Confidence interval</p>
          <p>
            Build the matching (one- or two-sided) interval. Reject <MathText text={tex`$H_0$`} /> if it does NOT include the null value.
          </p>
        </article>
      </div>
      <Formula tex={tex`\text{Reject }H_0\ \Longleftrightarrow\ |Z_0|>z_{\alpha/2}\ \Longleftrightarrow\ p\text{-value}<\alpha\ \Longleftrightarrow\ \mu_0\notin\text{CI}_{1-\alpha}`} />
      <p className={styles.small}>
        The two-sided test at level <MathText text={tex`$\alpha$`} /> pairs with the <MathText text={tex`$100(1-\alpha)\%$`} /> two-sided interval; a
        one-sided test pairs with the one-sided bound. All three always give the same decision (for the normal-mean tests).
      </p>
    </SceneFrame>
  );
}

function TailPickerScene() {
  const [side, setSide] = useState<Side>("upper");
  const [alpha, setAlpha] = useState<number>(0.05);
  const [z0, setZ0] = useState(1.3);
  const crit = zUpper(side === "two" ? alpha / 2 : alpha);
  const p = pValueOf(side, z0, stdNormalUpper);
  const rejectRegion = side === "two" ? Math.abs(z0) > crit : side === "upper" ? z0 > crit : z0 < -crit;
  return (
    <SceneFrame kicker="Game" title="The alternative decides which tail counts." tone="gold">
      <p className={styles.lead}>
        Standard normal test statistic <MathText text={tex`$Z_0$`} />. Pick the alternative and <MathText text={tex`$\alpha$`} />, then drag{" "}
        <MathText text={tex`$Z_0$`} />. Red = rejection region (area α); blue = p-value (area beyond <MathText text={tex`$Z_0$`} />).
      </p>
      <LiveOnly>
        <SidePicker value={side} onChange={setSide} />
        <AlphaPicker value={alpha} onChange={setAlpha} />
        <label className={styles.slider}>
          Observed Z₀ = {formatNum(z0, 2)}
          <input type="range" min={-4} max={4} step={0.01} value={z0} onChange={(e) => setZ0(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <Formula tex={tex`\text{critical value}=${side === "two" ? tex`\pm z_{\alpha/2}=\pm` : side === "upper" ? tex`z_{\alpha}=` : tex`-z_{\alpha}=-`}${formatNum(crit, 3)},\qquad p\text{-value}=${formatP(p)}`} />
      <figure className={styles.figure}>
        <TestPlot dist="z" side={side} crit={crit} stat={z0} showP label="Rejection region and p-value on the standard normal curve" />
      </figure>
      <p>
        <strong>
          Region: {rejectRegion ? "reject" : "fail to reject"} · p-value: {p < alpha ? "reject" : "fail to reject"}
        </strong>{" "}
        — the two always agree.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 6 · One mean
// ---------------------------------------------------------------------------

function ZKnownTableScene() {
  return (
    <SceneFrame kicker="Normal mean · variance known" title={tex`Test of $H_0:\mu=\mu_0$ when $\sigma$ is known.`}>
      <Formula tex={tex`Z_0=\dfrac{\bar{X}-\mu_0}{\sigma/\sqrt{n}}\ \sim\ N(0,1)\quad\text{under }H_0`} />
      <ProcedureTable
        spec={{
          stat: tex`Z_0`,
          dist: tex`Z`,
          critHalf: tex`z_{\alpha/2}`,
          critOne: tex`z_{\alpha}`,
          center: tex`\bar{x}`,
          se: tex`\dfrac{\sigma}{\sqrt{n}}`,
          param: tex`\mu`,
          nullVal: tex`\mu_0`,
        }}
      />
      <p className={styles.small}>
        Valid for a normal population, or approximately for any population when <MathText text={tex`$n>30$`} />. In software: <code>qnorm(1 - alpha)</code> gives{" "}
        <MathText text={tex`$z_\alpha$`} />.
      </p>
    </SceneFrame>
  );
}

function BatteryScene() {
  const se = BATTERY.sigma / Math.sqrt(BATTERY.n);
  const z0 = (BATTERY.xBar - BATTERY.mu0) / se;
  const p = stdNormalUpper(z0);
  const lower = BATTERY.xBar - zUpper(0.05) * se;
  return (
    <SceneFrame kicker="Example · Battery life" title="Does the new battery last longer than 40 hours?">
      <p className={styles.lead}>
        <MathText text={tex`$\sigma=1.25$`} />, <MathText text={tex`$n=10$`} />, <MathText text={tex`$\bar{x}=40.5$`} />, <MathText text={tex`$\alpha=0.05$`} />.
        Parameter: <MathText text={tex`$\mu$`} />.
      </p>
      <Formula
        tex={tex`H_0:\mu=40\ \text{vs.}\ H_1:\mu>40,\qquad Z_0=\dfrac{\bar{x}-\mu_0}{\sigma/\sqrt{n}}=\dfrac{40.5-40}{1.25/\sqrt{10}}=${formatNum(z0, 3)}`}
      />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`Reject if $Z_0>z_{0.05}=1.645$. Since $Z_0=${formatNum(z0, 3)}<1.645$.`, reject: false },
          { name: "② p-value", calc: tex`$P(Z>Z_0)=1-\Phi(${formatNum(z0, 3)})=${formatNum(p, 3)}>\alpha=0.05$.`, reject: false },
          { name: "③ Confidence interval", calc: tex`95% one-sided CI $[\bar{x}-z_\alpha\sigma/\sqrt{n},\,\infty)=[${formatNum(lower, 2)},\infty)$ contains $\mu_0=40$.`, reject: false },
        ]}
      />
      <figure className={styles.figure}>
        <TestPlot dist="z" side="upper" crit={zUpper(0.05)} stat={z0} label="Battery example: observed z below the critical value" />
      </figure>
      <CiBar lo={lower} hi={Infinity} point={BATTERY.xBar} domain={[39, 42]} nullValue={BATTERY.mu0} />
      <p className={styles.small}>
        Conclusion: we cannot reject <MathText text={tex`$H_0$`} />. There is not enough evidence to support <MathText text={tex`$H_1$`} />.
      </p>
    </SceneFrame>
  );
}

function ResponseTimeScene() {
  const z0 = (79.25 - 75) / (8 / 5);
  const lower = 79.25 - zUpper(0.05) * (8 / 5);
  return (
    <SceneFrame kicker="Example · Response time" title="Does the mean response time exceed 75 ms?">
      <p className={styles.lead}>
        A distributed system’s response time has known <MathText text={tex`$\sigma=8$`} /> ms. The command is executed <MathText text={tex`$n=25$`} /> times;
        the sample mean is <MathText text={tex`$\bar{x}=79.25$`} /> ms. Test at <MathText text={tex`$\alpha=0.05$`} />.
      </p>
      <Formula tex={tex`H_0:\mu=75\ \text{vs.}\ H_1:\mu>75,\qquad Z_0=\dfrac{79.25-75}{8/\sqrt{25}}=${formatNum(z0, 3)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$Z_0=${formatNum(z0, 3)}>z_{0.05}=1.645$.`, reject: true },
          { name: "② p-value", calc: tex`$P(Z>${formatNum(z0, 3)})=${formatNum(stdNormalUpper(z0), 4)}<0.05$.`, reject: true },
          { name: "③ Lower CI", calc: tex`$[\bar{x}-z_\alpha\sigma/\sqrt{n},\infty)=[${formatNum(lower, 2)},\infty)$ does not contain 75.`, reject: true },
        ]}
      />
      <CiBar lo={lower} hi={Infinity} point={79.25} domain={[72, 82]} nullValue={75} />
      <p className={styles.small}>
        Conclusion: <MathText text={tex`$H_1$`} /> is supported: the mean response time exceeds 75 ms. (p-value as an exercise: about 0.004.)
      </p>
    </SceneFrame>
  );
}

function TTableScene() {
  const rows = [5, 10, 24, 100].map((df) => ({ df, t: tUpper(0.025, df) }));
  return (
    <SceneFrame kicker="Normal mean · variance unknown" title={tex`Test of $H_0:\mu=\mu_0$ when $\sigma$ is unknown.`}>
      <Formula tex={tex`t_0=\dfrac{\bar{X}-\mu_0}{S/\sqrt{n}}\ \sim\ t(n-1)\quad\text{under }H_0`} />
      <ProcedureTable
        spec={{
          stat: tex`t_0`,
          dist: tex`T`,
          critHalf: tex`t_{\alpha/2}(n-1)`,
          critOne: tex`t_{\alpha}(n-1)`,
          center: tex`\bar{x}`,
          se: tex`\dfrac{s}{\sqrt{n}}`,
          param: tex`\mu`,
          nullVal: tex`\mu_0`,
        }}
      />
      <p className={styles.small}>
        Same recipe as the z-test: replace <MathText text={tex`$\sigma\to s$`} /> and <MathText text={tex`$z\to t$`} /> with <MathText text={tex`$n-1$`} />{" "}
        degrees of freedom. Two-sided <MathText text={tex`$t_{0.025}(\text{df})$`} />:{" "}
        {rows.map((row, i) => (
          <span key={row.df}>
            {i > 0 ? " · " : ""}df {row.df}: {formatNum(row.t, 3)}
          </span>
        ))}{" "}
        · z: {formatNum(zUpper(0.025), 3)}.
      </p>
    </SceneFrame>
  );
}

function BodyTemperatureScene() {
  const n = 25;
  const xBar = 98.264;
  const s2 = 0.2324;
  const mu0 = 98.6;
  const se = Math.sqrt(s2 / n);
  const t0 = (xBar - mu0) / se;
  const crit = tUpper(0.025, n - 1);
  const p = 2 * tUpperTail(Math.abs(t0), n - 1);
  const lo = xBar - crit * se;
  const hi = xBar + crit * se;
  return (
    <SceneFrame kicker="Example · Body temperature" title="Is the mean body temperature 98.6 °F?">
      <p className={styles.lead}>
        <MathText text={tex`$n=25$`} /> women: <MathText text={tex`$\bar{x}=98.264$`} />, <MathText text={tex`$s^2=0.2324$`} />. Parameter: mean body
        temperature <MathText text={tex`$\mu$`} />; <MathText text={tex`$\alpha=0.05$`} />.
      </p>
      <Formula
        tex={tex`H_0:\mu=98.6\ \text{vs.}\ H_1:\mu\neq98.6,\qquad t_0=\dfrac{98.264-98.6}{\sqrt{0.2324/25}}=${formatNum(t0, 4)}`}
      />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$t_{0.025}(24)=${formatNum(crit, 4)}$ and $|t_0|=${formatNum(Math.abs(t0), 3)}>${formatNum(crit, 4)}$.`, reject: true },
          { name: "② p-value", calc: tex`$2P(t(24)>${formatNum(Math.abs(t0), 4)})=${formatNum(p, 4)}<0.05$.`, reject: true },
          { name: "③ Confidence interval", calc: tex`$[\bar{x}\pm t_{\alpha/2}s/\sqrt{n}]=[${formatNum(lo, 3)},\,${formatNum(hi, 3)}]$ does not contain 98.6.`, reject: true },
        ]}
      />
      <figure className={styles.figure}>
        <TestPlot dist="t" df={n - 1} side="two" crit={crit} stat={t0} showP label="t(24) density with rejection region and observed t" />
      </figure>
      <CiBar lo={lo} hi={hi} point={xBar} domain={[98, 98.8]} nullValue={mu0} digits={3} />
      <p className={styles.small}>Very strong evidence to reject H0: the mean body temperature differs from 98.6 °F.</p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 7 · Two means
// ---------------------------------------------------------------------------

function TwoMeansKnownScene() {
  return (
    <SceneFrame kicker="Two means · known variances" title={tex`Test of $H_0:\mu_X-\mu_Y=\Delta_0$.`}>
      <Formula
        tex={tex`X_1,\dots,X_n\sim N(\mu_X,\sigma_X^2),\ Y_1,\dots,Y_m\sim N(\mu_Y,\sigma_Y^2)\ \Rightarrow\ \bar{X}-\bar{Y}\sim N\!\left(\mu_X-\mu_Y,\ \dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}\right)`}
      />
      <Formula tex={tex`Z_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{\sqrt{\sigma_X^2/n+\sigma_Y^2/m}}\ \sim\ N(0,1)\quad\text{under }H_0\qquad(\text{e.g. }\Delta_0=0)`} />
      <ProcedureTable
        spec={{
          stat: tex`Z_0`,
          dist: tex`Z`,
          critHalf: tex`z_{\alpha/2}`,
          critOne: tex`z_{\alpha}`,
          center: tex`\bar{x}-\bar{y}`,
          se: tex`\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}`,
          param: tex`\mu_X-\mu_Y`,
          nullVal: tex`\Delta_0`,
        }}
      />
    </SceneFrame>
  );
}

function PaintsScene() {
  const se = 8 * Math.sqrt(1 / 10 + 1 / 10);
  const z0 = (121 - 112) / se;
  const lower = 9 - zUpper(0.05) * se;
  return (
    <SceneFrame kicker="Example · Comparing two paints" title="Does paint X dry slower than paint Y?">
      <p className={styles.lead}>
        <MathText text={tex`$\sigma_X=\sigma_Y=8$`} />, <MathText text={tex`$n=m=10$`} />, <MathText text={tex`$\bar{x}=121$`} />,{" "}
        <MathText text={tex`$\bar{y}=112$`} />, <MathText text={tex`$\alpha=0.05$`} />.
      </p>
      <Formula tex={tex`H_0:\mu_X=\mu_Y\ \text{vs.}\ H_1:\mu_X>\mu_Y,\qquad Z_0=\dfrac{\bar{x}-\bar{y}}{8\sqrt{\tfrac1{10}+\tfrac1{10}}}=${formatNum(z0, 4)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$z_{0.05}=1.645$ and $Z_0=${formatNum(z0, 3)}>1.645$.`, reject: true },
          { name: "② p-value", calc: tex`$P(Z>${formatNum(z0, 4)})=${formatNum(stdNormalUpper(z0), 4)}<0.05$.`, reject: true },
          { name: "③ Lower CI", calc: tex`$[\bar{x}-\bar{y}-z_\alpha\sqrt{\sigma_X^2/n+\sigma_Y^2/m},\infty)=[${formatNum(lower, 3)},\infty)$ does not contain 0.`, reject: true },
        ]}
      />
      <CiBar lo={lower} hi={Infinity} point={9} domain={[-2, 14]} nullValue={0} digits={1} />
      <p className={styles.small}>Strong evidence to reject H0: paint X has the larger mean (p-value very small).</p>
    </SceneFrame>
  );
}

function PooledTScene() {
  return (
    <SceneFrame kicker="Two means · unknown, equal variances" title="Pooled t-test.">
      <Formula tex={tex`X_1,\dots,X_n\sim N(\mu_X,\sigma^2),\quad Y_1,\dots,Y_m\sim N(\mu_Y,\sigma^2)`} />
      <Formula tex={tex`S_p^2=\dfrac{(n-1)S_X^2+(m-1)S_Y^2}{n+m-2},\qquad t_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{S_p\sqrt{\tfrac1n+\tfrac1m}}\ \sim\ t(n+m-2)`} />
      <ProcedureTable
        spec={{
          stat: tex`t_0`,
          dist: tex`T`,
          critHalf: tex`t_{\alpha/2}(n+m-2)`,
          critOne: tex`t_{\alpha}(n+m-2)`,
          center: tex`\bar{x}-\bar{y}`,
          se: tex`S_p\sqrt{\tfrac1n+\tfrac1m}`,
          param: tex`\mu_X-\mu_Y`,
          nullVal: tex`\Delta_0`,
        }}
      />
      <p className={styles.small}>
        Use when both samples come from normal populations with a common (but unknown) variance. Check by comparing <MathText text={tex`$S_X$`} /> and{" "}
        <MathText text={tex`$S_Y$`} />.
      </p>
    </SceneFrame>
  );
}

function CatalystScene() {
  const sx = 2.39;
  const sy = 2.98;
  const xBar = 92.255;
  const yBar = 92.733;
  const sp2 = (sx * sx + sy * sy) / 2;
  const se = Math.sqrt(sp2 / 4);
  const t0 = (xBar - yBar) / se;
  const df = 14;
  const crit = tUpper(0.025, df);
  const p = 2 * tUpperTail(Math.abs(t0), df);
  const lo = xBar - yBar - crit * se;
  const hi = xBar - yBar + crit * se;
  return (
    <SceneFrame kicker="Example · Comparing catalysts" title="Do the two catalysts give the same mean yield?">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Catalyst 1 (n = 8)</p>
          <div className={styles.dataGrid}>
            {CATALYST_1.map((value, i) => (
              <span key={i}>{formatNum(value, 2)}</span>
            ))}
          </div>
          <p className={styles.small}>
            x̄ = {formatNum(mean(CATALYST_1), 3)}, s = 2.39
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Catalyst 2 (m = 8)</p>
          <div className={styles.dataGrid}>
            {CATALYST_2.map((value, i) => (
              <span key={i}>{formatNum(value, 2)}</span>
            ))}
          </div>
          <p className={styles.small}>
            ȳ = {formatNum(mean(CATALYST_2), 3)}, s = 2.98
          </p>
        </article>
      </div>
      <Formula tex={tex`H_0:\mu_X=\mu_Y\ \text{vs.}\ H_1:\mu_X\ne\mu_Y,\quad S_p^2=${formatNum(sp2, 4)},\quad t_0=\dfrac{92.255-92.733}{\sqrt{${formatNum(sp2, 4)}/4}}=${formatNum(t0, 4)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$t_{0.025}(14)=${formatNum(crit, 3)}>|t_0|=${formatNum(Math.abs(t0), 3)}$.`, reject: false },
          { name: "② p-value", calc: tex`$2P(t(14)>${formatNum(Math.abs(t0), 4)})=${formatNum(p, 4)}>0.05$.`, reject: false },
          { name: "③ Confidence interval", calc: tex`$\bar{x}-\bar{y}\pm t_{\alpha/2}S_p\sqrt{\tfrac1n+\tfrac1m}=[${formatNum(lo, 3)},\,${formatNum(hi, 3)}]\ni0$.`, reject: false },
        ]}
      />
      <p className={styles.small}>
        Fail to reject <MathText text={tex`$H_0$`} />: no evidence that the mean yields differ, so the cheaper catalyst 2 can be adopted (equal variances assumed,
        <MathText text={tex`$\alpha=0.05$`} />).
      </p>
    </SceneFrame>
  );
}

/** Welch–Satterthwaite degrees of freedom r. */
function welchDf(s1: number, s2: number, n: number, m: number): number {
  const a = (s1 * s1) / n;
  const b = (s2 * s2) / m;
  return (a + b) ** 2 / ((a * a) / (n - 1) + (b * b) / (m - 1));
}

function WelchScene() {
  const [s1, setS1] = useState(2.39);
  const [s2, setS2] = useState(2.98);
  const [n, setN] = useState(8);
  const diff = -0.478;
  const se = Math.sqrt((s1 * s1) / n + (s2 * s2) / n);
  const r = welchDf(s1, s2, n, n);
  const sp = Math.sqrt((s1 * s1 + s2 * s2) / 2);
  const sePooled = sp * Math.sqrt(2 / n);
  return (
    <SceneFrame kicker="Two means · unknown, unequal variances" title="Welch’s t-test.">
      <Formula tex={tex`X_i\sim N(\mu_X,\sigma_X^2),\ Y_j\sim N(\mu_Y,\sigma_Y^2)\qquad t_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{\sqrt{S_X^2/n+S_Y^2/m}}\ \approx\ t(r)`} />
      <Formula tex={tex`r=\dfrac{\left(S_X^2/n+S_Y^2/m\right)^2}{\dfrac{(S_X^2/n)^2}{n-1}+\dfrac{(S_Y^2/m)^2}{m-1}}\quad(\text{round down; Satterthwaite})`} />
      <ProcedureTable
        spec={{
          stat: tex`t_0`,
          dist: tex`T`,
          critHalf: tex`t_{\alpha/2}(r)`,
          critOne: tex`t_{\alpha}(r)`,
          center: tex`\bar{x}-\bar{y}`,
          se: tex`\sqrt{\dfrac{S_X^2}{n}+\dfrac{S_Y^2}{m}}`,
          param: tex`\mu_X-\mu_Y`,
          nullVal: tex`\Delta_0`,
        }}
      />
      <LiveOnly>
        <div className={styles.tools}>
          <label className={styles.slider}>
            s_X = {formatNum(s1, 2)}
            <input type="range" min={0.5} max={8} step={0.05} value={s1} onChange={(e) => setS1(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            s_Y = {formatNum(s2, 2)}
            <input type="range" min={0.5} max={8} step={0.05} value={s2} onChange={(e) => setS2(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            n = m = {n}
            <input type="range" min={3} max={40} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
        </div>
      </LiveOnly>
      <p>
        Welch df <MathText text={tex`$r=${formatNum(r, 2)}$`} /> versus pooled df <MathText text={tex`$n+m-2=${2 * n - 2}$`} />. With x̄ − ȳ = −0.478: Welch{" "}
        <MathText text={tex`$t_0=${formatNum(diff / se, 3)}$`} />, pooled <MathText text={tex`$t_0=${formatNum(diff / sePooled, 3)}$`} />.
      </p>
      <p className={styles.small}>
        Defaults are the catalyst data. When <MathText text={tex`$n=m$`} /> the two statistics coincide; they differ once the sample sizes or the variances
        differ. Welch does not assume equal variances, so it is the safer default.
      </p>
    </SceneFrame>
  );
}

function PairedScene() {
  const n = 24;
  const wBar = 0.0788;
  const sW = 0.2549;
  const se = sW / Math.sqrt(n);
  const t0 = wBar / se;
  const crit = tUpper(0.05, n - 1);
  const p = tUpperTail(t0, n - 1);
  const lower = wBar - crit * se;
  return (
    <SceneFrame kicker="Two means · paired data" title="Paired t-test.">
      <p className={styles.lead}>
        <MathText text={tex`$n$`} /> independent pairs <MathText text={tex`$(X_i,Y_i)$`} />, but within a pair <MathText text={tex`$X_i,Y_i$`} /> are dependent
        (same unit, before/after). Work with the differences <MathText text={tex`$D_i=X_i-Y_i$`} />: a one-sample t-test.
      </p>
      <Formula tex={tex`t_0=\dfrac{\bar{D}-\Delta_0}{S_D/\sqrt{n}}\ \sim\ t(n-1)\ \text{under }H_0:\mu_X-\mu_Y=\Delta_0\ (\mu_D=\Delta_0)`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Example · 40-yard dash (n = 24 girls)</p>
          <p>
            <MathText text={tex`$W$`} /> = before − after time. Test <MathText text={tex`$H_0:\mu_W=0$`} /> against <MathText text={tex`$H_1:\mu_W>0$`} /> at{" "}
            <MathText text={tex`$\alpha=0.05$`} />.
          </p>
          <p className={styles.small}>
            Data: <MathText text={tex`$\bar{w}=${formatNum(mean(PAIRED_W), 4)}$`} />, <MathText text={tex`$s_W=${formatNum(sampleSd(PAIRED_W), 4)}$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Test statistic</p>
          <Formula tex={tex`t_0=\dfrac{0.0788}{0.2549/\sqrt{24}}=${formatNum(t0, 3)}`} />
        </article>
      </div>
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$t_{0.05}(23)=${formatNum(crit, 3)}$ and $t_0=${formatNum(t0, 3)}<${formatNum(crit, 3)}$.`, reject: false },
          { name: "② p-value", calc: tex`$P(t(23)>t_0)=${formatNum(p, 4)}>0.05$.`, reject: false },
          { name: "③ Lower CI", calc: tex`$[\bar{w}-t_\alpha s_W/\sqrt{n},\infty)=[${formatNum(lower, 4)},\infty)\ni0$.`, reject: false },
        ]}
      />
      <p className={styles.small}>
        Fail to reject <MathText text={tex`$H_0$`} />: no convincing evidence that the program speeds up the 40-yard dash. The rejection/p-value/CI table is the
        same as for one mean with <MathText text={tex`$\bar{d}$`} />, <MathText text={tex`$S_D$`} /> and <MathText text={tex`$n-1$`} /> df.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 8 · Proportions
// ---------------------------------------------------------------------------

function ProportionFormulaScene() {
  return (
    <SceneFrame kicker="One proportion" title={tex`Test of $H_0:p=p_0$.`}>
      <Formula tex={tex`X_1,\dots,X_n\sim\text{Bernoulli}(p),\qquad \hat{p}=\dfrac{1}{n}\sum_{i=1}^nX_i\ \approx\ N\!\left(p,\dfrac{p(1-p)}{n}\right)\ (\text{CLT})`} />
      <Formula tex={tex`Z_0=\dfrac{\hat{p}-p_0}{\sqrt{p_0(1-p_0)/n}}\ \sim\ N(0,1)\quad\text{asymptotically under }H_0`} />
      <ProcedureTable
        spec={{
          stat: tex`Z_0`,
          dist: tex`Z`,
          critHalf: tex`z_{\alpha/2}`,
          critOne: tex`z_{\alpha}`,
          center: tex`\hat{p}`,
          se: tex`\sqrt{\dfrac{\hat{p}(1-\hat{p})}{n}}`,
          param: tex`p`,
          nullVal: tex`p_0`,
          ciUpperEnd: tex`1\right]`,
          ciLowerStart: tex`\left[0,\ `,
        }}
      />
      <p className={styles.small}>
        The test statistic uses <MathText text={tex`$p_0$`} /> in the standard error (the null is assumed true); the CI uses <MathText text={tex`$\hat{p}$`} />.
        Check <MathText text={tex`$np_0$`} /> and <MathText text={tex`$n(1-p_0)$`} /> are large enough (at least 5).
      </p>
    </SceneFrame>
  );
}

function FortuneScene() {
  const n = 484;
  const pHat = 0.242;
  const p0 = 0.5;
  const z0 = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const half = zUpper(0.025) * Math.sqrt((pHat * (1 - pHat)) / n);
  return (
    <SceneFrame kicker="Example · Higher education" title="Do half of all engineers continue to graduate study?">
      <p className={styles.lead}>
        <em>Fortune</em> claimed nearly one-half of engineers continue academic studies beyond the B.S. <em>Engineering Horizons</em> data: 117 of 484 new
        graduates planned graduate study. Test <MathText text={tex`$H_0:p=0.5$`} /> versus <MathText text={tex`$H_1:p\ne0.5$`} /> at{" "}
        <MathText text={tex`$\alpha=0.05$`} />.
      </p>
      <Formula tex={tex`\hat{p}=\dfrac{117}{484}\approx0.242,\qquad Z_0=\dfrac{0.242-0.5}{\sqrt{0.25/484}}=${formatNum(z0, 3)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$z_{0.025}=1.96$ and $|Z_0|=${formatNum(Math.abs(z0), 2)}>1.96$.`, reject: true },
          { name: "② p-value", calc: tex`$2P(Z>11.352)\approx7\times10^{-30}\ll\alpha$.`, reject: true },
          { name: "③ Confidence interval", calc: tex`$\hat{p}\pm1.96\sqrt{\hat{p}(1-\hat{p})/n}=[${formatNum(pHat - half, 4)},\,${formatNum(pHat + half, 4)}]$ excludes 0.5.`, reject: true },
        ]}
      />
      <p className={styles.small}>
        The data are not consistent with the Fortune claim: only about a quarter of new graduates (not a half) plan graduate study.
      </p>
    </SceneFrame>
  );
}

function FairDieScene() {
  const n = 8000;
  const y = 1389;
  const p0 = 1 / 6;
  const pHat = y / n;
  const z0 = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const p = stdNormalUpper(z0);
  const seHat = Math.sqrt((pHat * (1 - pHat)) / n);
  const lower = pHat - zUpper(0.05) * seHat;
  return (
    <SceneFrame kicker="Example · Fair die" title="Do these dice favour the six?">
      <p className={styles.lead}>
        Let <MathText text={tex`$p$`} /> = probability of rolling a 6. Test <MathText text={tex`$H_0:p=1/6$`} /> against <MathText text={tex`$H_1:p>1/6$`} />{" "}
        with <MathText text={tex`$n=8000$`} /> rolls, <MathText text={tex`$\alpha=0.05$`} />. The experiment gave <MathText text={tex`$y=1389$`} /> sixes.
      </p>
      <Formula tex={tex`Z_0=\dfrac{Y/n-1/6}{\sqrt{(1/6)(5/6)/n}}=\dfrac{1389/8000-1/6}{\sqrt{(1/6)(5/6)/8000}}=${formatNum(z0, 2)}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Critical-region approach</p>
          <p>
            Reject if <MathText text={tex`$z\ge z_{0.05}=1.645$`} />. Here <MathText text={tex`$z=${formatNum(z0, 2)}>1.645$`} />: <strong>reject</strong>{" "}
            <MathText text={tex`$H_0$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>p-value approach</p>
          <p>
            <MathText text={tex`$P(Z>${formatNum(z0, 2)})=${formatNum(p, 3)}<0.05$`} />: <strong>reject</strong> <MathText text={tex`$H_0$`} />.
          </p>
        </article>
      </div>
      <TestPlot dist="z" side="upper" crit={zUpper(0.05)} stat={z0} showP label="Fair die test: observed z just beyond the critical value" />
      <p className={styles.small}>
        The dice appear to favour a 6 more than a fair die would. Caution: this is a borderline result. The CI route with{" "}
        <MathText text={tex`$\hat{p}$`} /> in the standard error gives lower bound <MathText text={tex`$${formatNum(lower, 5)}$`} /> versus{" "}
        <MathText text={tex`$p_0=${formatNum(p0, 5)}$`} />, essentially on the edge, because the test uses <MathText text={tex`$p_0$`} /> and the CI uses{" "}
        <MathText text={tex`$\hat{p}$`} />. Borderline cases need care.
      </p>
    </SceneFrame>
  );
}

type PropPreset = { name: string; n: number; x: number; p0: number; side: Side };

const PROP_PRESETS: PropPreset[] = [
  { name: "Fortune (117/484)", n: 484, x: 117, p0: 0.5, side: "two" },
  { name: "Fair die (1389/8000)", n: 8000, x: 1389, p0: 1 / 6, side: "upper" },
  { name: "Coin (60/100)", n: 100, x: 60, p0: 0.5, side: "two" },
];

function PropCalcScene() {
  const [n, setN] = useState(484);
  const [x, setX] = useState(117);
  const [p0, setP0] = useState(0.5);
  const [alpha, setAlpha] = useState<number>(0.05);
  const [side, setSide] = useState<Side>("two");
  const successes = Math.min(x, n);
  const pHat = successes / n;
  const z0 = (pHat - p0) / Math.sqrt((p0 * (1 - p0)) / n);
  const crit = zUpper(side === "two" ? alpha / 2 : alpha);
  const p = pValueOf(side, z0, stdNormalUpper);
  const seHat = Math.sqrt((pHat * (1 - pHat)) / n);
  const ciLo = side === "lower" ? 0 : pHat - crit * seHat;
  const ciHi = side === "upper" ? 1 : pHat + crit * seHat;
  const rejectCrit = side === "two" ? Math.abs(z0) > crit : side === "upper" ? z0 > crit : z0 < -crit;
  const rejectP = p < alpha;
  const rejectCi = p0 < ciLo || p0 > ciHi;
  const verdict = (reject: boolean) => (reject ? "reject H0" : "fail to reject H0");
  const largeEnough = n * p0 >= 5 && n * (1 - p0) >= 5;
  const applyPreset = (preset: PropPreset) => {
    setN(preset.n);
    setX(preset.x);
    setP0(preset.p0);
    setSide(preset.side);
  };
  return (
    <SceneFrame kicker="Game" title="Proportion z-test calculator." tone="gold">
      <LiveOnly>
        <div className={styles.tools}>
          {PROP_PRESETS.map((preset) => (
            <button key={preset.name} type="button" className={styles.toolBtn} onClick={() => applyPreset(preset)}>
              {preset.name}
            </button>
          ))}
        </div>
        <SidePicker value={side} onChange={setSide} />
        <AlphaPicker value={alpha} onChange={setAlpha} />
        <div className={styles.tools}>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={20} max={10000} step={2} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Successes x = {successes}
            <input type="range" min={0} max={n} value={successes} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Null value p₀ = {formatNum(p0, 3)}
            <input type="range" min={0.02} max={0.98} step={0.001} value={p0} onChange={(e) => setP0(Number(e.target.value))} />
          </label>
        </div>
      </LiveOnly>
      <Formula
        tex={tex`\hat{p}=\dfrac{${successes}}{${n}}=${formatNum(pHat, 4)},\qquad Z_0=\dfrac{\hat{p}-p_0}{\sqrt{p_0(1-p_0)/n}}=${formatNum(z0, 3)},\qquad p\text{-value}=${formatP(p)}`}
      />
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>① Critical region</p>
          <p>
            critical value {side === "two" ? "±" : side === "lower" ? "−" : ""}
            {formatNum(crit, 3)}
          </p>
          <p>
            <strong>{verdict(rejectCrit)}</strong>
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>② p-value</p>
          <p>
            {formatP(p)} {rejectP ? "<" : "≥"} α = {alpha}
          </p>
          <p>
            <strong>{verdict(rejectP)}</strong>
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>③ Confidence interval</p>
          <p>
            [{formatNum(ciLo, 4)}, {formatNum(ciHi, 4)}] {rejectCi ? "excludes" : "contains"} p₀
          </p>
          <p>
            <strong>{verdict(rejectCi)}</strong>
          </p>
        </article>
      </div>
      <TestPlot dist="z" side={side} crit={crit} stat={z0} showP label="Proportion z-test: rejection region and observed statistic" />
      {rejectCrit !== rejectCi ? (
        <p className={styles.small}>
          The methods disagree here only because the test statistic uses p₀ in the standard error while the CI uses p̂: a borderline case. The test statistic /
          p-value decision is the standard one.
        </p>
      ) : null}
      {!largeEnough ? <p className={styles.small}>Warning: np₀ or n(1 − p₀) is below 5, so the normal approximation is doubtful.</p> : null}
    </SceneFrame>
  );
}

function TwoProportionsScene() {
  return (
    <SceneFrame kicker="Two proportions" title={tex`Test of $H_0:p_1=p_2$.`}>
      <Formula tex={tex`\hat{p}_1-\hat{p}_2\ \approx\ N\!\left(p_1-p_2,\ \dfrac{p_1(1-p_1)}{n_1}+\dfrac{p_2(1-p_2)}{n_2}\right)\qquad(\text{large samples, CLT})`} />
      <Formula tex={tex`Z_0=\dfrac{\hat{p}_1-\hat{p}_2}{\sqrt{\hat{p}(1-\hat{p})\left(\tfrac1{n_1}+\tfrac1{n_2}\right)}}\sim N(0,1),\qquad \hat{p}=\dfrac{\sum X_i+\sum Y_i}{n_1+n_2}`} />
      <p className={styles.small}>
        Under <MathText text={tex`$H_0:p_1=p_2=p$`} /> the pooled <MathText text={tex`$\hat{p}$`} /> is the estimate of the common <MathText text={tex`$p$`} />.
      </p>
      <ProcedureTable
        spec={{
          stat: tex`Z_0`,
          dist: tex`Z`,
          critHalf: tex`z_{\alpha/2}`,
          critOne: tex`z_{\alpha}`,
          center: tex`\hat{p}_1-\hat{p}_2`,
          se: tex`\sqrt{\tfrac{\hat{p}_1(1-\hat{p}_1)}{n_1}+\tfrac{\hat{p}_2(1-\hat{p}_2)}{n_2}}`,
          param: tex`p_1`,
          nullVal: tex`p_2`,
          ciUpperEnd: tex`1\right]`,
          ciLowerStart: tex`\left[-1,\ `,
          ciNullNote: tex`0`,
        }}
      />
    </SceneFrame>
  );
}

function SparrowScene() {
  const n1 = 894;
  const n2 = 700;
  const p1 = 124 / n1;
  const p2 = 70 / n2;
  const pPool = (124 + 70) / (n1 + n2);
  const z0 = (p1 - p2) / Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const p = 2 * stdNormalUpper(Math.abs(z0));
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const lo = p1 - p2 - 1.96 * se;
  const hi = p1 - p2 + 1.96 * se;
  return (
    <SceneFrame kicker="Example · White-crowned sparrows" title="Do males and females return to the hatching site equally often?">
      <p className={styles.lead}>
        <MathText text={tex`$p_m,p_f$`} /> = proportions of male and female sparrows that return. 124 of 894 males and 70 of 700 females returned. Give a 95%
        interval for <MathText text={tex`$p_m-p_f$`} /> and test <MathText text={tex`$H_0:p_1=p_2$`} /> against <MathText text={tex`$H_1:p_1\ne p_2$`} /> at{" "}
        <MathText text={tex`$\alpha=0.05$`} />.
      </p>
      <Formula tex={tex`\hat{p}_1=\dfrac{124}{894}=${formatNum(p1, 3)},\ \ \hat{p}_2=\dfrac{70}{700}=${formatNum(p2, 3)},\ \ \hat{p}=\dfrac{194}{1594}=${formatNum(pPool, 3)},\ \ Z_0=${formatNum(z0, 2)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$z_{0.025}=1.96<Z_0=${formatNum(z0, 2)}$.`, reject: true },
          { name: "② p-value", calc: tex`$2P(Z>Z_0)=${formatNum(p, 3)}<0.05$.`, reject: true },
          { name: "③ Confidence interval", calc: tex`$\hat{p}_1-\hat{p}_2\pm1.96\,SE=[${formatNum(lo, 3)},\,${formatNum(hi, 3)}]$ excludes 0.`, reject: true },
        ]}
      />
      <CiBar lo={lo} hi={hi} point={p1 - p2} domain={[-0.02, 0.09]} nullValue={0} digits={3} />
      <p className={styles.small}>
        The interval and the test agree: males return more often. (The slide rounds <MathText text={tex`$\hat{p}$`} /> to 0.12, giving{" "}
        <MathText text={tex`$Z_0\approx2.36$`} /> and p ≈ 0.018.)
      </p>
    </SceneFrame>
  );
}

function BirthWeightScene() {
  const n1 = 200;
  const n2 = 100;
  const p1 = 22 / n1;
  const p2 = 16 / n2;
  const pPool = 38 / 300;
  const z0 = (p1 - p2) / Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const p = 2 * stdNormalUpper(Math.abs(z0));
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const lo = p1 - p2 - 1.96 * se;
  const hi = p1 - p2 + 1.96 * se;
  return (
    <SceneFrame kicker="Example · Low birth weight" title="Is the low-birth-weight rate the same in two countries?">
      <p className={styles.lead}>
        Country 1: 22 low-birth-weight babies among <MathText text={tex`$n=200$`} />. Country 2: 16 among <MathText text={tex`$m=100$`} />. Test{" "}
        <MathText text={tex`$H_0:p_1=p_2$`} /> versus <MathText text={tex`$H_1:p_1\ne p_2$`} /> at 5%.
      </p>
      <Formula tex={tex`Z_0=\dfrac{\tfrac{22}{200}-\tfrac{16}{100}}{\sqrt{\tfrac{38}{300}\left(1-\tfrac{38}{300}\right)\left(\tfrac1{200}+\tfrac1{100}\right)}}=${formatNum(z0, 2)}`} />
      <VerdictCards
        rows={[
          { name: "① Critical region", calc: tex`$|Z_0|=${formatNum(Math.abs(z0), 2)}<z_{0.025}=1.96$.`, reject: false },
          { name: "② p-value", calc: tex`$2P(Z>${formatNum(Math.abs(z0), 2)})=${formatNum(p, 3)}>0.05$.`, reject: false },
          { name: "③ Confidence interval", calc: tex`$[${formatNum(lo, 3)},\,${formatNum(hi, 3)}]$ contains 0.`, reject: false },
        ]}
      />
      <p className={styles.small}>Fail to reject H0: the observed difference of 5 percentage points is within what chance alone could produce.</p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// 9 · Summary, games, close
// ---------------------------------------------------------------------------

const TEST_MENU: { setting: string; stat: string; dist: string; extra: string }[] = [
  { setting: tex`One mean, $\sigma$ known`, stat: tex`Z_0=\dfrac{\bar{X}-\mu_0}{\sigma/\sqrt{n}}`, dist: tex`N(0,1)`, extra: tex`z_{\alpha/2}\text{ or }z_\alpha` },
  { setting: tex`One mean, $\sigma$ unknown`, stat: tex`t_0=\dfrac{\bar{X}-\mu_0}{S/\sqrt{n}}`, dist: tex`t(n-1)`, extra: tex`t_{\alpha/2}(n-1)` },
  { setting: tex`Two means, known variances`, stat: tex`Z_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{\sqrt{\sigma_X^2/n+\sigma_Y^2/m}}`, dist: tex`N(0,1)`, extra: tex`z_{\alpha/2}` },
  { setting: tex`Two means, equal variances (pooled)`, stat: tex`t_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{S_p\sqrt{1/n+1/m}}`, dist: tex`t(n+m-2)`, extra: tex`t_{\alpha/2}(n+m-2)` },
  { setting: tex`Two means, unequal variances (Welch)`, stat: tex`t_0=\dfrac{\bar{X}-\bar{Y}-\Delta_0}{\sqrt{S_X^2/n+S_Y^2/m}}`, dist: tex`t(r)`, extra: tex`t_{\alpha/2}(r)` },
  { setting: tex`Paired data`, stat: tex`t_0=\dfrac{\bar{D}-\Delta_0}{S_D/\sqrt{n}}`, dist: tex`t(n-1)`, extra: tex`t_{\alpha/2}(n-1)` },
  { setting: tex`One proportion`, stat: tex`Z_0=\dfrac{\hat{p}-p_0}{\sqrt{p_0(1-p_0)/n}}`, dist: tex`N(0,1)`, extra: tex`z_{\alpha/2}` },
  { setting: tex`Two proportions`, stat: tex`Z_0=\dfrac{\hat{p}_1-\hat{p}_2}{\sqrt{\hat{p}(1-\hat{p})(1/n_1+1/n_2)}}`, dist: tex`N(0,1)`, extra: tex`z_{\alpha/2}` },
];

function TestMenuScene() {
  return (
    <SceneFrame kicker="Summary" title="The test menu.">
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Setting</th>
              <th>Test statistic</th>
              <th>
                Distribution under <MathText text="$H_0$" />
              </th>
              <th>Two-sided critical value</th>
            </tr>
          </thead>
          <tbody>
            {TEST_MENU.map((row) => (
              <tr key={row.setting}>
                <td>
                  <MathText text={row.setting} />
                </td>
                <td>
                  <InlineMath tex={row.stat} />
                </td>
                <td>
                  <InlineMath tex={row.dist} />
                </td>
                <td>
                  <InlineMath tex={row.extra} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        One-sided: use <MathText text={tex`$\alpha$`} /> in place of <MathText text={tex`$\alpha/2$`} />, and the sign of the alternative decides the tail.
        Variance tests are not covered here.
      </p>
    </SceneFrame>
  );
}

type McSituation = { title: string; story: string; options: string[]; answer: number; why: string };

const letterOpt = (j: number) => String.fromCharCode(65 + j);

const TEST_STORIES: McSituation[] = [
  {
    title: "Bottling line",
    story:
      "Years of records give a trusted process standard deviation of 4 ml. A sample of 40 bottles is used to test whether the mean fill is 500 ml.",
    options: [
      "z-test, one mean (σ known)",
      "t-test, one mean (σ unknown)",
      "paired t-test",
      "z-test, one proportion",
    ],
    answer: 0,
    why: "One mean with a reliable known σ ⇒ z-test.",
  },
  {
    title: "Café receipts",
    story: "A new café has 18 bell-shaped receipts and no earlier data. Is the mean spend 60 dollars?",
    options: [
      "z-test, one mean (σ known)",
      "t-test, one mean (σ unknown)",
      "Welch t-test",
      "z-test, two proportions",
    ],
    answer: 1,
    why: "One mean, σ must be estimated by s ⇒ t-test with 17 df.",
  },
  {
    title: "Two paint brands",
    story: "Drying times of brands X and Y are normal with known standard deviations from the supplier. Compare the means.",
    options: [
      "z-test, two means (σ’s known)",
      "pooled t-test",
      "Welch t-test",
      "paired t-test",
    ],
    answer: 0,
    why: "Two independent samples, both variances known ⇒ two-sample z-test.",
  },
  {
    title: "Two catalysts",
    story: "Eight pilot-plant runs per catalyst, sample SDs 2.39 and 2.98. It is reasonable to assume equal variances. Compare the mean yields.",
    options: [
      "z-test, two means (σ’s known)",
      "pooled t-test",
      "Welch t-test",
      "paired t-test",
    ],
    answer: 1,
    why: "Two independent small samples, unknown but equal variances ⇒ pooled t with n + m − 2 df.",
  },
  {
    title: "Two machines",
    story: "Ten runs per machine; the sample SDs are 1.1 and 5.4, so equal variances are not believable. Compare the means.",
    options: [
      "pooled t-test",
      "Welch t-test",
      "paired t-test",
      "z-test, one mean (σ known)",
    ],
    answer: 1,
    why: "Unknown and unequal variances ⇒ Welch’s t-test with Satterthwaite df.",
  },
  {
    title: "Training programme",
    story: "The same 24 students run the dash before and after a training programme. Did their mean time change?",
    options: [
      "pooled t-test",
      "Welch t-test",
      "paired t-test",
      "z-test, two proportions",
    ],
    answer: 2,
    why: "Before/after on the same units ⇒ pairs are dependent ⇒ paired t-test on the differences.",
  },
  {
    title: "Customer preference",
    story: "In a survey, 120 of 200 customers prefer the new design. Is the true proportion above 0.5?",
    options: [
      "t-test, one mean",
      "z-test, one proportion",
      "z-test, two proportions",
      "paired t-test",
    ],
    answer: 1,
    why: "One proportion against a null value p₀ ⇒ one-proportion z-test.",
  },
  {
    title: "Return rates",
    story: "124 of 894 male and 70 of 700 female sparrows return to the hatching site. Do the return rates differ?",
    options: [
      "z-test, one proportion",
      "z-test, two proportions",
      "pooled t-test",
      "Welch t-test",
    ],
    answer: 1,
    why: "Two independent proportions ⇒ two-proportion z-test with pooled p̂.",
  },
];

function WhichTestScene() {
  const print = usePrintMode();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const situation = TEST_STORIES[index];

  if (print) {
    return (
      <SceneFrame kicker="Game" title="Which test fits the story?" tone="gold">
        <div className={styles.promptList}>
          {TEST_STORIES.map((item) => (
            <article key={item.title} className={styles.promptItem}>
              <strong>{item.title}</strong>
              <p>{item.story}</p>
              <p>
                {item.options.map((opt, j) => (
                  <span key={opt}>
                    {letterOpt(j)}. <MathText text={opt} />
                    {"   "}
                  </span>
                ))}
              </p>
              <p className={styles.small}>
                <strong>Answer {letterOpt(item.answer)}.</strong> {item.why}
              </p>
            </article>
          ))}
        </div>
      </SceneFrame>
    );
  }

  const go = (next: number) => {
    setIndex(next);
    setPicked(null);
  };

  return (
    <SceneFrame kicker="Game" title="Which test fits the story?" tone="gold">
      <p className={styles.muted}>
        Situation {index + 1} of {TEST_STORIES.length} · Live Poll A–D
      </p>
      <article className={styles.card}>
        <p className={styles.kicker}>{situation.title}</p>
        <p>{situation.story}</p>
      </article>
      <div className={styles.tools}>
        {situation.options.map((opt, j) => (
          <button key={opt} type="button" className={picked === j ? styles.toolBtnActive : styles.toolBtn} onClick={() => setPicked(j)}>
            {letterOpt(j)}. <MathText text={opt} />
          </button>
        ))}
      </div>
      {picked != null ? (
        <p>
          {picked === situation.answer ? (
            <>
              Right — {letterOpt(situation.answer)}. {situation.why}
            </>
          ) : (
            <>
              Not quite: answer is {letterOpt(situation.answer)}. {situation.why}
            </>
          )}
        </p>
      ) : null}
      <div className={styles.tools}>
        <button type="button" className={styles.toolBtn} disabled={index === 0} onClick={() => go(index - 1)}>
          Previous
        </button>
        <button type="button" className={styles.toolBtn} disabled={index === TEST_STORIES.length - 1} onClick={() => go(index + 1)}>
          Next
        </button>
      </div>
    </SceneFrame>
  );
}

function EquivalenceScene() {
  const [xBar, setXBar] = useState(BATTERY.xBar);
  const [alpha, setAlpha] = useState<number>(0.05);
  const se = BATTERY.sigma / Math.sqrt(BATTERY.n);
  const z0 = (xBar - BATTERY.mu0) / se;
  const crit = zUpper(alpha);
  const p = stdNormalUpper(z0);
  const lower = xBar - crit * se;
  const rejectCrit = z0 > crit;
  const rejectP = p < alpha;
  const rejectCi = BATTERY.mu0 < lower;
  const verdict = (reject: boolean) => (reject ? "Reject H0" : "Fail to reject H0");
  return (
    <SceneFrame kicker="Summary · three methods" title="One decision, three routes." tone="gold">
      <p className={styles.lead}>
        Battery example: <MathText text={tex`$H_0:\mu=40$ versus $H_1:\mu>40$`} />, <MathText text={tex`$\sigma=1.25$`} />, <MathText text={tex`$n=10$`} />. Drag
        the sample mean: the three methods always flip together, at <MathText text={tex`$\bar{x}^*=40+z_\alpha\sigma/\sqrt{n}=${formatNum(BATTERY.mu0 + crit * se, 3)}$`} />.
      </p>
      <LiveOnly>
        <AlphaPicker value={alpha} onChange={setAlpha} />
        <label className={styles.slider}>
          Sample mean x̄ = {formatNum(xBar, 2)}
          <input type="range" min={39.4} max={41.6} step={0.01} value={xBar} onChange={(e) => setXBar(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>① Rejection region</p>
          <p>
            <MathText text={tex`$Z_0=${formatNum(z0, 3)}$ vs $z_\alpha=${formatNum(crit, 3)}$`} />
          </p>
          <p>
            <strong>{verdict(rejectCrit)}</strong>
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>② p-value</p>
          <p>
            p = {formatP(p)} {rejectP ? "<" : "≥"} α = {alpha}
          </p>
          <p>
            <strong>{verdict(rejectP)}</strong>
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>③ Confidence interval</p>
          <p>
            [{formatNum(lower, 2)}, ∞) {rejectCi ? "excludes" : "contains"} 40
          </p>
          <p>
            <strong>{verdict(rejectCi)}</strong>
          </p>
        </article>
      </div>
      <CiBar lo={lower} hi={Infinity} point={xBar} domain={[38.5, 42]} nullValue={BATTERY.mu0} />
      <PrintOnly>
        <p className={styles.small}>On the website: drag x̄ and α to see all three decisions switch at the same sample mean.</p>
      </PrintOnly>
    </SceneFrame>
  );
}

const FINAL_QUIZ: QuizItem[] = [
  {
    q: tex`One-sided test, $\alpha=0.05$, $\sigma$ known. Reject $H_0$ for $H_1:\mu>\mu_0$ when $Z_0>$ …`,
    options: [tex`$1.960$`, tex`$1.645$`, tex`$2.576$`, tex`$1.282$`],
    answer: 1,
    why: tex`All of $\alpha=0.05$ is in one tail: $z_{0.05}=1.645$.`,
  },
  {
    q: tex`$\sigma$ unknown, $n=16$, two-sided $\alpha=0.05$. Reject if $|t_0|>$ …`,
    options: [tex`$1.960$`, tex`$2.131$`, tex`$2.120$`, tex`$1.645$`],
    answer: 1,
    why: tex`Use $t_{0.025}(15)=2.131$ (df $=n-1=15$).`,
  },
  {
    q: tex`Pooled two-sample t-test, $n=m=8$. Degrees of freedom …`,
    options: [tex`$7$`, tex`$14$`, tex`$16$`, tex`$15$`],
    answer: 1,
    why: tex`$n+m-2=14$.`,
  },
  {
    q: tex`CI approach for a two-sided test: reject $H_0$ when …`,
    options: [
      tex`the null value lies outside the interval`,
      tex`the null value lies inside the interval`,
      tex`the interval is wider than 1`,
      tex`the interval contains $\bar{x}$`,
    ],
    answer: 0,
    why: tex`A $100(1-\alpha)\%$ interval excludes exactly those null values that a level-$\alpha$ two-sided test would reject.`,
  },
  {
    q: tex`Before/after weights of the same 30 people call for …`,
    options: [tex`pooled t-test`, tex`paired t-test`, tex`two-proportion z-test`, tex`Welch t-test`],
    answer: 1,
    why: tex`Observations are paired: test the mean of the differences with $t(n-1)$.`,
  },
  {
    q: tex`In the two-proportion test, the standard error uses the pooled $\hat{p}$ because …`,
    options: [
      tex`it is larger than either $\hat{p}_i$`,
      tex`under $H_0$ we have $p_1=p_2$, so the samples can be combined`,
      tex`the sample sizes are equal`,
      tex`it makes the p-value larger`,
    ],
    answer: 1,
    why: tex`The statistic’s distribution is computed assuming $H_0$ is true.`,
  },
];

function FinalQuizScene() {
  return (
    <SceneFrame kicker="Practice" title="Which answer is right?" tone="gold">
      <QuizBlock items={FINAL_QUIZ} />
    </SceneFrame>
  );
}

function TakeawaysScene() {
  return (
    <SceneFrame kicker="Takeaways" title="State H0 and H1, pick the statistic, decide, report." tone="dark">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Setup</p>
          <p>
            <MathText text={tex`$H_0$`} /> (status quo, contains “=”) versus <MathText text={tex`$H_1$`} /> (what we want evidence for). Reject or fail to reject; never
            “prove” <MathText text={tex`$H_0$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Errors</p>
          <p>
            Type I = reject a true <MathText text={tex`$H_0$`} /> (<MathText text={tex`$\alpha$`} />); Type II = miss a false <MathText text={tex`$H_0$`} /> (
            <MathText text={tex`$\beta$`} />). Smaller <MathText text={tex`$\alpha$`} /> raises <MathText text={tex`$\beta$`} />; only larger <MathText text={tex`$n$`} />{" "}
            lowers both.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>p-value</p>
          <p>
            Probability, under <MathText text={tex`$H_0$`} />, of a statistic at least as extreme as observed. Reject when p-value &lt; <MathText text={tex`$\alpha$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Three equivalent methods</p>
          <p>
            Rejection region · p-value · confidence interval (reject if it excludes the null value).
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Means</p>
          <p>
            z (σ known), t(n−1) (σ unknown), two-sample z / pooled t / Welch t, paired t on differences.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Proportions</p>
          <p>
            <MathText text={tex`$Z_0=(\hat{p}-p_0)/\sqrt{p_0(1-p_0)/n}$`} />; two proportions use the pooled <MathText text={tex`$\hat{p}$`} />.
          </p>
        </article>
      </div>
      <p className={styles.footerNote}>DOTE2011G · Hypothesis Testing · CUHK</p>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Start", label: "Title", Scene: CoverScene },
  { id: "roadmap", chapter: "Start", label: "Roadmap", Scene: RoadmapScene },
  { id: "aircrew", chapter: "Start", label: "Aircrew escape system", Scene: AircrewScene },
  { id: "hypotheses", chapter: "Setup", label: "H0 versus H1", Scene: HypothesesScene },
  { id: "class-activity", chapter: "Setup", label: "Which hypotheses?", Scene: ClassActivityScene },
  { id: "predetermined-cutoff", chapter: "Setup", label: "Predetermined critical region", Scene: PredeterminedCutoffScene },
  { id: "test-statistic", chapter: "Setup", label: "Test statistic and regions", Scene: TestStatisticScene },
  { id: "hypothesis-types", chapter: "Setup", label: "Types of hypothesis", Scene: HypothesisTypesScene },
  { id: "error-table", chapter: "Errors", label: "Type I / Type II table", Scene: ErrorTableScene },
  { id: "type-i", chapter: "Errors", label: "Propellant: two-sided α", Scene: TypeIScene },
  { id: "type-ii", chapter: "Errors", label: "Propellant: two-sided β", Scene: TypeIIScene },
  { id: "type-i-upper", chapter: "Errors", label: "Propellant: upper α", Scene: TypeIUpperScene },
  { id: "type-ii-upper", chapter: "Errors", label: "Propellant: upper β", Scene: TypeIIUpperScene },
  { id: "type-i-lower", chapter: "Errors", label: "Propellant: lower α", Scene: TypeILowerScene },
  { id: "type-ii-lower", chapter: "Errors", label: "Propellant: lower β", Scene: TypeIILowerScene },
  { id: "game-cutoff", chapter: "Game", label: "Cutoff α–β explorer", Scene: CutoffGameScene },
  { id: "significance", chapter: "Errors", label: "Significance level", Scene: SignificanceScene },
  { id: "game-type-i-sim", chapter: "Game", label: "Simulate α", Scene: TypeISimScene },
  { id: "p-value", chapter: "p-value", label: "Definition", Scene: PValueDefScene },
  { id: "psu-critical", chapter: "p-value", label: "Power supply: region", Scene: PowerSupplySetupScene },
  { id: "psu-p", chapter: "p-value", label: "Power supply: p-values", Scene: PowerSupplyPValuesScene },
  { id: "game-p-explorer", chapter: "Game", label: "p-value explorer", Scene: PValueExplorerScene },
  { id: "quiz-errors", chapter: "Practice", label: "Concept check: errors", Scene: ErrorQuizScene },
  { id: "quiz-p", chapter: "Practice", label: "Concept check: p-value", Scene: PValueQuizScene },
  { id: "eight-steps", chapter: "Procedure", label: "Eight steps", Scene: EightStepsScene },
  { id: "three-approaches", chapter: "Procedure", label: "Three approaches", Scene: ThreeApproachesScene },
  { id: "game-tails", chapter: "Game", label: "Which tail?", Scene: TailPickerScene },
  { id: "z-table", chapter: "Mean · σ known", label: "z-test table", Scene: ZKnownTableScene },
  { id: "battery", chapter: "Mean · σ known", label: "Battery life", Scene: BatteryScene },
  { id: "response", chapter: "Mean · σ known", label: "Response time", Scene: ResponseTimeScene },
  { id: "t-table", chapter: "Mean · σ unknown", label: "t-test table", Scene: TTableScene },
  { id: "body-temp", chapter: "Mean · σ unknown", label: "Body temperature", Scene: BodyTemperatureScene },
  { id: "two-means-z", chapter: "Two means", label: "Known variances", Scene: TwoMeansKnownScene },
  { id: "paints", chapter: "Two means", label: "Comparing paints", Scene: PaintsScene },
  { id: "pooled-t", chapter: "Two means", label: "Pooled t-test", Scene: PooledTScene },
  { id: "catalysts", chapter: "Two means", label: "Comparing catalysts", Scene: CatalystScene },
  { id: "welch", chapter: "Two means", label: "Welch t-test", Scene: WelchScene },
  { id: "paired", chapter: "Two means", label: "Paired t-test", Scene: PairedScene },
  { id: "prop-formula", chapter: "Proportions", label: "One-proportion test", Scene: ProportionFormulaScene },
  { id: "fortune", chapter: "Proportions", label: "Higher education", Scene: FortuneScene },
  { id: "fair-die", chapter: "Proportions", label: "Fair die", Scene: FairDieScene },
  { id: "game-prop-calc", chapter: "Game", label: "Proportion calculator", Scene: PropCalcScene },
  { id: "two-props", chapter: "Proportions", label: "Two proportions", Scene: TwoProportionsScene },
  { id: "sparrows", chapter: "Proportions", label: "Sparrows", Scene: SparrowScene },
  { id: "birth-weight", chapter: "Proportions", label: "Low birth weight", Scene: BirthWeightScene },
  { id: "test-menu", chapter: "Summary", label: "The test menu", Scene: TestMenuScene },
  { id: "game-which-test", chapter: "Game", label: "Which test?", Scene: WhichTestScene },
  { id: "equivalence", chapter: "Summary", label: "Three methods agree", Scene: EquivalenceScene },
  { id: "quiz-final", chapter: "Practice", label: "Which answer?", Scene: FinalQuizScene },
  { id: "takeaways", chapter: "Close", label: "Takeaways", Scene: TakeawaysScene },
];
