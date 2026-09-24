import { useState, type ReactElement, type ReactNode } from "react";
import { binomialCdf, binomialPmf, formatProb, invStdNormal, normalCdf, stdNormalCdf, uniformCdfInterval } from "../utils";
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
  "Use ← → or the buttons above. Move the sliders to recompute probabilities. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

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
      <p className={styles.kicker}>{kicker}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

function normalY(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

function NormalBand({
  mu,
  sigma,
  lo,
  hi,
  label,
  xMin,
  xMax,
  yMax,
  xTicks,
}: {
  mu: number;
  sigma: number;
  lo: number;
  hi: number;
  label: string;
  xMin?: number;
  xMax?: number;
  /** When set, the vertical scale is fixed so taller/shorter peaks are visible. */
  yMax?: number;
  xTicks?: number[];
}) {
  const W = 560;
  const H = 220;
  const pad = { l: 44, r: 16, t: 18, b: 36 };
  const sd = Math.max(sigma, 0.01);
  const left = xMin ?? mu - 4 * sd;
  const right = xMax ?? mu + 4 * sd;
  const span = Math.max(right - left, 1e-6);
  const n = 201;
  const xs = Array.from({ length: n }, (_, i) => left + (span * i) / (n - 1));
  const density = (x: number) => normalY((x - mu) / sd) / sd;
  const ys = xs.map(density);
  const peak = Math.max(...ys, 1e-6);
  const topY = yMax ?? peak * 1.08;
  const xOf = (x: number) => pad.l + ((x - left) / span) * (W - pad.l - pad.r);
  const yOf = (y: number) => pad.t + (1 - Math.min(y, topY) / topY) * (H - pad.t - pad.b);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(ys[i]).toFixed(2)}`).join(" ");
  const base = yOf(0);
  const shadeLo = Math.max(lo, left);
  const shadeHi = Math.min(hi, right);
  const shade =
    shadeHi > shadeLo
      ? Array.from({ length: 81 }, (_, i) => shadeLo + ((shadeHi - shadeLo) * i) / 80)
      : [];
  const shadePath =
    shade.length > 1
      ? `M ${xOf(shade[0]).toFixed(2)} ${base} ` +
        shade.map((x) => `L ${xOf(x).toFixed(2)} ${yOf(density(x)).toFixed(2)}`).join(" ") +
        ` L ${xOf(shade[shade.length - 1]).toFixed(2)} ${base} Z`
      : "";
  const meanX = Math.min(right, Math.max(left, mu));
  const ticks = xTicks ?? [];
  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} stroke="#16213c" strokeWidth="1.5" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={base} stroke="#16213c" strokeWidth="1.5" />
        {shadePath ? <path d={shadePath} fill="rgba(223,74,62,0.35)" /> : null}
        <path d={path} fill="none" stroke="#16213c" strokeWidth="2.5" />
        <line x1={xOf(meanX)} y1={pad.t} x2={xOf(meanX)} y2={base} stroke="#16213c" strokeDasharray="4 3" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={xOf(tick)} y1={base} x2={xOf(tick)} y2={base + 5} stroke="#16213c" />
            <text x={xOf(tick)} y={base + 18} textAnchor="middle" fontSize="11" fill="#16213c">
              {tick}
            </text>
          </g>
        ))}
        <text x={xOf(meanX)} y={H - 4} textAnchor="middle" fontSize="12" fill="#16213c">
          μ = {mu}
        </text>
        <text x={10} y={pad.t + 10} fontSize="12" fill="#16213c">
          f(x)
        </text>
      </svg>
      <figcaption className={styles.small}>{label}</figcaption>
    </figure>
  );
}

function StandardNormalTail({ alpha, zCut }: { alpha: number; zCut: number }) {
  const W = 560;
  const H = 240;
  const pad = { l: 36, r: 18, t: 22, b: 52 };
  const xMin = -3.5;
  const xMax = 3.5;
  const yMax = 0.45;
  const n = 201;
  const xs = Array.from({ length: n }, (_, i) => xMin + ((xMax - xMin) * i) / (n - 1));
  const ys = xs.map(normalY);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const xOf = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
  const yOf = (y: number) => pad.t + (1 - y / yMax) * plotH;
  const base = yOf(0);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(ys[i]).toFixed(2)}`).join(" ");
  const z = Math.min(xMax - 0.02, Math.max(xMin, zCut));
  const shade = xs.filter((x) => x >= z);
  const shadePath =
    shade.length > 1
      ? `M ${xOf(shade[0]).toFixed(2)} ${base} ` +
        shade.map((x) => `L ${xOf(x).toFixed(2)} ${yOf(normalY(x)).toFixed(2)}`).join(" ") +
        ` L ${xOf(shade[shade.length - 1]).toFixed(2)} ${base} Z`
      : "";
  const ticks = [-3, -2, -1, 0, 1, 2, 3].filter((tick) => Math.abs(tick - z) > 0.55);
  const areaX = Math.min(z + 0.12, 2.7);
  const areaY = Math.max(pad.t + 16, yOf(normalY(z)) - 10);
  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Standard normal right tail. Area ${alpha.toFixed(2)} starts at z ${z.toFixed(3)}.`}>
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} stroke="#16213c" strokeWidth="1.5" />
        {shadePath ? <path d={shadePath} fill="#f7b0cb" stroke="#e36a9a" strokeWidth="1.5" /> : null}
        <path d={path} fill="none" stroke="#16213c" strokeWidth="2.5" />
        <line x1={xOf(z)} y1={yOf(normalY(z))} x2={xOf(z)} y2={base + 8} stroke="#c2185b" strokeWidth="2" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={xOf(tick)} y1={base} x2={xOf(tick)} y2={base + 5} stroke="#16213c" />
            <text x={xOf(tick)} y={base + 18} textAnchor="middle" fontSize="12" fill="#16213c">
              {tick}
            </text>
          </g>
        ))}
        <text x={xOf(z)} y={base + 36} textAnchor="middle" fontSize="13" fontWeight="700" fill="#c2185b">
          z={z.toFixed(3)}
        </text>
        <text x={xOf(areaX)} y={areaY} textAnchor="start" fontSize="14" fontWeight="700" fill="#9d174d">
          Area={alpha.toFixed(2)}
        </text>
        <text x={pad.l + 4} y={pad.t + 4} fontSize="12" fill="#16213c">
          f(z)
        </text>
      </svg>
      <figcaption className={styles.small}>
        Standard normal. The pink area on the right is the stockout probability. z is the value that cuts it off.
      </figcaption>
    </figure>
  );
}

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id="cover">
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Continuous Probability Distributions</h1>
        <p className={styles.lead}>
          Uniform, normal, and exponential models — probability as area under a density, not as a probability at a single point.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function ContinuousIdeaScene() {
  return (
    <SceneFrame kicker="Continuous random variables" title="Any value in an interval — not a list of points.">
      <p className={styles.lead}>
        A continuous random variable can take any value in an interval (or a collection of intervals) on the real line.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>What we do not say</p>
          <MathText text={tex`The probability that $X$ equals one exact number is zero: $P(X = x) = 0$.`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>What we do say</p>
          <MathText text={tex`We ask for an interval: $P(x_1 < X < x_2)$ is the area under the density between $x_1$ and $x_2$.`} />
        </article>
      </div>
      <p className={styles.small}>
        Endpoints do not matter for a continuous variable: <MathText text={tex`$P(X \le x_2) = P(X < x_2)$.`} />
      </p>
    </SceneFrame>
  );
}

function DensityAreaPlot() {
  const W = 560;
  const H = 220;
  const pad = { l: 40, r: 18, t: 20, b: 44 };
  const xMin = -3.4;
  const xMax = 3.4;
  const yMax = 0.45;
  const x1 = -0.6;
  const x2 = 1.4;
  const n = 161;
  const xs = Array.from({ length: n }, (_, i) => xMin + ((xMax - xMin) * i) / (n - 1));
  const ys = xs.map(normalY);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const xOf = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
  const yOf = (y: number) => pad.t + (1 - y / yMax) * plotH;
  const base = yOf(0);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(ys[i]).toFixed(2)}`).join(" ");
  const shade = xs.filter((x) => x >= x1 && x <= x2);
  const shadePath =
    shade.length > 1
      ? `M ${xOf(shade[0]).toFixed(2)} ${base} ` +
        shade.map((x) => `L ${xOf(x).toFixed(2)} ${yOf(normalY(x)).toFixed(2)}`).join(" ") +
        ` L ${xOf(shade[shade.length - 1]).toFixed(2)} ${base} Z`
      : "";
  const mid = (x1 + x2) / 2;
  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Density curve with shaded area between x1 and x2">
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} stroke="#16213c" strokeWidth="1.5" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={base} stroke="#16213c" strokeWidth="1.5" />
        {shadePath ? <path d={shadePath} fill="#f7b0cb" stroke="#e36a9a" strokeWidth="1" /> : null}
        <path d={path} fill="none" stroke="#16213c" strokeWidth="2.5" />
        <line x1={xOf(x1)} y1={yOf(normalY(x1))} x2={xOf(x1)} y2={base + 6} stroke="#df4a3e" strokeWidth="2" strokeDasharray="4 3" />
        <line x1={xOf(x2)} y1={yOf(normalY(x2))} x2={xOf(x2)} y2={base + 6} stroke="#df4a3e" strokeWidth="2" strokeDasharray="4 3" />
        <text x={xOf(x1)} y={base + 22} textAnchor="middle" fontSize="14" fontWeight="700" fill="#df4a3e">
          x₁
        </text>
        <text x={xOf(x2)} y={base + 22} textAnchor="middle" fontSize="14" fontWeight="700" fill="#df4a3e">
          x₂
        </text>
        <text x={xOf(mid)} y={yOf(normalY(mid) * 0.45)} textAnchor="middle" fontSize="13" fontWeight="700" fill="#9d174d">
          area = P(x₁ &lt; X &lt; x₂)
        </text>
        <text x={pad.l + 6} y={pad.t + 6} fontSize="13" fill="#16213c">
          f(x)
        </text>
        <text x={W - pad.r} y={base + 22} textAnchor="end" fontSize="12" fill="#16213c">
          x
        </text>
      </svg>
      <figcaption className={styles.small}>
        The pink region is the probability. The whole area under the curve equals 1.
      </figcaption>
    </figure>
  );
}

