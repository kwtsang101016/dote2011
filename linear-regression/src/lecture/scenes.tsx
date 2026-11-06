import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { formatNum, formatP, invNorm, stdNormalPdf, tUpper, tUpperTail } from "../utils";
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
  "Use ← → or the buttons above. Drag the explorers where they appear. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

/** Table 11-1: oxygen purity (%) vs hydrocarbon level (%). */
const OXY_X = [0.99, 1.02, 1.15, 1.29, 1.46, 1.36, 0.87, 1.23, 1.55, 1.4, 1.19, 1.15, 0.98, 1.01, 1.11, 1.2, 1.26, 1.32, 1.43, 0.95];
const OXY_Y = [90.01, 89.05, 91.43, 93.74, 96.73, 94.45, 87.59, 91.77, 99.42, 93.65, 93.54, 92.52, 90.56, 89.54, 89.85, 90.39, 93.25, 93.41, 94.98, 87.33];

type Fit = {
  n: number;
  xBar: number;
  yBar: number;
  Sxx: number;
  Sxy: number;
  Syy: number;
  b0: number;
  b1: number;
  SSE: number;
  sigma2: number;
  sigma: number;
  df: number;
  sumX: number;
  sumY: number;
  sumX2: number;
  sumY2: number;
  sumXY: number;
};

/**
 * S_xx, S_xy, S_yy use the 1/n definitions throughout this lecture
 * (not the n−1 sample-variance divisor, and not raw sums).
 */
function fitSimple(xs: number[], ys: number[]): Fit {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const sumY2 = ys.reduce((a, b) => a + b * b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const xBar = sumX / n;
  const yBar = sumY / n;
  let cssX = 0;
  let cssXY = 0;
  let cssY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - xBar;
    const dy = ys[i] - yBar;
    cssX += dx * dx;
    cssXY += dx * dy;
    cssY += dy * dy;
  }
  const Sxx = cssX / n;
  const Sxy = cssXY / n;
  const Syy = cssY / n;
  const b1 = Sxy / Sxx;
  const b0 = yBar - b1 * xBar;
  const SSE = cssY - b1 * cssXY; // = n(S_yy − β̂₁ S_xy)
  const df = n - 2;
  const sigma2 = SSE / df;
  return { n, xBar, yBar, Sxx, Sxy, Syy, b0, b1, SSE, sigma2, sigma: Math.sqrt(sigma2), df, sumX, sumY, sumX2, sumY2, sumXY };
}

const OXY = fitSimple(OXY_X, OXY_Y);

/** BMI vs body fat summary (n = 250 men). */
const BMI = (() => {
  const n = 250;
  const sumX = 6322.28;
  const sumX2 = 162674.18;
  const sumY = 4757.9;
  const sumY2 = 107679.27;
  const sumXY = 125471.1;
  const xBar = sumX / n;
  const yBar = sumY / n;
  const cssX = sumX2 - n * xBar * xBar;
  const cssXY = sumXY - n * xBar * yBar;
  const cssY = sumY2 - n * yBar * yBar;
  const Sxx = cssX / n;
  const Sxy = cssXY / n;
  const Syy = cssY / n;
  const b1 = Sxy / Sxx;
  const b0 = yBar - b1 * xBar;
  const SSE = cssY - b1 * cssXY;
  const df = n - 2;
  const sigma2 = SSE / df;
  return { n, xBar, yBar, Sxx, Sxy, Syy, b0, b1, SSE, sigma2, sigma: Math.sqrt(sigma2), df, sumX, sumY, sumX2, sumY2, sumXY };
})();

/** Denominator pieces that need Σ(x−x̄)² = n S_xx when S_xx is the 1/n sample form. */
function nSxx(fit: Fit): number {
  return fit.n * fit.Sxx;
}

