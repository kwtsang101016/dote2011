import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  formatMoney,
  formatNum,
  mean,
  mulberry32,
  sampleNormal,
  sampleSd,
  sampleSkewed,
  stdNormalCdf,
  stdNormalPdf,
  tPdf,
  tUpper,
  zUpper,
} from "../utils";
import { Formula, MathText, tex } from "./Math";
import styles from "./Lecture.module.css";
import { LiveOnly, PrintOnly, usePrintMode } from "./printContext";

export type SceneDef = {
  id: string;
  chapter: string;
  label: string;
  Scene: () => ReactElement;
};

const COVER_HINT_LIVE =
  "Use ← → or the buttons above. Move the sliders to rebuild the intervals. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

const CONFIDENCE_LEVELS = [0.9, 0.95, 0.99] as const;
type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** HMV retail-outlet example (σ known). */
const HMV = { n: 36, xBar: 41100, sigma: 4500 };
/** Apartment-rent example (σ unknown). */
const RENT = { n: 16, xBar: 750, s: 55 };
/** Political Science, Inc. poll. */
const PSI = { n: 500, x: 220 };
/** Butterfat production of n = 20 cows (pounds). */
const BUTTERFAT = [481, 537, 513, 583, 453, 510, 570, 500, 457, 555, 618, 327, 350, 643, 499, 421, 505, 637, 599, 392];
/** Fill volumes (ounces) from two filling machines. */
const MACHINE_1 = [16.03, 16.04, 16.05, 16.05, 16.02, 16.01, 15.96, 15.98, 16.02, 15.99];
const MACHINE_2 = [16.02, 15.97, 15.96, 16.01, 15.99, 16.03, 16.04, 16.02, 16.01, 16.0];

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