function AreaScene() {
  return (
    <SceneFrame kicker="Density" title="Probability is the area under f(x).">
      <p className={styles.lead}>
        The graph of the probability density function <MathText text={tex`$f(x)$`} /> sits above the axis. The total area under the curve is 1.
      </p>
      <DensityAreaPlot />
      <Formula tex={tex`P(x_1 < X < x_2) = \int_{x_1}^{x_2} f(x)\,dx`} />
      <p className={styles.small}>
        This rule is the same for uniform, normal, and exponential densities. The shape of <MathText text={tex`$f(x)$`} /> changes; the meaning of area does not.
      </p>
    </SceneFrame>
  );
}

function CdfComparePlots() {
  const W = 300;
  const H = 200;
  const pad = { l: 36, r: 14, t: 18, b: 34 };
  const xMin = -0.5;
  const xMax = 7;
  const yMax = 1.08;
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const xOf = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
  const yOf = (y: number) => pad.t + (1 - y / yMax) * plotH;
  const base = yOf(0);
  const continuousPath = [
    `M ${xOf(xMin).toFixed(1)} ${yOf(0).toFixed(1)}`,
    `L ${xOf(0).toFixed(1)} ${yOf(0).toFixed(1)}`,
    `L ${xOf(6).toFixed(1)} ${yOf(1).toFixed(1)}`,
    `L ${xOf(xMax).toFixed(1)} ${yOf(1).toFixed(1)}`,
  ].join(" ");
  const ticks = [0, 1, 2, 3, 4, 5, 6];
  const discreteSegments: string[] = [];
  for (let k = 0; k <= 6; k += 1) {
    const y = k / 6;
    const left = k === 0 ? xMin : k;
    const right = k === 6 ? xMax : k + 1 - 1e-6;
    discreteSegments.push(
      `M ${xOf(left).toFixed(1)} ${yOf(y).toFixed(1)} L ${xOf(Math.min(right, xMax)).toFixed(1)} ${yOf(y).toFixed(1)}`,
    );
  }
  const Axis = ({ label }: { label: string }) => (
    <>
      <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} stroke="#16213c" strokeWidth="1.4" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={base} stroke="#16213c" strokeWidth="1.4" />
      {ticks.map((tick) => (
        <text key={`${label}-${tick}`} x={xOf(tick)} y={base + 16} textAnchor="middle" fontSize="10" fill="#16213c">
          {tick}
        </text>
      ))}
      <text x={8} y={yOf(1) + 3} fontSize="10" fill="#16213c">
        1
      </text>
      <text x={8} y={base + 3} fontSize="10" fill="#16213c">
        0
      </text>
      <text x={pad.l + 4} y={pad.t + 2} fontSize="11" fill="#16213c">
        F(x)
      </text>
      <text x={W - pad.r} y={base + 28} textAnchor="end" fontSize="11" fill="#16213c">
        x
      </text>
    </>
  );
  return (
    <div className={styles.two}>
      <figure className={styles.chartCard}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Continuous uniform on 0 to 6. F rises smoothly with no jumps.">
          <Axis label="cont" />
          <path d={continuousPath} fill="none" stroke="#16213c" strokeWidth="2.4" />
        </svg>
        <figcaption className={styles.small}>
          Continuous Unif(0, 6). <MathText text={tex`$F(x)=x/6$`} /> on (0, 6). No jumps.
        </figcaption>
      </figure>
      <figure className={styles.chartCard}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Discrete uniform on 1 through 6. F jumps by one sixth at each integer.">
          <Axis label="disc" />
          {discreteSegments.map((d) => (
            <path key={d} d={d} fill="none" stroke="#16213c" strokeWidth="2.4" />
          ))}
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <g key={k}>
              <line
                x1={xOf(k)}
                y1={yOf((k - 1) / 6)}
                x2={xOf(k)}
                y2={yOf(k / 6)}
                stroke="#df4a3e"
                strokeWidth="2.2"
              />
              <circle cx={xOf(k)} cy={yOf(k / 6)} r="3.2" fill="#df4a3e" />
              <circle cx={xOf(k)} cy={yOf((k - 1) / 6)} r="3.2" fill="#fffaf0" stroke="#16213c" strokeWidth="1.4" />
            </g>
          ))}
        </svg>
        <figcaption className={styles.small}>
          Discrete uniform on {"{1,…,6}"}. Jump of height <MathText text={tex`$1/6$`} /> at each point.
        </figcaption>
      </figure>
    </div>
  );
}

