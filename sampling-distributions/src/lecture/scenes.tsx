import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  POPULATIONS,
  formatNum,
  formatProb,
  histogramOfMeans,
  mulberry32,
  normalIntervalProb,
  sampleMean,
  seMean,
  seProportion,
  stdNormalCdf,
  type HistogramBin,
  type Population,
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
  "Use ← → or the buttons above. Move the sliders to recompute probabilities. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

/** St. Stephen's College running example. */
const STEPHEN = {
  N: 900,
  n: 30,
  mu: 1090,
  sigma: 80,
  p: 0.72,
  xBar: 1097,
  s: 75.2,
  pHat: 0.67,
};

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
}: {
  mu: number;
  sigma: number;
  lo: number;
  hi: number;
  label: string;
  xMin?: number;
  xMax?: number;
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
  const topY = peak * 1.08;
  const xOf = (x: number) => pad.l + ((x - left) / span) * (W - pad.l - pad.r);
  const yOf = (y: number) => pad.t + (1 - Math.min(y, topY) / topY) * (H - pad.t - pad.b);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(ys[i]).toFixed(2)}`).join(" ");
  const bandLo = Math.max(lo, left);
  const bandHi = Math.min(hi, right);
  const bandXs = xs.filter((x) => x >= bandLo && x <= bandHi);
  const areaPath =
    bandXs.length > 1
      ? [
          `M ${xOf(bandXs[0]).toFixed(2)} ${yOf(0).toFixed(2)}`,
          ...bandXs.map((x) => `L ${xOf(x).toFixed(2)} ${yOf(density(x)).toFixed(2)}`),
          `L ${xOf(bandXs[bandXs.length - 1]).toFixed(2)} ${yOf(0).toFixed(2)} Z`,
        ].join(" ")
      : "";
  const ticks = [lo, mu, hi].filter((x, i, arr) => Number.isFinite(x) && arr.indexOf(x) === i);

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <path d={path} fill="none" stroke="#16213c" strokeWidth="2.5" />
        {areaPath ? <path d={areaPath} fill="rgba(196, 58, 58, 0.28)" stroke="none" /> : null}
        <line x1={pad.l} y1={yOf(0)} x2={W - pad.r} y2={yOf(0)} stroke="#16213c" strokeWidth="1.5" />
        {ticks.map((x) => (
          <g key={x}>
            <line x1={xOf(x)} y1={yOf(0)} x2={xOf(x)} y2={yOf(0) + 6} stroke="#16213c" strokeWidth="1.5" />
            <text x={xOf(x)} y={H - 10} textAnchor="middle" fontSize="12" fill="#16213c">
              {Number.isInteger(x) ? String(x) : formatNum(x, 2)}
            </text>
          </g>
        ))}
        <text x={pad.l + 4} y={pad.t + 4} fontSize="12" fill="#16213c">
          {label}
        </text>
      </svg>
    </figure>
  );
}

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id="cover">
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Sampling and Sampling Distributions</h1>
        <p className={styles.lead}>
          Selecting a sample, point estimation, and the sampling distributions of <MathText text={tex`$\bar{x}$`} /> and{" "}
          <MathText text={tex`$\hat{p}$`} /> — including the central limit theorem.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function PopulationSampleScene() {
  return (
    <SceneFrame kicker="Introduction" title="A sample is a subset of the population.">
      <p className={styles.lead}>
        Running example for this lecture: <strong>St. Stephen&apos;s College</strong> received{" "}
        <MathText text={tex`$N = 900$`} /> applications. Admissions will later draw a sample of{" "}
        <MathText text={tex`$n = 30$`} /> to estimate average SAT score and the share wanting on-campus housing.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Population</p>
          <p>
            The collection of all elements of interest. Here: all <MathText text={tex`$900$`} /> applicants for the upcoming year.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample</p>
          <p>
            A subset of the population from which we collect data. Here: the <MathText text={tex`$30$`} /> applicants chosen for detailed review.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Element</p>
          <p>
            The entity on which data are collected. Here: one applicant (with SAT score, housing preference, and so on).
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Frame</p>
          <p>
            A list of the elements the sample will be selected from. Here: the numbered list of applicants 1 through 900 as applications arrive. The sampled population is that list of 900.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function WhySampleScene() {
  return (
    <SceneFrame kicker="Introduction" title="We sample to answer a question about a population.">
      <p className={styles.lead}>
        Sample results provide estimates of population characteristics. With a proper sampling method, those estimates can be good — but they are still estimates, because the sample is only a portion of the population.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Research goal</p>
          <p>Collect data that help answer a question about the whole population.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Why not a census?</p>
          <p>Cost, time, or impossibility (ongoing processes) often rule out measuring every element.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function FiniteSrsScene() {
  return (
    <SceneFrame kicker="Selecting a sample" title={tex`A simple random sample gives every sample of size $n$ the same chance.`}>
      <p className={styles.lead}>
        Finite populations are often defined by lists: membership rosters, account numbers, inventory codes.
      </p>
      <Formula
        tex={tex`\text{SRS of size } n \text{ from } N:\ \text{each possible sample of size } n \text{ has equal probability}`}
      />
      <p className={styles.small}>
        Most projects use sampling <strong>without replacement</strong>. Replacing each selected element before the next draw is sampling <strong>with replacement</strong>.
      </p>
    </SceneFrame>
  );
}

function StephenSelectScene() {
  return (
    <SceneFrame kicker="St. Stephen's College" title="Select 30 of 900 applicants with random numbers.">
      <p className={styles.lead}>
        St. Stephen&apos;s received <MathText text={tex`$N=900$`} /> applications, numbered 1 to 900. Admissions wants a simple random sample of{" "}
        <MathText text={tex`$n=30$`} />.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Step 1</p>
          <p>Assign each applicant a random number.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Step 2</p>
          <p>Sort by that random number and take the first 30 applicants (or the 30 smallest random numbers).</p>
        </article>
      </div>
      <p className={styles.small}>Large projects automate this with computer-generated random numbers.</p>
    </SceneFrame>
  );
}

function InfiniteSampleScene() {
  return (
    <SceneFrame kicker="Selecting a sample" title="An infinite population has no complete list to sample from.">
      <p className={styles.lead}>
        Ongoing processes — parts on a line, bank transactions, help-desk calls, customers entering a store — have no upper limit, so we cannot build a frame.
      </p>
      <Formula
        tex={tex`\text{Random sample from an infinite population: each element comes from the population of interest, and selections are independent}`}
      />
      <p className={styles.small}>Valid inference about an infinite population requires that kind of random sample.</p>
    </SceneFrame>
  );
}

function PointEstimationScene() {
  return (
    <SceneFrame kicker="Point estimation" title="A sample statistic estimates a population parameter.">
      <p className={styles.lead}>Point estimation uses sample data to compute a single number that estimates a population parameter.</p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={`${styles.kicker} ${styles.kickerNoCaps}`}>
            <MathText text={tex`$\bar{x}$`} />
          </p>
          <p>
            Point estimator of the population mean <MathText text={tex`$\mu$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={`${styles.kicker} ${styles.kickerNoCaps}`}>
            <MathText text={tex`$s$`} />
          </p>
          <p>
            Point estimator of the population standard deviation <MathText text={tex`$\sigma$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={`${styles.kicker} ${styles.kickerNoCaps}`}>
            <MathText text={tex`$\hat{p}$`} />
          </p>
          <p>
            Point estimator of the population proportion <MathText text={tex`$p$`} />.
          </p>
        </article>
      </div>
      <p className={styles.small}>Point estimation is a form of statistical inference.</p>
    </SceneFrame>
  );
}

function StephenEstimatesScene() {
  return (
    <SceneFrame kicker="St. Stephen's College" title="Sample estimates versus the true applicant population.">
      <p className={styles.lead}>
        Before all 900 records were in the database, Admissions used a sample of 30. Later the full population values became known — so we can compare.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Mean SAT</p>
          <p>
            <MathText text={tex`$\bar{x}=1097$`} /> estimates <MathText text={tex`$\mu=1090$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>SAT std. deviation</p>
          <p>
            <MathText text={tex`$s=75.2$`} /> estimates <MathText text={tex`$\sigma=80$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Want on-campus housing</p>
          <p>
            <MathText text={tex`$\hat{p}=0.67$`} /> estimates <MathText text={tex`$p=0.72$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample formulas</p>
          <MathText text={tex`$\bar{x}=\dfrac{\sum x_i}{n},\quad \hat{p}=\dfrac{x}{n}$`} />
          <p className={styles.small}>
            Here <MathText text={tex`$x_i$`} /> is applicant <MathText text={tex`$i$`} />&apos;s SAT score, and{" "}
            <MathText text={tex`$x$`} /> is the number in the sample who want on-campus housing (so{" "}
            <MathText text={tex`$x=0.67\times 30\approx 20$`} />).
          </p>
        </article>
      </div>
      <p className={styles.small}>A different random sample would have given different estimates.</p>
    </SceneFrame>
  );
}