function SceneFrame({
  kicker,
  title,
  tone = "cream",
  children,
}: {
  kicker: string;
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

type ScatterPoint = { x: number; y: number };

function ScatterPlot({
  points,
  xLabel,
  yLabel,
  line,
  bands,
  residualAt,
  highlight,
  flatLine,
  width = 560,
  height = 260,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  line?: { b0: number; b1: number; color?: string };
  bands?: { lo: (x: number) => number; hi: (x: number) => number; color: string }[];
  residualAt?: number;
  highlight?: { x: number; y: number; label?: string };
  /** Force a horizontal line at y = mean(y) (significance-of-regression cartoon). */
  flatLine?: boolean;
  width?: number;
  height?: number;
}) {
  const pad = { l: 48, r: 16, t: 16, b: 42 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.08 || 0.1;
  const yPad = (yMax - yMin) * 0.12 || 1;
  const X0 = xMin - xPad;
  const X1 = xMax + xPad;
  const Y0 = yMin - yPad;
  const Y1 = yMax + yPad;
  const sx = (x: number) => pad.l + ((x - X0) / (X1 - X0)) * (width - pad.l - pad.r);
  const sy = (y: number) => height - pad.b - ((y - Y0) / (Y1 - Y0)) * (height - pad.t - pad.b);
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;

  const bandPaths =
    bands?.map((band) => {
      const steps = 40;
      const top: string[] = [];
      const bot: string[] = [];
      for (let i = 0; i <= steps; i += 1) {
        const x = X0 + ((X1 - X0) * i) / steps;
        top.push(`${sx(x)},${sy(band.hi(x))}`);
        bot.push(`${sx(x)},${sy(band.lo(x))}`);
      }
      return { d: `M ${top.join(" L ")} L ${bot.reverse().join(" L ")} Z`, color: band.color };
    }) ?? [];

  let linePath = "";
  if (flatLine) {
    linePath = `M ${sx(X0)} ${sy(yMean)} L ${sx(X1)} ${sy(yMean)}`;
  } else if (line) {
    linePath = `M ${sx(X0)} ${sy(line.b0 + line.b1 * X0)} L ${sx(X1)} ${sy(line.b0 + line.b1 * X1)}`;
  }

  const ticksX = 5;
  const ticksY = 4;
  const xTicks = Array.from({ length: ticksX }, (_, i) => X0 + ((X1 - X0) * i) / (ticksX - 1));
  const yTicks = Array.from({ length: ticksY }, (_, i) => Y0 + ((Y1 - Y0) * i) / (ticksY - 1));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${yLabel} versus ${xLabel}`}>
      {bandPaths.map((b, i) => (
        <path key={i} d={b.d} fill={b.color} opacity={0.28} stroke="none" />
      ))}
      <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#16213c" strokeWidth={1.5} />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#16213c" strokeWidth={1.5} />
      {xTicks.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={height - pad.b} x2={sx(x)} y2={height - pad.b + 5} stroke="#16213c" />
          <text x={sx(x)} y={height - pad.b + 18} textAnchor="middle" fontSize={11} fill="#16213c">
            {formatNum(x, x >= 10 ? 1 : 2)}
          </text>
        </g>
      ))}
      {yTicks.map((y) => (
        <g key={`y${y}`}>
          <line x1={pad.l - 5} y1={sy(y)} x2={pad.l} y2={sy(y)} stroke="#16213c" />
          <text x={pad.l - 8} y={sy(y) + 4} textAnchor="end" fontSize={11} fill="#16213c">
            {formatNum(y, y >= 20 ? 0 : 1)}
          </text>
        </g>
      ))}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#16213c">
        {xLabel}
      </text>
      <text x={14} y={height / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#16213c" transform={`rotate(-90 14 ${height / 2})`}>
        {yLabel}
      </text>
      {linePath ? <path d={linePath} stroke={line?.color ?? "#df4a3e"} strokeWidth={2.5} fill="none" /> : null}
      {residualAt != null && line ? (
        <line
          x1={sx(points[residualAt].x)}
          y1={sy(points[residualAt].y)}
          x2={sx(points[residualAt].x)}
          y2={sy(line.b0 + line.b1 * points[residualAt].x)}
          stroke="#2e7190"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      ) : null}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill="#2e7190" stroke="#fff" strokeWidth={1} />
      ))}
      {highlight ? (
        <g>
          <circle cx={sx(highlight.x)} cy={sy(highlight.y)} r={7} fill="#df4a3e" stroke="#fff" strokeWidth={1.5} />
          {highlight.label ? (
            <text x={sx(highlight.x) + 10} y={sy(highlight.y) - 8} fontSize={12} fontWeight={700} fill="#df4a3e">
              {highlight.label}
            </text>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}

function ResidualVsXCartoon({ kind }: { kind: "ok" | "trend" | "funnel" }) {
  const W = 220;
  const H = 150;
  const pad = 22;
  const pts: ScatterPoint[] = [];
  for (let i = 0; i < 30; i += 1) {
    const x = i / 29;
    const noise = Math.sin(i * 12.9898) * 0.4 + Math.cos(i * 78.233) * 0.28;
    let e = noise * 0.55;
    if (kind === "trend") e = 1.2 * (x - 0.5) + noise * 0.35;
    if (kind === "funnel") e = noise * (0.25 + 1.5 * x);
    pts.push({ x, y: e });
  }
  const yMin = -1.8;
  const yMax = 1.8;
  const sx = (x: number) => pad + x * (W - 2 * pad);
  const sy = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);
  const labels = {
    ok: "OK: no pattern in (x, e)",
    trend: "Bad: trend left in (x, e)",
    funnel: "Bad: spread changes with x",
  } as const;
  return (
    <article className={styles.card}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label={labels[kind]}>
        <line x1={pad} y1={sy(0)} x2={W - pad} y2={sy(0)} stroke="#16213c" strokeWidth={1} strokeDasharray="3 3" />
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.2} fill="#2e7190" />
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#16213c">
          x
        </text>
        <text x={10} y={H / 2} textAnchor="middle" fontSize={10} fill="#16213c" transform={`rotate(-90 10 ${H / 2})`}>
          e
        </text>
      </svg>
      <p className={styles.small}>{labels[kind]}</p>
    </article>
  );
}

function ResidualHistogram({ values, se2, title }: { values: number[]; se2: number; title: string }) {
  const W = 280;
  const H = 180;
  const pad = { l: 36, r: 12, t: 14, b: 32 };
  const se = Math.sqrt(se2);
  const n = values.length;
  const lo = Math.min(-3 * se, ...values) - 0.2;
  const hi = Math.max(3 * se, ...values) + 0.2;
  const bins = 8;
  const binW = (hi - lo) / bins || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / binW)));
    counts[idx] += 1;
  }
  const densityToCount = (e: number) => (n * binW * stdNormalPdf(e / se)) / se;
  const maxC = Math.max(...counts, ...Array.from({ length: 40 }, (_, i) => densityToCount(lo + ((hi - lo) * i) / 39)), 1);
  const barW = (W - pad.l - pad.r) / bins;
  const sx = (e: number) => pad.l + ((e - lo) / (hi - lo)) * (W - pad.l - pad.r);
  const sy = (c: number) => H - pad.b - (c / maxC) * (H - pad.t - pad.b);
  const curve: string[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const e = lo + ((hi - lo) * i) / 60;
    curve.push(`${i === 0 ? "M" : "L"} ${sx(e)} ${sy(densityToCount(e))}`);
  }
  return (
    <article className={styles.card}>
      <p className={styles.kicker}>{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label={title}>
        {counts.map((c, i) => {
          const h = ((H - pad.t - pad.b) * c) / maxC;
          const x = pad.l + i * barW;
          const y = H - pad.b - h;
          return <rect key={i} x={x + 1} y={y} width={barW - 2} height={h} fill="#2e7190" opacity={0.85} />;
        })}
        <path d={curve.join(" ")} fill="none" stroke="#df4a3e" strokeWidth={2.5} />
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#16213c" strokeWidth={1.5} />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#16213c" strokeWidth={1.5} />
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#16213c">
          residual e
        </text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize={11} fill="#16213c" transform={`rotate(-90 12 ${H / 2})`}>
          count
        </text>
      </svg>
      <p className={styles.small}>
        Red curve: <MathText text={tex`$N(0,s_e^2)$`} /> density (scaled to histogram counts).
      </p>
    </article>
  );
}

function ResidualQQPlot({ values, title }: { values: number[]; title: string }) {
  const W = 280;
  const H = 180;
  const pad = { l: 40, r: 14, t: 14, b: 36 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const zs = sorted.map((_, i) => invNorm((i + 0.5) / n));
  const xMin = Math.min(...zs) - 0.2;
  const xMax = Math.max(...zs) + 0.2;
  const yMin = Math.min(...sorted) - 0.3;
  const yMax = Math.max(...sorted) + 0.3;
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - ((y - yMin) / (yMax - yMin || 1)) * (H - pad.t - pad.b);
  const xTicks = [-1.5, 0, 1.5].filter((t) => t >= xMin && t <= xMax);
  const yTicks = [yMin, 0, yMax].map((t) => (Math.abs(t) < 1e-9 ? 0 : t));
  return (
    <article className={styles.card}>
      <p className={styles.kicker}>{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label={title}>
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#16213c" strokeWidth={1.5} />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#16213c" strokeWidth={1.5} />
        {xTicks.map((t) => (
          <g key={`qx${t}`}>
            <line x1={sx(t)} y1={H - pad.b} x2={sx(t)} y2={H - pad.b + 4} stroke="#16213c" />
            <text x={sx(t)} y={H - pad.b + 16} textAnchor="middle" fontSize={10} fill="#16213c">
              {formatNum(t, 1)}
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`qy${t}`}>
            <line x1={pad.l - 4} y1={sy(t)} x2={pad.l} y2={sy(t)} stroke="#16213c" />
            <text x={pad.l - 6} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="#16213c">
              {formatNum(t, 1)}
            </text>
          </g>
        ))}
        <line x1={sx(xMin)} y1={sy(yMin)} x2={sx(xMax)} y2={sy(yMax)} stroke="#df4a3e" strokeWidth={2} />
        {sorted.map((y, i) => (
          <circle key={i} cx={sx(zs[i])} cy={sy(y)} r={3} fill="#2e7190" />
        ))}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#16213c">
          theoretical N(0,1) quantile (x)
        </text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="#16213c" transform={`rotate(-90 12 ${H / 2})`}>
          sample residual e (y)
        </text>
      </svg>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Quiz helper (same pattern as hypothesis-tests)
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
// Scenes (covariance warm-up, then mirror 11 Linear Regression.pdf; trim later)
// ---------------------------------------------------------------------------

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id={print ? undefined : "cover"}>
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Simple Linear Regression</h1>
        <p className={styles.lead}>
          Start with covariance of two random variables, then relate a response <MathText text={tex`$Y$`} /> to a
          predictor <MathText text={tex`$X$`} /> with a straight line: least-squares fit, residuals, intervals, and
          tests on the slope and intercept.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function CovDefinitionScene() {
  return (
    <SceneFrame kicker="Covariance" title={tex`How do $X$ and $Y$ move together?`}>
      <p className={styles.lead}>
        The covariance of two random variables measures whether they tend to move in the same direction.
      </p>
      <Formula
        tex={tex`\mathrm{Cov}(X,Y)=E\!\big[(X-\mu_X)(Y-\mu_Y)\big]=E(XY)-\mu_X\mu_Y`}
      />
      <Formula tex={tex`\mu_X=E(X),\qquad \mu_Y=E(Y)\quad\text{(both are constants)}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Same direction</p>
          <p>
            When <MathText text={tex`$X>\mu_X$`} />, we often also see <MathText text={tex`$Y>\mu_Y$`} /> (and
            likewise below the means). Then the product{" "}
            <MathText text={tex`$(X-\mu_X)(Y-\mu_Y)$`} /> tends to be positive, so{" "}
            <MathText text={tex`$\mathrm{Cov}(X,Y)$`} /> is expected to be <strong>positive</strong>.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Opposite direction</p>
          <p>
            If large <MathText text={tex`$X$`} /> tends to come with small <MathText text={tex`$Y$`} />, the product
            tends to be negative → <MathText text={tex`$\mathrm{Cov}(X,Y)$`} /> expected{" "}
            <strong>negative</strong>.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function CovPropertiesScene() {
  return (
    <SceneFrame kicker="Covariance" title="Useful properties (we will lean on these).">
      <Formula tex={tex`\mathrm{Cov}(X,c)=0\quad\text{for any constant }c`} />
      <Formula tex={tex`\mathrm{Cov}(X,X)=\mathrm{Var}(X)`} />
      <Formula tex={tex`\mathrm{Cov}(\beta X,Y)=\mathrm{Cov}(X,\beta Y)=\beta\,\mathrm{Cov}(X,Y)`} />
      <Formula tex={tex`\mathrm{Cov}(X_1+X_2,Y)=\mathrm{Cov}(X_1,Y)+\mathrm{Cov}(X_2,Y)`} />
      <Formula tex={tex`X,Y\text{ independent}\ \Rightarrow\ \mathrm{Cov}(X,Y)=0`} />
      <p className={styles.small}>
        Constants factor out; covariance is additive in each argument. Independence implies zero covariance — but
        zero covariance does <em>not</em> imply independence.
      </p>
    </SceneFrame>
  );
}

function CovSignQuizScene() {
  const options = ["Positive", "Zero", "Negative", "Not sure"];
  const items: QuizItem[] = [
    {
      q: tex`If $Y=3+0.2\,X$, then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 0,
      why: tex`Slope $0.2>0$: $X$ and $Y$ move together. Formally $\mathrm{Cov}(X,Y)=0.2\,\mathrm{Var}(X)>0$ (unless $X$ is constant).`,
    },
    {
      q: tex`If $Y=5-1.5\,X$, then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 2,
      why: tex`Negative slope: when $X$ rises, $Y$ falls. $\mathrm{Cov}(X,Y)=-1.5\,\mathrm{Var}(X)<0$.`,
    },
    {
      q: tex`If $Y=3+0\cdot X$ (i.e. $Y=3$), then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 1,
      why: tex`$Y$ is a constant, so $\mathrm{Cov}(X,Y)=\mathrm{Cov}(X,3)=0$.`,
    },
    {
      q: tex`If $Y=-4$, then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 1,
      why: tex`Again $Y$ is constant: $\mathrm{Cov}(X,-4)=0$.`,
    },
    {
      q: tex`If $Y=0.2\,X$ (no intercept), then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 0,
      why: tex`Same as a positive slope through the origin: $\mathrm{Cov}(X,0.2X)=0.2\,\mathrm{Var}(X)>0$.`,
    },
    {
      q: tex`If $Y=10-0\cdot X$, then $\mathrm{Cov}(X,Y)$ should be:`,
      options,
      answer: 1,
      why: tex`Coefficient of $X$ is zero → $Y$ does not depend on $X$ → covariance zero.`,
    },
  ];
  return (
    <SceneFrame kicker="Warm-up poll" title={tex`Sign of $\mathrm{Cov}(X,Y)$ for a perfect line.`}>
      <p className={styles.lead}>
        Each question assumes the stated equation holds exactly (no extra noise). Think before clicking.
      </p>
      <QuizBlock items={items} />
    </SceneFrame>
  );
}

function CovLineBridgeScene() {
  return (
    <SceneFrame kicker="Bridge to regression" title={tex`If $Y=\beta_0+\beta_1 X$, then $\mathrm{Cov}(X,Y)=\beta_1\mathrm{Var}(X)$.`}>
      <p className={styles.lead}>Steps, using only the properties we just listed:</p>
      <Formula tex={tex`\mathrm{Cov}(X,Y)=\mathrm{Cov}\!\big(X,\ \beta_0+\beta_1 X\big)`} />
      <Formula
        tex={tex`=\mathrm{Cov}(X,\beta_0)+\mathrm{Cov}(X,\beta_1 X)
=\mathrm{Cov}(X,\beta_0)+\beta_1\,\mathrm{Cov}(X,X)`}
      />
      <Formula
        tex={tex`=\ 0+\beta_1\,\mathrm{Var}(X)
=\beta_1\,\mathrm{Var}(X)`}
      />
      <p className={styles.small}>
        (Used: additivity; constant factors out; <MathText text={tex`$\mathrm{Cov}(X,c)=0$`} />;{" "}
        <MathText text={tex`$\mathrm{Cov}(X,X)=\mathrm{Var}(X)$`} />.)
      </p>
    </SceneFrame>
  );
}

function Beta1EstimationScene() {
  return (
    <SceneFrame kicker="Bridge to regression" title={tex`$\beta_1$ Estimation`}>
      <Formula
        tex={tex`\mathrm{Cov}(X,Y)=\beta_1\,\mathrm{Var}(X)\quad\Rightarrow\quad
\beta_1=\dfrac{\mathrm{Cov}(X,Y)}{\mathrm{Var}(X)}
\quad\text{(when $\mathrm{Var}(X)>0$)}`}
      />
      <p className={styles.lead}>
        From paired observations <MathText text={tex`$(x_1,y_1),\dots,(x_n,y_n)$`} />, define
      </p>
      <Formula
        tex={tex`S_{xx}=\dfrac{1}{n}\sum_{i=1}^{n}(x_i-\bar{x})^2,\qquad
S_{xy}=\dfrac{1}{n}\sum_{i=1}^{n}(x_i-\bar{x})(y_i-\bar{y})`}
      />
      <p className={styles.small}>
        <MathText text={tex`$S_{xy}$`} /> estimates <MathText text={tex`$\mathrm{Cov}(X,Y)$`} />;{" "}
        <MathText text={tex`$S_{xx}$`} /> estimates <MathText text={tex`$\mathrm{Var}(X)$`} />. (We use divisor{" "}
        <MathText text={tex`$n$`} /> here — not the usual sample-variance divisor <MathText text={tex`$n-1$`} />.)
      </p>
      <Formula tex={tex`\hat\beta_1=\dfrac{S_{xy}}{S_{xx}}`} />
      <p className={styles.small}>
        Next: scatterplots, the regression model with noise, and least squares — which recover this same{" "}
        <MathText text={tex`$\hat\beta_1$`} />.
      </p>
    </SceneFrame>
  );
}

function LinePlot({
  b0,
  b1,
  xMin = -2,
  xMax = 2,
  width = 560,
  height = 280,
}: {
  b0: number;
  b1: number;
  xMin?: number;
  xMax?: number;
  width?: number;
  height?: number;
}) {
  const pad = { l: 48, r: 16, t: 20, b: 42 };
  const yAt = (x: number) => b0 + b1 * x;
  const yEnds = [yAt(xMin), yAt(xMax), b0];
  const yPad = 1.2;
  const Y0 = Math.min(-2, ...yEnds) - yPad;
  const Y1 = Math.max(2, ...yEnds) + yPad;
  const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (width - pad.l - pad.r);
  const sy = (y: number) => height - pad.b - ((y - Y0) / (Y1 - Y0)) * (height - pad.t - pad.b);
  const xTicks = [-2, -1, 0, 1, 2];
  const yTicks = Array.from({ length: 5 }, (_, i) => Y0 + ((Y1 - Y0) * i) / 4);
  const axisY = sy(0);
  const axisX = sx(0);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Straight line y equals beta0 plus beta1 x">
      <line x1={pad.l} y1={axisY} x2={width - pad.r} y2={axisY} stroke="#16213c" strokeWidth={1.5} />
      <line x1={axisX} y1={pad.t} x2={axisX} y2={height - pad.b} stroke="#16213c" strokeWidth={1.5} />
      {xTicks.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={axisY} x2={sx(x)} y2={axisY + 5} stroke="#16213c" />
          <text x={sx(x)} y={axisY + 18} textAnchor="middle" fontSize={11} fill="#16213c">
            {x}
          </text>
        </g>
      ))}
      {yTicks.map((y) => (
        <g key={`y${y}`}>
          <line x1={axisX - 5} y1={sy(y)} x2={axisX} y2={sy(y)} stroke="#16213c" />
          <text x={axisX - 8} y={sy(y) + 4} textAnchor="end" fontSize={11} fill="#16213c">
            {formatNum(y, 1)}
          </text>
        </g>
      ))}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#16213c">
        x
      </text>
      <text x={14} y={height / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill="#16213c" transform={`rotate(-90 14 ${height / 2})`}>
        y
      </text>
      <line x1={sx(xMin)} y1={sy(yAt(xMin))} x2={sx(xMax)} y2={sy(yAt(xMax))} stroke="#df4a3e" strokeWidth={3} />
      <circle cx={sx(0)} cy={sy(b0)} r={5} fill="#2e7190" stroke="#fff" strokeWidth={1.5} />
      <text x={sx(0) + 8} y={sy(b0) - 8} fontSize={12} fontWeight={700} fill="#2e7190">
        {`(0, ${formatNum(b0, 1)})`}
      </text>
    </svg>
  );
}

function LineExplorerScene() {
  const [b0, setB0] = useState(1);
  const [b1, setB1] = useState(0.8);
  const slopeWord = b1 > 0.05 ? "upward" : b1 < -0.05 ? "downward" : "flat";
  return (
    <SceneFrame kicker="Picture the line" title={tex`$y=\beta_0+\beta_1 x$`}>
      <p className={styles.lead}>
        <MathText text={tex`$\beta_0$`} /> is the intercept (value at <MathText text={tex`$x=0$`} />);{" "}
        <MathText text={tex`$\beta_1$`} /> is the slope (rise per unit of <MathText text={tex`$x$`} />).
      </p>
      <LiveOnly>
        <label className={styles.sliderRow}>
          <span>
            <MathText text={tex`$\beta_0=${formatNum(b0, 1)}$`} />
          </span>
          <input type="range" min={-3} max={3} step={0.1} value={b0} onChange={(e) => setB0(Number(e.target.value))} />
        </label>
        <label className={styles.sliderRow}>
          <span>
            <MathText text={tex`$\beta_1=${formatNum(b1, 1)}$`} />
          </span>
          <input type="range" min={-2} max={2} step={0.1} value={b1} onChange={(e) => setB1(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>
          On the website, drag <MathText text={tex`$\beta_0$`} /> and <MathText text={tex`$\beta_1$`} /> from negative to
          positive values.
        </p>
      </PrintOnly>
      <div className={styles.two}>
        <LinePlot b0={b0} b1={b1} />
        <article className={styles.card}>
          <p className={styles.kicker}>What you should see</p>
          <ul className={styles.bullets}>
            <li>
              Changing <MathText text={tex`$\beta_0$`} /> shifts the line up or down (blue mark = intercept).
            </li>
            <li>
              <MathText text={tex`$\beta_1>0$`} /> → upward; <MathText text={tex`$\beta_1<0$`} /> → downward;{" "}
              <MathText text={tex`$\beta_1=0$`} /> → horizontal.
            </li>
            <li>
              Right now: <strong>{slopeWord}</strong>,{" "}
              <MathText text={tex`$y=${formatNum(b0, 1)}+(${formatNum(b1, 1)})x$`} />.
            </li>
          </ul>
        </article>
      </div>
    </SceneFrame>
  );
}

function ScatterIntroScene() {
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  return (
    <SceneFrame kicker="Example · scatter diagram" title="Relationships between two variables.">
      <p className={styles.lead}>
        Many problems in statistics and science involve exploring relationships between two or more variables.{" "}
        <strong>Regression analysis</strong> is a statistical technique that is very useful for these types of problems.
      </p>
      <div className={styles.two}>
        <ScatterPlot points={points} xLabel="Hydrocarbon level x (%)" yLabel="Purity y (%)" />
        <article className={styles.card}>
          <p className={styles.kicker}>Table 11-1 · Oxygen and hydrocarbon</p>
          <p className={styles.small}>
            <MathText text={tex`$n=20$`} /> process runs. As hydrocarbon level rises, oxygen purity tends to rise — a
            candidate for a straight-line summary.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function OxygenTableScene() {
  return (
    <SceneFrame kicker="Example · data" title="Oxygen purity and hydrocarbon levels.">
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>
                <MathText text={tex`$x$ (%)`} />
              </th>
              <th>
                <MathText text={tex`$y$ (%)`} />
              </th>
              <th>#</th>
              <th>
                <MathText text={tex`$x$ (%)`} />
              </th>
              <th>
                <MathText text={tex`$y$ (%)`} />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{formatNum(OXY_X[i], 2)}</td>
                <td>{formatNum(OXY_Y[i], 2)}</td>
                <td>{i + 11}</td>
                <td>{formatNum(OXY_X[i + 10], 2)}</td>
                <td>{formatNum(OXY_Y[i + 10], 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Formula
        tex={tex`n=20,\ \sum x_i=${formatNum(OXY.sumX, 2)},\ \sum y_i=${formatNum(OXY.sumY, 2)},\ \bar{x}=${formatNum(OXY.xBar, 4)},\ \bar{y}=${formatNum(OXY.yBar, 4)}`}
      />
      <Formula
        tex={tex`\sum x_i^2=${formatNum(OXY.sumX2, 4)},\ \sum y_i^2=${formatNum(OXY.sumY2, 4)},\ \sum x_iy_i=${formatNum(OXY.sumXY, 4)}`}
      />
    </SceneFrame>
  );
}

function ModelScene() {
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  return (
    <SceneFrame kicker="Simple linear regression" title={tex`Mean of $Y$ related to $X$ by a straight line.`}>
      <p className={styles.lead}>
        Based on the scatter diagram, it is reasonable to assume that the mean of the random variable{" "}
        <MathText text={tex`$Y$`} /> is related to <MathText text={tex`$X$`} /> by the following simple linear regression
        model.
      </p>
      <Formula tex={tex`Y_i=\beta_0+\beta_1 X_i+\varepsilon_i,\qquad i=1,2,\dots,n`} />
      <div className={styles.two}>
        <ScatterPlot points={points} xLabel="Hydrocarbon x (%)" yLabel="Purity y (%)" line={{ b0: OXY.b0, b1: OXY.b1 }} residualAt={8} />
        <div>
          <article className={styles.card}>
            <p className={styles.kicker}>Pieces</p>
            <ul className={styles.bullets}>
              <li>
                <MathText text={tex`$Y_i$`} />: response
              </li>
              <li>
                <MathText text={tex`$X_i$`} />: regressor / predictor
              </li>
              <li>
                <MathText text={tex`$\beta_0$`} />: intercept · <MathText text={tex`$\beta_1$`} />: slope (regression
                coefficients)
              </li>
              <li>
                <MathText text={tex`$\varepsilon_i\sim N(0,\sigma^2)$`} />: random error
              </li>
            </ul>
          </article>
          <Formula tex={tex`E(Y\mid x)=\beta_0+\beta_1 x,\qquad V(Y\mid x)=\sigma^2`} />
          <p className={styles.small}>
            Simple linear regression: a single predictor <MathText text={tex`$X$`} /> and one response{" "}
            <MathText text={tex`$Y$`} />.
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}

function LeastSquaresScene() {
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  return (
    <SceneFrame kicker="Least squares" title="Minimize vertical squared gaps — closed-form minimizers.">
      <p className={styles.lead}>
        Least squares estimates <MathText text={tex`$\beta_0$`} /> and <MathText text={tex`$\beta_1$`} /> by minimizing{" "}
        <MathText text={tex`$L$`} />, the sum of squared vertical deviations. The minimizers recover the same slope as{" "}
        <MathText text={tex`$S_{xy}/S_{xx}$`} />.
      </p>
      <div className={styles.two}>
        <div>
          <Formula tex={tex`L=\sum_{i=1}^{n}(y_i-\beta_0-\beta_1 x_i)^2`} />
          <Formula
            tex={tex`S_{xx}=\dfrac{1}{n}\sum(x_i-\bar{x})^2,\quad
S_{xy}=\dfrac{1}{n}\sum(x_i-\bar{x})(y_i-\bar{y})`}
          />
          <Formula tex={tex`\hat\beta_1=\dfrac{S_{xy}}{S_{xx}},\qquad \hat\beta_0=\bar{y}-\hat\beta_1\bar{x}`} />
          <Formula tex={tex`\hat{y}_i=\hat\beta_0+\hat\beta_1 x_i,\qquad e_i=y_i-\hat{y}_i`} />
          <p className={styles.small}>
            Because <MathText text={tex`$S_{xx}$`} /> and <MathText text={tex`$S_{xy}$`} /> already include{" "}
            <MathText text={tex`$1/n$`} />, formulas that need the raw sum of squared deviations will show{" "}
            <MathText text={tex`$nS_{xx}$`} /> (and likewise <MathText text={tex`$nS_{xy}$`} />).
          </p>
        </div>
        <ScatterPlot points={points} xLabel="x" yLabel="y" line={{ b0: OXY.b0, b1: OXY.b1 }} residualAt={4} />
      </div>
    </SceneFrame>
  );
}

function OxygenExampleSetupScene() {
  return (
    <SceneFrame kicker="Example" title="Purity vs hydrocarbon — find the least-squares line.">
      <p className={styles.lead}>
        Find the least square estimates of the simple linear regression describing the relationship between Purity{" "}
        <MathText text={tex`$y$`} /> and Hydrocarbon Levels <MathText text={tex`$x$`} />. Also calculate the predicted
        purity when hydrocarbon level is 1.00.
      </p>
      <Formula
        tex={tex`S_{xx}=\dfrac{1}{n}\sum x_i^2-\bar{x}^2,\qquad
S_{xy}=\dfrac{1}{n}\sum x_iy_i-\bar{x}\bar{y}`}
      />
      <Formula
        tex={tex`\sum x_i=${formatNum(OXY.sumX, 2)},\ \sum y_i=${formatNum(OXY.sumY, 2)},\ 
\sum x_i^2=${formatNum(OXY.sumX2, 4)},\ \sum x_iy_i=${formatNum(OXY.sumXY, 4)}`}
      />
    </SceneFrame>
  );
}

function OxygenFittedScene() {
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  const yHat1 = OXY.b0 + OXY.b1 * 1;
  return (
    <SceneFrame kicker="Example · fitted model" title="Oxygen purity least-squares line.">
      <Formula
        tex={tex`S_{xx}=${formatNum(OXY.Sxx, 5)},\ S_{xy}=${formatNum(OXY.Sxy, 5)}
\ \Rightarrow\ \hat\beta_1=\dfrac{S_{xy}}{S_{xx}}=${formatNum(OXY.b1, 5)}`}
      />
      <Formula
        tex={tex`\hat\beta_0=\bar{y}-\hat\beta_1\bar{x}=${formatNum(OXY.yBar, 4)}-${formatNum(OXY.b1, 5)}\cdot${formatNum(OXY.xBar, 4)}=${formatNum(OXY.b0, 5)}`}
      />
      <Formula tex={tex`\hat{y}=${formatNum(OXY.b0, 3)}+${formatNum(OXY.b1, 3)}\,x`} />
      <div className={styles.two}>
        <ScatterPlot
          points={points}
          xLabel="Hydrocarbon level (%)"
          yLabel="Oxygen purity (%)"
          line={{ b0: OXY.b0, b1: OXY.b1 }}
          highlight={{ x: 1, y: yHat1, label: "x=1" }}
        />
        <article className={styles.card}>
          <p className={styles.kicker}>Practical interpretation</p>
          <Formula tex={tex`x=1.00\ \Rightarrow\ \hat{y}=${formatNum(yHat1, 2)}\%`} />
          <p className={styles.small}>
            Read as an estimate of the mean purity at <MathText text={tex`$x=1$`} />, or as a point forecast for a new
            observation — both are subject to error. Later: confidence and prediction intervals.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function BmiSetupScene() {
  return (
    <SceneFrame kicker="Example · diabetes and obesity" title="Body fat vs BMI.">
      <p className={styles.lead}>
        Diabetes and obesity are serious health concerns. Measuring body fat helps monitor weight control. BMI = mass
        (kg) / (height(m))² is used as a proxy for body fat.
      </p>
      <p>
        In a study of 250 men at Brigham Young University, both BMI <MathText text={tex`$x$`} /> and body fat{" "}
        <MathText text={tex`$y$`} /> were measured. Summary statistics:
      </p>
      <Formula
        tex={tex`\sum x_i=6322.28,\ \sum x_i^2=162674.18,\ \sum y_i=4757.90,\ \sum y_i^2=107679.27,\ \sum x_iy_i=125471.10`}
      />
      <p className={styles.small}>Fit a linear regression model.</p>
    </SceneFrame>
  );
}

function BmiFitScene() {
  return (
    <SceneFrame kicker="Example · diabetes and obesity" title="Body fat least-squares estimates.">
      <Formula
        tex={tex`n=250,\ \bar{x}=\dfrac{\sum x_i}{250}=${formatNum(BMI.xBar, 5)},\ \bar{y}=\dfrac{\sum y_i}{250}=${formatNum(BMI.yBar, 4)}`}
      />
      <Formula
        tex={tex`S_{xx}=\dfrac{1}{n}\sum x_i^2-\bar{x}^2=${formatNum(BMI.Sxx, 3)},\quad
S_{xy}=\dfrac{1}{n}\sum x_iy_i-\bar{x}\bar{y}=${formatNum(BMI.Sxy, 3)}`}
      />
      <Formula
        tex={tex`\hat\beta_1=\dfrac{S_{xy}}{S_{xx}}=${formatNum(BMI.b1, 3)},\qquad
\hat\beta_0=\bar{y}-\hat\beta_1\bar{x}=${formatNum(BMI.b0, 3)}`}
      />
      <Formula tex={tex`\widehat{\text{body fat}}=${formatNum(BMI.b0, 3)}+${formatNum(BMI.b1, 3)}\,(\text{BMI})`} />
    </SceneFrame>
  );
}

function BmiUseScene() {
  const y30 = BMI.b0 + BMI.b1 * 30;
  const y25 = BMI.b0 + BMI.b1 * 25;
  const e = 25 - y25;
  return (
    <SceneFrame kicker="Continue · body fat vs BMI" title="Prediction and a residual.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Average body fat at BMI = 30</p>
          <Formula tex={tex`\hat{y}=\hat\beta_0+\hat\beta_1 x=${formatNum(BMI.b0, 3)}+${formatNum(BMI.b1, 3)}\times 30=${formatNum(y30, 3)}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Residual at BMI = 25, observed fat = 25%</p>
          <Formula tex={tex`\hat{y}=${formatNum(BMI.b0, 3)}+${formatNum(BMI.b1, 3)}\times 25=${formatNum(y25, 3)}`} />
          <Formula tex={tex`e=y-\hat{y}=25-${formatNum(y25, 3)}=${formatNum(e, 3)}`} />
        </article>
      </div>
    </SceneFrame>
  );
}

function ModelDiagnosisVsXScene() {
  const residuals = OXY_X.map((x, i) => OXY_Y[i] - (OXY.b0 + OXY.b1 * x));
  const eBar = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const Sxe =
    residuals.reduce((a, e, i) => a + (OXY_X[i] - OXY.xBar) * (e - eBar), 0) / residuals.length;
  const points = OXY_X.map((x, i) => ({ x, y: residuals[i] }));
  return (
    <SceneFrame kicker="Model diagnosis" title="Check residuals' assumptions">
      <p className={styles.lead}>
        After fitting, look at <MathText text={tex`$e_i=y_i-\hat y_i$`} />. To check that leftover error is not still
        tied to the predictor, plot <MathText text={tex`$(x_i,e_i)$`} /> or compute the sample covariance of{" "}
        <MathText text={tex`$x$`} /> and <MathText text={tex`$e$`} />.
      </p>
      <Formula tex={tex`S_{xe}=\dfrac{1}{n}\sum(x_i-\bar{x})(e_i-\bar{e})\ \approx\ 0\quad\text{(hope)}`} />
      <div className={styles.two}>
        <div>
          <ScatterPlot points={points} xLabel="Hydrocarbon x" yLabel="Residual e" line={{ b0: 0, b1: 0, color: "#625f54" }} />
          <p className={styles.small}>
            Oxygen data: <MathText text={tex`$S_{xe}\approx${formatNum(Sxe, 4)}$`} /> (near 0 — no leftover linear
            link with <MathText text={tex`$x$`} />).
          </p>
        </div>
        <div className={styles.two}>
          <ResidualVsXCartoon kind="ok" />
          <ResidualVsXCartoon kind="trend" />
          <ResidualVsXCartoon kind="funnel" />
        </div>
      </div>
      <p className={styles.small}>
        A trend in <MathText text={tex`$(x,e)$`} /> means the straight-line mean is wrong; a funnel means non-constant
        variance. We do <em>not</em> diagnose independence by plotting residuals against <MathText text={tex`$Y$`} />.
      </p>
    </SceneFrame>
  );
}

function ModelDiagnosisNormalScene() {
  const residuals = OXY_X.map((x, i) => OXY_Y[i] - (OXY.b0 + OXY.b1 * x));
  const n = residuals.length;
  const se2 = residuals.reduce((a, e) => a + e * e, 0) / (n - 2);
  return (
    <SceneFrame kicker="Model diagnosis" title={tex`Normality of residuals: histogram and QQ-plot.`}>
      <p className={styles.lead}>
        Inference later assumes errors are roughly normal. Overlay the density of{" "}
        <MathText text={tex`$N(0,s_e^2)$`} /> on the histogram of the <MathText text={tex`$e_i$`} />.
      </p>
      <Formula
        tex={tex`s_e^2=\dfrac{1}{n-2}\sum_{i=1}^{n} e_i^2
\quad\text{(sample variance of residuals; divisor $n-2$ because $\hat\beta_0,\hat\beta_1$ were estimated)}`}
      />
      <Formula tex={tex`\text{Oxygen: }s_e^2=${formatNum(se2, 2)}\ \big(=\hat\sigma^2\big)`} />
      <div className={styles.two}>
        <ResidualHistogram values={residuals} se2={se2} title="Histogram of eᵢ with N(0, sₑ²) density" />
        <ResidualQQPlot values={residuals} title="Normal QQ-plot of eᵢ (oxygen)" />
      </div>
      <p className={styles.small}>
        Hope: histogram matches the red normal curve; QQ points hug the reference line.
      </p>
    </SceneFrame>
  );
}

function FitCheckQuizScene() {
  const items: QuizItem[] = [
    {
      q: tex`If $Y=\beta_0+\beta_1 X$ with $\beta_1>0$, then $\mathrm{Cov}(X,Y)$ is`,
      options: ["Positive", "Zero", "Negative", "Could be anything"],
      answer: 0,
      why: tex`$\mathrm{Cov}(X,Y)=\beta_1\mathrm{Var}(X)>0$ when $\mathrm{Var}(X)>0$.`,
    },
    {
      q: tex`Our slope estimator from sample moments is`,
      options: [tex`$S_{xx}/S_{xy}$`, tex`$S_{xy}/S_{xx}$`, tex`$\bar{y}/\bar{x}$`, tex`$S_{xy}/n$`],
      answer: 1,
      why: tex`$\hat\beta_1=S_{xy}/S_{xx}$ estimates $\mathrm{Cov}(X,Y)/\mathrm{Var}(X)$.`,
    },
    {
      q: tex`The residual for observation $i$ is`,
      options: [tex`$e_i=\hat y_i-y_i$`, tex`$e_i=y_i-\bar{y}$`, tex`$e_i=y_i-\hat y_i$`, tex`$e_i=x_i-\bar{x}$`],
      answer: 2,
      why: tex`$e_i=y_i-\hat y_i=y_i-\hat\beta_0-\hat\beta_1 x_i$.`,
    },
    {
      q: tex`To check that residuals are not still related to the predictor, we should`,
      options: [
        tex`Plot $(y_i,e_i)$`,
        tex`Plot $(x_i,e_i)$ or check $S_{xe}\approx 0$`,
        tex`Only look at $\hat\beta_1$`,
        tex`Plot $(\hat y_i,y_i)$ only`,
      ],
      answer: 1,
      why: tex`Independence from $X$ is about $(x_i,e_i)$; a plot against $Y$ is the wrong check.`,
    },
    {
      q: tex`A normal QQ-plot of residuals is mainly used to check`,
      options: [
        tex`Whether $\beta_1=0$`,
        tex`Constant variance vs $x$`,
        "Normality of the errors",
        tex`Whether $S_{xx}$ is large`,
      ],
      answer: 2,
      why: "Points near a straight line support approximately normal residuals.",
    },
    {
      q: tex`If $X$ and $Y$ are independent, then $\mathrm{Cov}(X,Y)$`,
      options: ["Must be positive", "Must be zero", "Must be negative", "Can be nonzero"],
      answer: 1,
      why: tex`Independence $\Rightarrow\mathrm{Cov}(X,Y)=0$ (the converse is false).`,
    },
  ];
  return (
    <SceneFrame kicker="Check understanding" title="Before confidence intervals — quick poll.">
      <QuizBlock items={items} />
    </SceneFrame>
  );
}

function CiSectionScene() {
  return (
    <SceneFrame kicker="Next block" title="Confidence intervals" tone="gold">
      <p className={styles.lead}>
        From here: sampling distributions of the least-squares estimates, estimating <MathText text={tex`$\sigma^2$`} />,
        then confidence intervals for coefficients, mean response, and prediction intervals for a new observation.
      </p>
    </SceneFrame>
  );
}

function InferenceModelScene() {
  return (
    <SceneFrame kicker="Least squares estimates" title={tex`Model for inference: $Y_i\sim N(\beta_0+\beta_1 X_i,\sigma^2)$.`}>
      <Formula tex={tex`Y_i=\beta_0+\beta_1 X_i+\varepsilon_i,\qquad \varepsilon_i\sim N(0,\sigma^2)`} />
      <Formula tex={tex`\Rightarrow\ Y_i\sim N(\beta_0+\beta_1 X_i,\sigma^2),\quad i=1,2,\dots,n`} />
      <Formula tex={tex`\hat\beta_1=\dfrac{S_{xy}}{S_{xx}},\qquad \hat\beta_0=\bar{y}-\hat\beta_1\bar{x}`} />
      <p className={styles.lead}>What is the distribution of <MathText text={tex`$\hat\beta_0,\hat\beta_1$`} />?</p>
    </SceneFrame>
  );
}

function EstimatesAsLinearCombosScene() {
  return (
    <SceneFrame kicker="Distribution of the estimates" title={tex`$\hat\beta_0$ and $\hat\beta_1$ are linear combinations of the $y_i$.`}>
      <Formula tex={tex`\hat\beta_1=\dfrac{1}{nS_{xx}}\sum_{i=1}^{n} y_i(x_i-\bar{x})`} />
      <Formula
        tex={tex`\hat\beta_0=\sum_{i=1}^{n} y_i\left(\dfrac{1}{n}-\dfrac{\bar{x}}{nS_{xx}}(x_i-\bar{x})\right)`}
      />
      <p className={styles.small}>
        Under normality of the <MathText text={tex`$Y_i$`} />, linear combinations of the{" "}
        <MathText text={tex`$y_i$`} /> are normal — so both estimators are normal.
      </p>
    </SceneFrame>
  );
}

function NormalLinearComboScene() {
  return (
    <SceneFrame kicker="Recall" title="A linear combination of independent normals is still normal.">
      <p className={styles.lead}>
        If <MathText text={tex`$Y_1\sim N(\mu_1,\sigma_1^2)$`} /> and{" "}
        <MathText text={tex`$Y_2\sim N(\mu_2,\sigma_2^2)$`} /> are independent, then for any constants{" "}
        <MathText text={tex`$a_1$`} /> and <MathText text={tex`$a_2$`} />,
      </p>
      <Formula
        tex={tex`a_1Y_1+a_2Y_2\sim N(a_1\mu_1+a_2\mu_2,\ a_1^2\sigma_1^2+a_2^2\sigma_2^2)`}
      />
      <p className={styles.small}>
        This is how we derive the sampling distribution for the difference of two means.
      </p>
      <p className={styles.lead}>
        In general, if <MathText text={tex`$Y_i\sim N(\mu_i,\sigma_i^2)$`} /> are independent, then{" "}
        <MathText text={tex`$\sum_{i=1}^{n}a_i Y_i=a_1Y_1+\cdots+a_nY_n$`} /> follows
      </p>
      <Formula
        tex={tex`N\!\left(\sum_{i=1}^{n}a_i\mu_i,\ \sum_{i=1}^{n}a_i^2\sigma_i^2\right)`}
      />
    </SceneFrame>
  );
}

function EstimatesDistributionScene() {
  return (
    <SceneFrame kicker="Distribution of the estimates" title="Means, variances, and normal laws.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Slope</p>
          <Formula tex={tex`E(\hat\beta_1)=\beta_1,\quad V(\hat\beta_1)=\dfrac{\sigma^2}{nS_{xx}}`} />
          <Formula tex={tex`\hat\beta_1\sim N\!\left(\beta_1,\dfrac{\sigma^2}{nS_{xx}}\right)`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Intercept</p>
          <Formula tex={tex`E(\hat\beta_0)=\beta_0,\quad V(\hat\beta_0)=\sigma^2\!\left(\dfrac{1}{n}+\dfrac{\bar{x}^2}{nS_{xx}}\right)`} />
          <Formula tex={tex`\hat\beta_0\sim N\!\left(\beta_0,\sigma^2\!\left(\dfrac{1}{n}+\dfrac{\bar{x}^2}{nS_{xx}}\right)\right)`} />
        </article>
      </div>
      <p className={styles.small}>
        Recall: if independent normals are added, means and variances add. That yields the two normal distributions
        above.
      </p>
    </SceneFrame>
  );
}

function VarianceEstimationScene() {
  return (
    <SceneFrame kicker="Estimation of variance" title={tex`Unbiased estimator of $\sigma^2$.`}>
      <p className={styles.lead}>
        An unbiased estimator of <MathText text={tex`$\sigma^2$`} /> is
      </p>
      <Formula tex={tex`\hat\sigma^2=\dfrac{SS_E}{n-2}`} />
      <p className={styles.small}>
        where <MathText text={tex`$SS_E$`} /> is the error sum of squares:
      </p>
      <Formula
        tex={tex`SS_E=\sum e_i^2=\sum(y_i-\hat{y}_i)^2=\sum(y_i-\hat\beta_0-\hat\beta_1 x_i)^2
=n\big(S_{yy}-\hat\beta_1 S_{xy}\big)`}
      />
      <p className={styles.small}>
        <MathText text={tex`$S_{yy}=\frac{1}{n}\sum(y_i-\bar{y})^2$`} />. Because{" "}
        <MathText text={tex`$S_{xy}$`} /> already has the <MathText text={tex`$1/n$`} />, the cross term carries an{" "}
        <MathText text={tex`$n$`} />.
      </p>
    </SceneFrame>
  );
}

function OxygenVarianceScene() {
  return (
    <SceneFrame kicker="Example · estimate variance" title="Oxygen purity: SSE and σ̂².">
      <Formula
        tex={tex`S_{yy}=${formatNum(OXY.Syy, 4)},\ S_{xy}=${formatNum(OXY.Sxy, 5)},\ \hat\beta_1=${formatNum(OXY.b1, 5)}`}
      />
      <Formula
        tex={tex`SS_E=n(S_{yy}-\hat\beta_1 S_{xy})=${formatNum(OXY.SSE, 4)}`}
      />
      <Formula
        tex={tex`\hat\sigma^2=\dfrac{SS_E}{n-2}=\dfrac{${formatNum(OXY.SSE, 4)}}{18}=${formatNum(OXY.sigma2, 2)}`}
      />
    </SceneFrame>
  );
}

function BmiVarianceScene() {
  return (
    <SceneFrame kicker="Example · estimate variance" title="Body fat: SSE and σ̂².">
      <Formula tex={tex`S_{yy}=${formatNum(BMI.Syy, 3)},\quad SS_E=n(S_{yy}-\hat\beta_1 S_{xy})=${formatNum(BMI.SSE, 2)}`} />
      <Formula tex={tex`\hat\sigma^2=\dfrac{SS_E}{n-2}=\dfrac{${formatNum(BMI.SSE, 2)}}{248}=${formatNum(BMI.sigma2, 2)}`} />
    </SceneFrame>
  );
}

function TDistributionEstimatesScene() {
  return (
    <SceneFrame kicker="Distribution of the estimate" title={tex`Student-$t$ pivots after replacing $\sigma$ by $\hat\sigma$.`}>
      <Formula tex={tex`\hat\beta_1\sim N\!\left(\beta_1,\dfrac{\sigma^2}{nS_{xx}}\right),\qquad
\hat\beta_0\sim N\!\left(\beta_0,\sigma^2\!\left(\dfrac{1}{n}+\dfrac{\bar{x}^2}{nS_{xx}}\right)\right)`} />
      <Formula tex={tex`\hat\sigma^2:=\dfrac{1}{n-2}\sum_{i=1}^{n}(y_i-\hat\beta_0-\hat\beta_1 x_i)^2`} />
      <Formula
        tex={tex`\dfrac{\hat\beta_1-\beta_1}{\hat\sigma/\sqrt{nS_{xx}}}\sim t(n-2),\qquad
\dfrac{\hat\beta_0-\beta_0}{\hat\sigma\sqrt{\frac{1}{n}+\frac{\bar{x}^2}{nS_{xx}}}}\sim t(n-2)`}
      />
    </SceneFrame>
  );
}

function CiCoefficientsScene() {
  return (
    <SceneFrame kicker="Confidence interval for regression coefficients" title={tex`Intervals for $\beta_1$ and $\beta_0$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Slope</p>
          <Formula tex={tex`E(\hat\beta_1)=\beta_1,\quad V(\hat\beta_1)=\dfrac{\sigma^2}{nS_{xx}}`} />
          <p className={styles.small}>Use this to find the standard error.</p>
          <Formula
            tex={tex`\hat\beta_1\pm t_{\alpha/2}(n-2)\sqrt{\dfrac{\hat\sigma^2}{nS_{xx}}}`}
          />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Intercept</p>
          <Formula tex={tex`E(\hat\beta_0)=\beta_0,\quad V(\hat\beta_0)=\sigma^2\!\left[\dfrac{1}{n}+\dfrac{\bar{x}^2}{nS_{xx}}\right]`} />
          <Formula
            tex={tex`\hat\beta_0\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2\!\left(\dfrac{1}{n}+\dfrac{\bar{x}^2}{nS_{xx}}\right)}`}
          />
        </article>
      </div>
      <p className={styles.small}>The width of the confidence interval indicates the overall quality of the regression line.</p>
    </SceneFrame>
  );
}

function OxygenSlopeCiScene() {
  const tcrit = tUpper(0.025, OXY.df);
  const se = Math.sqrt(OXY.sigma2 / nSxx(OXY));
  const half = tcrit * se;
  return (
    <SceneFrame kicker="Gas purity example" title="95% CI on the slope.">
      <p className={styles.lead}>
        Example: oxygen purity confidence interval on the slope. From earlier:{" "}
        <MathText text={tex`$\hat\beta_1=${formatNum(OXY.b1, 3)}$`} />,{" "}
        <MathText text={tex`$S_{xx}=${formatNum(OXY.Sxx, 5)}$`} />,{" "}
        <MathText text={tex`$\hat\sigma^2=${formatNum(OXY.sigma2, 2)}$`} />.
      </p>
      <Formula
        tex={tex`t_{0.025,18}=${formatNum(tcrit, 3)},\quad
${formatNum(OXY.b1, 3)}\pm ${formatNum(tcrit, 3)}\sqrt{\dfrac{${formatNum(OXY.sigma2, 2)}}{nS_{xx}}}
=${formatNum(OXY.b1, 3)}\pm ${formatNum(tcrit, 3)}\sqrt{\dfrac{${formatNum(OXY.sigma2, 2)}}{${formatNum(nSxx(OXY), 5)}}}`}
      />
      <Formula tex={tex`${formatNum(OXY.b1 - half, 3)}\le\beta_1\le ${formatNum(OXY.b1 + half, 3)}`} />
      <p className={styles.small}>
        The interval does not include 0 → strong evidence (at <MathText text={tex`$\alpha=0.05$`} />) that the slope is
        not zero. Width ±{formatNum(half, 3)} is reasonably narrow because residual variance is fairly small.
      </p>
    </SceneFrame>
  );
}

function MeanResponseCiFormulaScene() {
  return (
    <SceneFrame kicker="Confidence interval on mean response" title={tex`CI for $\mu_{Y\mid x_0}$.`}>
      <p className={styles.lead}>
        A <MathText text={tex`$100(1-\alpha)\%$`} /> confidence interval about the mean response at{" "}
        <MathText text={tex`$x=x_0$`} />, say <MathText text={tex`$\mu_{Y\mid x_0}$`} />, is
      </p>
      <Formula
        tex={tex`\hat\mu_{Y\mid x_0}\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2\left(\dfrac{1}{n}+\dfrac{(x_0-\bar{x})^2}{nS_{xx}}\right)}`}
      />
      <Formula tex={tex`\hat\mu_{Y\mid x_0}=\hat\beta_0+\hat\beta_1 x_0,\qquad E(Y\mid x_0)=\mu_{Y\mid x_0}=\beta_0+\beta_1 x_0`} />
    </SceneFrame>
  );
}

function OxygenMeanCiScene() {
  const x0 = 1;
  const yHat = OXY.b0 + OXY.b1 * x0;
  const tcrit = tUpper(0.025, OXY.df);
  const den = nSxx(OXY);
  const half = tcrit * Math.sqrt(OXY.sigma2 * (1 / OXY.n + (x0 - OXY.xBar) ** 2 / den));
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  const meanBand = {
    lo: (x: number) => OXY.b0 + OXY.b1 * x - tcrit * Math.sqrt(OXY.sigma2 * (1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
    hi: (x: number) => OXY.b0 + OXY.b1 * x + tcrit * Math.sqrt(OXY.sigma2 * (1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
    color: "#2e7190",
  };
  return (
    <SceneFrame kicker="Gas purity example" title={tex`95% CI on mean purity at $x_0=1.00$.`}>
      <Formula tex={tex`\hat\mu_{Y\mid 1.00}=${formatNum(OXY.b0, 3)}+${formatNum(OXY.b1, 3)}(1)=${formatNum(yHat, 2)}`} />
      <Formula
        tex={tex`${formatNum(yHat, 2)}\pm ${formatNum(tcrit, 3)}\sqrt{${formatNum(OXY.sigma2, 2)}\left[\dfrac{1}{20}+\dfrac{(1-${formatNum(OXY.xBar, 4)})^2}{nS_{xx}}\right]}
=${formatNum(yHat, 2)}\pm ${formatNum(half, 2)}`}
      />
      <Formula tex={tex`${formatNum(yHat - half, 2)}\le\mu_{Y\mid 1.00}\le ${formatNum(yHat + half, 2)}`} />
      <ScatterPlot points={points} xLabel="Hydrocarbon (%)" yLabel="Purity (%)" line={{ b0: OXY.b0, b1: OXY.b1 }} bands={[meanBand]} />
    </SceneFrame>
  );
}

function PredictionIntervalFormulaScene() {
  return (
    <SceneFrame kicker="Prediction interval" title="Predicting a new response.">
      <p className={styles.lead}>
        Predicting the response for a new observation. The new observation is independent of the data used to build the
        linear regression model.
      </p>
      <Formula
        tex={tex`\hat{y}_0\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2\left(1+\dfrac{1}{n}+\dfrac{(x_0-\bar{x})^2}{nS_{xx}}\right)}`}
      />
    </SceneFrame>
  );
}

function OxygenPredIntervalScene() {
  const x0 = 1;
  const yHat = OXY.b0 + OXY.b1 * x0;
  const tcrit = tUpper(0.025, OXY.df);
  const half = tcrit * Math.sqrt(OXY.sigma2 * (1 + 1 / OXY.n + (x0 - OXY.xBar) ** 2 / nSxx(OXY)));
  return (
    <SceneFrame kicker="Gas purity example" title={tex`95% prediction interval at $x_0=1.00$.`}>
      <p className={styles.lead}>
        From the mean-response example, <MathText text={tex`$\hat{y}_0=${formatNum(yHat, 2)}$`} />.
      </p>
      <Formula
        tex={tex`${formatNum(yHat, 2)}\pm ${formatNum(tcrit, 3)}\sqrt{${formatNum(OXY.sigma2, 2)}\left[1+\dfrac{1}{20}+\dfrac{(1-${formatNum(OXY.xBar, 4)})^2}{nS_{xx}}\right]}`}
      />
      <Formula tex={tex`${formatNum(yHat - half, 2)}\le Y_0\le ${formatNum(yHat + half, 2)}`} />
      <p className={styles.small}>
        Prediction intervals are always wider than confidence limits on the mean response at the same{" "}
        <MathText text={tex`$x_0$`} />.
      </p>
    </SceneFrame>
  );
}

function PredVsMeanScene() {
  return (
    <SceneFrame kicker="Observation" title="Why the prediction interval is wider.">
      <p className={styles.lead}>
        A prediction interval is always wider than a confidence interval. This is because a prediction interval depends
        on both the error from fitting the model and the randomness of the new observation.
      </p>
      <Formula
        tex={tex`\text{mean CI uses }\sqrt{\tfrac{1}{n}+\tfrac{(x_0-\bar x)^2}{nS_{xx}}}
\quad\text{vs}\quad
\text{PI uses }\sqrt{1+\tfrac{1}{n}+\tfrac{(x_0-\bar x)^2}{nS_{xx}}}`}
      />
    </SceneFrame>
  );
}

function IntervalExplorerScene() {
  const [x0, setX0] = useState(1.0);
  const tcrit = tUpper(0.025, OXY.df);
  const yHat = OXY.b0 + OXY.b1 * x0;
  const den = nSxx(OXY);
  const meanFactor = 1 / OXY.n + (x0 - OXY.xBar) ** 2 / den;
  const predFactor = 1 + meanFactor;
  const meanHalf = tcrit * Math.sqrt(OXY.sigma2 * meanFactor);
  const predHalf = tcrit * Math.sqrt(OXY.sigma2 * predFactor);
  const points = OXY_X.map((x, i) => ({ x, y: OXY_Y[i] }));
  const meanBand = useMemo(
    () => ({
      lo: (x: number) => OXY.b0 + OXY.b1 * x - tcrit * Math.sqrt(OXY.sigma2 * (1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
      hi: (x: number) => OXY.b0 + OXY.b1 * x + tcrit * Math.sqrt(OXY.sigma2 * (1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
      color: "#2e7190",
    }),
    [tcrit, den],
  );
  const predBand = useMemo(
    () => ({
      lo: (x: number) => OXY.b0 + OXY.b1 * x - tcrit * Math.sqrt(OXY.sigma2 * (1 + 1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
      hi: (x: number) => OXY.b0 + OXY.b1 * x + tcrit * Math.sqrt(OXY.sigma2 * (1 + 1 / OXY.n + (x - OXY.xBar) ** 2 / den)),
      color: "#df4a3e",
    }),
    [tcrit, den],
  );
  return (
    <SceneFrame kicker="Explorer" title={tex`Move $x_0$: mean CI (blue) vs prediction (red).`}>
      <LiveOnly>
        <label className={styles.sliderRow}>
          <span>
            <MathText text={tex`$x_0=${formatNum(x0, 2)}$`} />
          </span>
          <input type="range" min={0.9} max={1.5} step={0.01} value={x0} onChange={(e) => setX0(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>Interactive slider on the website.</p>
      </PrintOnly>
      <div className={styles.two}>
        <ScatterPlot
          points={points}
          xLabel="Hydrocarbon (%)"
          yLabel="Purity (%)"
          line={{ b0: OXY.b0, b1: OXY.b1 }}
          bands={[predBand, meanBand]}
          highlight={{ x: x0, y: yHat, label: formatNum(yHat, 1) }}
        />
        <div>
          <Formula tex={tex`\hat{y}=${formatNum(yHat, 2)}`} />
          <Formula
            tex={tex`\text{mean CI: }[${formatNum(yHat - meanHalf, 2)},\ ${formatNum(yHat + meanHalf, 2)}]`}
          />
          <Formula
            tex={tex`\text{PI: }[${formatNum(yHat - predHalf, 2)},\ ${formatNum(yHat + predHalf, 2)}]`}
          />
        </div>
      </div>
    </SceneFrame>
  );
}

function SummaryParametersScene() {
  return (
    <SceneFrame kicker="Summary" title="Parameters, estimates, and CIs.">
      <Formula tex={tex`Y_i=\beta_0+\beta_1 X_i+\varepsilon_i,\qquad \varepsilon_i\sim N(0,\sigma^2)`} />
      <Formula
        tex={tex`\hat\beta_0=\bar{y}-\hat\beta_1\bar{x}\sim N\!\left(\beta_0,\sigma^2\!\left(\tfrac{1}{n}+\tfrac{\bar{x}^2}{nS_{xx}}\right)\right)`}
      />
      <Formula
        tex={tex`\hat\beta_0\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2\!\left(\tfrac{1}{n}+\tfrac{\bar{x}^2}{nS_{xx}}\right)}`}
      />
      <Formula tex={tex`\hat\beta_1=\dfrac{S_{xy}}{S_{xx}}\sim N\!\left(\beta_1,\tfrac{\sigma^2}{nS_{xx}}\right)`} />
      <Formula tex={tex`\hat\beta_1\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2/(nS_{xx})}`} />
      <Formula tex={tex`\hat\sigma^2:=\dfrac{1}{n-2}\sum(y_i-\hat\beta_0-\hat\beta_1 x_i)^2`} />
    </SceneFrame>
  );
}

function InferenceCheckQuizScene() {
  const items: QuizItem[] = [
    {
      q: tex`The $t$ critical value for a CI on $\beta_1$ uses how many degrees of freedom?`,
      options: [tex`$n$`, tex`$n-1$`, tex`$n-2$`, tex`$2$`],
      answer: 2,
      why: tex`Two parameters $\hat\beta_0$ and $\hat\beta_1$ are estimated, so $df=n-2$.`,
    },
    {
      q: tex`$\hat\sigma^2$ is`,
      options: [
        tex`$\sum e_i^2/n$`,
        tex`$\sum e_i^2/(n-1)$`,
        tex`$\sum e_i^2/(n-2)$`,
        tex`$S_{yy}/S_{xx}$`,
      ],
      answer: 2,
      why: tex`$\hat\sigma^2=SS_E/(n-2)$, and $SS_E=\sum e_i^2$.`,
    },
    {
      q: tex`The variance of $\hat\beta_1$ is`,
      options: [
        tex`$\sigma^2/n$`,
        tex`$\sigma^2/(nS_{xx})$`,
        tex`$\sigma^2/S_{xy}$`,
        tex`$\hat\beta_1/n$`,
      ],
      answer: 1,
      why: tex`Because $S_{xx}$ already divides by $n$, $V(\hat\beta_1)=\sigma^2/(nS_{xx})$.`,
    },
    {
      q: tex`A 95% prediction interval for a new $Y$ at $x_0$ is wider than the 95% CI for the mean response at the same $x_0$ because`,
      options: [
        "It uses a larger $t$ critical value",
        tex`It adds an extra $1$ under the square root for the new error`,
        tex`It replaces $n-2$ by $n-1$`,
        "It ignores $\\hat\\sigma^2$",
      ],
      answer: 1,
      why: tex`The PI has $1+1/n+(x_0-\bar x)^2/(nS_{xx})$; the mean CI drops the leading $1$.`,
    },
    {
      q: tex`Moving $x_0$ farther from $\bar{x}$ makes both the mean CI and the prediction interval`,
      options: ["Narrower", "Unchanged", "Wider", "One narrower and one wider"],
      answer: 2,
      why: tex`Both formulas grow with $(x_0-\bar x)^2/(nS_{xx})$.`,
    },
    {
      q: tex`If a 95% CI for $\beta_1$ does not contain $0$, then at $\alpha=0.05$ we`,
      options: [
        tex`Fail to reject $H_0:\beta_1=0$`,
        tex`Reject $H_0:\beta_1=0$`,
        tex`Conclude $\beta_1$ is exactly the center of the interval`,
        tex`Must refit with a larger $n$`,
      ],
      answer: 1,
      why: tex`The CI and the two-sided $t$ test reject $H_0:\beta_1=0$ together.`,
    },
  ];
  return (
    <SceneFrame kicker="Check understanding" title="Intervals and sampling distributions — quick poll.">
      <QuizBlock items={items} />
    </SceneFrame>
  );
}

function HtSectionScene() {
  return (
    <SceneFrame kicker="Next block" title="Hypothesis tests" tone="gold">
      <p className={styles.lead}>
        Tests on the regression parameters, with the important special case{" "}
        <MathText text={tex`$H_0:\beta_1=0$`} /> (significance of regression).
      </p>
    </SceneFrame>
  );
}

function HtParametersScene() {
  return (
    <SceneFrame kicker="Hypothesis test on regression parameters" title="Slope and intercept.">
      <Formula tex={tex`Y_i=\beta_0+\beta_1 X_i+\varepsilon_i`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Slope</p>
          <Formula tex={tex`H_0:\beta_1=\beta_{1,0}\quad\text{vs}\quad H_1:\beta_1\neq\beta_{1,0}`} />
          <p className={styles.small}>An appropriate test statistic would be</p>
          <Formula tex={tex`t_0=\dfrac{\hat\beta_1-\beta_{1,0}}{\sqrt{\hat\sigma^2/(nS_{xx})}}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Intercept</p>
          <Formula tex={tex`H_0:\beta_0=\beta_{0,0}\quad\text{vs}\quad H_1:\beta_0\neq\beta_{0,0}`} />
          <p className={styles.small}>An appropriate test statistic would be</p>
          <Formula
            tex={tex`t_0=\dfrac{\hat\beta_0-\beta_{0,0}}{\sqrt{\hat\sigma^2\left[\frac{1}{n}+\frac{\bar{x}^2}{nS_{xx}}\right]}}`}
          />
        </article>
      </div>
      <p className={styles.lead}>
        Reject <MathText text={tex`$H_0$`} /> if <MathText text={tex`$|t_0|>t_{\alpha/2,\,n-2}$`} />. Confidence intervals
        can also be used to test the above hypotheses.
      </p>
    </SceneFrame>
  );
}

function SignificanceOfRegressionScene() {
  const noise = Array.from({ length: 24 }, (_, i) => {
    const x = 0.85 + (i / 23) * 0.7;
    const y = 92 + Math.sin(i * 3.1) * 3 + Math.cos(i * 7.7) * 2;
    return { x, y };
  });
  const curve = Array.from({ length: 24 }, (_, i) => {
    const x = 0.85 + (i / 23) * 0.7;
    const t = (x - 1.2) * 8;
    return { x, y: 92 + t * t - 2 };
  });
  return (
    <SceneFrame kicker="Hypothesis test on slope" title={tex`Special case: $H_0:\beta_1=0$ (significance of regression).`}>
      <Formula tex={tex`H_0:\beta_1=0\quad\text{vs}\quad H_1:\beta_1\neq 0`} />
      <p className={styles.lead}>
        These hypotheses relate to the <strong>significance of regression</strong>. Failure to reject{" "}
        <MathText text={tex`$H_0$`} /> is equivalent to concluding that there is no <em>linear</em> relationship between{" "}
        <MathText text={tex`$x$`} /> and <MathText text={tex`$Y$`} />.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>(a) no pattern</p>
          <ScatterPlot points={noise} xLabel="x" yLabel="y" flatLine height={200} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>(b) nonlinear pattern</p>
          <ScatterPlot points={curve} xLabel="x" yLabel="y" flatLine height={200} />
        </article>
      </div>
    </SceneFrame>
  );
}

function OxygenSlopeTestScene() {
  const se = Math.sqrt(OXY.sigma2 / nSxx(OXY));
  const t0 = OXY.b1 / se;
  const tcrit = tUpper(0.025, OXY.df);
  const p = 2 * tUpperTail(Math.abs(t0), OXY.df);
  return (
    <SceneFrame kicker="Gas purity example" title={tex`Test $H_0:\beta_1=0$ for oxygen data.`}>
      <Formula
        tex={tex`t_0=\dfrac{\hat\beta_1}{\sqrt{\hat\sigma^2/(nS_{xx})}}=\dfrac{${formatNum(OXY.b1, 3)}}{${formatNum(se, 3)}}=${formatNum(t0, 2)}`}
      />
      <Formula tex={tex`t_{0.025,18}=${formatNum(tcrit, 3)},\quad p\text{-value}=2P(T_{18}>|t_0|)\approx ${formatP(p)}`} />
      <p className={styles.lead}>
        Reject <MathText text={tex`$H_0$`} /> at the usual levels: hydrocarbon level is a significant linear predictor of
        purity.
      </p>
    </SceneFrame>
  );
}

function SummarySlopeInferenceScene() {
  return (
    <SceneFrame kicker="Summary" title={tex`Inference on the slope $\beta_1$.`}>
      <Formula tex={tex`H_0:\beta_1=\beta_{1,0},\quad t_0=\dfrac{\hat\beta_1-\beta_{1,0}}{\sqrt{\hat\sigma^2/(nS_{xx})}},\quad t_0\sim t(n-2)\text{ under }H_0`} />
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Alternative</th>
              <th>Reject if</th>
              <th>p-value</th>
              <th>CI approach</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_1\neq\beta_{1,0}$`} />
              </td>
              <td>
                <MathText text={tex`$|t_0|>t_{\alpha/2}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$2P(T>|t_0|)$`} />
              </td>
              <td>
                <MathText text={tex`$[\hat\beta_1\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2/(nS_{xx})}]$`} />
              </td>
            </tr>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_1>\beta_{1,0}$`} />
              </td>
              <td>
                <MathText text={tex`$t_0>t_{\alpha}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$P(T>t_0)$`} />
              </td>
              <td>
                <MathText text={tex`$[\hat\beta_1-t_{\alpha}(n-2)\sqrt{\hat\sigma^2/(nS_{xx})},+\infty)$`} />
              </td>
            </tr>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_1<\beta_{1,0}$`} />
              </td>
              <td>
                <MathText text={tex`$t_0<-t_{\alpha}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$P(T<t_0)$`} />
              </td>
              <td>
                <MathText text={tex`$(-\infty,\hat\beta_1+t_{\alpha}(n-2)\sqrt{\hat\sigma^2/(nS_{xx})}]$`} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        Reject when p-value &lt; <MathText text={tex`$\alpha$`} />, or when the CI does not include{" "}
        <MathText text={tex`$\beta_{1,0}$`} />.
      </p>
    </SceneFrame>
  );
}

function SummaryInterceptInferenceScene() {
  return (
    <SceneFrame kicker="Summary" title={tex`Inference on the intercept $\beta_0$.`}>
      <Formula tex={tex`Y_i=\beta_0+\beta_1 X_i+\varepsilon_i`} />
      <Formula
        tex={tex`H_0:\beta_0=\beta_{0,0},\quad
t_0=\dfrac{\hat\beta_0-\beta_{0,0}}{\sqrt{\hat\sigma^2[\frac{1}{n}+\frac{\bar{x}^2}{nS_{xx}}]}},\quad
t_0\sim t(n-2)\text{ under }H_0`}
      />
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Alternative</th>
              <th>Reject if</th>
              <th>p-value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_0\neq\beta_{0,0}$`} />
              </td>
              <td>
                <MathText text={tex`$|t_0|>t_{\alpha/2}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$2P(T>|t_0|)$`} />
              </td>
            </tr>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_0>\beta_{0,0}$`} />
              </td>
              <td>
                <MathText text={tex`$t_0>t_{\alpha}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$P(T>t_0)$`} />
              </td>
            </tr>
            <tr>
              <td>
                <MathText text={tex`$H_1:\beta_0<\beta_{0,0}$`} />
              </td>
              <td>
                <MathText text={tex`$t_0<-t_{\alpha}(n-2)$`} />
              </td>
              <td>
                <MathText text={tex`$P(T<t_0)$`} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Formula
        tex={tex`\text{two-sided CI: }\hat\beta_0\pm t_{\alpha/2}(n-2)\sqrt{\hat\sigma^2\!\left(\tfrac{1}{n}+\tfrac{\bar{x}^2}{nS_{xx}}\right)}`}
      />
      <p className={styles.small}>
        Reject when p-value &lt; <MathText text={tex`$\alpha$`} />, or when the CI does not include{" "}
        <MathText text={tex`$\beta_{0,0}$`} />.
      </p>
    </SceneFrame>
  );
}

function CoefficientTestQuizScene() {
  const items: QuizItem[] = [
    {
      q: tex`The test statistic for $H_0:\beta_1=\beta_{1,0}$ is`,
      options: [
        tex`$(\hat\beta_1-\beta_{1,0})/\sqrt{\hat\sigma^2/n}$`,
        tex`$(\hat\beta_1-\beta_{1,0})/\sqrt{\hat\sigma^2/(nS_{xx})}$`,
        tex`$(\hat\beta_0-\beta_{1,0})/\sqrt{\hat\sigma^2/(nS_{xx})}$`,
        tex`$S_{xy}/S_{xx}$`,
      ],
      answer: 1,
      why: tex`Under $H_0$, $t_0=(\hat\beta_1-\beta_{1,0})/\sqrt{\hat\sigma^2/(nS_{xx})}\sim t(n-2)$.`,
    },
    {
      q: tex`For a two-sided test of $H_0:\beta_1=\beta_{1,0}$ at level $\alpha$, reject if`,
      options: [
        tex`$t_0>t_{\alpha,\,n-2}$`,
        tex`$t_0<-t_{\alpha/2,\,n-2}$`,
        tex`$|t_0|>t_{\alpha/2,\,n-2}$`,
        tex`$|t_0|>t_{\alpha,\,n-2}$`,
      ],
      answer: 2,
      why: tex`Two-sided rejection uses both tails, so the critical value is $t_{\alpha/2}(n-2)$.`,
    },
    {
      q: tex`For $H_1:\beta_1>\beta_{1,0}$, the p-value is`,
      options: [
        tex`$2P(T>|t_0|)$`,
        tex`$P(T>t_0)$`,
        tex`$P(T<t_0)$`,
        tex`$P(T>t_{\alpha/2})$`,
      ],
      answer: 1,
      why: tex`A right-tailed alternative uses only the upper tail of $t(n-2)$.`,
    },
    {
      q: tex`Failing to reject $H_0:\beta_1=0$ means`,
      options: [
        tex`$x$ and $Y$ are independent`,
        "There is no relationship of any kind",
        tex`There is no linear relationship between $x$ and $Y$`,
        tex`$\hat\beta_1$ is exactly $0$`,
      ],
      answer: 2,
      why: tex`The test only concerns a straight-line association. A curve can still be present.`,
    },
    {
      q: tex`The denominator of $t_0$ for a test on $\beta_0$ is`,
      options: [
        tex`$\sqrt{\hat\sigma^2/n}$`,
        tex`$\sqrt{\hat\sigma^2/(nS_{xx})}$`,
        tex`$\sqrt{\hat\sigma^2\left[\frac{1}{n}+\frac{\bar{x}^2}{nS_{xx}}\right]}$`,
        tex`$\sqrt{\hat\sigma^2/(n-2)}$`,
      ],
      answer: 2,
      why: tex`The intercept standard error includes both $1/n$ and $\bar{x}^2/(nS_{xx})$.`,
    },
    {
      q: tex`A 95% CI for $\beta_1$ that excludes $\beta_{1,0}$ means, for the two-sided test at $\alpha=0.05$, we`,
      options: [
        tex`Fail to reject $H_0:\beta_1=\beta_{1,0}$`,
        tex`Reject $H_0:\beta_1=\beta_{1,0}$`,
        "Have a p-value larger than 0.05",
        "Must switch to a one-sided test",
      ],
      answer: 1,
      why: tex`The two-sided CI and the two-sided $t$ test reject the same values of $\beta_{1,0}$.`,
    },
  ];
  return (
    <SceneFrame kicker="Check understanding" title="Hypothesis tests for the coefficients — quick poll.">
      <QuizBlock items={items} />
      <p className={styles.footerNote}>DOTE2011G · Linear Regression · CUHK</p>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Start", label: "Cover", Scene: CoverScene },
  { id: "cov-def", chapter: "Covariance", label: "Definition", Scene: CovDefinitionScene },
  { id: "cov-props", chapter: "Covariance", label: "Properties", Scene: CovPropertiesScene },
  { id: "cov-quiz", chapter: "Covariance", label: "Sign of Cov quiz", Scene: CovSignQuizScene },
  { id: "cov-line", chapter: "Covariance", label: "Cov along a line", Scene: CovLineBridgeScene },
  { id: "beta1-est", chapter: "Covariance", label: "β₁ Estimation", Scene: Beta1EstimationScene },
  { id: "line-explorer", chapter: "Covariance", label: "y = β₀ + β₁x", Scene: LineExplorerScene },
  { id: "scatter-intro", chapter: "Fit", label: "Scatter diagram", Scene: ScatterIntroScene },
  { id: "oxygen-table", chapter: "Fit", label: "Oxygen data", Scene: OxygenTableScene },
  { id: "model", chapter: "Fit", label: "SLR model", Scene: ModelScene },
  { id: "least-squares", chapter: "Fit", label: "Least squares", Scene: LeastSquaresScene },
  { id: "oxygen-setup", chapter: "Fit", label: "Oxygen setup", Scene: OxygenExampleSetupScene },
  { id: "oxygen-fit", chapter: "Fit", label: "Oxygen fitted", Scene: OxygenFittedScene },
  { id: "bmi-setup", chapter: "Fit", label: "BMI setup", Scene: BmiSetupScene },
  { id: "bmi-fit", chapter: "Fit", label: "BMI fit", Scene: BmiFitScene },
  { id: "bmi-use", chapter: "Fit", label: "BMI predict/residual", Scene: BmiUseScene },
  { id: "diagnosis-x", chapter: "Check", label: "Residuals vs x", Scene: ModelDiagnosisVsXScene },
  { id: "diagnosis-normal", chapter: "Check", label: "Residual normality", Scene: ModelDiagnosisNormalScene },
  { id: "fit-quiz", chapter: "Check", label: "Check understanding", Scene: FitCheckQuizScene },
  { id: "ci-section", chapter: "Infer", label: "CI section", Scene: CiSectionScene },
  { id: "infer-model", chapter: "Infer", label: "Normal model", Scene: InferenceModelScene },
  { id: "linear-combos", chapter: "Infer", label: "Estimates as combos", Scene: EstimatesAsLinearCombosScene },
  { id: "normal-combo", chapter: "Infer", label: "Linear combo of normals", Scene: NormalLinearComboScene },
  { id: "est-dist", chapter: "Infer", label: "Dist. of estimates", Scene: EstimatesDistributionScene },
  { id: "sigma2", chapter: "Infer", label: "Estimate σ²", Scene: VarianceEstimationScene },
  { id: "oxygen-var", chapter: "Infer", label: "Oxygen σ²", Scene: OxygenVarianceScene },
  { id: "bmi-var", chapter: "Infer", label: "BMI σ²", Scene: BmiVarianceScene },
  { id: "t-pivots", chapter: "Infer", label: "t pivots", Scene: TDistributionEstimatesScene },
  { id: "ci-coef", chapter: "Infer", label: "CI for β₀, β₁", Scene: CiCoefficientsScene },
  { id: "oxygen-slope-ci", chapter: "Infer", label: "Oxygen slope CI", Scene: OxygenSlopeCiScene },
  { id: "mean-ci-formula", chapter: "Infer", label: "Mean-response CI", Scene: MeanResponseCiFormulaScene },
  { id: "oxygen-mean-ci", chapter: "Infer", label: "Oxygen mean CI", Scene: OxygenMeanCiScene },
  { id: "pi-formula", chapter: "Infer", label: "Prediction interval", Scene: PredictionIntervalFormulaScene },
  { id: "oxygen-pi", chapter: "Infer", label: "Oxygen PI", Scene: OxygenPredIntervalScene },
  { id: "pi-vs-mean", chapter: "Infer", label: "PI vs mean CI", Scene: PredVsMeanScene },
  { id: "explorer", chapter: "Infer", label: "Interval explorer", Scene: IntervalExplorerScene },
  { id: "summary-params", chapter: "Infer", label: "Parameter summary", Scene: SummaryParametersScene },
  { id: "infer-quiz", chapter: "Infer", label: "Check understanding", Scene: InferenceCheckQuizScene },
  { id: "ht-section", chapter: "Test", label: "HT section", Scene: HtSectionScene },
  { id: "ht-params", chapter: "Test", label: "Tests on β₀, β₁", Scene: HtParametersScene },
  { id: "sig-reg", chapter: "Test", label: "Significance of reg.", Scene: SignificanceOfRegressionScene },
  { id: "oxygen-slope-test", chapter: "Test", label: "Oxygen slope test", Scene: OxygenSlopeTestScene },
  { id: "summary-slope", chapter: "Test", label: "Summary: slope", Scene: SummarySlopeInferenceScene },
  { id: "summary-intercept", chapter: "Test", label: "Summary: intercept", Scene: SummaryInterceptInferenceScene },
  { id: "ht-quiz", chapter: "Test", label: "Check understanding", Scene: CoefficientTestQuizScene },
];