function DistributionFunctionScene() {
  return (
    <SceneFrame kicker="Distribution function" title="F(x) is the area to the left of x.">
      <p className={styles.lead}>
        The distribution function is <MathText text={tex`$F(x) = P(X \le x)$`} />. Compare continuous Unif(0, 6) with a fair die: discrete uniform on <MathText text={tex`$\{1,2,3,4,5,6\}$`} />.
      </p>
      <CdfComparePlots />
      <Formula tex={tex`F(x) = \int_{-\infty}^{x} f(t)\,dt, \qquad f(x) = F'(x) \text{ when } F \text{ is continuous}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Continuous Unif(0, 6)</p>
          <p>
            <MathText text={tex`$f(x)=1/6$`} /> on (0, 6). <MathText text={tex`$P(X=x)=0$`} />, so <MathText text={tex`$F$`} /> has no jumps. <MathText text={tex`$P(a < X < b)=F(b)-F(a)$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Discrete uniform · die</p>
          <p>
            <MathText text={tex`$f(k)=1/6$`} /> for <MathText text={tex`$k=1,\ldots,6$`} />. <MathText text={tex`$F$`} /> jumps by <MathText text={tex`$1/6$`} /> at each integer. <MathText text={tex`$f(k)=F(k)-F(k-1)$`} />.
          </p>
        </article>
      </div>
      <p className={styles.small}>
        In both cases <MathText text={tex`$F$`} /> never decreases, <MathText text={tex`$F(-\infty) = 0$`} />, and <MathText text={tex`$F(\infty) = 1$`} />.
      </p>
    </SceneFrame>
  );
}

function ExpectationScene() {
  return (
    <SceneFrame kicker="Center" title="Expected value is the same idea as in the discrete case.">
      <p className={styles.lead}>
        Replace the sum by an integral. The properties do not change.
      </p>
      <Formula tex={tex`E(X) = \mu = \int_{-\infty}^{\infty} x\, f(x)\, dx`} />
      <div className={styles.promptList}>
        <article className={styles.promptItem}>
          <strong>(a)</strong>
          <p>
            <MathText text={tex`If $c$ is a constant, $E(c) = c$.`} />
          </p>
        </article>
        <article className={styles.promptItem}>
          <strong>(b)</strong>
          <p>
            <MathText text={tex`$E(c\, g(X)) = c\, E(g(X))$.`} />
          </p>
        </article>
        <article className={styles.promptItem}>
          <strong>(c)</strong>
          <p>
            <MathText text={tex`$E(c_1 g_1(X) + c_2 g_2(X)) = c_1 E(g_1(X)) + c_2 E(g_2(X))$.`} />
          </p>
        </article>
      </div>
      <Formula tex={tex`E(X+Y) = E(X) + E(Y)`} />
      <p className={styles.small}>
        Linearity does not require independence. <MathText text={tex`$E(X)$`} /> is the average value of <MathText text={tex`$X$`} />; it need not be a value <MathText text={tex`$X$`} /> can take.
      </p>
    </SceneFrame>
  );
}

function VarianceScene() {
  return (
    <SceneFrame kicker="Spread" title="Variance uses the same properties as the discrete case.">
      <p className={styles.lead}>
        Variance is still the expected squared distance from the mean. The standard deviation is its positive square root.
      </p>
      <Formula tex={tex`\operatorname{Var}(X) = E\big[(X-\mu)^2\big] = \int_{-\infty}^{\infty} (x-\mu)^2 f(x)\,dx = E(X^2) - \big[E(X)\big]^2`} />
      <Formula tex={tex`\sigma = \sqrt{\operatorname{Var}(X)}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Constant</p>
          <Formula tex={tex`\operatorname{Var}(c) = 0`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Scale</p>
          <Formula tex={tex`\operatorname{Var}(cX) = c^2 \operatorname{Var}(X)`} />
        </article>
      </div>
      <Formula tex={tex`\text{If } X \text{ and } Y \text{ are independent, } \operatorname{Var}(X+Y) = \operatorname{Var}(X)+\operatorname{Var}(Y)`} />
      <p className={styles.small}>
        Independence is required for the variance of a sum. It is not required for <MathText text={tex`$E(X+Y)=E(X)+E(Y)$`} />.
      </p>
    </SceneFrame>
  );
}

function UniformPlot({ a, b }: { a: number; b: number }) {
  const width = b - a;
  const height = width > 0 ? 1 / width : 0;
  const W = 560;
  const H = 228;
  const pad = { l: 54, r: 16, t: 16, b: 46 };
  const xMin = -1;
  const xMax = 21;
  const yMax = 1.15;
  const xOf = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r);
  const yOf = (y: number) => pad.t + (1 - y / yMax) * (H - pad.t - pad.b);
  const base = yOf(0);
  const left = xOf(a);
  const right = xOf(b);
  const top = yOf(height);
  const mean = (a + b) / 2;
  const ticks = [0, 5, 10, 15, 20];
  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Uniform density from ${a} to ${b}, height ${height.toFixed(3)}`}>
        <line x1={pad.l} y1={base} x2={W - pad.r} y2={base} stroke="#16213c" strokeWidth="1.5" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={base} stroke="#16213c" strokeWidth="1.5" />
        <rect x={left} y={top} width={Math.max(0, right - left)} height={Math.max(0, base - top)} fill="rgba(223,74,62,0.35)" stroke="#16213c" strokeWidth="2" />
        <line x1={xOf(mean)} y1={top} x2={xOf(mean)} y2={base} stroke="#16213c" strokeDasharray="4 3" />
        <text x={left + (right - left) / 2} y={top - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#16213c">
          {height.toFixed(3)}
        </text>
        <text x={12} y={yOf(1) + 4} fontSize="12" fill="#16213c">
          1
        </text>
        <line x1={pad.l - 4} y1={yOf(1)} x2={pad.l} y2={yOf(1)} stroke="#16213c" />
        {ticks.map((tick) => (
          <text key={tick} x={xOf(tick)} y={base + 16} textAnchor="middle" fontSize="11" fill="#16213c">
            {tick}
          </text>
        ))}
        <text x={Math.min(left, right - 36)} y={base + 34} textAnchor="middle" fontSize="12" fontWeight="700" fill="#df4a3e">
          a={a}
        </text>
        <text x={Math.max(right, left + 36)} y={base + 34} textAnchor="middle" fontSize="12" fontWeight="700" fill="#df4a3e">
          b={b}
        </text>
        <text x={pad.l + 6} y={pad.t + 12} fontSize="12" fill="#16213c">
          f(x)
        </text>
      </svg>
      <figcaption className={styles.small}>
        Flat on ({a}, {b}). Height is 1/(b − a). Outside that interval the density is 0. Area of the rectangle is 1.
      </figcaption>
    </figure>
  );
}

function UniformFormulaScene() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(8);
  const width = b - a;
  const mean = (a + b) / 2;
  const variance = width ** 2 / 12;
  return (
    <SceneFrame kicker="Uniform" title="Probability is proportional to interval length.">
      <p className={styles.lead}>
        <MathText text={tex`$X$`} /> is uniform on <MathText text={tex`$(a, b)$`} /> when every sub-interval of the same length is equally likely. Widen the interval and the bar gets shorter, so the area stays 1.
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>LOWER END a</b>
          <input
            type="range"
            min={0}
            max={18}
            value={a}
            onChange={(event) => {
              const next = Number(event.target.value);
              setA(next);
              setB((current) => (current <= next ? Math.min(20, next + 1) : current));
            }}
          />
          <span>{a}</span>
        </div>
        <div className={styles.sliderRow}>
          <b>UPPER END b</b>
          <input
            type="range"
            min={1}
            max={20}
            value={b}
            onChange={(event) => {
              const next = Number(event.target.value);
              setB(next);
              setA((current) => (current >= next ? Math.max(0, next - 1) : current));
            }}
          />
          <span>{b}</span>
        </div>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>Printed with a = {a}, b = {b}.</p>
      </PrintOnly>
      <UniformPlot a={a} b={b} />
      <Formula tex={tex`f(x) = \dfrac{1}{${width}} \quad \text{for } ${a} < x < ${b}, \quad f(x) = 0 \text{ elsewhere}`} />
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Mean</p>
          <Formula tex={tex`E(X) = \dfrac{a+b}{2} = ${mean.toFixed(1)}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Variance</p>
          <Formula tex={tex`\operatorname{Var}(X) = \dfrac{(b-a)^2}{12} = ${variance.toFixed(2)}`} />
        </article>
      </div>
    </SceneFrame>
  );
}

function SaladScene() {
  const [low, setLow] = useState(12);
  const [high, setHigh] = useState(15);
  const a = 5;
  const b = 15;
  const left = Math.min(low, high);
  const right = Math.max(low, high);
  const p = uniformCdfInterval(left, right, a, b);
  const mean = (a + b) / 2;
  const variance = (b - a) ** 2 / 12;
  return (
    <SceneFrame kicker="Uniform example" title="Healthy Canteen: salad weight is uniform from 5 to 15 oz.">
      <p className={styles.lead}>
        Customers are charged by the amount of salad they take. Sampling suggests the plate weight is uniform between 5 and 15 ounces.
      </p>
      <Formula tex={tex`f(x) = \dfrac{1}{10} \text{ for } 5 < x < 15`} />
      <p className={styles.small}>
        <MathText text={tex`$E(X) = (5+15)/2 = 10$`} /> oz. <MathText text={tex`$\operatorname{Var}(X) = 10^2/12 \approx ${variance.toFixed(2)}$`} />.
        Mean {mean.toFixed(0)} oz.
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <label>
            Lower bound {left.toFixed(0)} oz
            <input type="range" min={5} max={15} value={left} onChange={(e) => setLow(Number(e.target.value))} />
          </label>
          <label>
            Upper bound {right.toFixed(0)} oz
            <input type="range" min={5} max={15} value={right} onChange={(e) => setHigh(Number(e.target.value))} />
          </label>
        </div>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>Example interval: 12 to 15 ounces.</p>
      </PrintOnly>
      <Formula tex={tex`P(${left.toFixed(0)} < X < ${right.toFixed(0)}) = \dfrac{1}{10}\times ${Math.max(0, right - left).toFixed(0)} = ${formatProb(p, 2)}`} />
    </SceneFrame>
  );
}

function NormalIntroScene() {
  return (
    <SceneFrame kicker="Normal" title="The most used model for a continuous variable.">
      <p className={styles.lead}>
        The normal distribution describes heights, rainfall, test scores, and scientific measurements. It is the workhorse of statistical inference.
      </p>
      <Formula
        tex={tex`f(x) = \dfrac{1}{\sigma\sqrt{2\pi}}\, e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}`}
      />
      <p className={styles.small}>
        <MathText text={tex`$\mu$`} /> is the mean, <MathText text={tex`$\sigma$`} /> the standard deviation, <MathText text={tex`$\pi \approx 3.14159$`} />, and{" "}
        <MathText text={tex`$e \approx 2.71828$`} />. Abraham de Moivre derived the curve in 1733.
      </p>
    </SceneFrame>
  );
}

function NormalShapeScene() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  return (
    <SceneFrame kicker="Normal characteristics" title="The family is fixed by μ and σ.">
      <ul className={styles.lead}>
        <li>Symmetric: skewness is 0. The highest point is the mean, which is also the median and the mode.</li>
        <li>
          <MathText text={tex`$\mu$`} /> can be negative, zero, or positive. <MathText text={tex`$\sigma$`} /> sets the width: larger <MathText text={tex`$\sigma$`} /> means a wider, flatter curve.
        </li>
        <li>Total area is 1: 0.5 to the left of the mean and 0.5 to the right.</li>
      </ul>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>MEAN μ</b>
          <input type="range" min={-10} max={25} value={mu} onChange={(e) => setMu(Number(e.target.value))} />
          <span>{mu}</span>
        </div>
        <div className={styles.sliderRow}>
          <b>SD σ</b>
          <input type="range" min={1} max={25} value={sigma} onChange={(e) => setSigma(Number(e.target.value))} />
          <span>{sigma}</span>
        </div>
      </LiveOnly>
      <NormalBand
        mu={mu}
        sigma={sigma}
        lo={mu - sigma}
        hi={mu + sigma}
        xMin={-40}
        xMax={70}
        yMax={0.45}
        xTicks={[-40, -20, 0, 20, 40, 60]}
        label={`Fixed axes: larger σ → wider and shorter. Shaded band is μ ± σ.`}
      />
    </SceneFrame>
  );
}

function EmpiricalScene() {
  return (
    <SceneFrame kicker="Empirical rule" title="Almost all of a normal curve sits within 3 SDs of the mean.">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>±1σ</p>
          <p>68.26% of values</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>±2σ</p>
          <p>95.44% of values</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>±3σ</p>
          <p>99.72% of values</p>
        </article>
      </div>
      <Formula tex={tex`P(\mu - k\sigma < X < \mu + k\sigma)`} />
      <p className={styles.small}>
        These percentages are the basis of the empirical rule you met with descriptive statistics. Here they are exact areas under a normal density, not a rough sketch of any data set.
      </p>
    </SceneFrame>
  );
}

function StandardNormalScene() {
  return (
    <SceneFrame kicker="Standard normal" title="z counts how many standard deviations x is from μ.">
      <p className={styles.lead}>
        A normal random variable with mean 0 and standard deviation 1 is standard normal. We write it as <MathText text={tex`$z$`} />.
      </p>
      <Formula tex={tex`z = \dfrac{x - \mu}{\sigma}`} />
      <p className={styles.small}>
        Any normal probability becomes a standard-normal area. Tables (and the calculator on the next slides) give <MathText text={tex`$P(Z \le z)$`} />.
      </p>
    </SceneFrame>
  );
}

function StockoutScene() {
  const [reorder, setReorder] = useState(20);
  const mu = 15;
  const sigma = 6;
  const z = (reorder - mu) / sigma;
  const left = stdNormalCdf(z);
  const stockout = 1 - left;
  return (
    <SceneFrame kicker="William Automobile" title="Assume demand during lead time is normal with μ = 15 and σ = 6.">
      <p className={styles.lead}>
        The store reorders multi-grade oil when stock hits a reorder point. The manager wants the chance that demand during replenishment exceeds that point — a stockout.
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <label>
            Reorder point {reorder} gallons
            <input type="range" min={8} max={35} value={reorder} onChange={(e) => setReorder(Number(e.target.value))} />
          </label>
        </div>
      </LiveOnly>
      <Formula tex={tex`z = \dfrac{${reorder} - 15}{6} = ${z.toFixed(2)}`} />
      <p className={styles.small}>
        Area to the left of <MathText text={tex`$z$`} /> is {formatProb(left)}. Stockout probability{" "}
        <MathText text={tex`$P(X > ${reorder}) = 1 - ${formatProb(left)} = ${formatProb(stockout)}$`} />.
      </p>
      <NormalBand
        mu={mu}
        sigma={sigma}
        lo={reorder}
        hi={40}
        xMin={0}
        xMax={40}
        label={`Shaded tail: demand above ${reorder} gallons.`}
      />
    </SceneFrame>
  );
}

function ReorderScene() {
  const [alpha, setAlpha] = useState(0.05);
  const mu = 15;
  const sigma = 6;
  const z = invStdNormal(1 - alpha);
  const x = mu + z * sigma;
  return (
    <SceneFrame kicker="Inverse normal" title="Choose the reorder point so the stockout chance is small.">
      <p className={styles.lead}>
        Given a tail probability, look up the <MathText text={tex`$z$`} /> that cuts off that area on the right, then convert back to gallons.
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>RIGHT-TAIL AREA</b>
          <input
            type="range"
            min={1}
            max={20}
            value={Math.round(alpha * 100)}
            onChange={(e) => setAlpha(Number(e.target.value) / 100)}
          />
          <span>{alpha.toFixed(2)}</span>
        </div>
      </LiveOnly>
      <StandardNormalTail alpha={alpha} zCut={z} />
      <Formula tex={tex`z_{${alpha.toFixed(2)}} = ${z.toFixed(3)}, \quad x = 15 + z \times 6 = ${x.toFixed(2)}`} />
      <p className={styles.small}>
        Round up to a whole number of gallons when you stock the shelf. Raising the reorder point from 20 to about 25 gallons cuts the stockout chance from roughly 0.20 to 0.05.
      </p>
    </SceneFrame>
  );
}

function CltScene() {
  return (
    <SceneFrame kicker="Central limit theorem" title="Sample means look normal when n is large.">
      <p className={styles.lead}>
        Assume <MathText text={tex`$X_1,\ldots,X_n$`} /> are i.i.d.: independent, and each has the same mean <MathText text={tex`$\mu$`} /> and the same finite variance <MathText text={tex`$\sigma^2$`} />.
      </p>
      <Formula tex={tex`E(X_i)=\mu, \qquad \operatorname{Var}(X_i)=\sigma^2 < \infty`} />
      <p className={styles.small}>
        The population itself need not be normal. For large <MathText text={tex`$n$`} />, the sample mean <MathText text={tex`$\bar{X}$`} /> is still approximately normal, with mean <MathText text={tex`$\mu$`} /> and standard deviation <MathText text={tex`$\sigma/\sqrt{n}$`} />.
      </p>
      <Formula tex={tex`\bar{X} \text{ is approximately } N\!\left(\mu,\; \dfrac{\sigma}{\sqrt{n}}\right) \text{ for large } n`} />
      <article className={styles.card}>
        <p className={styles.kicker}>A related fact, and it is exact</p>
        <p className={styles.lead}>
          If <MathText text={tex`$X$`} /> and <MathText text={tex`$Y$`} /> are independent and each is normal, then any linear combination is normal too.
        </p>
        <Formula tex={tex`aX + bY \text{ is normal, for any constants } a \text{ and } b.`} />
      </article>
    </SceneFrame>
  );
}

function HalfUnitSketch() {
  const rows = [
    {
      y: 28,
      title: "Height",
      subtitle: "reading",
      labels: ["1.74", "1.75", "1.76"],
      edges: ["1.735", "1.745", "1.755", "1.765"],
      cutoff: "1.755",
    },
    {
      y: 122,
      title: "Count",
      subtitle: "integer",
      labels: ["11", "12", "13"],
      edges: ["10.5", "11.5", "12.5", "13.5"],
      cutoff: "12.5",
    },
  ] as const;
  const padL = 78;
  const width = 540;
  const binW = width / 3;
  const h = 42;
  return (
    <figure className={styles.chartCard}>
      <svg viewBox="0 0 640 214" role="img" aria-label="Half-unit bins. A reading covers the interval out to the next half unit.">
        {rows.map((row) => {
          const cutoffX = padL + 2 * binW;
          return (
            <g key={row.title}>
              <text x="8" y={row.y + 18} fontSize="13" fontWeight="700" fill="#16213c">
                {row.title}
              </text>
              <text x="8" y={row.y + 34} fontSize="11" fill="#625f54">
                {row.subtitle}
              </text>
              <rect x={padL} y={row.y} width={2 * binW} height={h} fill="#f7b0cb" />
              {row.labels.map((label, i) => (
                <g key={label}>
                  <rect x={padL + i * binW} y={row.y} width={binW} height={h} fill="none" stroke="#16213c" strokeWidth="1.6" />
                  <text x={padL + (i + 0.5) * binW} y={row.y + 26} textAnchor="middle" fontSize="14" fontWeight="700" fill="#16213c">
                    {label}
                  </text>
                </g>
              ))}
              {row.edges.map((edge, i) => (
                <text key={edge} x={padL + i * binW} y={row.y + h + 16} textAnchor="middle" fontSize="11" fill="#625f54">
                  {edge}
                </text>
              ))}
              <line x1={cutoffX} y1={row.y - 6} x2={cutoffX} y2={row.y + h} stroke="#df4a3e" strokeWidth="2.2" strokeDasharray="5 3" />
              <text x={cutoffX + 6} y={row.y - 8} fontSize="12" fontWeight="700" fill="#df4a3e">
                cutoff {row.cutoff}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.small}>
        Pink is the ≤ event, up to the red cutoff. A recorded 12 is the whole bar from 11.5 to 12.5, not a spike at 12.
      </figcaption>
    </figure>
  );
}

function BinomialApproxScene() {
  const [n, setN] = useState(100);
  const [pSuccess, setP] = useState(0.1);
  const mean = n * pSuccess;
  const variance = n * pSuccess * (1 - pSuccess);
  const sigma = Math.sqrt(variance);
  const ok = mean > 5 && n * (1 - pSuccess) > 5;
  return (
    <SceneFrame kicker="Normal approximation" title="A binomial is a sum of Bernoulli trials.">
      <p className={styles.lead}>
        Write <MathText text={tex`$X = X_1 + \cdots + X_n$`} />, where the <MathText text={tex`$X_i$`} /> are i.i.d. Bernoulli: each is 1 with probability <MathText text={tex`$p$`} /> and 0 otherwise.
      </p>
      <Formula tex={tex`E(X_i)=p, \quad \operatorname{Var}(X_i)=p(1-p), \quad E(X)=np, \quad \operatorname{Var}(X)=np(1-p)`} />
      <p className={styles.small}>
        The central limit theorem applies to this sum. When <MathText text={tex`$n$`} /> is large enough that <MathText text={tex`$np > 5$`} /> and <MathText text={tex`$n(1-p) > 5$`} />, <MathText text={tex`$X$`} /> is approximately normal with mean <MathText text={tex`$np$`} /> and standard deviation <MathText text={tex`$\sqrt{np(1-p)}$`} />.
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>TRIALS n</b>
          <input type="range" min={10} max={200} step={10} value={n} onChange={(e) => setN(Number(e.target.value))} />
          <span>{n}</span>
        </div>
        <div className={styles.sliderRow}>
          <b>SUCCESS p</b>
          <input type="range" min={1} max={50} value={Math.round(pSuccess * 100)} onChange={(e) => setP(Number(e.target.value) / 100)} />
          <span>{pSuccess.toFixed(2)}</span>
        </div>
      </LiveOnly>
      <Formula tex={tex`np = ${mean.toFixed(1)}, \quad n(1-p) = ${(n * (1 - pSuccess)).toFixed(1)}, \quad \sigma = ${sigma.toFixed(2)}`} />
      <p className={styles.small}>
        {ok
          ? "Both products exceed 5, so the normal curve is a fair stand-in for this binomial."
          : "Not yet. Both np and n(1−p) need to exceed 5 before the normal approximation is trustworthy."}
      </p>
    </SceneFrame>
  );
}

function HalfUnitScene() {
  return (
    <SceneFrame kicker="Half-unit correction" title="An integer count is a bar of width 1.">
      <p className={styles.lead}>
        The normal curve is continuous. A recorded integer is one whole bar, so the cutoff sits half a unit past the number you care about.
      </p>
      <p className={styles.small}>
        A height recorded as 1.75 m means the interval [1.745, 1.755): the ruler’s unit is 0.01 m, so the half-unit is 0.005 m. A count has unit 1, so the half-unit is 0.5.{" "}
        <MathText text={tex`$P(X = 12)$`} /> is the bar <MathText text={tex`$(11.5,\, 12.5)$`} />, and <MathText text={tex`$P(X \le 12)$`} /> runs up to 12.5.
      </p>
      <HalfUnitSketch />
      <Formula tex={tex`P(X \le x) \approx \Phi\!\left(\dfrac{x + 0.5 - \mu}{\sigma}\right)`} />
      <Formula tex={tex`P(X \ge x) \approx 1 - \Phi\!\left(\dfrac{x - 0.5 - \mu}{\sigma}\right)`} />
      <Formula tex={tex`P(X = k) \approx \Phi\!\left(\dfrac{k + 0.5 - \mu}{\sigma}\right) - \Phi\!\left(\dfrac{k - 0.5 - \mu}{\sigma}\right)`} />
    </SceneFrame>
  );
}

function CorrectionGameScene() {
  const [n, setN] = useState(100);
  const [pSuccess, setP] = useState(0.1);
  const [k, setK] = useState(12);
  const [event, setEvent] = useState<"atMost" | "equal">("atMost");
  const [guess, setGuess] = useState<"with" | "without" | null>(null);
  const mu = n * pSuccess;
  const sigma = Math.sqrt(n * pSuccess * (1 - pSuccess));
  const ok = n * pSuccess > 5 && n * (1 - pSuccess) > 5 && sigma > 0;
  const without =
    sigma <= 0
      ? 0
      : event === "atMost"
        ? normalCdf(k, mu, sigma)
        : normalCdf(k + 1, mu, sigma) - normalCdf(k, mu, sigma);
  const withCc =
    sigma <= 0
      ? 0
      : event === "atMost"
        ? normalCdf(k + 0.5, mu, sigma)
        : normalCdf(k + 0.5, mu, sigma) - normalCdf(k - 0.5, mu, sigma);
  const exact = event === "atMost" ? binomialCdf(n, pSuccess, k) : binomialPmf(n, pSuccess, k);
  const errWithout = Math.abs(without - exact);
  const errWith = Math.abs(withCc - exact);
  const closer = errWith < errWithout ? "with" : errWithout < errWith ? "without" : "tie";
  const resetGuess = () => setGuess(null);
  const withoutTex =
    event === "atMost"
      ? tex`$\Phi\!\left(\dfrac{${k} - \mu}{\sigma}\right) = ${formatProb(without)}$`
      : tex`$\Phi\!\left(\dfrac{${k + 1} - \mu}{\sigma}\right) - \Phi\!\left(\dfrac{${k} - \mu}{\sigma}\right) = ${formatProb(without)}$`;
  const withTex =
    event === "atMost"
      ? tex`$\Phi\!\left(\dfrac{${(k + 0.5).toFixed(1)} - \mu}{\sigma}\right) = ${formatProb(withCc)}$`
      : tex`$\Phi\!\left(\dfrac{${(k + 0.5).toFixed(1)} - \mu}{\sigma}\right) - \Phi\!\left(\dfrac{${(k - 0.5).toFixed(1)} - \mu}{\sigma}\right) = ${formatProb(withCc)}$`;
  return (
    <SceneFrame kicker="Game" title="Which approximation is closer?" tone="gold">
      <p className={styles.lead}>
        Compare the normal curve with the half-unit, the normal curve without it, and the exact binomial.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={event === "atMost" ? styles.toolBtnActive : styles.toolBtn} type="button" onClick={() => { setEvent("atMost"); resetGuess(); }}>
            P(X ≤ k)
          </button>
          <button className={event === "equal" ? styles.toolBtnActive : styles.toolBtn} type="button" onClick={() => { setEvent("equal"); resetGuess(); }}>
            P(X = k)
          </button>
        </div>
        <div className={styles.sliderRow}>
          <b>TRIALS n</b>
          <input
            type="range"
            min={20}
            max={200}
            step={10}
            value={n}
            onChange={(e) => {
              const next = Number(e.target.value);
              setN(next);
              setK((current) => Math.min(current, next));
              resetGuess();
            }}
          />
          <span>{n}</span>
        </div>
        <div className={styles.sliderRow}>
          <b>SUCCESS p</b>
          <input
            type="range"
            min={1}
            max={40}
            value={Math.round(pSuccess * 100)}
            onChange={(e) => {
              setP(Number(e.target.value) / 100);
              resetGuess();
            }}
          />
          <span>{pSuccess.toFixed(2)}</span>
        </div>
        <div className={styles.sliderRow}>
          <b>CUTOFF k</b>
          <input
            type="range"
            min={0}
            max={n}
            value={k}
            onChange={(e) => {
              setK(Number(e.target.value));
              resetGuess();
            }}
          />
          <span>{k}</span>
        </div>
      </LiveOnly>
      <Formula tex={tex`\mu = ${mu.toFixed(1)}, \quad \sigma = ${sigma.toFixed(2)}`} />
      {!ok ? <p className={styles.small}>Both np and n(1−p) should exceed 5 before you trust either normal answer. The exact binomial is still valid.</p> : null}
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>Normal without correction</p>
          <p>
            <MathText text={withoutTex} />
          </p>
          {guess ? <p className={styles.small}>Error {formatProb(errWithout)}</p> : null}
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Normal with correction</p>
          <p>
            <MathText text={withTex} />
          </p>
          {guess ? <p className={styles.small}>Error {formatProb(errWith)}</p> : null}
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Exact by binomial</p>
          <p>
            <MathText text={event === "atMost" ? tex`$P(X \le ${k}) = ${formatProb(exact)}$` : tex`$P(X = ${k}) = ${formatProb(exact)}$`} />
          </p>
        </article>
      </div>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={guess === "without" ? styles.toolBtnActive : styles.toolBtn} type="button" onClick={() => setGuess("without")}>
            Without correction
          </button>
          <button className={guess === "with" ? styles.toolBtnActive : styles.toolBtn} type="button" onClick={() => setGuess("with")}>
            With correction
          </button>
        </div>
      </LiveOnly>
      {guess ? (
        <p className={styles.small}>
          {closer === "tie"
            ? "The two approximations miss the exact binomial by the same amount."
            : guess === closer
              ? `Yes. ${closer === "with" ? "With" : "Without"} the half-unit is closer.`
              : `Not this time. ${closer === "with" ? "With" : "Without"} the half-unit is closer.`}
        </p>
      ) : (
        <PrintOnly>
          <p className={styles.small}>
            {closer === "tie" ? "The two errors match." : `${closer === "with" ? "With" : "Without"} the half-unit is closer on this draw.`}
          </p>
        </PrintOnly>
      )}
    </SceneFrame>
  );
}

function ExponentialScene() {
  const [mean, setMean] = useState(3);
  const [x0, setX0] = useState(2);
  const cdf = 1 - Math.exp(-x0 / mean);
  return (
    <SceneFrame kicker="Exponential" title="Waiting times: mean and standard deviation are equal.">
      <p className={styles.lead}>
        Use the exponential distribution for time to finish a task, time between arrivals, or distance between defects. In queues it often models service time. The curve is skewed right (skewness 2).
      </p>
      <Formula tex={tex`f(x) = \dfrac{1}{\mu} e^{-x/\mu} \quad \text{for } x > 0`} />
      <Formula tex={tex`E(X) = \mu, \qquad \operatorname{Var}(X) = \mu^2, \qquad \sigma = \mu`} />
      <Formula tex={tex`P(X \le x_0) = 1 - e^{-x_0/\mu}`} />
      <LiveOnly>
        <div className={styles.sliderRow}>
          <label>
            Mean μ = {mean} minutes
            <input type="range" min={1} max={10} value={mean} onChange={(e) => setMean(Number(e.target.value))} />
          </label>
          <label>
            Cutoff x₀ = {x0} minutes
            <input type="range" min={0} max={12} step={0.5} value={x0} onChange={(e) => setX0(Number(e.target.value))} />
          </label>
        </div>
      </LiveOnly>
      <p className={styles.small}>
        Al’s full-service pump: arrivals are exponential with mean 3 minutes.{" "}
        <MathText text={tex`$P(X \le 2) = 1 - e^{-2/3} \approx 0.4866$`} />. With the sliders,{" "}
        <MathText text={tex`$E(X) = ${mean}$`} />, <MathText text={tex`$\operatorname{Var}(X) = ${mean * mean}$`} />, and{" "}
        <MathText text={tex`$P(X \le ${x0}) = ${formatProb(cdf)}$`} />.
      </p>
    </SceneFrame>
  );
}

function PoissonLinkScene() {
  return (
    <SceneFrame kicker="Poisson and exponential" title="Counts per interval, or the gap between counts.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Poisson</p>
          <p>Number of occurrences in a fixed interval (cars per hour, defects per kilometre).</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Exponential</p>
          <p>Length of the interval between occurrences (minutes until the next car).</p>
        </article>
      </div>
      <p className={styles.small}>
        If arrivals are Poisson with mean <MathText text={tex`$\lambda$`} /> events per unit time, the waiting time until the next event is exponential with mean{" "}
        <MathText text={tex`$1/\lambda$`} />. Same process, two questions.
      </p>
    </SceneFrame>
  );
}

const QUIZ = [
  {
    q: "Healthy Canteen: salad is uniform on (5, 15). What is P(12 < X < 15)?",
    options: ["1/10", "3/10", "1/2", "(15−5)/12"],
    answer: 1,
    why: tex`Length 3 over width 10: $(1/10)\times 3 = 3/10$.`,
  },
  {
    q: "William oil: μ = 15, σ = 6, reorder at 20. Which z matches x = 20?",
    options: ["(15−20)/6", "(20−15)/6", "20/6", "15×6"],
    answer: 1,
    why: tex`$z = (x-\mu)/\sigma = (20-15)/6 = 0.83$.`,
  },
  {
    q: "Same oil example. A 0.05 right-tail uses z ≈ 1.645. The reorder point is",
    options: ["15 + 1.645", "15 + 1.645×6", "20 + 0.05×6", "6/1.645"],
    answer: 1,
    why: tex`$x = \mu + z\sigma = 15 + 1.645(6) \approx 24.87$, about 25 gallons.`,
  },
  {
    q: "Binomial n = 100, p = 0.1. The continuity correction for P(X = 12) is",
    options: ["P(X > 12)", "P(11.5 < X < 12.5)", "P(X < 12)", "P(X = 12.5)"],
    answer: 1,
    why: tex`A point mass at 12 becomes the unit interval centred at 12.`,
  },
  {
    q: "For an exponential random variable, which statement is true?",
    options: ["Mean is twice the SD", "Mean equals the SD", "Skewness is 0", "f(x) is constant"],
    answer: 1,
    why: tex`Both the mean and the standard deviation equal $\mu$. Skewness is 2, not 0.`,
  },
] as const;

function QuizScene() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const score = QUIZ.reduce((s, item, i) => s + (picked[i] === item.answer ? 1 : 0), 0);
  const shown = Object.keys(picked).length;
  return (
    <SceneFrame kicker="Check" title="Which expression is the model asking for?" tone="gold">
      <p className={styles.lead}>Multiple choice on the formula, not on a calculator.</p>
      <div className={styles.promptList}>
        {QUIZ.map((item, i) => (
          <article key={item.q} className={styles.promptItem}>
            <strong>
              {i + 1}. {item.q}
            </strong>
            <div className={styles.tools}>
              {item.options.map((opt, j) => (
                <button
                  key={opt}
                  type="button"
                  className={picked[i] === j ? styles.toolBtnActive : styles.toolBtn}
                  onClick={() => setPicked((m) => ({ ...m, [i]: j }))}
                >
                  {opt}
                </button>
              ))}
            </div>
            {picked[i] != null ? (
              <p className={styles.small}>
                {picked[i] === item.answer ? "Correct. " : "Not that one. "}
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

function PromptsScene() {
  return (
    <SceneFrame kicker="Prompts to try" title="Download real data, then look at the shape." tone="gold">
      <div className={styles.promptList}>
        <article className={styles.promptItem}>
          <strong>APPLE RETURNS · DOES IT LOOK NORMAL?</strong>
          <p>
            Use Python to download Apple’s daily prices for the last two years with yfinance (ticker AAPL). Compute the daily percent return from the adjusted close. Plot a histogram and a boxplot. Overlay a normal curve that uses the sample mean and sample standard deviation.
          </p>
        </article>
        <article className={styles.promptItem}>
          <strong>EARTHQUAKE WAITS · 2025</strong>
          <p>
            Use Python to download successive earthquake times in 2025 from the USGS FDSN event API (https://earthquake.usgs.gov/fdsnws/event/1/). Important: a single year-long query of all magnitudes exceeds the API’s 20,000-event limit and returns HTTP 400 Bad Request — so download month by month (or paginate with limit and offset), concatenate, then compute the hours between successive events. Save those waiting times as a CSV file. Plot a histogram and a boxplot. Report the mean and the standard deviation.
          </p>
        </article>
      </div>
      <p className={styles.note}>
        You may try: paste a prompt into{" "}
        <a href="https://copilot.microsoft.com/" target="_blank" rel="noreferrer">
          Microsoft Copilot
        </a>
        , then run the Python in{" "}
        <a href="https://colab.research.google.com/" target="_blank" rel="noreferrer">
          Google Colab
        </a>
        . Read the code before you trust the number.
      </p>
    </SceneFrame>
  );
}

function TakeawaysScene() {
  return (
    <SceneFrame kicker="Takeaways" title="Area, not a point mass." tone="dark">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Uniform</p>
          <p>
            <MathText text={tex`$f(x)=1/(b-a)$`} />, mean <MathText text={tex`$(a+b)/2$`} />, variance <MathText text={tex`$(b-a)^2/12$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Normal</p>
          <p>
            Standardize with <MathText text={tex`$z=(x-\mu)/\sigma$`} />. Invert <MathText text={tex`$z$`} /> when the probability is given and <MathText text={tex`$x$`} /> is not.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Binomial shortcut</p>
          <p>
            Large n: normal with <MathText text={tex`$\mu=np$`} />, plus ±0.5 continuity correction.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Exponential</p>
          <p>
            <MathText text={tex`$P(X \le x_0)=1-e^{-x_0/\mu}$`} />. Mean equals standard deviation. Pair it with Poisson counts.
          </p>
        </article>
      </div>
      <p className={styles.footerNote}>DOTE2011G · Continuous Probability Distributions · CUHK</p>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Start", label: "Title", Scene: CoverScene },
  { id: "idea", chapter: "Continuous RVs", label: "Intervals, not points", Scene: ContinuousIdeaScene },
  { id: "area", chapter: "Continuous RVs", label: "Area under f(x)", Scene: AreaScene },
  { id: "cdf", chapter: "Continuous RVs", label: "Distribution function", Scene: DistributionFunctionScene },
  { id: "expectation", chapter: "Moments", label: "Expected value", Scene: ExpectationScene },
  { id: "variance", chapter: "Moments", label: "Variance", Scene: VarianceScene },
  { id: "uniform", chapter: "Uniform", label: "Density, mean, variance", Scene: UniformFormulaScene },
  { id: "salad", chapter: "Uniform", label: "Healthy Canteen", Scene: SaladScene },
  { id: "normal-intro", chapter: "Normal", label: "Density", Scene: NormalIntroScene },
  { id: "shape", chapter: "Normal", label: "μ and σ", Scene: NormalShapeScene },
  { id: "empirical", chapter: "Normal", label: "Empirical rule", Scene: EmpiricalScene },
  { id: "z", chapter: "Standard normal", label: "The z score", Scene: StandardNormalScene },
  { id: "stockout", chapter: "Standard normal", label: "William stockout", Scene: StockoutScene },
  { id: "reorder", chapter: "Standard normal", label: "Reorder point", Scene: ReorderScene },
  { id: "clt", chapter: "Normal", label: "Central limit theorem", Scene: CltScene },
  { id: "binomial", chapter: "Approximation", label: "Bernoulli sum", Scene: BinomialApproxScene },
  { id: "half-unit", chapter: "Approximation", label: "Half-unit correction", Scene: HalfUnitScene },
  { id: "approx-game", chapter: "Approximation", label: "Which is closer?", Scene: CorrectionGameScene },
  { id: "exp", chapter: "Exponential", label: "Waiting times", Scene: ExponentialScene },
  { id: "poisson", chapter: "Exponential", label: "Poisson link", Scene: PoissonLinkScene },
  { id: "quiz", chapter: "Practice", label: "Which expression?", Scene: QuizScene },
  { id: "prompts", chapter: "Practice", label: "Prompts to try", Scene: PromptsScene },
  { id: "takeaways", chapter: "Close", label: "Takeaways", Scene: TakeawaysScene },
];