function InferencePipelineScene() {
  return (
    <SceneFrame kicker={tex`Sampling distribution of $\bar{x}$`} title={tex`Inference: sample → statistic → statement about $\mu$.`}>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Sample</p>
          <p>
            Draw a simple random sample of size <MathText text={tex`$n$`} /> from a population with unknown mean{" "}
            <MathText text={tex`$\mu$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Statistic</p>
          <p>
            Compute the sample mean <MathText text={tex`$\bar{x}$`} /> from the data.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Inference</p>
          <p>
            Use <MathText text={tex`$\bar{x}$`} /> to make statements about <MathText text={tex`$\mu$`} />.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function SamplingDistMeanScene() {
  return (
    <SceneFrame kicker={tex`Sampling distribution of $\bar{x}$`} title={tex`The sampling distribution is the distribution of all possible $\bar{x}$ values.`}>
      <p className={styles.lead}>
        Imagine every possible sample of size <MathText text={tex`$n$`} /> and its sample mean. That collection of{" "}
        <MathText text={tex`$\bar{x}$`} /> values has a probability distribution — the sampling distribution of{" "}
        <MathText text={tex`$\bar{x}$`} />.
      </p>
      <Formula tex={tex`E(\bar{x}) = \mu`} />
      <p className={styles.small}>
        When the expected value of a point estimator equals the parameter, the estimator is <strong>unbiased</strong>. The sample mean and the sample variance are unbiased for <MathText text={tex`$\mu$`} /> and{" "}
        <MathText text={tex`$\sigma^2$`} />.
      </p>
    </SceneFrame>
  );
}

function SeMeanScene() {
  return (
    <SceneFrame kicker="Standard error" title={tex`$\sigma_{\bar{x}}$ is the standard deviation of the sampling distribution of $\bar{x}$.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Infinite population</p>
          <Formula tex={tex`\sigma_{\bar{x}} = \dfrac{\sigma}{\sqrt{n}}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Finite population</p>
          <Formula tex={tex`\sigma_{\bar{x}} = \dfrac{\sigma}{\sqrt{n}}\sqrt{\dfrac{N-n}{N-1}}`} />
        </article>
      </div>
      <p className={styles.lead}>
        <MathText text={tex`$\sigma_{\bar{x}}$`} /> is the <strong>standard error</strong> of the sample mean. Treat a finite population as infinite when{" "}
        <MathText text={tex`$n/N < 0.05$`} /> (skip the finite correction).
      </p>
      <p className={styles.small}>
        Finite population correction factor: <MathText text={tex`$\sqrt{(N-n)/(N-1)}$`} /> (sampling without replacement).
      </p>
    </SceneFrame>
  );
}

function FormOfXbarScene() {
  return (
    <SceneFrame kicker="Form of the sampling distribution" title={tex`When is the sampling distribution of $\bar{x}$ approximately normal?`}>
      <Formula
        tex={tex`\text{CLT: for large } n,\ \bar{x}\ \text{ is approximately } N\!\left(\mu,\ \dfrac{\sigma^{2}}{n}\right)`}
      />
      <p className={styles.lead}>
        Same mean as the population; the second argument is the variance of <MathText text={tex`$\bar{x}$`} />, equal to{" "}
        <MathText text={tex`$\sigma_{\bar{x}}^{2}=\sigma^{2}/n$`} /> (so the standard error is <MathText text={tex`$\sigma_{\bar{x}}=\sigma/\sqrt{n}$`} />). Use the finite-population correction when{" "}
        <MathText text={tex`$n/N \ge 0.05$`} />.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Normal population</p>
          <p>
            If the population is already normal, the sampling distribution of <MathText text={tex`$\bar{x}$`} /> is exactly{" "}
            <MathText text={tex`$N(\mu,\ \sigma^{2}/n)$`} /> for any sample size.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Rule of thumb</p>
          <p>
            In most applications, the CLT approximation is usable when <MathText text={tex`$n \ge 30$`} />. If the population is highly skewed or has outliers,{" "}
            <MathText text={tex`$n$`} /> near 50 may be needed.
          </p>
        </article>
      </div>
      <p className={styles.small}>
        The next slide shows how different populations need different <MathText text={tex`$n$`} /> before the histogram of sample means looks like that normal curve.
      </p>
    </SceneFrame>
  );
}

function MeansHistogram({ bins, population, n, draws }: { bins: HistogramBin[]; population: Population; n: number; draws: number }) {
  const W = 560;
  const H = 210;
  const pad = { l: 16, r: 16, t: 12, b: 30 };
  if (bins.length === 0) return null;
  const left = bins[0].lo;
  const right = bins[bins.length - 1].hi;
  const span = Math.max(right - left, 1e-9);
  const binWidth = bins[0].hi - bins[0].lo;
  const se = population.sd / Math.sqrt(n);
  const curveXs = Array.from({ length: 161 }, (_, i) => left + (span * i) / 160);
  const curveYs = curveXs.map((x) => (draws * binWidth * normalY((x - population.mean) / se)) / se);
  const top = Math.max(...bins.map((b) => b.count), ...curveYs, 1) * 1.08;
  const xOf = (x: number) => pad.l + ((x - left) / span) * (W - pad.l - pad.r);
  const yOf = (y: number) => H - pad.b - (y / top) * (H - pad.t - pad.b);
  const curve = curveXs.map((x, i) => `${i === 0 ? "M" : "L"} ${xOf(x).toFixed(2)} ${yOf(curveYs[i]).toFixed(2)}`).join(" ");
  const digits = span < 0.5 ? 3 : 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Histogram of simulated sample means with the CLT normal curve">
      {bins.map((b) => {
        const x0 = xOf(b.lo);
        const x1 = xOf(b.hi);
        return (
          <rect
            key={b.lo}
            x={x0 + 0.5}
            y={yOf(b.count)}
            width={Math.max(x1 - x0 - 1, 0.5)}
            height={H - pad.b - yOf(b.count)}
            fill="rgba(196, 58, 58, 0.5)"
          />
        );
      })}
      <path d={curve} fill="none" stroke="#16213c" strokeWidth="2.5" />
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#16213c" strokeWidth="1.5" />
      {[left, population.mean, right].map((x, i) => (
        <text key={i} x={xOf(x)} y={H - 10} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize="12" fill="#16213c">
          {i === 1 ? `μ = ${formatNum(x, 2)}` : formatNum(x, digits)}
        </text>
      ))}
    </svg>
  );
}

function CltScene() {
  const [popId, setPopId] = useState(POPULATIONS[0].id);
  const [n, setN] = useState(2);
  const [draws, setDraws] = useState(1000);
  const [round, setRound] = useState(0);
  const population = POPULATIONS.find((p) => p.id === popId) ?? POPULATIONS[0];

  const bins = useMemo(() => {
    const rng = mulberry32(2011 + round * 7919 + n * 131 + draws);
    const means = Array.from({ length: draws }, () => sampleMean(population, n, rng));
    return histogramOfMeans(means, population, n);
  }, [population, n, draws, round]);

  return (
    <SceneFrame kicker="Central limit theorem" title={tex`Sample means look normal when $n$ is large.`}>
      <p className={styles.lead}>
        Whatever the population, for large <MathText text={tex`$n$`} /> the sampling distribution of <MathText text={tex`$\bar{x}$`} /> is approximately{" "}
        <MathText text={tex`$N(\mu,\ \sigma^{2}/n)$`} />. How large depends on the population: symmetric ones need a small{" "}
        <MathText text={tex`$n$`} />, skewed ones need more.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          {POPULATIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === popId ? styles.toolBtnActive : styles.toolBtn}
              onClick={() => setPopId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <label className={styles.slider}>
            Sample size n = {n}
            <input type="range" min={1} max={100} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </label>
          <label className={styles.slider}>
            Repeated samples = {draws}
            <input type="range" min={200} max={3000} step={200} value={draws} onChange={(e) => setDraws(Number(e.target.value))} />
          </label>
          <button type="button" className={styles.toolBtn} onClick={() => setRound((r) => r + 1)}>
            Draw again
          </button>
        </div>
        <figure className={styles.figure}>
          <MeansHistogram bins={bins} population={population} n={n} draws={draws} />
          <figcaption className={styles.small}>
            Bars: {draws} simulated sample means, binned between their smallest and largest values. Curve: the CLT normal with{" "}
            <MathText text={tex`$\mu=${formatNum(population.mean, 2)}$`} /> and{" "}
            <MathText text={tex`$\sigma/\sqrt{n}=${formatNum(population.sd / Math.sqrt(n), 3)}$`} />. Population skewness ={" "}
            {formatNum(population.skewness, 2)}.
          </figcaption>
        </figure>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.small}>
          On the website: pick a fair die, Binomial (p = 0.5 or 0.1), Poisson, or exponential population and raise n. The symmetric populations look normal at small n; the skewed ones (Poisson, exponential, Binomial with p = 0.1) need a larger n.
        </p>
      </PrintOnly>
      <p className={styles.small}>
        Try it: the die looks normal by about <MathText text={tex`$n=5$`} />, while the exponential still leans right at <MathText text={tex`$n=10$`} /> and needs roughly{" "}
        <MathText text={tex`$n \ge 30$`} />.
      </p>
    </SceneFrame>
  );
}

function StephenSeScene() {
  const se = seMean(STEPHEN.sigma, STEPHEN.n);
  return (
    <SceneFrame kicker="St. Stephen's College" title={tex`Sampling distribution of mean SAT for $n = 30$.`}>
      <p className={styles.lead}>
        Population: <MathText text={tex`$\mu=1090$`} />, <MathText text={tex`$\sigma=80$`} />. Sample size{" "}
        <MathText text={tex`$n=30$`} />. Since <MathText text={tex`$n/N=30/900=0.033<0.05$`} />, use the infinite-population formula.
      </p>
      <Formula tex={tex`E(\bar{x})=1090,\qquad \sigma_{\bar{x}}=\dfrac{80}{\sqrt{30}}\approx 14.61`} />
      <NormalBand mu={STEPHEN.mu} sigma={se} lo={STEPHEN.mu - se} hi={STEPHEN.mu + se} label="Sampling distribution of the sample mean" />
    </SceneFrame>
  );
}

function StephenMeanProbScene() {
  const [margin, setMargin] = useState(10);
  const se = seMean(STEPHEN.sigma, STEPHEN.n);
  const lo = STEPHEN.mu - margin;
  const hi = STEPHEN.mu + margin;
  const z = margin / se;
  const left = stdNormalCdf(-z);
  const right = stdNormalCdf(z);
  const mid = right - left;

  return (
    <SceneFrame kicker="St. Stephen's College" title={tex`How likely is $\bar{x}$ within $\pm 10$ of $\mu$?`}>
      <p className={styles.lead}>
        What is <MathText text={tex`$P(1080 < \bar{x} < 1100)$`} /> when <MathText text={tex`$n=30$`} />? Standardize with{" "}
        <MathText text={tex`$z=(\bar{x}-\mu)/\sigma_{\bar{x}}$`} />.
      </p>
      <LiveOnly>
        <label className={styles.slider}>
          Margin ±{margin} around μ = {STEPHEN.mu}
          <input type="range" min={2} max={40} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
        </label>
      </LiveOnly>
      <NormalBand mu={STEPHEN.mu} sigma={se} lo={lo} hi={hi} label="Shaded: sample mean within ±m of μ" />
      <Formula
        tex={tex`z=\dfrac{${hi}-${STEPHEN.mu}}{${formatNum(se, 1)}}\approx ${formatNum(z, 2)},\quad P(|Z|<${formatNum(z, 2)})\approx ${formatProb(mid)}`}
      />
      <p className={styles.small}>
        For ±10: <MathText text={tex`$z\approx\pm 0.68$`} />, probability ≈ {formatProb(normalIntervalProb(1080, 1100, STEPHEN.mu, se))}.
      </p>
    </SceneFrame>
  );
}

function SampleSizeEffectScene() {
  const se30 = seMean(STEPHEN.sigma, 30);
  const se100 = seMean(STEPHEN.sigma, 100);
  const p30 = normalIntervalProb(1080, 1100, STEPHEN.mu, se30);
  const p100 = normalIntervalProb(1080, 1100, STEPHEN.mu, se100);

  return (
    <SceneFrame kicker="Sample size" title={tex`Larger $n$ shrinks the standard error of $\bar{x}$.`}>
      <p className={styles.lead}>
        <MathText text={tex`$E(\bar{x})=\mu$`} /> for any sample size. Increasing <MathText text={tex`$n$`} /> decreases{" "}
        <MathText text={tex`$\sigma_{\bar{x}}$`} />, so <MathText text={tex`$\bar{x}$`} /> tends to sit closer to{" "}
        <MathText text={tex`$\mu$`} />.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={`${styles.kicker} ${styles.kickerNoCaps}`}>
            <MathText text={tex`$n = 30$`} />
          </p>
          <p>
            <MathText text={tex`$\sigma_{\bar{x}}\approx 14.6$`} />.{" "}
            <MathText text={tex`$P(1080<\bar{x}<1100)\approx$`} /> {formatProb(p30)}.
          </p>
        </article>
        <article className={styles.card}>
          <p className={`${styles.kicker} ${styles.kickerNoCaps}`}>
            <MathText text={tex`$n = 100$`} />
          </p>
          <p>
            <MathText text={tex`$\sigma_{\bar{x}}=80/\sqrt{100}=8$`} />.{" "}
            <MathText text={tex`$P(1080<\bar{x}<1100)\approx$`} /> {formatProb(p100)}.
          </p>
        </article>
      </div>
      <NormalBand mu={STEPHEN.mu} sigma={se100} lo={1080} hi={1100} label="n = 100 · narrower SE" xMin={1040} xMax={1140} />
    </SceneFrame>
  );
}

function SamplingDistPScene() {
  return (
    <SceneFrame kicker={tex`Sampling distribution of $\hat{p}$`} title={tex`$\hat{p}$ estimates a population proportion the same way $\bar{x}$ estimates $\mu$.`}>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Sample</p>
          <p>
            SRS of size <MathText text={tex`$n$`} /> from a population with proportion <MathText text={tex`$p$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Statistic</p>
          <p>
            Sample proportion <MathText text={tex`$\hat{p}=x/n$`} />, where <MathText text={tex`$x$`} /> is the number of successes in the sample.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Inference</p>
          <p>
            Use <MathText text={tex`$\hat{p}$`} /> to infer about <MathText text={tex`$p$`} />.
          </p>
        </article>
      </div>
      <Formula tex={tex`E(\hat{p}) = p`} />
      <p className={styles.small}>
        The sampling distribution of <MathText text={tex`$\hat{p}$`} /> is the probability distribution of all possible sample proportions.
      </p>
    </SceneFrame>
  );
}

function SePScene() {
  return (
    <SceneFrame kicker={tex`Standard error of $\hat{p}$`} title={tex`$\sigma_{\hat{p}}$ measures the variability of the sample proportion.`}>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Infinite population</p>
          <Formula tex={tex`\sigma_{\hat{p}} = \sqrt{\dfrac{p(1-p)}{n}}`} />
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Finite population</p>
          <Formula tex={tex`\sigma_{\hat{p}} = \sqrt{\dfrac{p(1-p)}{n}}\sqrt{\dfrac{N-n}{N-1}}`} />
        </article>
      </div>
      <p className={styles.lead}>
        Approximate the sampling distribution of <MathText text={tex`$\hat{p}$`} /> by a normal when{" "}
        <MathText text={tex`$np > 5$`} /> and <MathText text={tex`$n(1-p) > 5$`} />.
      </p>
      <p className={styles.small}>
        Then <MathText text={tex`$\hat{p}=x/n$`} /> inherits approximate normality from the count <MathText text={tex`$x$`} />.
      </p>
    </SceneFrame>
  );
}

function StephenPCheckScene() {
  const np = STEPHEN.n * STEPHEN.p;
  const nq = STEPHEN.n * (1 - STEPHEN.p);
  const se = seProportion(STEPHEN.p, STEPHEN.n);
  return (
    <SceneFrame kicker="St. Stephen's College" title={tex`With $p$ known, study how close $\hat{p}$ tends to be.`}>
      <p className={styles.lead}>
        After all 900 records are in, the true share wanting on-campus housing is <MathText text={tex`$p=0.72$`} />. We are{" "}
        <strong>not</strong> estimating <MathText text={tex`$p$`} /> here. We use the known <MathText text={tex`$p$`} /> to describe the sampling distribution of{" "}
        <MathText text={tex`$\hat{p}$`} /> from an SRS of size <MathText text={tex`$n=30$`} /> — and to check that a normal curve is a fair stand-in.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Checks</p>
          <p>
            <MathText text={tex`$np=21.6>5$`} />, <MathText text={tex`$n(1-p)=8.4>5$`} />. Normal approximation is acceptable.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sampling distribution</p>
          <Formula tex={tex`E(\hat{p})=0.72,\qquad \sigma_{\hat{p}}\approx ${formatNum(se, 3)}`} />
        </article>
      </div>
      <p className={styles.small}>
        Computed: np = {formatNum(np, 1)}, n(1−p) = {formatNum(nq, 1)}, SE ≈ {formatNum(se, 3)}. Next: how likely is{" "}
        <MathText text={tex`$\hat{p}$`} /> to fall within 0.05 of 0.72?
      </p>
    </SceneFrame>
  );
}

function StephenPProbScene() {
  const [margin, setMargin] = useState(0.05);
  const se = seProportion(STEPHEN.p, STEPHEN.n);
  const lo = STEPHEN.p - margin;
  const hi = STEPHEN.p + margin;
  const z = margin / se;
  const mid = stdNormalCdf(z) - stdNormalCdf(-z);

  return (
    <SceneFrame kicker="St. Stephen's College" title={tex`How likely is $\hat{p}$ within $\pm 0.05$ of $p$?`}>
      <p className={styles.lead}>
        Still using the known <MathText text={tex`$p=0.72$`} />: if Admissions draws an SRS of size 30, what is the chance that the sample proportion lands within 0.05 of the truth? That is{" "}
        <MathText text={tex`$P(0.67 < \hat{p} < 0.77)$`} />.
      </p>
      <LiveOnly>
        <label className={styles.slider}>
          Margin ±{formatNum(margin, 2)} around p = {STEPHEN.p}
          <input
            type="range"
            min={0.01}
            max={0.2}
            step={0.01}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
          />
        </label>
      </LiveOnly>
      <NormalBand mu={STEPHEN.p} sigma={se} lo={lo} hi={hi} label="Shaded: sample proportion within ±m of p" xMin={0.4} xMax={1} />
      <Formula
        tex={tex`z=\dfrac{${formatNum(hi, 2)}-${STEPHEN.p}}{${formatNum(se, 3)}}\approx ${formatNum(z, 2)},\quad P\approx ${formatProb(mid)}`}
      />
      <p className={styles.small}>
        For ±0.05: <MathText text={tex`$z\approx\pm 0.61$`} />, probability ≈{" "}
        {formatProb(normalIntervalProb(0.67, 0.77, STEPHEN.p, se))}.
      </p>
    </SceneFrame>
  );
}

const QUIZ = [
  {
    q: tex`$E(\bar{x})$ equals …`,
    options: [tex`$\mu$`, tex`$\sigma/\sqrt{n}$`, tex`$\bar{x}$`, tex`$s$`],
    answer: 0,
    why: tex`Unbiasedness: $E(\bar{x})=\mu$ for any sample size.`,
  },
  {
    q: "When may we skip the finite population correction?",
    options: [tex`$n \ge 30$`, tex`$np > 5$`, tex`$n/N < 0.05$`, tex`$\sigma$ known`],
    answer: 2,
    why: tex`Treat a finite population as infinite when $n/N < 0.05$.`,
  },
  {
    q: tex`Normal approximation for $\hat{p}$ needs …`,
    options: [tex`$n \ge 30$ only`, "population normal", tex`$N$ known`, tex`$np > 5$ and $n(1-p) > 5$`],
    answer: 3,
    why: tex`Require $np>5$ and $n(1-p)>5$.`,
  },
  {
    q: tex`Larger $n$ mainly …`,
    options: [tex`shrinks $\sigma_{\bar{x}}$`, tex`changes $E(\bar{x})$`, tex`changes $\mu$`, tex`removes bias of $\bar{x}$`],
    answer: 0,
    why: tex`$E(\bar{x})$ stays $\mu$; $\sigma_{\bar{x}}=\sigma/\sqrt{n}$ falls as $n$ rises.`,
  },
];

function QuizScene() {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const shown = Object.keys(picked).length;
  const score = QUIZ.reduce((acc, item, i) => acc + (picked[i] === item.answer ? 1 : 0), 0);

  return (
    <SceneFrame kicker="Practice" title="Which statement is right?" tone="gold">
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
                  <MathText text={opt} />
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

function TakeawaysScene() {
  return (
    <SceneFrame kicker="Takeaways" title="Sample statistics have their own distributions." tone="dark">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>SRS</p>
          <p>Every sample of size n equally likely (finite). Infinite: elements from the population of interest, chosen independently.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Point estimators</p>
          <p>
            <MathText text={tex`$\bar{x}$`} />, <MathText text={tex`$s$`} />, <MathText text={tex`$\hat{p}$`} /> estimate{" "}
            <MathText text={tex`$\mu$`} />, <MathText text={tex`$\sigma$`} />, <MathText text={tex`$p$`} />.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Mean</p>
          <p>
            <MathText text={tex`$E(\bar{x})=\mu$`} />, <MathText text={tex`$\sigma_{\bar{x}}=\sigma/\sqrt{n}$`} /> (plus FPC if needed). CLT / n ≥ 30 for shape.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Proportion</p>
          <p>
            <MathText text={tex`$E(\hat{p})=p$`} />, <MathText text={tex`$\sigma_{\hat{p}}=\sqrt{p(1-p)/n}$`} />. Normal if{" "}
            <MathText text={tex`$np>5$`} /> and <MathText text={tex`$n(1-p)>5$`} />.
          </p>
        </article>
      </div>
      <p className={styles.footerNote}>DOTE2011G · Sampling and Sampling Distributions · CUHK</p>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Start", label: "Title", Scene: CoverScene },
  { id: "population", chapter: "Introduction", label: "Population and sample", Scene: PopulationSampleScene },
  { id: "why-sample", chapter: "Introduction", label: "Why we sample", Scene: WhySampleScene },
  { id: "finite-srs", chapter: "Selecting a sample", label: "Simple random sample", Scene: FiniteSrsScene },
  { id: "stephen-select", chapter: "Selecting a sample", label: "St. Stephen's selection", Scene: StephenSelectScene },
  { id: "infinite", chapter: "Selecting a sample", label: "Infinite population", Scene: InfiniteSampleScene },
  { id: "point-est", chapter: "Point estimation", label: "Estimators", Scene: PointEstimationScene },
  { id: "stephen-est", chapter: "Point estimation", label: "St. Stephen's estimates", Scene: StephenEstimatesScene },
  { id: "pipeline", chapter: "Sampling distribution of the mean", label: "Inference pipeline", Scene: InferencePipelineScene },
  { id: "sd-mean", chapter: "Sampling distribution of the mean", label: "Definition and expected value", Scene: SamplingDistMeanScene },
  { id: "se-mean", chapter: "Sampling distribution of the mean", label: "Standard error", Scene: SeMeanScene },
  { id: "form-xbar", chapter: "Sampling distribution of the mean", label: "Form / normality", Scene: FormOfXbarScene },
  { id: "clt", chapter: "Sampling distribution of the mean", label: "Central limit theorem", Scene: CltScene },
  { id: "stephen-se", chapter: "St. Stephen's · mean", label: "SE for n = 30", Scene: StephenSeScene },
  { id: "stephen-mean-prob", chapter: "St. Stephen's · mean", label: "P within ±10", Scene: StephenMeanProbScene },
  { id: "n-effect", chapter: "St. Stephen's · mean", label: "n = 30 vs 100", Scene: SampleSizeEffectScene },
  { id: "sd-p", chapter: "Sampling distribution of the proportion", label: "Definition and expected value", Scene: SamplingDistPScene },
  { id: "se-p", chapter: "Sampling distribution of the proportion", label: "SE and normal rule", Scene: SePScene },
  { id: "stephen-p-check", chapter: "St. Stephen's · proportion", label: "Known p · normal OK?", Scene: StephenPCheckScene },
  { id: "stephen-p-prob", chapter: "St. Stephen's · proportion", label: "P within ±0.05", Scene: StephenPProbScene },
  { id: "quiz", chapter: "Practice", label: "Which statement?", Scene: QuizScene },
  { id: "takeaways", chapter: "Close", label: "Takeaways", Scene: TakeawaysScene },
];