function ConfidencePicker({ value, onChange }: { value: Confidence; onChange: (next: Confidence) => void }) {
  return (
    <div className={styles.tools}>
      {CONFIDENCE_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          className={level === value ? styles.toolBtnActive : styles.toolBtn}
          onClick={() => onChange(level)}
        >
          {Math.round(level * 100)}%
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

type Curve = { pdf: (x: number) => number; color: string; width?: number; dash?: string; label?: string };
type Shade = { from: number; to: number; color?: string };
type Mark = { x: number; text: string; /** Rendered as a smaller, lowered subscript after `text` (SVG text has no math typesetting). */ sub?: string };
type Note = { x: number; y: number; text: string };

/** Density curves on a shared axis with shaded areas under the first curve. */
function DensityPlot({
  curves,
  xMin,
  xMax,
  shades = [],
  marks = [],
  notes = [],
  label,
}: {
  curves: Curve[];
  xMin: number;
  xMax: number;
  shades?: Shade[];
  marks?: Mark[];
  /** y is a fraction of the plot height measured from the axis (0 = axis, 1 = top). */
  notes?: Note[];
  label: string;
}) {
  const W = 560;
  const H = 220;
  const pad = { l: 16, r: 16, t: 14, b: 34 };
  const steps = 240;
  const xs = Array.from({ length: steps + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / steps);
  const peak = Math.max(...curves.flatMap((curve) => xs.map(curve.pdf)), 1e-9) * 1.1;
  const xOf = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const yOf = (y: number) => H - pad.b - (Math.min(y, peak) / peak) * (H - pad.t - pad.b);
  const pathOf = (pdf: (x: number) => number) =>
    xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(pdf(x)).toFixed(2)}`).join(" ");
  const base = curves[0];
  const areaOf = (shade: Shade) => {
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
        <path key={i} d={areaOf(shade)} fill={shade.color ?? "rgba(223, 74, 62, 0.35)"} stroke="none" />
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
            {mark.sub ? (
              <tspan dy="3" fontSize="9">
                {mark.sub}
              </tspan>
            ) : null}
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

function StandardNormalTails({ crit, side, label }: { crit: number; side: "two" | "upper" | "lower"; label: string }) {
  const tailLabel = side === "two" ? "α/2" : "α";
  const shades: Shade[] =
    side === "two"
      ? [
          { from: -4, to: -crit },
          { from: crit, to: 4 },
        ]
      : side === "upper"
        ? [{ from: crit, to: 4 }]
        : [{ from: -4, to: -crit }];
  const marks: Mark[] =
    side === "two"
      ? [
          { x: -crit, text: `−${formatNum(crit, 3)}` },
          { x: 0, text: "0" },
          { x: crit, text: formatNum(crit, 3) },
        ]
      : side === "upper"
        ? [
            { x: 0, text: "0" },
            { x: crit, text: formatNum(crit, 3) },
          ]
        : [
            { x: -crit, text: `−${formatNum(crit, 3)}` },
            { x: 0, text: "0" },
          ];
  const notes: Note[] = [{ x: side === "lower" ? 0.6 : side === "upper" ? -0.6 : 0, y: 0.35, text: "1 − α" }];
  if (side !== "lower") notes.push({ x: Math.min(crit + 0.55, 3.6), y: 0.16, text: tailLabel });
  if (side !== "upper") notes.push({ x: Math.max(-crit - 0.55, -3.6), y: 0.16, text: tailLabel });
  return (
    <DensityPlot
      curves={[{ pdf: stdNormalPdf, color: "#16213c" }]}
      xMin={-4}
      xMax={4}
      shades={shades}
      marks={marks}
      notes={notes}
      label={label}
    />
  );
}

/** Horizontal number line with an interval, its point estimate, and (optionally) the true value. */
function CiBar({
  lo,
  hi,
  point,
  domain,
  truth,
  digits = 2,
}: {
  lo: number;
  hi: number;
  point: number;
  domain: [number, number];
  truth?: number;
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
        {truth != null ? <i className={styles.ciBarTruth} style={{ left: `${pct(truth)}%` }} /> : null}
      </div>
      <div className={styles.ciBarLabels}>
        <span>{formatMoney(min, digits)}</span>
        <span>
          interval [{show(lo)}, {show(hi)}]
        </span>
        <span>{formatMoney(max, digits)}</span>
      </div>
    </div>
  );
}

type SimInterval = { lo: number; hi: number; covers: boolean };

/** Stack of simulated intervals around a vertical line at the true mean. */
function IntervalStack({ intervals, mu, halfRange, label }: { intervals: SimInterval[]; mu: number; halfRange: number; label: string }) {
  const W = 560;
  const rowH = Math.max(5, Math.min(12, 300 / Math.max(intervals.length, 1)));
  const H = intervals.length * rowH + 30;
  const xOf = (v: number) => {
    const clipped = Math.min(mu + halfRange, Math.max(mu - halfRange, v));
    return 20 + ((clipped - (mu - halfRange)) / (2 * halfRange)) * (W - 40);
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={xOf(mu)} x2={xOf(mu)} y1={4} y2={H - 18} stroke="#2e7190" strokeWidth="2" strokeDasharray="6 4" />
      <text x={xOf(mu)} y={H - 4} textAnchor="middle" fontSize="12" fill="#16213c">
        μ = {formatNum(mu, 0)}
      </text>
      {intervals.map((row, i) => (
        <line
          key={i}
          x1={xOf(row.lo)}
          x2={xOf(row.hi)}
          y1={10 + i * rowH}
          y2={10 + i * rowH}
          stroke={row.covers ? "#2a7a4b" : "#df4a3e"}
          strokeWidth={Math.max(2, rowH - 3)}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** Heights example: μ = 168 cm, σ = 5 cm, n = 25. */
const HEIGHTS = { mu: 168, sigma: 5, n: 25 };

function simulateHeightIntervals(seed: number, count: number, n: number, confidence: number): SimInterval[] {
  const rng = mulberry32(seed);
  const half = zUpper((1 - confidence) / 2) * (HEIGHTS.sigma / Math.sqrt(n));
  return Array.from({ length: count }, () => {
    const xBar = mean(Array.from({ length: n }, () => sampleNormal(HEIGHTS.mu, HEIGHTS.sigma, rng)));
    const lo = xBar - half;
    const hi = xBar + half;
    return { lo, hi, covers: lo <= HEIGHTS.mu && HEIGHTS.mu <= hi };
  });
}

// ---------------------------------------------------------------------------
// Opening
// ---------------------------------------------------------------------------

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id={print ? undefined : "cover"}>
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Interval Estimation</h1>
        <p className={styles.lead}>
          From a point estimate to a range we can trust: means (<MathText text={tex`$\sigma$`} /> known and unknown), one-sided bounds, sample size,
          proportions, and differences of two means or two proportions (pooled, Welch, and paired designs).
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
          <p className={styles.kicker}>
            <MathText text="1 · Mean, σ known" />
          </p>
          <p>
            <MathText text={tex`$\bar{x} \pm z_{\alpha/2}\,\sigma/\sqrt{n}$`} /> and what “95% confident” means.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="2 · Mean, σ unknown" />
          </p>
          <p>
            Replace <MathText text={tex`$\sigma$`} /> by <MathText text={tex`$s$`} /> and <MathText text={tex`$z$`} /> by the{" "}
            <MathText text={tex`$t$`} /> distribution.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · One-sided bounds</p>
          <p>Only a lower (or only an upper) limit for the mean.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>4 · Sample size</p>
          <p>How large must n be for a chosen margin of error?</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>5 · Proportion</p>
          <p>
            <MathText text={tex`$\hat{p} \pm z_{\alpha/2}\sqrt{\hat{p}(1-\hat{p})/n}$`} /> and its sample size.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>6 · Two means &amp; proportions</p>
          <p>
            Known <MathText text={tex`$\sigma$`} />, pooled / Welch / paired <MathText text={tex`$t$`} />, then{" "}
            <MathText text={tex`$p_1-p_2$`} /> as a special case.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function WarmupScene() {
  const [n, setN] = useState(HEIGHTS.n);
  const se = HEIGHTS.sigma / Math.sqrt(n);
  const z = 2 / se;
  const prob = stdNormalCdf(z) - stdNormalCdf(-z);
  return (
    <SceneFrame kicker="Warm-up · last lecture" title="Height of CUHK Business students.">
      <p className={styles.lead}>
        Population mean <MathText text={tex`$\mu = 168$`} /> cm, population SD <MathText text={tex`$\sigma = 5$`} /> cm. What is the probability that a
        random sample of <MathText text={tex`$n = 25$`} /> has a sample mean between 166 and 170?
      </p>
      <Formula
        tex={tex`\sigma_{\bar{x}}=\dfrac{5}{\sqrt{25}}=1,\qquad P(166<\bar{x}<170)=P(-2<Z<2)\approx 0.9545`}
      />
      <LiveOnly>
        <label className={styles.slider}>
          Sample size n = {n} → P(166 &lt; x̄ &lt; 170) ≈ {formatNum(prob, 4)}
          <input type="range" min={4} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: (x) => stdNormalPdf((x - HEIGHTS.mu) / se) / se, color: "#16213c" }]}
          xMin={163}
          xMax={173}
          shades={[{ from: 166, to: 170 }]}
          marks={[166, 168, 170].map((x) => ({ x, text: String(x) }))}
          label="Sampling distribution of the sample mean height"
        />
      </figure>
      <p className={styles.small}>
        Flip the question: in practice <MathText text={tex`$\mu$`} /> is unknown and we only see one <MathText text={tex`$\bar{x}$`} />. Because{" "}
        <MathText text={tex`$\bar{x}$`} /> is within 2 cm of <MathText text={tex`$\mu$`} /> about 95% of the time, the range{" "}
        <MathText text={tex`$\bar{x}\pm 2$`} /> should catch <MathText text={tex`$\mu$`} /> about 95% of the time. That is an interval estimate.
      </p>
    </SceneFrame>
  );
}

function MarginScene() {
  return (
    <SceneFrame kicker="Margin of error" title="An interval estimate is a point estimate ± a margin of error.">
      <p className={styles.lead}>
        A point estimator cannot be expected to give the exact value of the population parameter. An interval estimate adds and subtracts a{" "}
        <strong>margin of error</strong> to show how close the point estimate is likely to be.
      </p>
      <Formula tex={tex`\text{Point estimate} \pm \text{Margin of error}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Population mean</p>
          <Formula tex={tex`\bar{x} \pm \text{Margin of error}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Population proportion</p>
          <Formula tex={tex`\hat{p} \pm \text{Margin of error}`} />
        </article>
      </div>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Mean, σ known
// ---------------------------------------------------------------------------

function SigmaKnownScene() {
  return (
    <SceneFrame kicker="Population mean · σ known" title="When can we treat σ as known?">
      <p className={styles.lead}>
        To build an interval estimate of a population mean, the margin of error must be computed using either the population standard deviation{" "}
        <MathText text={tex`$\sigma$`} /> or the sample standard deviation <MathText text={tex`$s$`} />.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="σ known case" />
          </p>
          <p>
            <MathText text={tex`$\sigma$`} /> is rarely known exactly, but a good estimate may come from historical data or other information. We then
            treat <MathText text={tex`$\sigma$`} /> as known.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="σ unknown case" />
          </p>
          <p>
            No trustworthy value before sampling: estimate it by <MathText text={tex`$s$`} /> from the same sample. Covered after the{" "}
            <MathText text={tex`$\sigma$`} /> known case.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function SamplingPictureScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const z = zUpper((1 - confidence) / 2);
  return (
    <SceneFrame kicker="Population mean · σ known" title={tex`A share $1-\alpha$ of all $\bar{x}$ values lie within $z_{\alpha/2}\sigma_{\bar{x}}$ of $\mu$.`}>
      <p className={styles.lead}>
        There is a <MathText text={tex`$1-\alpha$`} /> probability that the sample mean lands within{" "}
        <MathText text={tex`$z_{\alpha/2}\,\sigma_{\bar{x}}$`} /> of <MathText text={tex`$\mu$`} />, i.e. that its margin of error is{" "}
        <MathText text={tex`$z_{\alpha/2}\,\sigma_{\bar{x}}$`} /> or less.
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
      </LiveOnly>
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: stdNormalPdf, color: "#16213c" }]}
          xMin={-4}
          xMax={4}
          shades={[{ from: -z, to: z, color: "rgba(46, 113, 144, 0.3)" }, { from: -4, to: -z }, { from: z, to: 4 }]}
          marks={[
            { x: -z, text: `μ − ${formatNum(z, 3)}σ`, sub: "x̄" },
            { x: 0, text: "μ" },
            { x: z, text: `μ + ${formatNum(z, 3)}σ`, sub: "x̄" },
          ]}
          notes={[
            { x: 0, y: 0.35, text: `${Math.round(confidence * 100)}% of all x̄ values` },
            { x: Math.min(z + 0.6, 3.6), y: 0.14, text: "α/2" },
            { x: Math.max(-z - 0.6, -3.6), y: 0.14, text: "α/2" },
          ]}
          label="Sampling distribution of x-bar with central area 1 minus alpha"
        />
        <figcaption className={styles.small}>
          Sampling distribution of <MathText text={tex`$\bar{x}$`} />. Here <MathText text={tex`$\sigma_{\bar{x}}=\sigma/\sqrt{n}$`} /> is the standard error.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

function DeriveScene() {
  return (
    <SceneFrame kicker="Population mean · σ known" title="From the sampling distribution to the interval (two-sided).">
      <p className={styles.lead}>
        For a mean <MathText text={tex`$\mu$`} /> from a normal population with known <MathText text={tex`$\sigma$`} />:
      </p>
      <Formula
        tex={tex`X_1,\dots,X_n \sim N(\mu,\sigma^2)\ \Rightarrow\ \bar{X}\sim N\!\left(\mu,\tfrac{\sigma^2}{n}\right)\ \Rightarrow\ \dfrac{\bar{X}-\mu}{\sigma/\sqrt{n}}\sim N(0,1)`}
      />
      <Formula tex={tex`P\!\left\{-z_{\alpha/2}\le \dfrac{\bar{x}-\mu}{\sigma/\sqrt{n}}\le z_{\alpha/2}\right\}=1-\alpha \quad(\text{confidence level})`} />
      <Formula
        tex={tex`\underbrace{\bar{x}-z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}}_{\text{CI lower}}\ \le\ \mu\ \le\ \underbrace{\bar{x}+z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}}_{\text{CI upper}}`}
      />
      <p className={styles.small}>
        Rearrange the inequality so <MathText text={tex`$\mu$`} /> sits in the middle. This interval can also be used for the mean of a non-normal
        population when <MathText text={tex`$n>30$`} /> (central limit theorem).
      </p>
    </SceneFrame>
  );
}

function FormulaScene() {
  return (
    <SceneFrame kicker="Population mean · σ known" title={tex`Interval estimate of $\mu$ when $\sigma$ is known.`}>
      <Formula tex={tex`\bar{x} \pm z_{\alpha/2}\,\dfrac{\sigma}{\sqrt{n}}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Symbols</p>
          <p>
            <MathText text={tex`$\bar{x}$`} /> sample mean · <MathText text={tex`$1-\alpha$`} /> confidence coefficient ·{" "}
            <MathText text={tex`$\sigma$`} /> population standard deviation · <MathText text={tex`$n$`} /> sample size.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text={tex`$z_{\alpha/2}$`} />
          </p>
          <p>
            The <MathText text={tex`$z$`} /> value giving an area of <MathText text={tex`$\alpha/2$`} /> in the upper tail of the standard normal
            distribution.
          </p>
        </article>
      </div>
      <figure className={styles.figure}>
        <StandardNormalTails crit={1.96} side="two" label="Standard normal with alpha over 2 in each tail" />
      </figure>
    </SceneFrame>
  );
}

function ZTableScene() {
  return (
    <SceneFrame kicker="Population mean · σ known" title={tex`Values of $z_{\alpha/2}$ for the most common confidence levels.`}>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Confidence level</th>
              <th>α</th>
              <th>α/2</th>
              <th>Area to the left, 1 − α/2</th>
              <th>
                <MathText text={tex`$z_{\alpha/2}$`} />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>90%</td>
              <td>.10</td>
              <td>.05</td>
              <td>.9500</td>
              <td>1.645</td>
            </tr>
            <tr>
              <td>95%</td>
              <td>.05</td>
              <td>.025</td>
              <td>.9750</td>
              <td>1.960</td>
            </tr>
            <tr>
              <td>99%</td>
              <td>.01</td>
              <td>.005</td>
              <td>.9950</td>
              <td>2.576</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        The cumulative area to the left of <MathText text={tex`$z_{\alpha/2}$`} /> is <MathText text={tex`$1-\alpha/2$`} />. Memorise these three;
        they appear in almost every example. In software: R <code>qnorm(1 - alpha/2)</code>, Python{" "}
        <code>scipy.stats.norm.ppf(1 - alpha/2)</code>.
      </p>
    </SceneFrame>
  );
}

function MeaningScene() {
  const intervals = useMemo(() => simulateHeightIntervals(90, 20, HEIGHTS.n, 0.9), []);
  const hits = intervals.filter((row) => row.covers).length;
  return (
    <SceneFrame kicker="Meaning of confidence" title="“90% confident” describes the method, not one interval.">
      <p className={styles.lead}>
        Because 90% of all intervals built with <MathText text={tex`$\bar{x}\pm 1.645\,\sigma_{\bar{x}}$`} /> contain the population mean, we say we are{" "}
        <strong>90% confident</strong> that our interval includes <MathText text={tex`$\mu$`} />. The interval is established at the 90% confidence level;{" "}
        <MathText text={tex`$0.90$`} /> is the <strong>confidence coefficient</strong>.
      </p>
      <figure className={styles.figure}>
        <IntervalStack intervals={intervals} mu={HEIGHTS.mu} halfRange={4} label="Twenty 90% intervals from twenty samples of heights" />
        <figcaption className={styles.small}>
          Twenty samples of 25 heights (μ = 168, σ = 5), each giving its own 90% interval: {hits} of 20 include μ (green); red intervals miss it.
        </figcaption>
      </figure>
      <p className={styles.small}>
        After the data are in, a single interval either contains <MathText text={tex`$\mu$`} /> or it does not. The 90% is the long-run success rate of the
        procedure.
      </p>
    </SceneFrame>
  );
}

function CoverageGameScene() {
  const [seed, setSeed] = useState(7);
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const [n, setN] = useState(HEIGHTS.n);
  const [count, setCount] = useState(40);
  const intervals = useMemo(() => simulateHeightIntervals(seed, count, n, confidence), [seed, count, n, confidence]);
  const rate = intervals.filter((row) => row.covers).length / intervals.length;

  return (
    <SceneFrame kicker="Game" title="Coverage simulator." tone="gold">
      <p className={styles.lead}>
        Each bar is one sample of heights (true <MathText text={tex`$\mu=168$`} />, <MathText text={tex`$\sigma=5$`} />) turned into{" "}
        <MathText text={tex`$\bar{x}\pm z_{\alpha/2}\sigma/\sqrt{n}$`} />. Green covers <MathText text={tex`$\mu$`} />, red misses.
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <div className={styles.tools}>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={5} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Intervals = {count}
            <input type="range" min={10} max={100} step={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          <button type="button" className={styles.toolBtn} onClick={() => setSeed((s) => s + 1)}>
            New samples
          </button>
        </div>
      </LiveOnly>
      <p>
        Coverage this round: <strong>{formatNum(100 * rate, 1)}%</strong> (target {Math.round(confidence * 100)}%).
      </p>
      <figure className={styles.figure}>
        <IntervalStack intervals={intervals} mu={HEIGHTS.mu} halfRange={5} label="Simulated confidence intervals" />
      </figure>
      <p className={styles.small}>
        Try it: higher confidence makes every bar longer and the red bars rarer. Larger <MathText text={tex`$n$`} /> makes bars shorter but keeps the
        coverage near the target.
      </p>
    </SceneFrame>
  );
}

function HmvSetupScene() {
  return (
    <SceneFrame kicker="Example · HMV" title="Where should HMV open its next outlet?">
      <p className={styles.lead}>
        HMV has 260 retail outlets in Asia. It is evaluating a potential location for a new outlet, based in part on the mean annual income of individuals
        in the marketing area.
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample</p>
          <p>
            <MathText text={tex`$n=36$`} />, sample mean income <MathText text={tex`$\bar{x}=41{,}100$`} /> dollars.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="σ known" />
          </p>
          <p>
            Population SD estimated as <MathText text={tex`$\sigma=4{,}500$`} /> dollars; the population is not believed to be highly skewed.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Goal</p>
          <p>Interval estimate with confidence coefficient 0.95.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function HmvIntervalScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const z = zUpper((1 - confidence) / 2);
  const se = HMV.sigma / Math.sqrt(HMV.n);
  const margin = z * se;
  return (
    <SceneFrame kicker="Example · HMV" title="Margin of error and the 95% interval.">
      <p className={styles.lead}>
        95% of the sample means that can be observed are within <MathText text={tex`$\pm 1.96\,\sigma_{\bar{x}}$`} /> of <MathText text={tex`$\mu$`} />.
      </p>
      <Formula tex={tex`z_{.025}\dfrac{\sigma}{\sqrt{n}}=1.96\cdot\dfrac{4{,}500}{\sqrt{36}}=1{,}470`} />
      <Formula tex={tex`41{,}100 \pm 1{,}470 \ \Rightarrow\ \$39{,}630 \text{ to } \$42{,}570`} />
      <p className={styles.small}>We are 95% confident that the interval contains the population mean income.</p>
      <LiveOnly>
        <p className={styles.kicker}>Change the confidence level</p>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <Formula
          tex={tex`z_{\alpha/2}=${formatNum(z, 3)},\quad \text{margin}=${formatMoney(margin, 0)},\quad [\,${formatMoney(HMV.xBar - margin, 0)},\ ${formatMoney(HMV.xBar + margin, 0)}\,]`}
        />
        <CiBar lo={HMV.xBar - margin} hi={HMV.xBar + margin} point={HMV.xBar} domain={[38000, 44200]} digits={0} />
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>
          Other levels: 90% gives 41,100 ± 1,234; 99% gives 41,100 ± 1,932. Higher confidence ⇒ wider interval.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function AdequateSizeScene() {
  return (
    <SceneFrame kicker="Adequate sample size" title={tex`How large must $n$ be for $\bar{x}\pm z_{\alpha/2}\sigma/\sqrt{n}$?`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Most applications</p>
          <p>
            <MathText text={tex`$n=30$`} /> is adequate.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Highly skewed or outliers</p>
          <p>
            Use <MathText text={tex`$n\ge 50$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Not normal but roughly symmetric</p>
          <p>
            <MathText text={tex`$n$`} /> as small as 15 will suffice.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>At least approximately normal</p>
          <p>
            A sample size of less than 15 can be used.
          </p>
        </article>
      </div>
      <p className={styles.small}>
        These rules come from the central limit theorem: the more the population departs from normal, the larger <MathText text={tex`$n$`} /> must be before{" "}
        <MathText text={tex`$\bar{x}$`} /> is approximately normal.
      </p>
    </SceneFrame>
  );
}

function BulbScene() {
  return (
    <SceneFrame kicker="Example" title="Life of a 60-watt light bulb.">
      <p className={styles.lead}>
        Let <MathText text={tex`$X$`} /> be the life of a bulb, <MathText text={tex`$X\sim N(\mu,1296)$`} /> so <MathText text={tex`$\sigma=36$`} />. A random
        sample of <MathText text={tex`$n=27$`} /> bulbs burns out with sample mean <MathText text={tex`$\bar{x}=1478$`} /> hours. Find a 95% confidence interval
        for <MathText text={tex`$\mu$`} />.
      </p>
      <Formula
        tex={tex`\left[\bar{x}-z_{0.025}\dfrac{\sigma}{\sqrt{n}},\ \bar{x}+z_{0.025}\dfrac{\sigma}{\sqrt{n}}\right]=\left[1478-1.96\dfrac{36}{\sqrt{27}},\ 1478+1.96\dfrac{36}{\sqrt{27}}\right]`}
      />
      <Formula tex={tex`=[1478-13.58,\ 1478+13.58]=[1464.42,\ 1491.58]`} />
      <p className={styles.small}>The population is normal, so the interval is valid even though n is below 30.</p>
    </SceneFrame>
  );
}

function JuiceScene() {
  return (
    <SceneFrame kicker="Example" title="Orange juice consumption.">
      <p className={styles.lead}>
        Let <MathText text={tex`$X$`} /> be the grams of orange juice an American drinks per day, with known <MathText text={tex`$\sigma=96$`} />. An orange
        growers&apos; association samples <MathText text={tex`$n=576$`} /> Americans and finds <MathText text={tex`$\bar{x}=133$`} /> grams. Find an
        approximate 90% confidence interval for <MathText text={tex`$\mu$`} />.
      </p>
      <Formula tex={tex`133\pm 1.645\left(\dfrac{96}{\sqrt{576}}\right)=133\pm 6.58 \ \Rightarrow\ [126.42,\ 139.58]`} />
      <p className={styles.small}>
        The distribution of <MathText text={tex`$X$`} /> is not stated to be normal; with <MathText text={tex`$n=576$`} /> the CLT makes the interval
        approximately right, hence “approximate”.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Mean, σ unknown
// ---------------------------------------------------------------------------

function SigmaUnknownScene() {
  return (
    <SceneFrame kicker="Population mean · σ unknown" title={tex`No estimate of $\sigma$ before sampling? Use $s$ and the $t$ distribution.`}>
      <p className={styles.lead}>
        If an estimate of the population standard deviation <MathText text={tex`$\sigma$`} /> cannot be developed prior to sampling, we use the sample standard
        deviation <MathText text={tex`$s$`} /> to estimate <MathText text={tex`$\sigma$`} />. This is the <strong>σ unknown case</strong>.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>What changes</p>
          <p>
            The interval for <MathText text={tex`$\mu$`} /> is based on the <MathText text={tex`$t$`} /> distribution instead of the standard normal.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Assumption for now</p>
          <p>The population is normally distributed.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function TDistScene() {
  const print = usePrintMode();
  const [df, setDf] = useState(2);
  return (
    <SceneFrame kicker="t distribution" title={tex`Replacing $\sigma$ by $S$ turns $Z$ into $t(n-1)$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <Formula tex={tex`\bar{X}\sim N(\mu,\sigma^2/n),\qquad \dfrac{\bar{X}-\mu}{\sigma/\sqrt{n}}\sim Z`} />
          <Formula tex={tex`\dfrac{\bar{X}-\mu}{S/\sqrt{n}}\sim t(n-1)`} />
        </article>
        <article className={styles.card}>
          <Formula tex={tex`\bar{X}=\dfrac{X_1+\cdots+X_n}{n},\qquad S^2=\dfrac{1}{n-1}\sum_{i=1}^{n}(X_i-\bar{X})^2`} />
          <p className={styles.small}>
            <MathText text={tex`$S$`} /> varies from sample to sample, which adds extra spread: the <MathText text={tex`$t$`} /> curve has heavier tails.
          </p>
        </article>
      </div>
      <LiveOnly>
        <label className={styles.dfControl}>
          Your degrees of freedom = {df} (dashed red)
          <input type="range" min={1} max={60} value={df} onChange={(e) => setDf(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <figure className={styles.figure}>
        <DensityPlot
          curves={[
            { pdf: stdNormalPdf, color: "#16213c", label: "standard normal" },
            { pdf: (x) => tPdf(x, 20), color: "#2e7190", label: "t, 20 df" },
            { pdf: (x) => tPdf(x, 10), color: "#c58b00", label: "t, 10 df" },
            ...(print ? [] : [{ pdf: (x: number) => tPdf(x, df), color: "#df4a3e", dash: "6 4", label: `t, ${df} df` }]),
          ]}
          xMin={-4.5}
          xMax={4.5}
          marks={[-4, -2, 0, 2, 4].map((x) => ({ x, text: String(x) }))}
          label="Standard normal and t density curves"
        />
      </figure>
    </SceneFrame>
  );
}

function TPropertiesScene() {
  return (
    <SceneFrame kicker="t distribution" title="A family of curves indexed by degrees of freedom.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Family</p>
          <p>
            The <MathText text={tex`$t$`} /> distribution is a family of similar distributions. A specific one depends on its{" "}
            <strong>degrees of freedom</strong>: the number of independent pieces of information that go into computing <MathText text={tex`$s$`} />. For
            a mean, <MathText text={tex`$\text{df}=n-1$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>More df, less dispersion</p>
          <p>
            As degrees of freedom increase, the <MathText text={tex`$t$`} /> distribution has less dispersion and becomes closer and closer to the standard
            normal.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Large df</p>
          <p>
            For more than 100 degrees of freedom, the standard normal <MathText text={tex`$z$`} /> value is a good approximation to the{" "}
            <MathText text={tex`$t$`} /> value.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>From software</p>
          <p>
            Get <MathText text={tex`$t_{\alpha/2}$`} /> from software — R <code>qt(1 - alpha/2, df)</code>, Python{" "}
            <code>scipy.stats.t.ppf(1 - alpha/2, df)</code>. For large df it is close to <MathText text={tex`$z_{\alpha/2}$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function TvsZGameScene() {
  const [df, setDf] = useState(15);
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const tail = (1 - confidence) / 2;
  const z = zUpper(tail);
  const t = tUpper(tail, df);
  return (
    <SceneFrame kicker="Game" title={tex`$z$ versus $t$ critical values.`} tone="gold">
      <p className={styles.lead}>
        For the same confidence level, <MathText text={tex`$t_{\alpha/2}>z_{\alpha/2}$`} />: not knowing <MathText text={tex`$\sigma$`} /> costs a wider
        interval. The gap shrinks as the degrees of freedom grow.
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <label className={styles.slider}>
          Degrees of freedom n − 1 = {df}
          <input type="range" min={1} max={120} value={df} onChange={(e) => setDf(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <Formula
        tex={tex`z_{\alpha/2}=${formatNum(z, 3)},\qquad t_{\alpha/2}\ (${df}\ \text{df})=${formatNum(t, 3)},\qquad t/z=${formatNum(t / z, 3)}`}
      />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[
            { pdf: (x) => tPdf(x, df), color: "#df4a3e", label: `t, ${df} df` },
            { pdf: stdNormalPdf, color: "#16213c", label: "standard normal" },
          ]}
          xMin={-5}
          xMax={5}
          shades={[
            { from: -5, to: -t },
            { from: t, to: 5 },
          ]}
          marks={[
            { x: -t, text: `−${formatNum(t, 2)}` },
            { x: 0, text: "0" },
            { x: t, text: formatNum(t, 2) },
          ]}
          label="t density with shaded alpha over 2 tails"
        />
      </figure>
      <PrintOnly>
        <p className={styles.small}>On the website: drag the degrees of freedom. Example: 95% with 15 df gives t = 2.131 versus z = 1.960.</p>
      </PrintOnly>
    </SceneFrame>
  );
}

function TFormulaScene() {
  return (
    <SceneFrame kicker="Population mean · σ unknown" title={tex`Interval estimate of $\mu$ when $\sigma$ is unknown.`}>
      <Formula tex={tex`\bar{x} \pm t_{\alpha/2}\,\dfrac{s}{\sqrt{n}}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text={tex`$t_{\alpha/2}$`} />
          </p>
          <p>
            The <MathText text={tex`$t$`} /> value giving an area of <MathText text={tex`$\alpha/2$`} /> in the upper tail of a{" "}
            <MathText text={tex`$t$`} /> distribution with <MathText text={tex`$n-1$`} /> degrees of freedom.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Other symbols</p>
          <p>
            <MathText text={tex`$1-\alpha$`} /> confidence coefficient · <MathText text={tex`$s$`} /> sample standard deviation.
          </p>
        </article>
      </div>
      <p className={styles.small}>
        Same shape as the σ known interval: swap <MathText text={tex`$\sigma\to s$`} /> and <MathText text={tex`$z\to t$`} />.
      </p>
    </SceneFrame>
  );
}

function RentScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const df = RENT.n - 1;
  const t = tUpper((1 - confidence) / 2, df);
  const margin = (t * RENT.s) / Math.sqrt(RENT.n);
  return (
    <SceneFrame kicker="Example · Apartment rents" title="Mean monthly rent near campus.">
      <p className={styles.lead}>
        A student reporter samples 16 efficiency apartments within half a mile of campus: sample mean 750 dollars per month, sample SD 55 dollars. Build a 95%
        interval for the population mean rent, assuming rents are normally distributed.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Critical value</p>
          <p>
            95% ⇒ <MathText text={tex`$\alpha=.05$`} />, <MathText text={tex`$\alpha/2=.025$`} />. With <MathText text={tex`$n-1=15$`} /> df, software
            gives <MathText text={tex`$t_{.025}=\mathtt{qt}(0.975,15)=2.131$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Interval</p>
          <Formula tex={tex`750\pm 2.131\left(\dfrac{55}{\sqrt{16}}\right)=750\pm 29.30`} />
        </article>
      </div>
      <p className={styles.small}>
        We are 95% confident that the mean rent of all such apartments is between 720.70 and 779.30 dollars. The margin of error is 29.30.
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <Formula
          tex={tex`t_{\alpha/2}\ (15\ \text{df})=${formatNum(t, 3)},\quad 750\pm ${formatNum(margin, 2)} = [${formatNum(RENT.xBar - margin, 2)},\ ${formatNum(RENT.xBar + margin, 2)}]`}
        />
        <CiBar lo={RENT.xBar - margin} hi={RENT.xBar + margin} point={RENT.xBar} domain={[690, 810]} />
      </LiveOnly>
    </SceneFrame>
  );
}

function NonNormalScene() {
  return (
    <SceneFrame kicker="Population mean · σ unknown" title="What if the population is not normal?">
      <p className={styles.lead}>
        The adequate-sample-size rules for <MathText text={tex`$\bar{x}\pm t_{\alpha/2}\,s/\sqrt{n}$`} /> are the same as in the σ known case.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Rules of thumb</p>
          <p>
            <MathText text={tex`$n=30$`} /> adequate in most applications · <MathText text={tex`$n\ge 50$`} /> if highly skewed or with outliers · as small as
            15 if roughly symmetric · below 15 if approximately normal.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Non-normal data</p>
          <p>
            If <MathText text={tex`$n$`} /> is large enough (say <MathText text={tex`$n>30$`} />), or if each <MathText text={tex`$X_i$`} /> is approximately
            normal, the results still hold approximately. Otherwise the method has to be used with caution!
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function ButterfatScene() {
  const xBar = mean(BUTTERFAT);
  const s = sampleSd(BUTTERFAT);
  return (
    <SceneFrame kicker="Example" title="Butterfat from 20 cows.">
      <p className={styles.lead}>
        <MathText text={tex`$X$`} /> = pounds of butterfat produced by a cow over a 305-day milk period, <MathText text={tex`$X\sim N(\mu,\sigma^2)$`} />. A
        farmer measured <MathText text={tex`$n=20$`} /> cows. Find a 90% confidence interval for <MathText text={tex`$\mu$`} />.
      </p>
      <div className={styles.dataGrid}>
        {BUTTERFAT.map((value, i) => (
          <span key={i}>{value}</span>
        ))}
      </div>
      <Formula
        tex={tex`\bar{x}=${formatNum(xBar, 2)},\quad s=${formatNum(s, 2)},\quad t_{0.05}(19)=1.729`}
      />
      <Formula tex={tex`507.50\pm 1.729\left(\dfrac{89.75}{\sqrt{20}}\right)=507.50\pm 34.70\ \Rightarrow\ [472.80,\ 542.20]`} />
      <p className={styles.small}>
        90% two-sided ⇒ upper-tail area <MathText text={tex`$\alpha/2=0.05$`} />. Software gives{" "}
        <MathText text={tex`$t_{0.05}(19)=\mathtt{qt}(0.95,19)=1.729$`} />. The point estimate of <MathText text={tex`$\mu$`} /> is{" "}
        <MathText text={tex`$\bar{x}=507.50$`} />.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// One-sided bounds
// ---------------------------------------------------------------------------

function OneSidedKnownScene() {
  return (
    <SceneFrame kicker="One-sided interval · σ known" title={tex`$100(1-\alpha)\%$ lower or upper bound for a normal mean.`}>
      <p className={styles.lead}>
        Put all of <MathText text={tex`$\alpha$`} /> in one tail, so the critical value is <MathText text={tex`$z_{\alpha}$`} /> (not{" "}
        <MathText text={tex`$z_{\alpha/2}$`} />).
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Lower bound</p>
          <StandardNormalTails crit={1.645} side="upper" label="Upper tail alpha shaded" />
          <Formula tex={tex`P\left\{\dfrac{\bar{X}-\mu}{\sigma/\sqrt{n}}\le z_{\alpha}\right\}=1-\alpha`} />
          <Formula tex={tex`\mu\ \ge\ \bar{x}-z_{\alpha}\dfrac{\sigma}{\sqrt{n}}`} />
          <Formula tex={tex`\Bigl[\bar{x}-z_{\alpha}\dfrac{\sigma}{\sqrt{n}},\ \infty\Bigr)`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Upper bound</p>
          <StandardNormalTails crit={1.645} side="lower" label="Lower tail alpha shaded" />
          <Formula tex={tex`P\left\{-z_{\alpha}\le\dfrac{\bar{X}-\mu}{\sigma/\sqrt{n}}\right\}=1-\alpha`} />
          <Formula tex={tex`\mu\ \le\ \bar{x}+z_{\alpha}\dfrac{\sigma}{\sqrt{n}}`} />
          <Formula tex={tex`\Bigl(-\infty,\ \bar{x}+z_{\alpha}\dfrac{\sigma}{\sqrt{n}}\Bigr]`} />
        </article>
      </div>
      <p className={styles.small}>
        Plots drawn for <MathText text={tex`$\alpha=0.05$`} />, <MathText text={tex`$z_{0.05}=1.645$`} />. These bounds can also be used for the mean of a
        non-normal distribution when <MathText text={tex`$n>30$`} />.
      </p>
    </SceneFrame>
  );
}

function SummaryFlowScene() {
  return (
    <SceneFrame kicker="Summary" title="Interval estimation procedures for a population mean.">
      <div className={styles.flow}>
        <div className={styles.flowQuestion}>
          Can the population standard deviation <MathText text={tex`$\sigma$`} /> be assumed known?
        </div>
        <div className={styles.two}>
          <article className={styles.card}>
            <p className={styles.flowBranch}>YES → σ KNOWN CASE</p>
            <Formula tex={tex`\bar{x}\pm z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}`} />
            <p className={styles.small}>
              Lower: <MathText text={tex`$\bigl[\bar{x}-z_{\alpha}\dfrac{\sigma}{\sqrt{n}},\ \infty\bigr)$`} />
            </p>
            <p className={styles.small}>
              Upper: <MathText text={tex`$\bigl(-\infty,\ \bar{x}+z_{\alpha}\dfrac{\sigma}{\sqrt{n}}\bigr]$`} />
            </p>
          </article>
          <article className={styles.card}>
            <p className={styles.flowBranch}>NO → σ UNKNOWN CASE</p>
            <p className={styles.small}>
              Use the sample standard deviation <MathText text={tex`$s$`} /> to estimate <MathText text={tex`$\sigma$`} />.
            </p>
            <Formula tex={tex`\bar{x}\pm t_{\alpha/2}\dfrac{s}{\sqrt{n}}`} />
            <p className={styles.small}>
              Lower: <MathText text={tex`$\bigl[\bar{x}-t_{\alpha}(n-1)\dfrac{s}{\sqrt{n}},\ \infty\bigr)$`} />
            </p>
            <p className={styles.small}>
              Upper: <MathText text={tex`$\bigl(-\infty,\ \bar{x}+t_{\alpha}(n-1)\dfrac{s}{\sqrt{n}}\bigr]$`} />
            </p>
          </article>
        </div>
      </div>
    </SceneFrame>
  );
}

function ContainerScene() {
  const z = 1.645;
  const margin = (z * 15) / Math.sqrt(20);
  return (
    <SceneFrame kicker="Example" title="Strength of a plastic beverage container.">
      <p className={styles.lead}>
        Strengths are normal with known SD <MathText text={tex`$\sigma=15$`} /> psi. A sample of <MathText text={tex`$n=20$`} /> containers has mean{" "}
        <MathText text={tex`$\bar{x}=246$`} /> psi. Compute the 95% lower confidence bound for the process mean.
      </p>
      <Formula tex={tex`\alpha=0.05,\quad 1-\alpha=0.95,\quad z_{\alpha}=z_{0.05}=1.645`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Lower bound (asked)</p>
          <Formula tex={tex`\mu\ge 246-1.645\times\dfrac{15}{\sqrt{20}}=240.48`} />
          <p>
            Interval <MathText text={tex`$[240.48,\ \infty)$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Upper bound (for comparison)</p>
          <Formula tex={tex`\mu\le 246+1.645\times\dfrac{15}{\sqrt{20}}=251.52`} />
          <p>
            Interval <MathText text={tex`$(-\infty,\ 251.52]$`} />.
          </p>
        </article>
      </div>
      <CiBar lo={246 - margin} hi={Infinity} point={246} domain={[230, 262]} />
      <p className={styles.small}>A buyer who only cares that containers are strong enough needs the lower bound: “the mean strength is at least 240.48 psi.”</p>
    </SceneFrame>
  );
}

function OneSidedUnknownScene() {
  return (
    <SceneFrame kicker="One-sided interval · σ unknown" title={tex`One-sided bounds with $s$ and $t_{\alpha}(n-1)$.`}>
      <Formula tex={tex`X_1,\dots,X_n\sim N(\mu,\sigma^2)\ \Rightarrow\ \dfrac{\bar{X}-\mu}{S/\sqrt{n}}\sim t(n-1)`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Upper confidence bound</p>
          <Formula tex={tex`\mu\ \le\ \bar{x}+t_{\alpha}(n-1)\,\dfrac{s}{\sqrt{n}}`} />
          <Formula tex={tex`\Bigl(-\infty,\ \bar{x}+t_{\alpha}(n-1)\,\dfrac{s}{\sqrt{n}}\Bigr]`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Lower confidence bound</p>
          <Formula tex={tex`\mu\ \ge\ \bar{x}-t_{\alpha}(n-1)\,\dfrac{s}{\sqrt{n}}`} />
          <Formula tex={tex`\Bigl[\bar{x}-t_{\alpha}(n-1)\,\dfrac{s}{\sqrt{n}},\ \infty\Bigr)`} />
        </article>
      </div>
      <p className={styles.small}>
        Same pattern as before: one-sided uses the upper-tail area <MathText text={tex`$\alpha$`} />, two-sided uses <MathText text={tex`$\alpha/2$`} />.
      </p>
    </SceneFrame>
  );
}

const ALLOY = [19.8, 10.1, 14.9, 7.5, 15.4, 15.4, 15.4, 18.5, 7.9, 12.7, 11.9, 11.4, 11.4, 14.1, 17.6, 16.7, 15.8, 19.5, 8.8, 13.6, 11.9, 11.4];

function AlloyScene() {
  const n = ALLOY.length;
  const t = tUpper(0.05, n - 1);
  const margin = (t * 3.55) / Math.sqrt(n);
  return (
    <SceneFrame kicker="Example" title="Load at failure of U-700 alloy specimens.">
      <p className={styles.lead}>
        Tensile adhesion tests on 22 alloy specimens (<em>Materials Engineering</em>, 1989) give loads at failure in megapascals. Construct a 95% lower
        confidence bound for the mean load.
      </p>
      <div className={styles.dataGrid}>
        {ALLOY.map((value, i) => (
          <span key={i}>{formatNum(value, 1)}</span>
        ))}
      </div>
      <Formula
        tex={tex`\bar{x}=13.71,\quad s=3.55,\quad n=22,\quad t_{\alpha}(n-1)=t_{0.05}(21)=${formatNum(t, 3)}\approx 1.72`}
      />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Lower bound (asked)</p>
          <Formula tex={tex`\mu\ge 13.71-1.72\times\dfrac{3.55}{\sqrt{22}}=12.41`} />
          <p>
            Interval <MathText text={tex`$[12.41,\ \infty)$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Upper bound (for comparison)</p>
          <Formula tex={tex`\mu\le 13.71+1.72\times\dfrac{3.55}{\sqrt{22}}=15.01`} />
          <p>
            Interval <MathText text={tex`$(-\infty,\ 15.01]$`} />.
          </p>
        </article>
      </div>
      <CiBar lo={13.71 - margin} hi={Infinity} point={13.71} domain={[10, 17]} />
    </SceneFrame>
  );
}

type Side = "two" | "lower" | "upper";

function CaseLabScene() {
  const [seed, setSeed] = useState(3);
  const [n, setN] = useState(15);
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const [normal, setNormal] = useState(true);
  const [known, setKnown] = useState(true);
  const [side, setSide] = useState<Side>("two");
  const mu = 0;
  const sigma = 1;
  const trials = 400;
  const showBars = 30;
  const alpha = 1 - confidence;
  const tail = side === "two" ? alpha / 2 : alpha;
  const crit = known ? zUpper(tail) : tUpper(tail, n - 1);

  const sim = useMemo(() => {
    const rng = mulberry32(seed * 7919 + n);
    let hits = 0;
    const bars: SimInterval[] = [];
    for (let i = 0; i < trials; i += 1) {
      const sample = Array.from({ length: n }, () => (normal ? sampleNormal(mu, sigma, rng) : sampleSkewed(mu, sigma, 2, rng)));
      const xBar = mean(sample);
      const spread = known ? sigma : sampleSd(sample);
      const margin = (crit * spread) / Math.sqrt(n);
      const lo = side === "upper" ? -Infinity : xBar - margin;
      const hi = side === "lower" ? Infinity : xBar + margin;
      const covers = lo <= mu && mu <= hi;
      if (covers) hits += 1;
      if (i < showBars) bars.push({ lo, hi, covers });
    }
    return { rate: hits / trials, bars };
  }, [seed, n, normal, known, side, crit]);

  const statistic = known ? tex`z` : tex`t`;
  const critTex = side === "two" ? tex`${statistic}_{\alpha/2}` : tex`${statistic}_{\alpha}`;
  const spreadTex = known ? tex`\sigma` : tex`s`;
  const formula =
    side === "two"
      ? tex`\bar{x}\pm ${critTex}\,${spreadTex}/\sqrt{n}`
      : side === "lower"
        ? tex`\mu\ge\bar{x}-${critTex}\,${spreadTex}/\sqrt{n}`
        : tex`\mu\le\bar{x}+${critTex}\,${spreadTex}/\sqrt{n}`;

  return (
    <SceneFrame kicker="Game" title="Interval lab: σ known or unknown, normal or skewed, one- or two-sided." tone="gold">
      <p className={styles.lead}>
        Each bar is one simulated interval for a true mean <MathText text={tex`$\mu=0$`} /> (population SD 1). The skewed population has skewness 2, like an
        exponential. Watch the coverage when <MathText text={tex`$n$`} /> is small and the data are skewed.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button type="button" className={normal ? styles.toolBtnActive : styles.toolBtn} onClick={() => setNormal(true)}>
            Normal population
          </button>
          <button type="button" className={!normal ? styles.toolBtnActive : styles.toolBtn} onClick={() => setNormal(false)}>
            Skewed population
          </button>
          <button type="button" className={known ? styles.toolBtnActive : styles.toolBtn} onClick={() => setKnown(true)}>
            <MathText text="σ known (z)" />
          </button>
          <button type="button" className={!known ? styles.toolBtnActive : styles.toolBtn} onClick={() => setKnown(false)}>
            <MathText text="σ unknown (t)" />
          </button>
        </div>
        <div className={styles.tools}>
          {(["two", "lower", "upper"] as Side[]).map((option) => (
            <button key={option} type="button" className={side === option ? styles.toolBtnActive : styles.toolBtn} onClick={() => setSide(option)}>
              {option === "two" ? "Two-sided" : option === "lower" ? "Lower bound" : "Upper bound"}
            </button>
          ))}
          {CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={level === confidence ? styles.toolBtnActive : styles.toolBtn}
              onClick={() => setConfidence(level)}
            >
              {Math.round(level * 100)}%
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={5} max={80} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <button type="button" className={styles.toolBtn} onClick={() => setSeed((s) => s + 1)}>
            New samples
          </button>
        </div>
      </LiveOnly>
      <Formula tex={formula} />
      <p>
        Critical value {formatNum(crit, 3)} · coverage <strong>{formatNum(100 * sim.rate, 1)}%</strong> of {trials} intervals (target{" "}
        {Math.round(confidence * 100)}%).
      </p>
      <figure className={styles.figure}>
        <IntervalStack intervals={sim.bars} mu={mu} halfRange={1.6} label="Simulated intervals" />
        <figcaption className={styles.small}>First {showBars} intervals. One-sided bars run off the edge on their open side.</figcaption>
      </figure>
      <PrintOnly>
        <p className={styles.small}>
          On the website: switch population shape, σ known/unknown, and one- or two-sided. Normal populations hit the target at any n; skewed populations
          with small n drift away from it, and recover as n grows past about 30.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

type McSituation = { title: string; story: string; options: string[]; answer: number; why: string };

const letter = (j: number) => String.fromCharCode(65 + j);

const SITUATIONS: McSituation[] = [
  {
    title: "Mall foot traffic",
    story:
      "A mall manager has five years of daily visitor counts and trusts their population standard deviation. She samples 40 recent days and wants an interval for the mean daily traffic.",
    options: [
      "Two-sided z-interval (σ known)",
      "Two-sided t-interval (σ unknown)",
      "One-sided lower bound only",
      "One-sided upper bound only",
    ],
    answer: 0,
    why: "A reliable historical σ ⇒ two-sided z-interval with that σ (σ known case).",
  },
  {
    title: "New café receipts",
    story:
      "A café opened last month. The owner has 18 roughly bell-shaped receipts and no earlier data on spending variability. She wants an interval for the mean spend.",
    options: [
      "Two-sided z-interval (σ known)",
      "Two-sided t-interval (σ unknown)",
      "CI for a proportion",
      "One-sided upper bound only",
    ],
    answer: 1,
    why: "No prior σ ⇒ estimate it with s and use the t-interval with n − 1 = 17 df (σ unknown case).",
  },
  {
    title: "Cable breaking strength",
    story:
      "A buyer only needs assurance that the mean breaking strength is high enough (“at least …”). The supplier’s σ is known. What kind of bound should you report?",
    options: [
      "Two-sided CI for μ",
      "One-sided lower bound for μ",
      "One-sided upper bound for μ",
      "CI for a proportion p",
    ],
    answer: 1,
    why: "Only a floor on μ matters ⇒ one-sided lower bound x̄ − z_α σ/√n.",
  },
  {
    title: "Hospital waiting times",
    story:
      "A clinic wants to advertise that average wait is not too long. Management only cares about an upper limit on the mean wait; a lower limit is irrelevant.",
    options: [
      "Two-sided CI for μ",
      "One-sided lower bound for μ",
      "One-sided upper bound for μ",
      "Sample-size formula for E only",
    ],
    answer: 2,
    why: "Only “no larger than” matters ⇒ one-sided upper bound x̄ + z_α σ/√n (or t if σ is estimated).",
  },
  {
    title: "Entrance-exam mean",
    story:
      "Admissions wants a 90% interval that both under- and over-states the mean score with equal error budget.",
    options: [
      "One-sided lower bound",
      "One-sided upper bound",
      "Two-sided CI for μ",
      "CI for the difference of two means",
    ],
    answer: 2,
    why: "Both sides matter equally ⇒ two-sided CI x̄ ± (critical value) × (SE).",
  },
];

function WhichIntervalScene() {
  const print = usePrintMode();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const situation = SITUATIONS[index];

  if (print) {
    return (
      <SceneFrame kicker="Game" title="Which interval fits the story?" tone="gold">
        <div className={styles.promptList}>
          {SITUATIONS.map((item) => (
            <article key={item.title} className={styles.promptItem}>
              <strong>{item.title}</strong>
              <p>{item.story}</p>
              <p>
                {item.options.map((opt, j) => (
                  <span key={opt}>
                    {letter(j)}. <MathText text={opt} />
                    {"   "}
                  </span>
                ))}
              </p>
              <p className={styles.small}>
                <strong>Answer {letter(item.answer)}.</strong> {item.why}
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
    <SceneFrame kicker="Game" title="Which interval fits the story?" tone="gold">
      <p className={styles.muted}>
        Situation {index + 1} of {SITUATIONS.length} · Live Poll A–D
      </p>
      <article className={styles.card}>
        <p className={styles.kicker}>{situation.title}</p>
        <p>{situation.story}</p>
      </article>
      <div className={styles.tools}>
        {situation.options.map((opt, j) => (
          <button key={opt} type="button" className={picked === j ? styles.toolBtnActive : styles.toolBtn} onClick={() => setPicked(j)}>
            {letter(j)}. <MathText text={opt} />
          </button>
        ))}
      </div>
      {picked != null ? (
        <p>
          {picked === situation.answer ? (
            <>
              Right — {letter(situation.answer)}. {situation.why}
            </>
          ) : (
            <>
              Not quite: answer is {letter(situation.answer)}. {situation.why}
            </>
          )}
        </p>
      ) : null}
      <div className={styles.tools}>
        <button type="button" className={styles.toolBtn} disabled={index === 0} onClick={() => go(index - 1)}>
          Previous
        </button>
        <button type="button" className={styles.toolBtn} disabled={index === SITUATIONS.length - 1} onClick={() => go(index + 1)}>
          Next
        </button>
      </div>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Practice with AI · one-sided CI for mean return
// ---------------------------------------------------------------------------

function AiPracticeAppleCiScene() {
  return (
    <SceneFrame kicker="Practice with AI" title="One-sided 95% CIs for Apple’s mean daily return." tone="white">
      <p className={styles.lead}>
        End of the one-sided material: download real returns, then build a lower (and, for comparison, an upper) 95%
        bound for the <strong>mean</strong> daily return — once treating <MathText text="$s$" /> like a known{" "}
        <MathText text="σ" /> (normal / <MathText text="$z$" />), and once with the{" "}
        <MathText text="$t$" /> interval.
      </p>
      <p className={styles.note}>
        <strong>You may try:</strong> paste the prompt into{" "}
        <a href="https://copilot.microsoft.com/" target="_blank" rel="noopener noreferrer">
          Microsoft Copilot
        </a>{" "}
        (copilot.microsoft.com), then run the Python in{" "}
        <a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer">
          Google Colab
        </a>{" "}
        (colab.research.google.com) — download any files, and still read the code so you know what the assistant did.
      </p>
      <p className={styles.kicker} style={{ marginTop: 18 }}>
        EXAMPLE PROMPT · COPY AND ADAPT
      </p>
      <pre className={styles.promptCard}>{`Step 1 — download returns
Use Python and the akshare package to download Apple (AAPL) daily stock prices
for the past 3 months. Compute daily simple returns
  r_t = Close_t / Close_{t-1} - 1
(or log returns if you prefer; say which). Save the return series as a CSV
(e.g. aapl_returns_3m.csv). Show n, the sample mean x̄, the sample SD s,
the first few rows, and a histogram.

Step 2 — 95% one-sided confidence intervals for the mean return μ
Using the same x̄, s, and n, compute and print:
  (a) Normal / z (treat s as if σ were known):
        lower bound  x̄ - z_{0.05} * s / sqrt(n)
        upper bound  x̄ + z_{0.05} * s / sqrt(n)
      with z_{0.05} = 1.645
  (b) Student-t (σ unknown):
        lower bound  x̄ - t_{0.05}(n-1) * s / sqrt(n)
        upper bound  x̄ + t_{0.05}(n-1) * s / sqrt(n)
State the intervals as [L, +∞) and (−∞, U]. Briefly compare the z and t bounds.`}</pre>
      <p className={styles.note}>
        <strong>Check before you continue:</strong> you must divide by <MathText text="$\sqrt{n}$" /> (this is a CI for{" "}
        <MathText text="μ" />, not a quantile of a single day’s return). Comment on whether daily returns look roughly
        normal, and how honest the normal / <MathText text="$z$" /> bounds are when <MathText text="σ" /> is really
        estimated from the same sample.
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Sample size for a mean
// ---------------------------------------------------------------------------

function SampleSizeMeanScene() {
  return (
    <SceneFrame kicker="Sample size · mean" title="Choose the margin of error first, then solve for n.">
      <p className={styles.lead}>
        Let <MathText text={tex`$E$`} /> be the desired margin of error: the amount added to and subtracted from the point estimate. If <MathText text={tex`$E$`} />{" "}
        is chosen before sampling, we can find the sample size that achieves it.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Margin of error</p>
          <Formula tex={tex`E=z_{\alpha/2}\dfrac{\sigma}{\sqrt{n}}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Necessary sample size</p>
          <Formula tex={tex`n=\dfrac{(z_{\alpha/2})^2\sigma^2}{E^2}`} />
        </article>
      </div>
      <p className={styles.small}>Always round n up to the next whole number, so the margin is no larger than E.</p>
    </SceneFrame>
  );
}

function PlanningSigmaScene() {
  return (
    <SceneFrame kicker="Sample size · mean" title={tex`The formula needs $\sigma$ before we have data.`}>
      <p className={styles.lead}>
        If <MathText text={tex`$\sigma$`} /> is unknown, use a preliminary or <strong>planning value</strong> for <MathText text={tex`$\sigma$`} />:
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Previous study</p>
          <p>Use the estimate of the population SD computed in a previous study.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Pilot study</p>
          <p>Select a preliminary sample and use its sample standard deviation.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Judgment</p>
          <p>
            Use judgment or a “best guess” for <MathText text={tex`$\sigma$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function HmvSampleSizeScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const [sigma, setSigma] = useState(4500);
  const [error, setError] = useState(500);
  const z = zUpper((1 - confidence) / 2);
  const raw = (z * z * sigma * sigma) / (error * error);
  return (
    <SceneFrame kicker="Example · HMV" title="How many incomes must HMV sample?">
      <p className={styles.lead}>
        HMV&apos;s management wants a 0.95 probability that the sampling error is 500 dollars or less. Recall <MathText text={tex`$\sigma=4{,}500$`} /> and{" "}
        <MathText text={tex`$z_{.025}=1.96$`} />.
      </p>
      <Formula tex={tex`n=\dfrac{(1.96)^2(4{,}500)^2}{(500)^2}=311.17\ \Rightarrow\ 312`} />
      <p className={styles.small}>A sample of 312 is needed to reach a precision of ±500 dollars at 95% confidence.</p>
      <LiveOnly>
        <p className={styles.kicker}>Sample size planner</p>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <div className={styles.tools}>
          <label className={styles.slider}>
            Planning σ = {formatMoney(sigma)}
            <input type="range" min={1000} max={9000} step={100} value={sigma} onChange={(e) => setSigma(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Margin of error E = {formatMoney(error)}
            <input type="range" min={100} max={2000} step={50} value={error} onChange={(e) => setError(Number(e.target.value))} />
          </label>
        </div>
        <Formula
          tex={tex`n=\dfrac{(${formatNum(z, 3)})^2(${formatMoney(sigma)})^2}{(${formatMoney(error)})^2}=${formatNum(raw, 2)}\ \Rightarrow\ ${Math.ceil(raw - 1e-9)}`}
        />
        <p className={styles.small}>Halving E multiplies n by about 4; going from 95% to 99% multiplies it by about 1.73.</p>
      </LiveOnly>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Proportion
// ---------------------------------------------------------------------------

function PropSamplingScene() {
  const z = 1.96;
  return (
    <SceneFrame kicker="Population proportion" title={tex`The sampling distribution of $\hat{p}$ sets the margin of error.`}>
      <p className={styles.lead}>
        The sampling distribution of <MathText text={tex`$\hat{p}$`} /> can be approximated by a normal distribution whenever{" "}
        <MathText text={tex`$np>5$`} /> and <MathText text={tex`$n(1-p)>5$`} />.
      </p>
      <Formula tex={tex`\sigma_{\hat{p}}=\sqrt{\dfrac{p(1-p)}{n}}`} />
      <figure className={styles.figure}>
        <DensityPlot
          curves={[{ pdf: stdNormalPdf, color: "#16213c" }]}
          xMin={-4}
          xMax={4}
          shades={[{ from: -z, to: z, color: "rgba(46, 113, 144, 0.3)" }, { from: -4, to: -z }, { from: z, to: 4 }]}
          marks={[
            { x: -z, text: "p − z(α/2)σ", sub: "p̂" },
            { x: 0, text: "p" },
            { x: z, text: "p + z(α/2)σ", sub: "p̂" },
          ]}
          notes={[
            { x: 0, y: 0.35, text: "1 − α of all p̂ values" },
            { x: 2.6, y: 0.14, text: "α/2" },
            { x: -2.6, y: 0.14, text: "α/2" },
          ]}
          label="Normal approximation of the sampling distribution of p-hat"
        />
      </figure>
    </SceneFrame>
  );
}

function PropFormulaScene() {
  return (
    <SceneFrame kicker="Population proportion" title="Interval estimate of a population proportion.">
      <Formula tex={tex`\hat{p}\pm z_{\alpha/2}\sqrt{\dfrac{\hat{p}(1-\hat{p})}{n}}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Symbols</p>
          <p>
            <MathText text={tex`$\hat{p}$`} /> sample proportion · <MathText text={tex`$1-\alpha$`} /> confidence coefficient ·{" "}
            <MathText text={tex`$z_{\alpha/2}$`} /> upper-tail <MathText text={tex`$\alpha/2$`} /> value of the standard normal.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Why p̂ inside the root?</p>
          <p>
            <MathText text={tex`$\sigma_{\hat{p}}$`} /> depends on the unknown <MathText text={tex`$p$`} />, so we plug in the estimate{" "}
            <MathText text={tex`$\hat{p}$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function PsiScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.95);
  const [n, setN] = useState(PSI.n);
  const [x, setX] = useState(PSI.x);
  const successes = Math.min(x, n);
  const pHat = successes / n;
  const z = zUpper((1 - confidence) / 2);
  const margin = z * Math.sqrt((pHat * (1 - pHat)) / n);
  return (
    <SceneFrame kicker="Example · Political Science, Inc." title="What share of voters favour the candidate?">
      <p className={styles.lead}>
        PSI runs telephone polls of registered voters. In a current campaign, 220 of 500 voters contacted favour a particular candidate. Find a 95% interval for
        the proportion of all registered voters who favour the candidate.
      </p>
      <Formula tex={tex`\hat{p}=\dfrac{220}{500}=.44,\qquad .44\pm 1.96\sqrt{\dfrac{.44(1-.44)}{500}}=.44\pm .0435`} />
      <p className={styles.small}>
        PSI is 95% confident that the proportion of all voters favouring the candidate is between .3965 and .4835. Check:{" "}
        <MathText text={tex`$n\hat{p}=220>5$`} /> and <MathText text={tex`$n(1-\hat{p})=280>5$`} />.
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <div className={styles.tools}>
          <label className={styles.slider}>
            Voters contacted n = {n}
            <input type="range" min={50} max={2000} step={10} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            In favour x = {successes}
            <input type="range" min={0} max={n} value={successes} onChange={(e) => setX(Number(e.target.value))} />
          </label>
        </div>
        <Formula
          tex={tex`\hat{p}=${formatNum(pHat, 3)},\quad \text{margin}=${formatNum(margin, 4)},\quad [${formatNum(pHat - margin, 4)},\ ${formatNum(pHat + margin, 4)}]`}
        />
        <CiBar lo={pHat - margin} hi={pHat + margin} point={pHat} domain={[0, 1]} digits={2} />
        {n * pHat <= 5 || n * (1 - pHat) <= 5 ? (
          <p className={styles.small}>Warning: np̂ or n(1 − p̂) is not above 5, so the normal approximation is doubtful.</p>
        ) : null}
      </LiveOnly>
    </SceneFrame>
  );
}

function PropSampleSizeScene() {
  return (
    <SceneFrame kicker="Sample size · proportion" title="Necessary sample size for a proportion.">
      <Formula tex={tex`E=z_{\alpha/2}\sqrt{\dfrac{p^*(1-p^*)}{n}}\quad\Longrightarrow\quad n=\dfrac{(z_{\alpha/2})^2\,p^*(1-p^*)}{E^2}`} />
      <p className={styles.lead}>
        The planning value <MathText text={tex`$p^*$`} /> can be chosen by:
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Previous sample</p>
          <p>The sample proportion from a previous sample of the same or similar units.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Pilot sample</p>
          <p>Select a preliminary sample and use its sample proportion.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Judgment</p>
          <p>
            Judgment or a “best guess” for <MathText text={tex`$p^*$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>4 · Otherwise</p>
          <p>
            Use <MathText text={tex`$p^*=.50$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function PsiSampleSizeScene() {
  const [confidence, setConfidence] = useState<Confidence>(0.99);
  const [pStar, setPStar] = useState(0.44);
  const [error, setError] = useState(0.03);
  const z = zUpper((1 - confidence) / 2);
  const raw = (z * z * pStar * (1 - pStar)) / (error * error);
  const curve = (p: number) => (z * z * p * (1 - p)) / (error * error);
  const W = 560;
  const H = 180;
  const peak = curve(0.5) * 1.1;
  const xOf = (p: number) => 30 + p * (W - 60);
  const yOf = (v: number) => H - 30 - (v / peak) * (H - 50);
  const path = Array.from({ length: 101 }, (_, i) => i / 100)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p).toFixed(2)} ${yOf(curve(p)).toFixed(2)}`)
    .join(" ");
  return (
    <SceneFrame kicker="Example · Political Science, Inc." title="How many voters for ±.03 at 99% confidence?">
      <p className={styles.lead}>
        PSI wants a .99 probability that the sample proportion is within .03 of the population proportion. A previous sample of similar units gave .44.
      </p>
      <Formula tex={tex`n=\dfrac{(2.576)^2(.44)(.56)}{(.03)^2}=1816.7\ \Rightarrow\ 1817`} />
      <p className={styles.small}>
        With no information about <MathText text={tex`$p$`} />, use <MathText text={tex`$p^*=.5$`} />: it gives the largest possible sample size,{" "}
        <MathText text={tex`$(2.576)^2(.25)/(.03)^2=1843.3$`} />, so about 1,844 voters (the textbook rounds this to 1,843).
      </p>
      <LiveOnly>
        <ConfidencePicker value={confidence} onChange={setConfidence} />
        <div className={styles.tools}>
          <label className={styles.slider}>
            Planning value p* = {formatNum(pStar, 2)}
            <input type="range" min={0.05} max={0.95} step={0.01} value={pStar} onChange={(e) => setPStar(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Margin of error E = {formatNum(error, 3)}
            <input type="range" min={0.01} max={0.1} step={0.005} value={error} onChange={(e) => setError(Number(e.target.value))} />
          </label>
        </div>
        <Formula tex={tex`n=\dfrac{(${formatNum(z, 3)})^2(${formatNum(pStar, 2)})(${formatNum(1 - pStar, 2)})}{(${formatNum(error, 3)})^2}=${formatNum(raw, 1)}\ \Rightarrow\ ${Math.ceil(raw - 1e-9)}`} />
      </LiveOnly>
      <figure className={styles.figure}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Required sample size as a function of the planning value">
          <path d={path} fill="none" stroke="#16213c" strokeWidth="2.5" />
          <line x1={30} x2={W - 30} y1={H - 30} y2={H - 30} stroke="#16213c" strokeWidth="1.5" />
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <text key={p} x={xOf(p)} y={H - 12} textAnchor="middle" fontSize="12" fill="#16213c">
              {p}
            </text>
          ))}
          <circle cx={xOf(pStar)} cy={yOf(raw)} r="6" fill="#df4a3e" />
          <text x={xOf(pStar)} y={yOf(raw) - 10} textAnchor="middle" fontSize="12" fill="#16213c">
            n = {Math.ceil(raw - 1e-9)}
          </text>
        </svg>
        <figcaption className={styles.small}>
          Required n against the planning value <MathText text={tex`$p^*$`} />. The curve <MathText text={tex`$p^*(1-p^*)$`} /> peaks at{" "}
          <MathText text={tex`$p^*=.5$`} />, so .5 is the safe choice.
        </figcaption>
      </figure>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Difference of two means
// ---------------------------------------------------------------------------

function TwoMeansScene() {
  return (
    <SceneFrame kicker="Two populations · known variances" title={tex`Two-sided interval for $\mu_X-\mu_Y$.`}>
      <p className={styles.lead}>Two independent random samples from two normal distributions with known variances:</p>
      <Formula
        tex={tex`X_1,\dots,X_n\sim N(\mu_X,\sigma_X^2),\ \ Y_1,\dots,Y_m\sim N(\mu_Y,\sigma_Y^2)\ \Rightarrow\ \bar{X}-\bar{Y}\sim N\!\left(\mu_X-\mu_Y,\ \dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}\right)`}
      />
      <Formula
        tex={tex`P\left\{-z_{\alpha/2}\le\dfrac{\bar{X}-\bar{Y}-(\mu_X-\mu_Y)}{\sqrt{\sigma_X^2/n+\sigma_Y^2/m}}\le z_{\alpha/2}\right\}=1-\alpha`}
      />
      <Formula
        tex={tex`\bar{x}-\bar{y}-z_{\alpha/2}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}\ \le\ \mu_X-\mu_Y\ \le\ \bar{x}-\bar{y}+z_{\alpha/2}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}`}
      />
      <p className={styles.small}>
        This interval can also be used for non-normal distributions when <MathText text={tex`$n,m>30$`} />.
      </p>
    </SceneFrame>
  );
}

function MachinesScene() {
  const xBar = mean(MACHINE_1);
  const yBar = mean(MACHINE_2);
  const se = Math.sqrt(0.02 ** 2 / 10 + 0.025 ** 2 / 10);
  const margin = 1.96 * se;
  const diff = xBar - yBar;
  return (
    <SceneFrame kicker="Example" title="Do two filling machines fill to the same mean?">
      <p className={styles.lead}>
        Two machines fill plastic bottles with a net volume of 16.0 ounces. Fill volumes are normal with <MathText text={tex`$\sigma_1=0.020$`} /> and{" "}
        <MathText text={tex`$\sigma_2=0.025$`} /> ounces. Ten bottles are sampled from each machine. Calculate a 95% interval on the difference in means and
        interpret it.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Machine 1</p>
          <div className={styles.dataGrid}>
            {MACHINE_1.map((value, i) => (
              <span key={i}>{formatNum(value, 2)}</span>
            ))}
          </div>
          <p>
            <MathText text={tex`$\bar{x}=${formatNum(xBar, 3)}$`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Machine 2</p>
          <div className={styles.dataGrid}>
            {MACHINE_2.map((value, i) => (
              <span key={i}>{formatNum(value, 2)}</span>
            ))}
          </div>
          <p>
            <MathText text={tex`$\bar{y}=${formatNum(yBar, 3)}$`} />
          </p>
        </article>
      </div>
      <Formula
        tex={tex`\bar{x}-\bar{y}\pm 1.96\sqrt{\dfrac{0.020^2}{10}+\dfrac{0.025^2}{10}}=${formatNum(diff, 3)}\pm ${formatNum(margin, 4)}\ \Rightarrow\ [-0.0098,\ 0.0298]`}
      />
      <CiBar lo={diff - margin} hi={diff + margin} point={diff} domain={[-0.04, 0.06]} truth={0} digits={2} />
      <p className={styles.small}>
        Interpretation: the interval contains 0 (dashed line), so the data are consistent with both machines filling to the same mean volume.
      </p>
    </SceneFrame>
  );
}

function TwoMeansOneSidedScene() {
  return (
    <SceneFrame kicker="Two populations · known variances" title={tex`One-sided bounds for $\mu_X-\mu_Y$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Lower bound</p>
          <StandardNormalTails crit={1.645} side="upper" label="Upper tail alpha shaded" />
          <Formula tex={tex`\bar{x}-\bar{y}-z_{\alpha}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}\ \le\ \mu_X-\mu_Y`} />
          <Formula
            tex={tex`\Bigl[\bar{x}-\bar{y}-z_{\alpha}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}},\ \infty\Bigr)`}
          />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Upper bound</p>
          <StandardNormalTails crit={1.645} side="lower" label="Lower tail alpha shaded" />
          <Formula tex={tex`\mu_X-\mu_Y\ \le\ \bar{x}-\bar{y}+z_{\alpha}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}`} />
          <Formula
            tex={tex`\Bigl(-\infty,\ \bar{x}-\bar{y}+z_{\alpha}\sqrt{\dfrac{\sigma_X^2}{n}+\dfrac{\sigma_Y^2}{m}}\Bigr]`}
          />
        </article>
      </div>
      <p className={styles.small}>
        Same recipe as for one mean: one-sided bounds use <MathText text={tex`$z_{\alpha}$`} />. Valid for non-normal distributions when{" "}
        <MathText text={tex`$n,m>30$`} />.
      </p>
    </SceneFrame>
  );
}

function DiffMeansSetupScene() {
  return (
    <SceneFrame kicker="Two means · σ unknown" title={tex`Three designs for $\mu_X-\mu_Y$.`}>
      <p className={styles.lead}>
        When the variances are unknown, the right interval depends on the sampling design — not only on the research question.
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>Pooled t</p>
          <p>
            Independent samples, common unknown variance <MathText text={tex`$\sigma_X^2=\sigma_Y^2=\sigma^2$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Welch t</p>
          <p>Independent samples, unequal unknown variances (safer default if equality is doubtful).</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Paired t</p>
          <p>
            Within-pair dependence; work with differences <MathText text={tex`$D_i=X_i-Y_i$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function PooledCiScene() {
  return (
    <SceneFrame kicker="Pooled t-interval" title={tex`Equal unknown variances for $\mu_X-\mu_Y$.`}>
      <p className={styles.lead}>
        Independent <MathText text={tex`$N(\mu_X,\sigma^2)$`} /> and <MathText text={tex`$N(\mu_Y,\sigma^2)$`} /> samples. A{" "}
        <MathText text={tex`$100(1-\alpha)\%$`} /> CI is
      </p>
      <Formula tex={tex`\bar{x}-\bar{y}\pm t_{\alpha/2}(n+m-2)\,s_p\sqrt{\dfrac{1}{n}+\dfrac{1}{m}}`} />
      <p>with pooled variance estimator</p>
      <Formula tex={tex`s_p^2=\dfrac{(n-1)s_X^2+(m-1)s_Y^2}{n+m-2}`} />
      <p className={styles.small}>
        <MathText text={tex`$s_p^2$`} /> is unbiased for the common <MathText text={tex`$\sigma^2$`} />. Degrees of freedom:{" "}
        <MathText text={tex`$n+m-2$`} />.
      </p>
    </SceneFrame>
  );
}

function PooledExampleScene() {
  const n = 9;
  const m = 15;
  const xBar = 81.31;
  const yBar = 78.61;
  const sx2 = 60.76;
  const sy2 = 48.24;
  const sp2 = ((n - 1) * sx2 + (m - 1) * sy2) / (n + m - 2);
  const sp = Math.sqrt(sp2);
  const se = sp * Math.sqrt(1 / n + 1 / m);
  const t = tUpper(0.025, n + m - 2);
  const half = t * se;
  const diff = xBar - yBar;
  return (
    <SceneFrame kicker="Example · pooled t" title="Mean test scores at two schools.">
      <p className={styles.lead}>
        Large school <MathText text={tex`$X$`} />: <MathText text={tex`$n=9$`} />, <MathText text={tex`$\bar{x}=81.31$`} />,{" "}
        <MathText text={tex`$s_X^2=60.76$`} />. Small school <MathText text={tex`$Y$`} />: <MathText text={tex`$m=15$`} />,{" "}
        <MathText text={tex`$\bar{y}=78.61$`} />, <MathText text={tex`$s_Y^2=48.24$`} />. Assume a common unknown variance and form a 95% CI for{" "}
        <MathText text={tex`$\mu_X-\mu_Y$`} />.
      </p>
      <Formula
        tex={tex`s_p=\sqrt{\dfrac{8\cdot 60.76+14\cdot 48.24}{22}}=${formatNum(sp, 3)},\quad t_{0.025}(22)=${formatNum(t, 3)}`}
      />
      <Formula
        tex={tex`81.31-78.61\pm ${formatNum(t, 3)}\,s_p\sqrt{\tfrac{1}{9}+\tfrac{1}{15}}=[${formatNum(diff - half, 2)},\ ${formatNum(diff + half, 2)}]`}
      />
      <CiBar lo={diff - half} hi={diff + half} point={diff} domain={[-6, 12]} truth={0} digits={2} />
      <p className={styles.small}>The interval covers 0, so these data do not show a clear mean gap under the pooled model.</p>
    </SceneFrame>
  );
}

function WelchCiScene() {
  return (
    <SceneFrame kicker="Welch t-interval" title={tex`Unequal unknown variances for $\mu_X-\mu_Y$.`}>
      <p className={styles.lead}>Approximate CI (do not pool the sample variances):</p>
      <Formula tex={tex`\bar{x}-\bar{y}\pm t_{\alpha/2}(r)\sqrt{\dfrac{s_X^2}{n}+\dfrac{s_Y^2}{m}}`} />
      <p>with (floored) Welch–Satterthwaite degrees of freedom</p>
      <Formula
        tex={tex`r=\left\lfloor\dfrac{\bigl(s_X^2/n+s_Y^2/m\bigr)^2}{\frac{1}{n-1}(s_X^2/n)^2+\frac{1}{m-1}(s_Y^2/m)^2}\right\rfloor`}
      />
      <p className={styles.small}>
        Use Welch when equal variances are doubtful. Same center as the pooled interval; usually a slightly different critical value and SE.
      </p>
    </SceneFrame>
  );
}

function WelchExampleScene() {
  const n = 9;
  const m = 15;
  const xBar = 81.31;
  const yBar = 78.61;
  const sx2 = 60.76;
  const sy2 = 48.24;
  const se = Math.sqrt(sx2 / n + sy2 / m);
  const rRaw = se ** 4 / ((1 / (n - 1)) * (sx2 / n) ** 2 + (1 / (m - 1)) * (sy2 / m) ** 2);
  const r = Math.max(1, Math.floor(rRaw));
  const t = tUpper(0.025, r);
  const half = t * se;
  const diff = xBar - yBar;
  return (
    <SceneFrame kicker="Example · Welch t" title="Same schools, without pooling variances.">
      <p className={styles.lead}>
        Same summaries as the pooled example, but now we refuse to assume equal score variances (different class sizes, tutoring access).
      </p>
      <Formula
        tex={tex`\mathrm{SE}=\sqrt{\dfrac{60.76}{9}+\dfrac{48.24}{15}}=${formatNum(se, 3)},\quad r=${r},\quad t_{0.025}(${r})=${formatNum(t, 3)}`}
      />
      <Formula
        tex={tex`81.31-78.61\pm ${formatNum(t, 3)}\times ${formatNum(se, 3)}=[${formatNum(diff - half, 2)},\ ${formatNum(diff + half, 2)}]`}
      />
      <CiBar lo={diff - half} hi={diff + half} point={diff} domain={[-6, 12]} truth={0} digits={2} />
      <p className={styles.small}>
        Still covers 0. Same center as pooled <MathText text={tex`$[-3.65,\ 9.05]$`} />; slightly wider when we drop the equal-variance assumption.
      </p>
    </SceneFrame>
  );
}

function PairedDefScene() {
  return (
    <SceneFrame kicker="Paired samples" title="When each X is matched to a unique Y.">
      <p className={styles.lead}>
        Samples are <strong>paired</strong> when each observation in the first sample is matched to a unique observation in the second — before/after on the
        same person, twin studies, or the same subject under two conditions.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Independent samples</p>
          <p>Separate groups → pooled or Welch for <MathText text={tex`$\mu_X-\mu_Y$`} />.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Paired samples</p>
          <p>
            Same units under two treatments → analyse <MathText text={tex`$D_i=X_i-Y_i$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function PairedCiScene() {
  return (
    <SceneFrame kicker="Paired t-interval" title={tex`Reduce to a one-sample $t$ on the differences.`}>
      <p className={styles.lead}>
        Let <MathText text={tex`$D_i=X_i-Y_i$`} /> with <MathText text={tex`$D_i\stackrel{\mathrm{i.i.d.}}{\sim}N(\mu_D,\sigma_D^2)$`} /> and{" "}
        <MathText text={tex`$\mu_D=\mu_X-\mu_Y$`} />. Then
      </p>
      <Formula tex={tex`\bar{d}\pm t_{\alpha/2}(n-1)\,\dfrac{s_D}{\sqrt{n}}`} />
      <Formula tex={tex`\bar{d}=\dfrac{1}{n}\sum D_i,\qquad s_D^2=\dfrac{1}{n-1}\sum(D_i-\bar{d})^2`} />
      <p className={styles.small}>
        Same formula as a one-mean <MathText text={tex`$t$`} /> interval for <MathText text={tex`$\mu_D$`} />, with{" "}
        <MathText text={tex`$n-1$`} /> df.
      </p>
    </SceneFrame>
  );
}

function PairedExampleScene() {
  const n = 8;
  const dBar = -0.0625;
  const sd = 0.0765;
  const t = tUpper(0.025, n - 1);
  const half = (t * sd) / Math.sqrt(n);
  return (
    <SceneFrame kicker="Example · paired t" title="Red vs green reaction times.">
      <p className={styles.lead}>
        Each of <MathText text={tex`$n=8$`} /> subjects hits a switch for a red light and for a green light. Analyse within-person differences{" "}
        <MathText text={tex`$D_i=X_i-Y_i$`} /> (red minus green, seconds): <MathText text={tex`$\bar{d}=-0.0625$`} />,{" "}
        <MathText text={tex`$s_D=0.0765$`} />. A 95% paired CI for <MathText text={tex`$\mu_X-\mu_Y$`} />:
      </p>
      <Formula
        tex={tex`-0.0625\pm t_{0.025}(7)\,\dfrac{0.0765}{\sqrt{8}}=[${formatNum(dBar - half, 4)},\ ${formatNum(dBar + half, 4)}]`}
      />
      <CiBar lo={dBar - half} hi={dBar + half} point={dBar} domain={[-0.2, 0.05]} truth={0} digits={3} />
      <p className={styles.small}>
        Barely covers 0. Pairing matters: ignoring it and treating red/green as independent samples gives a wider pooled interval roughly{" "}
        <MathText text={tex`$[-0.19,\ 0.06]$`} />.
      </p>
    </SceneFrame>
  );
}

function DiffCompareScene() {
  return (
    <SceneFrame kicker="Two means · summary" title="Which CI is narrower?">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Shared center</p>
          <Formula tex={tex`\bar{d}=\bar{x}-\bar{y}`} />
          <p className={styles.small}>All three methods share this point estimate when the data are the same pairs or the same two samples.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Typical width order</p>
          <p>
            When pairing is valid and <MathText text={tex`$\rho=\mathrm{Corr}(X,Y)>0$`} />: <strong>paired &lt; pooled &lt; Welch</strong>.
          </p>
          <p className={styles.small}>
            If <MathText text={tex`$\rho\approx 0$`} />, pairing helps little; if <MathText text={tex`$\rho<0$`} />, a paired CI can be wider than unpaired
            ones. If <MathText text={tex`$s_X^2\approx s_Y^2$`} />, pooled and Welch are similar.
          </p>
        </article>
      </div>
      <Formula tex={tex`\mathrm{Var}(X-Y)=\sigma_X^2+\sigma_Y^2-2\rho\sigma_X\sigma_Y`} />
    </SceneFrame>
  );
}

function PropDiffScene() {
  return (
    <SceneFrame kicker="Two proportions" title={tex`Large-sample CI for $p_1-p_2$.`}>
      <p className={styles.lead}>
        A proportion is a mean of 0–1 data, so <MathText text={tex`$p_1-p_2$`} /> is a special case of{" "}
        <MathText text={tex`$\mu_X-\mu_Y$`} />. Independent samples from two populations:
      </p>
      <Formula
        tex={tex`E(\hat{p}_1-\hat{p}_2)=p_1-p_2,\qquad \mathrm{Var}(\hat{p}_1-\hat{p}_2)=\dfrac{p_1(1-p_1)}{n_1}+\dfrac{p_2(1-p_2)}{n_2}`}
      />
      <p>Plug in the sample proportions for a large-sample CI:</p>
      <Formula
        tex={tex`\hat{p}_1-\hat{p}_2\pm z_{\alpha/2}\sqrt{\dfrac{\hat{p}_1(1-\hat{p}_1)}{n_1}+\dfrac{\hat{p}_2(1-\hat{p}_2)}{n_2}}`}
      />
      <p className={styles.small}>
        Unlike the hypothesis test under <MathText text={tex`$H_0:p_1=p_2$`} />, the CI does not pool the proportions — each group keeps its own{" "}
        <MathText text={tex`$\hat{p}_i$`} /> in the standard error.
      </p>
    </SceneFrame>
  );
}

function PropDiffExampleScene() {
  const p1 = 0.6;
  const p2 = 0.4;
  const n1 = 2000;
  const n2 = 2200;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const z = 1.96;
  const half = z * se;
  const diff = p1 - p2;
  return (
    <SceneFrame kicker="Example · two proportions" title="Gaming interest by gender.">
      <p className={styles.lead}>
        Independent campus surveys: males <MathText text={tex`$\hat{p}_1=0.6$`} /> (<MathText text={tex`$n_1=2000$`} />), females{" "}
        <MathText text={tex`$\hat{p}_2=0.4$`} /> (<MathText text={tex`$n_2=2200$`} />). Approximate 95% CI for{" "}
        <MathText text={tex`$p_1-p_2$`} />:
      </p>
      <Formula
        tex={tex`0.6-0.4\pm 1.96\sqrt{\dfrac{0.6\cdot 0.4}{2000}+\dfrac{0.4\cdot 0.6}{2200}}=[${formatNum(diff - half, 2)},\ ${formatNum(diff + half, 2)}]`}
      />
      <CiBar lo={diff - half} hi={diff + half} point={diff} domain={[0, 0.35]} truth={0} digits={2} />
      <p className={styles.small}>
        The entire interval is positive and away from 0, so these data support a real gap in reported gaming rates (under the survey’s sampling assumptions).
      </p>
    </SceneFrame>
  );
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

const QUIZ = [
  {
    q: "With the same data, moving from 95% to 99% confidence makes the interval …",
    options: ["wider", "narrower", "unchanged", "shift to the right"],
    answer: 0,
    why: tex`$z_{.005}=2.576>z_{.025}=1.960$, so the margin of error grows.`,
  },
  {
    q: tex`$\sigma$ unknown, normal population, $n=16$. The critical value comes from …`,
    options: ["standard normal z", tex`$t$ with 16 df`, tex`$t$ with 15 df`, tex`$t$ with 17 df`],
    answer: 2,
    why: tex`Use $s$ and $t_{\alpha/2}$ with $n-1=15$ degrees of freedom (e.g. $t_{.025}=2.131$).`,
  },
  {
    q: tex`To halve the margin of error $z_{\alpha/2}\sigma/\sqrt{n}$, multiply $n$ by …`,
    options: ["2", "4", "√2", "0.5"],
    answer: 1,
    why: tex`$E\propto 1/\sqrt{n}$, so $n$ must be multiplied by $2^2=4$.`,
  },
  {
    q: "“We are 95% confident that μ is in [39,630, 42,570]” means …",
    options: [
      "P(μ in this interval) = 0.95, μ is random",
      "95% of incomes lie in the interval",
      "95% of intervals built this way contain μ",
      "x̄ is in the interval with probability 0.95",
    ],
    answer: 2,
    why: tex`Confidence describes the long-run success rate of the method; $\mu$ is fixed.`,
  },
  {
    q: tex`Planning a poll with no information about $p$, use $p^*=$ …`,
    options: [".1", ".5", ".9", "the result of the poll"],
    answer: 1,
    why: tex`$p^*(1-p^*)$ is largest at $.5$, giving the safest (largest) sample size.`,
  },
  {
    q: "A 95% one-sided lower bound for μ (σ known) uses …",
    options: [tex`$z_{.025}=1.960$`, tex`$z_{.05}=1.645$`, tex`$z_{.10}=1.282$`, tex`$z_{.005}=2.576$`],
    answer: 1,
    why: tex`All of $\alpha=.05$ goes into one tail, so the critical value is $z_{\alpha}=z_{.05}$.`,
  },
  {
    q: "Independent samples, unknown but equal variances. CI for μX − μY uses …",
    options: ["pooled t (n+m−2 df)", "Welch t", "paired t (n−1 df)", "z with known σ only"],
    answer: 0,
    why: tex`Pool $s_X^2$ and $s_Y^2$ into $s_p^2$ and use $t_{\alpha/2}(n+m-2)$.`,
  },
  {
    q: "Before/after weights on the same 20 people. The CI for the mean change uses …",
    options: ["pooled t on the two lists", "Welch t", "paired t on the differences", "two-proportion z"],
    answer: 2,
    why: tex`Matched units ⇒ analyse $D_i=X_i-Y_i$ with a one-sample $t(n-1)$ interval.`,
  },
  {
    q: tex`Large-sample CI for $p_1-p_2$ plugs which variances into the SE?`,
    options: [
      tex`pooled $\hat{p}(1-\hat{p})$ only`,
      tex`each group's $\hat{p}_i(1-\hat{p}_i)$`,
      tex`only $\hat{p}_1(1-\hat{p}_1)$`,
      tex`$\sigma_X^2$ and $\sigma_Y^2$`,
    ],
    answer: 1,
    why: tex`The CI SE uses $\hat{p}_1(1-\hat{p}_1)/n_1+\hat{p}_2(1-\hat{p}_2)/n_2$ (no pooling).`,
  },
];

function QuizScene() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const shown = Object.keys(picked).length;
  const score = QUIZ.reduce((acc, item, i) => acc + (picked[i] === item.answer ? 1 : 0), 0);

  return (
    <SceneFrame kicker="Practice" title="Which answer is right?" tone="gold">
      <p className={styles.muted}>Live Poll A–D</p>
      <div className={styles.promptList}>
        {QUIZ.map((item, i) => (
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
        Score {score} / {QUIZ.length}
        {shown < QUIZ.length ? ` · ${QUIZ.length - shown} still open` : ""}.
      </p>
    </SceneFrame>
  );
}

function TakeawaysScene() {
  return (
    <SceneFrame kicker="Takeaways" title="Point estimate ± critical value × standard error." tone="dark">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="Mean, σ known" />
          </p>
          <p>
            <MathText text={tex`$\bar{x}\pm z_{\alpha/2}\,\sigma/\sqrt{n}$`} />. 90/95/99% use 1.645 / 1.960 / 2.576.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>
            <MathText text="Mean, σ unknown" />
          </p>
          <p>
            <MathText text={tex`$\bar{x}\pm t_{\alpha/2}\,s/\sqrt{n}$`} /> with <MathText text={tex`$n-1$`} /> df. Normal population, or n &gt; 30.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>One-sided</p>
          <p>
            Lower <MathText text={tex`$[\bar{x}-z_{\alpha}\sigma/\sqrt{n},\ \infty)$`} />; upper{" "}
            <MathText text={tex`$(-\infty,\ \bar{x}+z_{\alpha}\sigma/\sqrt{n}]$`} /> (use <MathText text={tex`$t_{\alpha}$`} /> if{" "}
            <MathText text={tex`$\sigma$`} /> unknown).
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample size</p>
          <p>
            <MathText text={tex`$n=z_{\alpha/2}^2\sigma^2/E^2$`} /> · <MathText text={tex`$n=z_{\alpha/2}^2p^*(1-p^*)/E^2$`} />. Round up.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Proportions</p>
          <p>
            <MathText text={tex`$\hat{p}\pm z_{\alpha/2}\sqrt{\hat{p}(1-\hat{p})/n}$`} />; difference{" "}
            <MathText text={tex`$\hat{p}_1-\hat{p}_2\pm z_{\alpha/2}\sqrt{\hat{p}_1(1-\hat{p}_1)/n_1+\hat{p}_2(1-\hat{p}_2)/n_2}$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Two means</p>
          <p>
            Known <MathText text={tex`$\sigma$`} />: z. Unknown equal: pooled{" "}
            <MathText text={tex`$t(n+m-2)$`} />. Unequal: Welch. Matched units: paired{" "}
            <MathText text={tex`$t(n-1)$`} /> on <MathText text={tex`$D_i$`} />.
          </p>
        </article>
      </div>
      <p className={styles.footerNote}>DOTE2011G · Interval Estimation · CUHK</p>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Start", label: "Title", Scene: CoverScene },
  { id: "roadmap", chapter: "Start", label: "Roadmap", Scene: RoadmapScene },
  { id: "warmup", chapter: "Start", label: "Warm-up: CUHK heights", Scene: WarmupScene },
  { id: "margin", chapter: "Start", label: "Margin of error", Scene: MarginScene },
  { id: "sigma-known", chapter: "Mean · σ known", label: "When is σ known?", Scene: SigmaKnownScene },
  { id: "sampling-picture", chapter: "Mean · σ known", label: "1 − α of all x̄", Scene: SamplingPictureScene },
  { id: "derive", chapter: "Mean · σ known", label: "Derivation", Scene: DeriveScene },
  { id: "z-formula", chapter: "Mean · σ known", label: "Interval formula", Scene: FormulaScene },
  { id: "z-table", chapter: "Mean · σ known", label: "Common z values", Scene: ZTableScene },
  { id: "meaning", chapter: "Mean · σ known", label: "Meaning of confidence", Scene: MeaningScene },
  { id: "game-coverage", chapter: "Game", label: "Coverage simulator", Scene: CoverageGameScene },
  { id: "hmv-setup", chapter: "HMV example", label: "Setup", Scene: HmvSetupScene },
  { id: "hmv-interval", chapter: "HMV example", label: "Margin and interval", Scene: HmvIntervalScene },
  { id: "adequate", chapter: "Mean · σ known", label: "Adequate sample size", Scene: AdequateSizeScene },
  { id: "bulb", chapter: "Examples · σ known", label: "Light bulbs", Scene: BulbScene },
  { id: "juice", chapter: "Examples · σ known", label: "Orange juice", Scene: JuiceScene },
  { id: "sigma-unknown", chapter: "Mean · σ unknown", label: "When σ is unknown", Scene: SigmaUnknownScene },
  { id: "t-dist", chapter: "t distribution", label: "From Z to t", Scene: TDistScene },
  { id: "t-props", chapter: "t distribution", label: "Degrees of freedom", Scene: TPropertiesScene },
  { id: "game-t-vs-z", chapter: "Game", label: "z versus t", Scene: TvsZGameScene },
  { id: "t-formula", chapter: "Mean · σ unknown", label: "Interval formula", Scene: TFormulaScene },
  { id: "rent", chapter: "Mean · σ unknown", label: "Apartment rents", Scene: RentScene },
  { id: "non-normal", chapter: "Mean · σ unknown", label: "Non-normal data", Scene: NonNormalScene },
  { id: "butterfat", chapter: "Examples · σ unknown", label: "Butterfat", Scene: ButterfatScene },
  { id: "one-sided-z", chapter: "One-sided", label: "Bounds, σ known", Scene: OneSidedKnownScene },
  { id: "summary-flow", chapter: "Summary", label: "Which formula for μ?", Scene: SummaryFlowScene },
  { id: "container", chapter: "One-sided", label: "Plastic containers", Scene: ContainerScene },
  { id: "one-sided-t", chapter: "One-sided", label: "Bounds, σ unknown", Scene: OneSidedUnknownScene },
  { id: "alloy", chapter: "One-sided", label: "Alloy specimens", Scene: AlloyScene },
  { id: "game-lab", chapter: "Game", label: "Interval lab", Scene: CaseLabScene },
  { id: "game-which", chapter: "Game", label: "Which interval?", Scene: WhichIntervalScene },
  { id: "ai-apple-ci", chapter: "Practice", label: "AI · Apple mean CI", Scene: AiPracticeAppleCiScene },
  { id: "n-mean", chapter: "Sample size", label: "Formula for a mean", Scene: SampleSizeMeanScene },
  { id: "n-planning", chapter: "Sample size", label: "Planning value of σ", Scene: PlanningSigmaScene },
  { id: "n-hmv", chapter: "Sample size", label: "HMV: n = 312", Scene: HmvSampleSizeScene },
  { id: "prop-sampling", chapter: "Proportion", label: "Sampling distribution of p̂", Scene: PropSamplingScene },
  { id: "prop-formula", chapter: "Proportion", label: "Interval formula", Scene: PropFormulaScene },
  { id: "psi", chapter: "Proportion", label: "PSI poll", Scene: PsiScene },
  { id: "n-prop", chapter: "Sample size", label: "Formula for a proportion", Scene: PropSampleSizeScene },
  { id: "n-psi", chapter: "Sample size", label: "PSI: n = 1817", Scene: PsiSampleSizeScene },
  { id: "two-means", chapter: "Two means", label: "Two-sided, known variances", Scene: TwoMeansScene },
  { id: "machines", chapter: "Two means", label: "Filling machines", Scene: MachinesScene },
  { id: "two-means-one-sided", chapter: "Two means", label: "One-sided bounds", Scene: TwoMeansOneSidedScene },
  { id: "diff-setup", chapter: "Two means", label: "Three designs (σ unknown)", Scene: DiffMeansSetupScene },
  { id: "pooled", chapter: "Pooled t", label: "Equal variances", Scene: PooledCiScene },
  { id: "pooled-ex", chapter: "Pooled t", label: "Two schools", Scene: PooledExampleScene },
  { id: "welch", chapter: "Welch t", label: "Unequal variances", Scene: WelchCiScene },
  { id: "welch-ex", chapter: "Welch t", label: "Schools, no pooling", Scene: WelchExampleScene },
  { id: "paired-def", chapter: "Paired t", label: "Paired samples", Scene: PairedDefScene },
  { id: "paired", chapter: "Paired t", label: "Paired CI", Scene: PairedCiScene },
  { id: "paired-ex", chapter: "Paired t", label: "Reaction times", Scene: PairedExampleScene },
  { id: "diff-compare", chapter: "Two means", label: "Width comparison", Scene: DiffCompareScene },
  { id: "prop-diff", chapter: "Two proportions", label: "Difference p1 − p2", Scene: PropDiffScene },
  { id: "prop-diff-ex", chapter: "Two proportions", label: "Gaming example", Scene: PropDiffExampleScene },
  { id: "quiz", chapter: "Practice", label: "Which answer?", Scene: QuizScene },
  { id: "takeaways", chapter: "Close", label: "Takeaways", Scene: TakeawaysScene },
];
