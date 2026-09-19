import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  binomialPmf,
  combinations,
  createRng,
  formatProb,
  hypergeometricPmf,
  poissonPmf,
  shuffle,
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
  "Use ← → or the buttons above. Numbers in every example can be redrawn. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

/** Broadway TV sales — textbook relative frequencies */
const BROADWAY = [
  { x: 0, days: 80, f: 0.4 },
  { x: 1, days: 50, f: 0.25 },
  { x: 2, days: 40, f: 0.2 },
  { x: 3, days: 10, f: 0.05 },
  { x: 4, days: 20, f: 0.1 },
] as const;

const BROADWAY_MU = BROADWAY.reduce((s, r) => s + r.x * r.f, 0);
const BROADWAY_VAR = BROADWAY.reduce((s, r) => s + (r.x - BROADWAY_MU) ** 2 * r.f, 0);

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

function DistBarChart({
  title,
  rows,
  xLabel,
}: {
  title: string;
  rows: { x: number | string; p: number }[];
  xLabel: string;
}) {
  const maxP = Math.max(...rows.map((r) => r.p), 0.01);
  const W = 420;
  const H = 200;
  const pad = { left: 36, right: 12, top: 28, bottom: 36 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const gap = 8;
  const barW = Math.min(48, (plotW - gap * (rows.length + 1)) / rows.length);

  return (
    <figure className={styles.chartCard}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <text x={pad.left} y={16} className={styles.chartTitle}>
          {title}
        </text>
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={pad.left + plotW}
          y2={pad.top + plotH}
          stroke="var(--ink)"
          strokeWidth="2"
        />
        {rows.map((row, i) => {
          const h = (row.p / maxP) * plotH;
          const x = pad.left + gap + i * (barW + gap);
          const y = pad.top + plotH - h;
          return (
            <g key={String(row.x)}>
              <rect x={x} y={y} width={barW} height={h} fill="var(--blue)" stroke="var(--ink)" strokeWidth="2" />
              <text x={x + barW / 2} y={y - 4} className={styles.barValue}>
                {formatProb(row.p, 3)}
              </text>
              <text x={x + barW / 2} y={pad.top + plotH + 16} className={styles.tick}>
                {row.x}
              </text>
            </g>
          );
        })}
        <text x={pad.left + plotW / 2} y={H - 4} className={styles.axisLabel}>
          {xLabel}
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
        <h1 className={styles.coverTitle}>Discrete Probability Distributions</h1>
        <p className={styles.lead}>
          Random variables, expectation and variance, then binomial, Poisson, and hypergeometric models for counting
          outcomes.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function RandomVariableScene() {
  return (
    <SceneFrame kicker="Random variables" title="A random variable turns outcomes into numbers.">
      <p className={styles.lead}>
        A <strong>random variable</strong> is a numerical description of the outcome of an experiment.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Discrete</p>
          <p>
            Takes a <strong>finite</strong> set of values, or an <strong>infinite sequence</strong> you can list (0, 1,
            2, …).
          </p>
          <p className={styles.small}>Example: number of TVs sold today.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Continuous</p>
          <p>
            Can take <strong>any</strong> value in an interval (or union of intervals).
          </p>
          <p className={styles.small}>Example: distance from home to the store (miles).</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function DiscreteTypesScene() {
  return (
    <SceneFrame kicker="Discrete RVs" title="Finite list vs countable infinity.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Finite · Broadway Electronics</p>
          <p>
            Broadway is a retail electronics store. Let <strong>x</strong> = number of TVs sold in one day. Stock on the
            floor caps sales, so x ∈ {"{0, 1, 2, 3, 4}"}.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Infinite sequence · Same store</p>
          <p>
            At the same store, let <strong>x</strong> = number of customers arriving in one day. Arrivals can be 0, 1,
            2, … with no fixed upper limit.
          </p>
        </article>
      </div>
      <p className={styles.small}>Both are discrete: we count. Continuous variables measure (length, time, weight).</p>
    </SceneFrame>
  );
}

function ClassifyGame() {
  const print = usePrintMode();
  const items = useMemo(
    () => [
      { q: "Family size (number of dependents on a tax return)", a: "discrete" as const },
      { q: "Distance from home to store (miles)", a: "continuous" as const },
      { q: "Own dog/cat coded 1–4 as categories", a: "discrete" as const },
    ],
    [],
  );
  const [seed, setSeed] = useState(1);
  const [guess, setGuess] = useState<Record<number, string>>({});
  const order = useMemo(() => {
    const rng = createRng(seed * 97 + 11);
    return shuffle(
      items.map((_, i) => i),
      rng,
    );
  }, [items, seed]);

  return (
    <SceneFrame kicker="Quick check" title="Discrete or continuous?" tone="gold">
      <p className={styles.lead}>Classify each random variable. Tap to reveal after you decide.</p>
      <div className={styles.promptList}>
        {order.map((i) => {
          const item = items[i];
          const g = guess[i];
          const shown = print || g != null;
          return (
            <article key={item.q} className={styles.promptItem}>
              <strong>{item.q}</strong>
              <LiveOnly>
                <div className={styles.tools}>
                  <button className={styles.toolBtn} type="button" onClick={() => setGuess((m) => ({ ...m, [i]: "discrete" }))}>
                    Discrete
                  </button>
                  <button className={styles.toolBtn} type="button" onClick={() => setGuess((m) => ({ ...m, [i]: "continuous" }))}>
                    Continuous
                  </button>
                </div>
              </LiveOnly>
              {shown ? (
                <p className={styles.small}>
                  {print || g === item.a
                    ? `Answer: ${item.a}.`
                    : `You said ${g}; textbook answer: ${item.a}.`}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
      <LiveOnly>
        <button className={styles.toolBtn} type="button" onClick={() => { setSeed((s) => s + 1); setGuess({}); }}>
          Shuffle order
        </button>
      </LiveOnly>
    </SceneFrame>
  );
}

function DistIdeaScene() {
  return (
    <SceneFrame kicker="Distributions" title="A discrete distribution spreads probability over values of x.">
      <p className={styles.lead}>
        The <strong>probability distribution</strong> of a random variable describes how probabilities are shared across
        its possible values. For discrete <strong>x</strong> we use a table, a graph, or a formula.
      </p>
      <Formula tex={tex`f(x) = P(X = x)`} />
      <p className={styles.small}>
        <MathText text={tex`Required: $f(x) \ge 0$ for every $x$, and $\sum f(x) = 1$ over all possible values.`} />
      </p>
    </SceneFrame>
  );
}

function BroadwayTableScene() {
  return (
    <SceneFrame kicker="Example · Broadway Electronics" title="TV sales: from days counted to f(x).">
      <p className={styles.lead}>
        Broadway Electronics tracked daily TV sales for <strong>200 business days</strong>. Managers want a probability
        model for tomorrow’s sales. Relative frequencies from this history estimate the probability function f(x).
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>x (units sold)</th>
              <th>Days</th>
              <th>f(x)</th>
            </tr>
          </thead>
          <tbody>
            {BROADWAY.map((r) => (
              <tr key={r.x}>
                <td>{r.x}</td>
                <td>{r.days}</td>
                <td>{formatProb(r.f, 2)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>200</td>
              <td>1.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.small}>Example: on 80 of 200 days they sold none, so f(0) = 80/200 = 0.40.</p>
    </SceneFrame>
  );
}

function DistributionFunctionScene() {
  let running = 0;
  const rows = BROADWAY.map((row) => {
    running += row.f;
    return { x: row.x, f: row.f, F: running };
  });
  return (
    <SceneFrame kicker="Distribution function" title="F(x) stacks the probability up to x.">
      <p className={styles.lead}>
        The distribution function, also called the cumulative distribution function, is <MathText text={tex`$F(x) = P(X \le x)$`} />. The probability function <MathText text={tex`$f$`} /> is the size of each jump.
      </p>
      <Formula tex={tex`f(x) = F(x) - F(x-1)`} />
      <p className={styles.small}>
        For an integer-valued count, take <MathText text={tex`$F(-1) = 0$`} />. <MathText text={tex`$F$`} /> is a step function: flat between the possible values, and a jump of height <MathText text={tex`$f(x)$`} /> at each value <MathText text={tex`$x$`} /> can take. <MathText text={tex`$F$`} /> never decreases, starts at 0, and ends at 1.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>x</th>
              <th>f(x)</th>
              <th>F(x)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.x}>
                <td>{row.x}</td>
                <td>{formatProb(row.f, 2)}</td>
                <td>{formatProb(row.F, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>Broadway: F(2) = 0.40 + 0.25 + 0.20 = 0.85, so f(2) = F(2) − F(1) = 0.20.</p>
    </SceneFrame>
  );
}

function BroadwayGraphScene() {
  return (
    <SceneFrame kicker="Example · Broadway Electronics" title="Graph the probability distribution.">
      <p className={styles.lead}>
        Same Broadway data as a picture: each bar is the estimated chance of selling that many TVs on a random day.
      </p>
      <DistBarChart
        title="Broadway TV sales"
        xLabel="Values of x (TV sales)"
        rows={BROADWAY.map((r) => ({ x: r.x, p: r.f }))}
      />
    </SceneFrame>
  );
}

function UniformScene() {
  const print = usePrintMode();
  const [nLive, setN] = useState(6);
  const n = print ? 6 : nLive;
  const rows = Array.from({ length: n }, (_, i) => ({ x: i + 1, p: 1 / n }));
  return (
    <SceneFrame kicker="Formula distributions" title="Discrete uniform: every value equally likely.">
      <p className={styles.lead}>
        <MathText text={tex`If $x$ can take $n$ equally likely values, then $f(x) = 1/n$.`} />
      </p>
      <Formula tex={tex`f(x) = \dfrac{1}{n}`} />
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            n values
          </span>
          {[4, 5, 6, 8].map((size) => (
            <button
              key={size}
              className={`${styles.toolBtn} ${n === size ? styles.toolBtnActive : ""}`}
              type="button"
              onClick={() => setN(size)}
            >
              n = {size}
            </button>
          ))}
        </div>
      </LiveOnly>
      <DistBarChart title={`Uniform · n = ${n}`} xLabel="x" rows={rows} />
    </SceneFrame>
  );
}

function ExpectationScene() {
  return (
    <SceneFrame kicker="Center" title="Expected value is a probability-weighted average.">
      <p className={styles.lead}>
        <MathText text={tex`For a discrete RV $X$ with probability function $f(x)$, the expected value (mean) is the average value of $X$:`} />
      </p>
      <Formula tex={tex`E(X) = \mu = \sum x\, f(x)`} />
      <p className={styles.small}>
        <MathText text={tex`Interpretation of $E(X)$: the average value of $X$. It need not be a value $X$ can actually take.`} />
      </p>
      <article className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.kicker}>Broadway Electronics</p>
        <p>
          <MathText
            text={tex`Using the 200-day sales distribution, the expected number of TVs sold in a day is $0(0.40)+1(0.25)+2(0.20)+3(0.05)+4(0.10) = ${formatProb(BROADWAY_MU, 2)}$.`}
          />
        </p>
      </article>
    </SceneFrame>
  );
}

function ExpectationPropertiesScene() {
  return (
    <SceneFrame kicker="Center" title="Properties of expected values.">
      <p className={styles.lead}>
        Mathematical expectation is a <strong>linear operator</strong>.
      </p>
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
            <MathText text={tex`If $c$ is a constant and $g(X)$ is a function,`} />
          </p>
          <Formula tex={tex`E\big(c\, g(X)\big) = c\, E\big(g(X)\big)`} />
        </article>
        <article className={styles.promptItem}>
          <strong>(c)</strong>
          <p>
            <MathText text={tex`If $c_1$ and $c_2$ are constants and $g_1(X)$, $g_2(X)$ are functions,`} />
          </p>
          <Formula tex={tex`E\big[c_1 g_1(X) + c_2 g_2(X)\big] = c_1 E\big[g_1(X)\big] + c_2 E\big[g_2(X)\big]`} />
        </article>
      </div>
      <Formula tex={tex`\text{For any two RVs } X,Y:\quad E(X+Y)=E(X)+E(Y)`} />
      <p className={styles.small}>
        Linearity of expectation does <strong>not</strong> require independence.
      </p>
    </SceneFrame>
  );
}

function VarianceScene() {
  return (
    <SceneFrame kicker="Spread" title="Variance weights squared deviations by probability.">
      <p className={styles.lead}>
        <MathText text={tex`Variance of a RV uses $g(X) = (X - E(X))^2$. The standard deviation is the positive square root of the variance.`} />
      </p>
      <Formula tex={tex`\begin{aligned}
\mathrm{Var}(X) &= E\big[(X - E(X))^2\big] = \sum (x - \mu)^2 f(x) \\
\mathrm{Var}(X) &= E(X^2) - \big[E(X)\big]^2 \\
\sigma &= \sqrt{\mathrm{Var}(X)}
\end{aligned}`}
      />
      <article className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.kicker}>Broadway Electronics</p>
        <p>
          <MathText text={tex`Day-to-day sales are noisy: $\sigma^2 \approx ${formatProb(BROADWAY_VAR, 3)}$, so $\sigma \approx ${formatProb(Math.sqrt(BROADWAY_VAR), 4)}$ TVs around the mean of $1.20$.`}
          />
        </p>
      </article>
    </SceneFrame>
  );
}

function VariancePropertiesScene() {
  return (
    <SceneFrame kicker="Spread" title="Properties of variance.">
      <p className={styles.lead}>
        <MathText text={tex`Let $c$ be a constant.`} />
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Constant</p>
          <Formula tex={tex`\mathrm{Var}(c) = 0`} />
          <p className={styles.small}>A constant does not vary.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Scale</p>
          <Formula tex={tex`\mathrm{Var}(cX) = c^2\, \mathrm{Var}(X)`} />
          <p className={styles.small}>The constant is squared.</p>
        </article>
      </div>
      <Formula tex={tex`\text{For independent RVs } X,Y:\quad \mathrm{Var}(X+Y)=\mathrm{Var}(X)+\mathrm{Var}(Y)`} />
      <p className={styles.small}>
        <MathText text={tex`Independence is required here. (By contrast, $E(X+Y)=E(X)+E(Y)$ always holds.)`} />
      </p>
    </SceneFrame>
  );
}

function BroadwayMomentsScene() {
  return (
    <SceneFrame kicker="Example · Broadway Electronics" title="Build E(x) and Var(x) from the table.">
      <p className={styles.lead}>
        Inventory planners at Broadway need both the average daily sales and how widely sales swing. Build the moments
        from the same f(x) table.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>x</th>
              <th>f(x)</th>
              <th>x f(x)</th>
              <th>(x − μ)²</th>
              <th>(x − μ)² f(x)</th>
            </tr>
          </thead>
          <tbody>
            {BROADWAY.map((r) => {
              const dev2 = (r.x - BROADWAY_MU) ** 2;
              return (
                <tr key={r.x}>
                  <td>{r.x}</td>
                  <td>{formatProb(r.f, 2)}</td>
                  <td>{formatProb(r.x * r.f, 2)}</td>
                  <td>{formatProb(dev2, 2)}</td>
                  <td>{formatProb(dev2 * r.f, 3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Formula tex={tex`\begin{aligned}
E(x) &= ${formatProb(BROADWAY_MU, 2)} \\
\mathrm{Var}(x) &= ${formatProb(BROADWAY_VAR, 3)} \\
\sigma &= ${formatProb(Math.sqrt(BROADWAY_VAR), 4)}
\end{aligned}`}
      />
    </SceneFrame>
  );
}

function BinomialPropsScene() {
  return (
    <SceneFrame kicker="Binomial" title="Four properties of a binomial experiment.">
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>1 · Trials</p>
          <p>
            The experiment is a sequence of <strong>n identical trials</strong>.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>2 · Outcomes</p>
          <p>
            Each trial has two results: <strong>success</strong> or <strong>failure</strong>.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>3 · Stationarity</p>
          <p>
            P(success) = <strong>p</strong> does not change from trial to trial.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>4 · Independence</p>
          <p>One trial’s result does not affect another.</p>
        </article>
      </div>
      <p className={styles.small}>Interest: x = number of successes in the n trials.</p>
    </SceneFrame>
  );
}

function BinomialFormulaScene() {
  const print = usePrintMode();
  const [nLive, setN] = useState(3);
  const [pLive, setP] = useState(0.1);
  const [xLive, setX] = useState(1);
  const n = print ? 3 : nLive;
  const p = print ? 0.1 : pLive;
  const x = print ? 1 : Math.min(Math.max(xLive, 0), n);
  const fx = binomialPmf(n, p, x);
  return (
    <SceneFrame kicker="Binomial" title="Binomial probability function.">
      <p className={styles.lead}>
        <MathText text={tex`$f(x) = \binom{n}{x} p^{x} (1-p)^{n-x}$ — count the sequences with $x$ successes, then multiply by each sequence’s probability.`} />
      </p>
      <p className={styles.small}>
        Running story (next slides): <strong>Café de Coral</strong>, a large Hong Kong–based restaurant chain, sees about
        10% annual turnover among hourly staff. Try n=3, p=0.10, x=1 for “exactly one of three workers leaves.”
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            n
          </span>
          {[2, 3, 4, 5].map((v) => (
            <button key={v} className={`${styles.toolBtn} ${n === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => { setN(v); setX((cur) => Math.min(cur, v)); }}>
              {v}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            p
          </span>
          {[0.1, 0.2, 0.5].map((v) => (
            <button key={v} className={`${styles.toolBtn} ${p === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => setP(v)}>
              {v}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            x
          </span>
          {Array.from({ length: n + 1 }, (_, v) => (
            <button key={v} className={`${styles.toolBtn} ${x === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => setX(v)}>
              {v}
            </button>
          ))}
        </div>
      </LiveOnly>
      <Formula tex={tex`\begin{aligned}
\binom{${n}}{${x}} &= ${combinations(n, x)} \\
f(${x}) &= ${formatProb(fx, 4)}
\end{aligned}`}
      />
    </SceneFrame>
  );
}

function CafeCoralScene() {
  const sequences = [
    { label: "(L, S, S)", p: 0.081 },
    { label: "(S, L, S)", p: 0.081 },
    { label: "(S, S, L)", p: 0.081 },
  ];
  return (
    <SceneFrame kicker="Example · Café de Coral" title="Staff turnover: P(exactly one of three leaves).">
      <p className={styles.lead}>
        <strong>Café de Coral</strong> (大家樂) is a well-known quick-service restaurant group. Management is worried
        about retention: in recent years about <strong>10%</strong> of hourly employees leave each year. HR picks 3
        hourly employees at random. What is the chance that <strong>exactly one</strong> leaves this year?
      </p>
      <p className={styles.small}>
        Model: treat “leaves” as success with p = 0.10, n = 3 independent workers, x = number who leave. Write{" "}
        <strong>L</strong> = leaves and <strong>S</strong> = stays.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Outcome</th>
              <th>Probability</th>
            </tr>
          </thead>
          <tbody>
            {sequences.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td>{formatProb(s.p, 3)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total = f(1)</strong>
              </td>
              <td>
                <strong>0.243</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Formula tex={tex`f(1) = \binom{3}{1}(0.1)^1(0.9)^2 = 3 \times 0.1 \times 0.81 = 0.243`} />
      <p className={styles.small}>
        <MathText text={tex`So there is about a 24% chance that exactly one of the three leaves. Mean and variance: $E(x)=np=0.3$, $\mathrm{Var}(x)=np(1-p)=0.27$, $\sigma\approx 0.52$ employees.`} />
      </p>
    </SceneFrame>
  );
}

function BinomialMomentsScene() {
  const print = usePrintMode();
  const [nLive, setN] = useState(3);
  const [pLive, setP] = useState(0.1);
  const n = print ? 3 : nLive;
  const p = print ? 0.1 : pLive;
  const mean = n * p;
  const variance = n * p * (1 - p);
  const sd = Math.sqrt(variance);
  return (
    <SceneFrame kicker="Binomial" title="Mean and variance have closed forms.">
      <p className={styles.lead}>
        <MathText text={tex`For a binomial with $n$ trials and success probability $p$:`} />
      </p>
      <Formula tex={tex`\begin{aligned}
E(x) &= np \\
\mathrm{Var}(x) &= np(1-p) \\
\sigma &= \sqrt{np(1-p)}
\end{aligned}`}
      />
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            n
          </span>
          {[2, 3, 4, 5, 10].map((v) => (
            <button
              key={v}
              className={`${styles.toolBtn} ${n === v ? styles.toolBtnActive : ""}`}
              type="button"
              onClick={() => setN(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            p
          </span>
          {[0.1, 0.2, 0.3, 0.5].map((v) => (
            <button
              key={v}
              className={`${styles.toolBtn} ${p === v ? styles.toolBtnActive : ""}`}
              type="button"
              onClick={() => setP(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </LiveOnly>
      <Formula tex={tex`\begin{aligned}
E(x) &= ${n} \times ${p} = ${formatProb(mean, 4)} \\
\mathrm{Var}(x) &= ${n} \times ${p} \times ${formatProb(1 - p, 2)} = ${formatProb(variance, 4)} \\
\sigma &= ${formatProb(sd, 4)}
\end{aligned}`}
      />
      <p className={styles.small}>
        <MathText text={tex`Café de Coral check: $n=3$, $p=0.10$ $\Rightarrow$ $E(x)=0.3$, $\mathrm{Var}(x)=0.27$, $\sigma\approx 0.52$.`} />
      </p>
    </SceneFrame>
  );
}

function BinomialGame() {
  const print = usePrintMode();
  const [choice, setChoice] = useState<string | null>(null);
  const answer = "yes";
  const revealed = print || choice != null;
  return (
    <SceneFrame kicker="Game" title="Is this binomial?" tone="gold">
      <p className={styles.lead}>
        A quality inspector at a factory checks 5 randomly selected items from a <strong>very large shipment</strong>.
        Each item is independently defective with probability 0.02. Let x = number of defectives in the sample of 5.
      </p>
      <LiveOnly>
        <div className={styles.choices}>
          <button className={`${styles.choice} ${choice === "yes" ? styles.choiceCorrect : ""}`} type="button" onClick={() => setChoice("yes")}>
            Yes — binomial (n=5, p=0.02)
          </button>
          <button className={`${styles.choice} ${choice === "no" ? styles.choiceCorrect : ""}`} type="button" onClick={() => setChoice("no")}>
            No — p changes / dependent trials
          </button>
        </div>
      </LiveOnly>
      {revealed ? (
        <>
          <p className={styles.small}>
            {print || choice === answer
              ? "Yes — with a very large shipment, removing a few items barely changes the fraction defective, so p ≈ 0.02 stays constant and the checks act as independent trials → binomial."
              : "For this wording (“very large shipment”), the binomial model is the right answer. The “p changes” worry matters when the lot is small — see below."}
          </p>
          <article className={styles.card} style={{ marginTop: 14 }}>
            <p className={styles.kicker}>Discussion · what if the shipment is small?</p>
            <p>
              Suppose instead the inspector samples <strong>without replacement</strong> from a <strong>small lot</strong>{" "}
              (say 20 items, of which a fixed number are defective). After the first draw, the remaining fraction
              defective has changed, so P(defective) on the next draw is no longer 0.02. Trials are{" "}
              <strong>dependent</strong> and the success probability is <strong>not constant</strong> — two binomial
              assumptions fail.
            </p>
            <p className={styles.small}>
              Then x follows a <strong>hypergeometric</strong> distribution (coming next), not a binomial. The large-N
              story is why we often still use binomial as an approximation when the sample is a tiny fraction of the
              shipment.
            </p>
          </article>
        </>
      ) : null}
    </SceneFrame>
  );
}

function PoissonIntroScene() {
  return (
    <SceneFrame kicker="Poisson" title="Count occurrences in time or space.">
      <p className={styles.lead}>
        A Poisson random variable often models the number of events in a fixed interval of time or space. Values: x = 0,
        1, 2, … (no fixed upper bound). Classic uses: vehicles at a toll booth, phone calls into a call centre, or
        patients arriving at an emergency room.
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Examples</p>
          <p>Toll-booth traffic in one hour · Bell Labs–style call arrivals · ER weekend nights (next slides).</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Two properties</p>
          <p>
            1) Equal-length intervals have the same occurrence probability.
            <br />
            2) Disjoint intervals are independent.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function PoissonFormulaScene() {
  const print = usePrintMode();
  const [muLive, setMu] = useState(3);
  const [xLive, setX] = useState(4);
  const mu = print ? 3 : muLive;
  const x = print ? 4 : xLive;
  const fx = poissonPmf(mu, x);
  const chartRows = Array.from({ length: 11 }, (_, i) => ({ x: i, p: poissonPmf(mu, i) }));
  return (
    <SceneFrame kicker="Poisson" title="Poisson probability function.">
      <p className={styles.lead}>
        <MathText text={tex`$f(x) = e^{-\mu} \mu^{x} / x!$, where $\mu$ is the mean number of occurrences in the interval.`} />
      </p>
      <p className={styles.small}>
        Running story: <strong>Mercy Hospital</strong> ER averages 6 arrivals per hour on weekend evenings, so a
        30-minute window has μ = 3. Here <strong>x</strong> = number of arrivals in those 30 minutes (try x = 4).
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            μ (per 30 min)
          </span>
          {[2, 3, 4, 6].map((v) => (
            <button key={v} className={`${styles.toolBtn} ${mu === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => setMu(v)}>
              {v}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            x (in 30 min)
          </span>
          {[0, 1, 2, 3, 4, 5, 6].map((v) => (
            <button key={v} className={`${styles.toolBtn} ${x === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => setX(v)}>
              {v}
            </button>
          ))}
        </div>
      </LiveOnly>
      <Formula tex={tex`f(${x}) = ${formatProb(fx, 4)}`} />
      <DistBarChart title={`Poisson(μ=${mu}) · 30-minute window`} xLabel="x = arrivals in 30 minutes" rows={chartRows} />
      <p className={styles.small}>
        <MathText text={tex`Property: mean = variance = $\mu$.`} />
      </p>
    </SceneFrame>
  );
}

function MercyScene() {
  return (
    <SceneFrame kicker="Example · Mercy Hospital" title="Weekend ER: how busy is the next half hour?">
      <p className={styles.lead}>
        On weekend evenings, patients arrive at the <strong>Mercy Hospital</strong> emergency room at an average rate of{" "}
        <strong>6 per hour</strong>. The charge nurse wants the chance of <strong>exactly 4 arrivals in the next 30
        minutes</strong> — useful for staffing and bed prep.
      </p>
      <p className={styles.small}>
        <MathText text={tex`Scale the mean to the interval: $\mu = 6/\text{hour} \times \tfrac{1}{2}\,\text{hour} = 3$.`} />
      </p>
      <Formula tex={tex`f(4) = \dfrac{e^{-3}\, 3^{4}}{4!} \approx ${formatProb(poissonPmf(3, 4), 4)}`} />
      <p className={styles.small}>
        <MathText text={tex`About a 17% chance of exactly four arrivals. Also $\sigma^2 = \mu = 3$ for that half-hour.`} />
      </p>
    </SceneFrame>
  );
}

function HyperIntroScene() {
  return (
    <SceneFrame kicker="Hypergeometric" title="Sampling without replacement changes p.">
      <p className={styles.lead}>
        Closely related to the binomial, but trials are <strong>not</strong> independent and the success probability{" "}
        <strong>changes</strong> from trial to trial (finite population, no replacement).
      </p>
      <div className={styles.two}>
        <article className={styles.card}>
          <p className={styles.kicker}>Population</p>
          <p>
            N elements, of which <strong>r</strong> are “success” labels.
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Sample</p>
          <p>
            Draw <strong>n</strong> items. x = number of successes in the sample.
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

function HyperFormulaScene() {
  const print = usePrintMode();
  const [N] = useState(4);
  const [r] = useState(2);
  const [nLive, setNDraw] = useState(2);
  const [xLive, setX] = useState(2);
  const n = print ? 2 : nLive;
  const x = print ? 2 : Math.min(xLive, n);
  const fx = hypergeometricPmf(N, r, n, x);
  return (
    <SceneFrame kicker="Hypergeometric" title="Hypergeometric probability function.">
      <p className={styles.lead}>
        <MathText text={tex`$f(x) = \dfrac{\binom{r}{x}\binom{N-r}{n-x}}{\binom{N}{n}}$. Valid when $x \le r$ and $n-x \le N-r$; otherwise $f(x)=0$.`} />
      </p>
      <p className={styles.small}>
        Running story: Tom mixed <strong>2 good</strong> and <strong>2 dead</strong> flashlight batteries (N=4, r=2). He
        draws n batteries; try x = number of good ones.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            Draw n (N=4, r=2 good)
          </span>
          {[1, 2, 3].map((v) => (
            <button key={v} className={`${styles.toolBtn} ${n === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => { setNDraw(v); setX((cur) => Math.min(cur, v)); }}>
              n={v}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            x good batteries
          </span>
          {Array.from({ length: n + 1 }, (_, v) => (
            <button key={v} className={`${styles.toolBtn} ${x === v ? styles.toolBtnActive : ""}`} type="button" onClick={() => setX(v)}>
              {v}
            </button>
          ))}
        </div>
      </LiveOnly>
      <Formula tex={tex`f(${x}) = ${formatProb(fx, 4)}`} />
    </SceneFrame>
  );
}

function BatteriesScene() {
  const mu = 2 * (2 / 4);
  const variance = 2 * (2 / 4) * (1 - 2 / 4) * ((4 - 2) / (4 - 1));
  return (
    <SceneFrame kicker="Example · Batteries" title="Tom’s flashlight: two good, two dead.">
      <p className={styles.lead}>
        Tom removed two dead batteries from a flashlight and accidentally mixed them with the two good replacements. The
        four batteries look identical. He now draws <strong>two</strong> at random to put back in the flashlight. What
        is P(both are good)?
      </p>
      <p className={styles.small}>Hypergeometric: N=4 batteries, r=2 good (“success”), n=2 drawn, x=2 good in the draw.</p>
      <Formula tex={tex`f(2) = \dfrac{\binom{2}{2}\binom{2}{0}}{\binom{4}{2}} = \dfrac{1}{6} \approx ${formatProb(hypergeometricPmf(4, 2, 2, 2), 3)}`}
      />
      <p className={styles.small}>
        <MathText text={tex`Only about a 17% chance both are good. Mean number of good batteries drawn: $\mu = n(r/N) = ${formatProb(mu, 2)}$. Variance $\approx ${formatProb(variance, 3)}$.`}
        />
      </p>
    </SceneFrame>
  );
}

function HyperApproxScene() {
  return (
    <SceneFrame kicker="Link to binomial" title="Large population ≈ binomial.">
      <p className={styles.lead}>
        <MathText text={tex`Let $p = r/N$ on the first draw. If the population $N$ is large relative to the sample size $n$, then removing a few items barely changes the success chance — hypergeometric behaves like binomial.`} />
      </p>
      <Formula tex={tex`\begin{aligned}
E(x) &\approx np \\
\mathrm{Var}(x) &\approx np(1-p)
\end{aligned}`}
      />
      <p className={styles.small}>
        <MathText text={tex`Then approximate with a binomial that has the same $n$ and $p = r/N$. (Tom’s $N=4$ is tiny — use the exact hypergeometric there.)`} />
      </p>
    </SceneFrame>
  );
}

function PromptsToTryScene() {
  const prompts = [
    {
      topic: "Simulate binomial",
      text: "Write Python to simulate Binomial(n=20, p=0.3) with 10,000 draws. Plot a histogram of x and overlay the theoretical PMF.",
    },
    {
      topic: "Broadway moments",
      text: "Using f(x) = [0.40, 0.25, 0.20, 0.05, 0.10] for x=0..4, compute E(x) and Var(x) in a notebook. Confirm σ = sqrt(Var).",
    },
    {
      topic: "Poisson ER",
      text: "Patients arrive at rate μ=6 per hour. In Python, compute P(X=k) for k=0..10 in a 30-minute window (μ=3). Which k is most likely?",
    },
    {
      topic: "Hypergeometric draw",
      text: "A box has 10 chips: 4 red, 6 blue. Draw 3 without replacement. Compute P(exactly 2 red) with the hypergeometric formula; check with itertools combinations.",
    },
  ];
  return (
    <SceneFrame kicker="Prompts to try" title="Practice discrete distributions with an AI coding assistant." tone="gold">
      <p className={styles.lead}>Use these prompts on your own machine. For graded work, follow the course AI policy.</p>
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
      <div className={styles.promptList}>
        {prompts.map((item) => (
          <article key={item.topic} className={styles.promptItem}>
            <strong>{item.topic.toUpperCase()}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </SceneFrame>
  );
}

function CloseScene() {
  return (
    <SceneFrame kicker="Takeaways" title="Discrete models organize chance for counts." tone="dark">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>01</p>
          <h2 className={styles.cardTitle}>Distribution</h2>
          <p className={styles.muted}>
            <MathText text={tex`$f(x)\ge 0$ and $\sum f(x)=1$. $F(x)=P(X\le x)$ jumps by $f(x)$.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>02</p>
          <h2 className={styles.cardTitle}>Moments</h2>
          <p className={styles.muted}>
            <MathText text={tex`$E(x)=\sum xf(x)$; $\mathrm{Var}(x)=\sum(x-\mu)^2f(x)$. Linearity of expectation always.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>03</p>
          <h2 className={styles.cardTitle}>Named families</h2>
          <p className={styles.muted}>Binomial (fixed n, constant p) · Poisson (rates) · Hypergeometric (without replacement).</p>
        </article>
      </div>
      <PrintOnly>
        <p className={styles.footerNote}>DOTE2011G · Discrete Probability Distributions · CUHK</p>
      </PrintOnly>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Welcome", label: "Cover", Scene: CoverScene },
  { id: "rv", chapter: "Random variables", label: "What is a random variable", Scene: RandomVariableScene },
  { id: "discrete-types", chapter: "Random variables", label: "Finite vs infinite", Scene: DiscreteTypesScene },
  { id: "classify", chapter: "Random variables", label: "Game · classify", Scene: ClassifyGame },
  { id: "dist-idea", chapter: "Distributions", label: "Probability distributions", Scene: DistIdeaScene },
  { id: "broadway-table", chapter: "Distributions", label: "Broadway table", Scene: BroadwayTableScene },
  { id: "broadway-graph", chapter: "Distributions", label: "Broadway graph", Scene: BroadwayGraphScene },
  { id: "cdf", chapter: "Distributions", label: "Distribution function", Scene: DistributionFunctionScene },
  { id: "uniform", chapter: "Distributions", label: "Discrete uniform", Scene: UniformScene },
  { id: "expectation", chapter: "Moments", label: "Expected value", Scene: ExpectationScene },
  { id: "expectation-props", chapter: "Moments", label: "Expectation properties", Scene: ExpectationPropertiesScene },
  { id: "variance", chapter: "Moments", label: "Variance & SD", Scene: VarianceScene },
  { id: "variance-props", chapter: "Moments", label: "Variance properties", Scene: VariancePropertiesScene },
  { id: "broadway-moments", chapter: "Moments", label: "Broadway E and Var", Scene: BroadwayMomentsScene },
  { id: "binom-props", chapter: "Binomial", label: "Binomial properties", Scene: BinomialPropsScene },
  { id: "binom-formula", chapter: "Binomial", label: "Binomial formula", Scene: BinomialFormulaScene },
  { id: "cafe", chapter: "Binomial", label: "Café de Coral", Scene: CafeCoralScene },
  { id: "binom-moments", chapter: "Binomial", label: "Binomial mean & Var", Scene: BinomialMomentsScene },
  { id: "binom-game", chapter: "Binomial", label: "Game · is it binomial", Scene: BinomialGame },
  { id: "poisson-intro", chapter: "Poisson", label: "Poisson idea", Scene: PoissonIntroScene },
  { id: "poisson-formula", chapter: "Poisson", label: "Poisson formula", Scene: PoissonFormulaScene },
  { id: "mercy", chapter: "Poisson", label: "Mercy Hospital", Scene: MercyScene },
  { id: "hyper-intro", chapter: "Hypergeometric", label: "Hypergeometric idea", Scene: HyperIntroScene },
  { id: "hyper-formula", chapter: "Hypergeometric", label: "Hypergeometric formula", Scene: HyperFormulaScene },
  { id: "batteries", chapter: "Hypergeometric", label: "Batteries example", Scene: BatteriesScene },
  { id: "hyper-approx", chapter: "Hypergeometric", label: "Large-N approximation", Scene: HyperApproxScene },
  { id: "prompts", chapter: "Practice", label: "Prompts to try", Scene: PromptsToTryScene },
  { id: "close", chapter: "Wrap-up", label: "Takeaways", Scene: CloseScene },
];
