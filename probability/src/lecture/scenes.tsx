import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  combinations,
  createRng,
  factorial,
  formatProb,
  listCombinations,
  listPermutations,
  permutations,
  shuffle,
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
  "Use ← → or the buttons above. Numbers in every example can be redrawn. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

/** DSME Investments — textbook sample points with subjective probabilities */
const DSME = [
  { id: "10_8", icbc: 10, mobile: 8, gain: 18, p: 0.2, i: true, c: true },
  { id: "10_-2", icbc: 10, mobile: -2, gain: 8, p: 0.08, i: true, c: false },
  { id: "5_8", icbc: 5, mobile: 8, gain: 13, p: 0.16, i: true, c: true },
  { id: "5_-2", icbc: 5, mobile: -2, gain: 3, p: 0.26, i: true, c: false },
  { id: "0_8", icbc: 0, mobile: 8, gain: 8, p: 0.1, i: false, c: true },
  { id: "0_-2", icbc: 0, mobile: -2, gain: -2, p: 0.12, i: false, c: false },
  { id: "-20_8", icbc: -20, mobile: 8, gain: -12, p: 0.02, i: false, c: true },
  { id: "-20_-2", icbc: -20, mobile: -2, gain: -22, p: 0.06, i: false, c: false },
] as const;

const P_I = DSME.filter((o) => o.i).reduce((s, o) => s + o.p, 0);
const P_C = DSME.filter((o) => o.c).reduce((s, o) => s + o.p, 0);
const P_I_AND_C = DSME.filter((o) => o.i && o.c).reduce((s, o) => s + o.p, 0);
const P_I_OR_C = DSME.filter((o) => o.i || o.c).reduce((s, o) => s + o.p, 0);

const LIBRARY_FREQ = [
  { books: 0, days: 4 },
  { books: 1, days: 6 },
  { books: 2, days: 18 },
  { books: 3, days: 10 },
  { books: 4, days: 2 },
];
const LIBRARY_N = LIBRARY_FREQ.reduce((s, r) => s + r.days, 0);

function SceneFrame({
  kicker,
  title,
  tone = "cream",
  children,
}: {
  kicker: string;
  title: ReactNode;
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

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id="cover">
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Probability</h1>
        <p className={styles.lead}>
          From experiments and counting rules to conditional probability and Bayes’ theorem — the language of chance.
        </p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function WhatIsProbScene() {
  return (
    <SceneFrame kicker="Start here" title="Probability measures how likely an event is.">
      <p className={styles.lead}>
        <MathText
          text={tex`A probability is always a number on the scale from $0$ to $1$. Near $0$ → very unlikely. Near $1$ → almost certain. Around $0.5$ → about as likely as not.`}
        />
      </p>
      <div className={styles.probScale} aria-hidden="true">
        <div className={styles.probScaleBar}>
          <span style={{ left: "0%" }}>0</span>
          <span style={{ left: "50%" }}>0.5</span>
          <span style={{ left: "100%" }}>1</span>
        </div>
        <div className={styles.probScaleLabels}>
          <span>Very unlikely</span>
          <span>Toss-up</span>
          <span>Almost certain</span>
        </div>
      </div>
      <p className={styles.note}>
        This lecture builds the toolkit you need before sampling distributions and inference later in the course.
      </p>
    </SceneFrame>
  );
}

function ExperimentScene() {
  const rows = [
    { experiment: "Toss a coin", outcomes: "Head, Tail" },
    { experiment: "Inspect a part", outcomes: "Defective, Non-defective" },
    { experiment: "Sales call", outcomes: "Purchase, No purchase" },
    { experiment: "Roll a die", outcomes: "1, 2, 3, 4, 5, 6" },
    { experiment: "Football game", outcomes: "Win, Lose, Tie" },
  ];
  return (
    <SceneFrame kicker="Sample space" title="An experiment generates well-defined outcomes.">
      <p className={styles.lead}>
        <MathText
          text={tex`In statistics an experiment is any process with well-defined outcomes. The sample space $S$ is the set of all outcomes (sample points). Repeat the same procedure and you may still get a different outcome — that is why we call them random experiments.`}
        />
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Experiment</th>
              <th>Sample space (outcomes)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.experiment}>
                <td>{row.experiment}</td>
                <td>{row.outcomes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SceneFrame>
  );
}

function DsmeSpaceScene() {
  return (
    <SceneFrame kicker="Running example" title="DSME Investment — two stocks, eight futures.">
      <p className={styles.lead}>
        DSME invested in <strong>ICBC</strong> and <strong>China Mobile</strong>. Three months from now, ICBC may gain
        10, 5, 0, or lose 20 (in $000); China Mobile may gain 8 or lose 2. Each pair (ICBC, Mobile) is one experimental
        outcome.
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>ICBC ($000)</th>
              <th>China Mobile ($000)</th>
              <th>Net gain/loss ($000)</th>
            </tr>
          </thead>
          <tbody>
            {DSME.map((o) => (
              <tr key={o.id}>
                <td>{o.icbc}</td>
                <td>{o.mobile}</td>
                <td>{o.gain > 0 ? `+${o.gain}` : o.gain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        <MathText text={tex`$8$ sample points $= 4$ ICBC results $\times 2$ China Mobile results. We will return to this example all lecture.`} />
      </p>
    </SceneFrame>
  );
}

const DSME_ICBC = ["10", "5", "0", "−20"] as const;

function CountingMultiScene() {
  // Left-to-right probability tree: Start → ICBC (4) → Mobile (2) → 8 leaves
  const x0 = 48;
  const x1 = 200;
  const x2 = 380;
  const x3 = 560;
  const leafGap = 28;
  // Centers spaced so sibling outcome boxes never overlap (box ≈ 24px tall)
  const icbcYs = [88, 188, 288, 388];
  const midY = (icbcYs[0] + icbcYs[3]) / 2;

  return (
    <SceneFrame kicker="Counting rules" title="Multiple-step experiments: multiply the choices.">
      <p className={styles.lead}>
        <MathText
          text={tex`If an experiment has $k$ steps with $n_1, n_2, \ldots, n_k$ possible results, the number of outcomes is $n_1 \times n_2 \times \cdots \times n_k$. A tree diagram shows the paths.`}
        />
      </p>
      <Formula tex={tex`n_1 \times n_2 = 4 \times 2 = 8 \text{ outcomes (DSME)}`} />
      <div className={styles.treeBox}>
        <p className={styles.kicker}>TREE · ICBC THEN CHINA MOBILE</p>
        <svg
          className={styles.treeSvg}
          viewBox="0 0 660 450"
          role="img"
          aria-label="Tree diagram: Start branches to four ICBC outcomes, each splitting into Mobile +8 and Mobile −2"
        >
          <text x={x0} y={18} textAnchor="middle" className={styles.treeColLabel}>
            Start
          </text>
          <text x={x1} y={18} textAnchor="middle" className={styles.treeColLabel}>
            Step 1 · ICBC
          </text>
          <text x={x2} y={18} textAnchor="middle" className={styles.treeColLabel}>
            Step 2 · Mobile
          </text>
          <text x={x3} y={18} textAnchor="middle" className={styles.treeColLabel}>
            Outcome
          </text>

          {/* Root */}
          <circle cx={x0} cy={midY} r={14} className={styles.treeNode} />
          <text x={x0} y={midY + 5} textAnchor="middle" className={styles.treeNodeText}>
            S
          </text>

          {DSME_ICBC.map((icbc, i) => {
            const y1 = icbcYs[i];
            const yUp = y1 - leafGap;
            const yDn = y1 + leafGap;
            const leafUp = `(${icbc}, 8)`;
            const leafDn = `(${icbc}, −2)`;
            return (
              <g key={icbc}>
                {/* Start → ICBC */}
                <line x1={x0 + 14} y1={midY} x2={x1 - 36} y2={y1} className={styles.treeEdge} />
                <rect x={x1 - 36} y={y1 - 14} width={72} height={28} rx={6} className={styles.treeBranch} />
                <text x={x1} y={y1 + 5} textAnchor="middle" className={styles.treeBranchText}>
                  {icbc}
                </text>

                {/* ICBC → Mobile +8 / −2 */}
                <line x1={x1 + 36} y1={y1} x2={x2 - 40} y2={yUp} className={styles.treeEdge} />
                <line x1={x1 + 36} y1={y1} x2={x2 - 40} y2={yDn} className={styles.treeEdge} />
                <rect x={x2 - 40} y={yUp - 12} width={80} height={24} rx={5} className={styles.treeLeaf} />
                <rect x={x2 - 40} y={yDn - 12} width={80} height={24} rx={5} className={styles.treeLeaf} />
                <text x={x2} y={yUp + 5} textAnchor="middle" className={styles.treeLeafText}>
                  +8
                </text>
                <text x={x2} y={yDn + 5} textAnchor="middle" className={styles.treeLeafText}>
                  −2
                </text>

                {/* Outcomes */}
                <line x1={x2 + 40} y1={yUp} x2={x3 - 52} y2={yUp} className={styles.treeEdge} />
                <line x1={x2 + 40} y1={yDn} x2={x3 - 52} y2={yDn} className={styles.treeEdge} />
                <rect x={x3 - 52} y={yUp - 12} width={104} height={24} rx={5} className={styles.treeOutcomeBox} />
                <rect x={x3 - 52} y={yDn - 12} width={104} height={24} rx={5} className={styles.treeOutcomeBox} />
                <text x={x3} y={yUp + 5} textAnchor="middle" className={styles.treeOutcome}>
                  {leafUp}
                </text>
                <text x={x3} y={yDn + 5} textAnchor="middle" className={styles.treeOutcome}>
                  {leafDn}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </SceneFrame>
  );
}

const POOL_LABELS = ["A", "B", "C", "D"] as const;

function CombinationsScene() {
  const print = usePrintMode();
  const [NLive, setNLive] = useState(3);
  const [nLive, setNLivePick] = useState(2);
  const N = print ? 3 : NLive;
  const n = print ? 2 : Math.min(Math.max(nLive, 1), N);
  const labels = useMemo(() => POOL_LABELS.slice(0, N), [N]);
  const groups = useMemo(() => {
    const combos = listCombinations(labels, n);
    return combos.map((combo) => ({
      combo,
      key: combo.join(""),
      perms: listPermutations(combo),
    }));
  }, [labels, n]);
  const cCount = groups.length;
  const pCount = groups.reduce((sum, g) => sum + g.perms.length, 0);
  const permsPerCombo = factorial(n);

  return (
    <SceneFrame kicker="Counting rules" title="Combinations ignore order. Permutations care about order.">
      <p className={styles.lead}>
        <MathText
          text={tex`Pool of $N$ letters; pick $n$. Each circle is one combination (same people). Inside the circle are the $n!$ different orders — those are the permutations.`}
        />
      </p>
      <p className={styles.note}>
        <MathText
          text={tex`Factorial: $n! = n \times (n-1) \times \cdots \times 1$ (multiply down to $1$). Example: $3! = 3 \times 2 \times 1 = 6$. By definition $0! = 1$.`}
        />
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            Pool size N
          </span>
          {[2, 3, 4].map((size) => (
            <button
              key={size}
              className={`${styles.toolBtn} ${N === size ? styles.toolBtnActive : ""}`}
              type="button"
              onClick={() => {
                setNLive(size);
                setNLivePick((take) => Math.min(take, size));
              }}
            >
              N = {size}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <span className={styles.small} style={{ alignSelf: "center" }}>
            Take n
          </span>
          {Array.from({ length: N }, (_, index) => index + 1).map((take) => (
            <button
              key={take}
              className={`${styles.toolBtn} ${n === take ? styles.toolBtnActive : ""}`}
              type="button"
              onClick={() => setNLivePick(take)}
            >
              n = {take}
            </button>
          ))}
        </div>
      </LiveOnly>
      <p className={styles.small} style={{ marginTop: 8 }}>
        Pool: {labels.join(", ")} &nbsp;·&nbsp; choosing {n}
      </p>
      <div className={styles.comboGrid}>
        {groups.map((group) => (
          <article key={group.key} className={styles.comboCircle}>
            <p className={styles.comboLabel}>
              <MathText text={tex`Combination $\{${group.combo.join(", ")}\}$`} />
            </p>
            <div className={styles.permChips}>
              {group.perms.map((perm) => (
                <span key={perm.join("")} className={styles.permChip}>
                  {perm.join(" → ")}
                </span>
              ))}
            </div>
            <p className={styles.comboFoot}>
              {group.perms.length} order{group.perms.length === 1 ? "" : "s"} (
              <InlineMath tex={tex`${n}!`} />)
            </p>
          </article>
        ))}
      </div>
      <p className={styles.note}>
        <MathText
          text={tex`$C(${N},${n}) = ${cCount}$ circles (unordered teams) · $P(${N},${n}) = ${pCount}$ ordered lists · $P = C \times n! = ${cCount} \times ${permsPerCombo}$`}
        />
      </p>
      <Formula tex={tex`C(N,n)=\dfrac{N!}{n!(N-n)!}\qquad P(N,n)=\dfrac{N!}{(N-n)!}`} />
      <PrintOnly>
        <p className={styles.small}>
          <MathText
            text={tex`Example $N=3$, $n=2$: combinations $\{A,B\}$, $\{A,C\}$, $\{B,C\}$; each has $2! = 2$ orders. $C(3,2)=3$, $P(3,2)=6$.`}
          />
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

/** Mark Six: 6 drawn numbers from 1–49 (order irrelevant). Unit stake HK$10. */
const MARK6_POOL = 49;
const MARK6_DRAW = 6;
const MARK6_UNIT = 10;

function MarkSixScene() {
  const print = usePrintMode();
  const [pickLive, setPickLive] = useState(7);
  const pick = print ? 7 : pickLive;
  const totalOutcomes = combinations(MARK6_POOL, MARK6_DRAW);
  const multiEntries = combinations(pick, MARK6_DRAW);
  const cost = multiEntries * MARK6_UNIT;
  const pFirst = 1 / totalOutcomes;
  const buyAllCost = totalOutcomes * MARK6_UNIT;
  /** Illustrative recent-scale first-division fund (HK$0.2 billion). */
  const jackpotExample = 200_000_000;
  const soleProfit = jackpotExample - buyAllCost;

  return (
    <SceneFrame kicker="HK example · Mark Six" title="Mark Six is combinations — order does not matter.">
      <p className={styles.lead}>
        <MathText
          text={tex`Hong Kong Mark Six draws $6$ numbers from $1$ to $49$. The winning set is unordered, so the sample space for the six Drawn Numbers is counted with combinations. (An Extra Number is also drawn for lower prizes; the first prize needs all six Drawn Numbers.)`}
        />
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>Q1 · HOW MANY DRAWS?</p>
          <p className={styles.muted}>Possible outcomes for the six Drawn Numbers</p>
          <p className={styles.cardTitle} style={{ fontSize: 28 }}>
            <InlineMath tex={tex`C(49,6)`} />
          </p>
          <p className={styles.muted}>
            <InlineMath tex={tex`= ${totalOutcomes.toLocaleString("en-US")}`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Q2 · FIRST PRIZE</p>
          <p className={styles.muted}>One single entry matches the six Drawn Numbers</p>
          <p className={styles.cardTitle} style={{ fontSize: 22 }}>
            <InlineMath tex={tex`P(\text{1st}) = \dfrac{1}{C(49,6)}`} />
          </p>
          <p className={styles.muted}>
            <MathText text={tex`$\approx ${pFirst.toExponential(2)}$ (about $1$ in $14$ million)`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>Q3 · WHY HK$70 FOR 7 NUMBERS?</p>
          <p className={styles.muted}>Unit stake is HK${MARK6_UNIT}. Buying 7 numbers is a Multiple entry.</p>
          <p className={styles.cardTitle} style={{ fontSize: 28 }}>
            <InlineMath tex={tex`C(7,6)=7`} />
          </p>
          <p className={styles.muted}>7 single tickets × HK${MARK6_UNIT} = HK$70</p>
        </article>
      </div>
      <Formula tex={tex`C(49,6)=\dfrac{49!}{6!(49-6)!}=${totalOutcomes.toLocaleString("en-US")}`} />
      <p className={styles.note}>
        <MathText
          text={tex`Why seven times as expensive? Choosing $7$ numbers creates every $6$-number ticket you can make from those $7$: $C(7,6)=7$ entries. So the price is $7$ times one single entry — not “one ticket that is luckier.”`}
        />
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>MULTIPLE ENTRY · PICK k NUMBERS</b>
          <input
            type="range"
            min={6}
            max={12}
            value={pickLive}
            onChange={(event) => setPickLive(Number(event.target.value))}
          />
          <span>{pickLive}</span>
        </div>
      </LiveOnly>
      <p className={styles.note}>
        <MathText
          text={tex`For $k = ${pick}$: number of entries $= C(${pick},6) = ${multiEntries.toLocaleString("en-US")}$.`}
        />{" "}
        Stake = {multiEntries.toLocaleString("en-US")} × HK${MARK6_UNIT} = HK${cost.toLocaleString("en-US")}.
      </p>
      <p className={styles.small}>
        <MathText text={tex`Check: $k=8$ → $C(8,6)=28$ →`} /> HK$280;{" "}
        <MathText text={tex`$k=10$ → $C(10,6)=210$ →`} /> HK$2,100 (same table the Jockey Club publishes).
      </p>
      <p className={styles.note} style={{ marginTop: 16 }}>
        <strong>Discussion · buy every combination?</strong> Cost of all{" "}
        <InlineMath tex={tex`C(49,6)`} /> tickets = {totalOutcomes.toLocaleString("en-US")} × HK${"$"}
        {MARK6_UNIT} ={" "}
        <strong>HK${"$"}{buyAllCost.toLocaleString("en-US")}</strong> (about HK$140 million). Suppose a first-division
        fund is about <strong>HK$0.2 billion</strong> (HK${"$"}
        {jackpotExample.toLocaleString("en-US")}). If you alone held the winning first-prize ticket, the simplified
        arithmetic is{" "}
        <InlineMath
          tex={tex`${jackpotExample.toLocaleString("en-US")} - ${buyAllCost.toLocaleString("en-US")} = ${soleProfit.toLocaleString("en-US")}`}
        />{" "}
        “left over.” But that is <em>not</em> a guaranteed profit: first prize is <strong>shared</strong> among all
        winning unit investments. If two people (or syndicates) hit the same six numbers, each gets about half the fund
        — and half of HK$0.2B is already below the ~HK$140M buy-all cost. Large jackpots also attract more players, so
        sharing becomes more likely. Treat this as counting + expected-value thinking, not a tip.
      </p>
    </SceneFrame>
  );
}

function HorseRacingScene() {
  const print = usePrintMode();
  const [fieldLive, setFieldLive] = useState(14);
  const n = print ? 14 : fieldLive;
  const forecast = permutations(n, 2);
  const quinella = combinations(n, 2);
  const tierce = permutations(n, 3);
  const trio = combinations(n, 3);
  const pWin = 1 / n;

  return (
    <SceneFrame kicker="HK example · horse racing" title="Same horses: order makes 二重彩 ≠ 連贏.">
      <p className={styles.lead}>
        <MathText
          text={tex`A race with $n$ runners. Assume every finishing order is equally likely (a teaching model — real odds are not equal). Hong Kong Jockey Club pools care whether order matters — students often know the Chinese names from the betting board.`}
        />
      </p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>FIELD SIZE n</b>
          <input
            type="range"
            min={8}
            max={14}
            value={fieldLive}
            onChange={(event) => setFieldLive(Number(event.target.value))}
          />
          <span>{fieldLive}</span>
        </div>
      </LiveOnly>
      <div className={styles.tableWrap} style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Pool</th>
              <th>What you must get right</th>
              <th>Count</th>
              <th>
                <MathText text={tex`$P(\text{one ticket wins})$`} />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Win
                <br />
                <span className={styles.muted}>獨贏</span>
              </td>
              <td>
                <MathText text={tex`Which horse finishes $1$st`} />
              </td>
              <td>
                <InlineMath tex={tex`${n}`} />
              </td>
              <td>
                <InlineMath tex={tex`1/${n} = ${formatProb(pWin)}`} />
              </td>
            </tr>
            <tr>
              <td>
                Place
                <br />
                <span className={styles.muted}>位置</span>
              </td>
              <td>
                <MathText text={tex`You pick one horse; it finishes in the top $3$ (usual rule for a larger field)`} />
              </td>
              <td>
                <MathText text={tex`$n$ horses · $3$ paying places`} />
              </td>
              <td>
                <InlineMath tex={tex`3/${n} = ${formatProb(3 / n)}`} />
              </td>
            </tr>
            <tr>
              <td>
                Forecast
                <br />
                <span className={styles.muted}>二重彩</span>
              </td>
              <td>
                <MathText text={tex`$1$st and $2$nd in the correct order`} />
              </td>
              <td>
                <InlineMath tex={tex`P(${n},2)=${forecast}`} />
              </td>
              <td>
                <InlineMath tex={tex`1/${forecast}`} />
              </td>
            </tr>
            <tr>
              <td>
                Quinella
                <br />
                <span className={styles.muted}>連贏</span>
              </td>
              <td>
                <MathText text={tex`$1$st and $2$nd in any order`} />
              </td>
              <td>
                <InlineMath tex={tex`C(${n},2)=${quinella}`} />
              </td>
              <td>
                <InlineMath tex={tex`1/${quinella}`} />
              </td>
            </tr>
            <tr>
              <td>
                Tierce
                <br />
                <span className={styles.muted}>三重彩</span>
              </td>
              <td>
                <MathText text={tex`$1$st–$2$nd–$3$rd in correct order`} />
              </td>
              <td>
                <InlineMath tex={tex`P(${n},3)=${tierce.toLocaleString("en-US")}`} />
              </td>
              <td>
                <InlineMath tex={tex`1/${tierce.toLocaleString("en-US")}`} />
              </td>
            </tr>
            <tr>
              <td>
                Trio
                <br />
                <span className={styles.muted}>單T</span>
              </td>
              <td>
                <MathText text={tex`$1$st–$2$nd–$3$rd in any order`} />
              </td>
              <td>
                <InlineMath tex={tex`C(${n},3)=${trio}`} />
              </td>
              <td>
                <InlineMath tex={tex`1/${trio}`} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Formula
        tex={tex`P(n,2)=n(n-1)=${n}\times${n - 1}=${forecast}\qquad C(n,2)=\dfrac{n(n-1)}{2}=${quinella}\qquad P(n,2)=2\cdot C(n,2)`}
      />
      <p className={styles.note}>
        <MathText
          text={tex`Questions: With $n=${n}$, how many 二重彩 (Forecast) tickets cover every ordered top-two? How many 連贏 (Quinella)? Why is Forecast twice Quinella? For 三重彩 vs 單T: $P(n,3)=3!\cdot C(n,3)$. Do not confuse 位置 with 單T: $C(n,3)$ counts which three horses fill the frame (Trio); 位置 is one horse in the top $3$, so $P=3/n$ under equal chance.`}
        />
      </p>
      <p className={styles.small}>
        <MathText
          text={tex`獨贏 (Win) is the simplest classical probability: pick one horse, $P(\text{win})=1/n$ under equal chance. Real racing odds are subjective / market-based — that is the next chapter’s idea.`}
        />
      </p>
    </SceneFrame>
  );
}

function CountingGame() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const bank = useMemo(
    () => [
      {
        id: "pin",
        q: tex`A PIN has $4$ digits; each digit $0$–$9$. How many PINs?`,
        choices: [
          { id: "a", label: tex`$10^4$`, ok: true },
          { id: "b", label: tex`$10 \times 4$`, ok: false },
          { id: "c", label: tex`$C(10,4)$`, ok: false },
          { id: "d", label: tex`$P(10,4)$`, ok: false },
        ],
        explain: tex`Multiply the steps: $10^4 = 10{,}000$. Order of digits matters and repeats are allowed, so not $C$ or $P$.`,
      },
      {
        id: "committee",
        q: tex`Choose $3$ committee members from $8$ people (order irrelevant).`,
        choices: [
          { id: "a", label: tex`$C(8,3)$`, ok: true },
          { id: "b", label: tex`$P(8,3)$`, ok: false },
          { id: "c", label: tex`$8 \times 3$`, ok: false },
          { id: "d", label: tex`$8^3$`, ok: false },
        ],
        explain: tex`Unordered team → combinations $C(8,3)=56$. $P(8,3)$ would count ordered lists.`,
      },
      {
        id: "medals",
        q: tex`Award gold, silver, bronze to $3$ of $10$ runners (order matters).`,
        choices: [
          { id: "a", label: tex`$P(10,3)$`, ok: true },
          { id: "b", label: tex`$C(10,3)$`, ok: false },
          { id: "c", label: tex`$10 \times 3$`, ok: false },
          { id: "d", label: tex`$3^{10}$`, ok: false },
        ],
        explain: tex`Medals are ordered → permutations $P(10,3)=10\times 9\times 8$.`,
      },
      {
        id: "lunch",
        q: tex`A lunch has $3$ mains, $2$ sides, and $4$ drinks. How many meals?`,
        choices: [
          { id: "a", label: tex`$3 \times 2 \times 4$`, ok: true },
          { id: "b", label: tex`$C(9,3)$`, ok: false },
          { id: "c", label: tex`$3+2+4$`, ok: false },
          { id: "d", label: tex`$P(9,3)$`, ok: false },
        ],
        explain: tex`Multiple-step experiment: multiply $3\times 2\times 4 = 24$.`,
      },
      {
        id: "marksix-space",
        q: tex`Mark Six: how many possible sets of $6$ Drawn Numbers from $1$–$49$?`,
        choices: [
          { id: "a", label: tex`$C(49,6)$`, ok: true },
          { id: "b", label: tex`$P(49,6)$`, ok: false },
          { id: "c", label: tex`$49^6$`, ok: false },
          { id: "d", label: tex`$49 \times 6$`, ok: false },
        ],
        explain: tex`The six Drawn Numbers are an unordered set → $C(49,6)$. $P(49,6)$ would treat draw order as mattering.`,
      },
      {
        id: "marksix-multi",
        q: tex`Mark Six Multiple: you pick $7$ numbers. How many single $6$-number entries is that?`,
        choices: [
          { id: "a", label: tex`$C(7,6)=7$`, ok: true },
          { id: "b", label: tex`$C(49,7)$`, ok: false },
          { id: "c", label: tex`$7\times 6$`, ok: false },
          { id: "d", label: tex`$P(7,6)$`, ok: false },
        ],
        explain: tex`Every way to drop one of the $7$ numbers: $C(7,6)=7$ unit tickets (HK\$70 at HK\$10 each).`,
      },
      {
        id: "forecast",
        q: tex`A race has $14$ horses. How many 二重彩 (Forecast) outcomes ($1$st and $2$nd in order)?`,
        choices: [
          { id: "a", label: tex`$P(14,2)$`, ok: true },
          { id: "b", label: tex`$C(14,2)$`, ok: false },
          { id: "c", label: tex`$14\times 2$`, ok: false },
          { id: "d", label: tex`$2^{14}$`, ok: false },
        ],
        explain: tex`Order matters → $P(14,2)=14\times 13$. $C(14,2)$ is 連贏 (Quinella).`,
      },
      {
        id: "quinella",
        q: tex`Same $14$-horse race. How many 連贏 (Quinella) outcomes ($1$st and $2$nd, any order)?`,
        choices: [
          { id: "a", label: tex`$C(14,2)$`, ok: true },
          { id: "b", label: tex`$P(14,2)$`, ok: false },
          { id: "c", label: tex`$14+2$`, ok: false },
          { id: "d", label: tex`$C(14,3)$`, ok: false },
        ],
        explain: tex`Any order → $C(14,2)=91$, half of Forecast.`,
      },
      {
        id: "tierce",
        q: tex`Same $14$-horse race. How many 三重彩 (Tierce) outcomes (top $3$ in exact order)?`,
        choices: [
          { id: "a", label: tex`$P(14,3)$`, ok: true },
          { id: "b", label: tex`$C(14,3)$`, ok: false },
          { id: "c", label: tex`$P(14,2)$`, ok: false },
          { id: "d", label: tex`$3/14$`, ok: false },
        ],
        explain: tex`Exact order of top three → $P(14,3)$. $C(14,3)$ is 單T (Trio); $3/14$ is 位置 (Place) for one horse.`,
      },
      {
        id: "place",
        q: tex`Same $14$-horse race. You buy 位置 (Place) on one horse (top $3$ pays). Under equal chance, what is $P(\text{win the Place bet})$?`,
        choices: [
          { id: "a", label: tex`$3/14$`, ok: true },
          { id: "b", label: tex`$C(14,3)$`, ok: false },
          { id: "c", label: tex`$1/14$`, ok: false },
          { id: "d", label: tex`$P(14,3)$`, ok: false },
        ],
        explain: tex`One horse in the top $3$ → $3/14$. $C(14,3)$ is 單T, not 位置.`,
      },
    ],
    [],
  );

  const current = useMemo(() => {
    const shuffledQs = shuffle([...bank], createRng(print ? 1 : seed + 3));
    const q = shuffledQs[0];
    const choices = shuffle([...q.choices], createRng(print ? 2 : seed + 11));
    return { ...q, choices };
  }, [bank, print, seed]);

  const correct = current.choices.find((c) => c.ok);

  return (
    <SceneFrame kicker="Game 1 · Counting" title="Which counting rule fits?" tone="gold">
      <p className={styles.lead}>
        <MathText text={current.q} />
      </p>
      <p className={styles.small}>Pick the matching expression — no calculator needed.</p>
      <div className={styles.choices}>
        {current.choices.map((item) => (
          <button
            key={item.id}
            className={`${styles.choice} ${
              picked === item.id ? (item.ok ? styles.choiceCorrect : styles.choiceWrong) : ""
            } ${print && item.ok ? styles.choiceCorrect : ""}`}
            type="button"
            onClick={() => {
              if (!print) setPicked(item.id);
            }}
          >
            <MathText text={item.label} />
          </button>
        ))}
      </div>
      <LiveOnly>
        <div className={styles.tools}>
          <button
            className={styles.ghost}
            type="button"
            onClick={() => {
              setSeed((s) => s + 1);
              setPicked(null);
            }}
          >
            NEW QUESTION
          </button>
        </div>
        {picked ? (
          <p className={styles.answer}>
            <MathText
              text={
                picked === correct?.id
                  ? tex`Correct — ${current.explain}`
                  : tex`Not quite. Hint: look for whether order matters. Answer: ${correct?.label ?? ""}. ${current.explain}`
              }
            />
          </p>
        ) : (
          <p className={styles.small}>Tap an answer.</p>
        )}
      </LiveOnly>
      <PrintOnly>
        <p className={styles.note}>
          <MathText text={tex`Answer: ${correct?.label ?? ""}. ${current.explain}`} />
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function AssignMethodsScene() {
  return (
    <SceneFrame kicker="Assigning probabilities" title="Three ways to put numbers on outcomes.">
      <p className={styles.lead}>
        <MathText
          text={tex`Whatever method you use, two rules always hold: each $P(E_i)$ is between $0$ and $1$, and the probabilities of all sample points sum to $1$.`}
        />
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>CLASSICAL</p>
          <p>
            <MathText text={tex`Equally likely outcomes → each gets $1/n$. Fair die: $P(\text{each face}) = 1/6$.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>RELATIVE FREQUENCY</p>
          <p>
            <MathText text={tex`From data: $P \approx \dfrac{\text{times outcome occurred}}{\text{trials}}$. Historical frequencies.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>SUBJECTIVE</p>
          <p>Judgment / degree of belief when history is thin or conditions change fast.</p>
        </article>
      </div>
      <Formula tex={tex`0 \le P(E_i) \le 1 \quad\text{and}\quad \sum P(E_i) = 1`} />
    </SceneFrame>
  );
}

function RelativeFreqScene() {
  return (
    <SceneFrame kicker="Relative frequency" title="William Mini-Library — books borrowed per day.">
      <p className={styles.lead}>
        <MathText
          text={tex`Over ${LIBRARY_N} days, William recorded how many books students borrowed. Relative frequency $= \dfrac{\text{days with that count}}{${LIBRARY_N}}$.`}
        />
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Books borrowed</th>
              <th>Days</th>
              <th>Probability</th>
            </tr>
          </thead>
          <tbody>
            {LIBRARY_FREQ.map((row) => (
              <tr key={row.books}>
                <td>{row.books}</td>
                <td>{row.days}</td>
                <td>{(row.days / LIBRARY_N).toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{LIBRARY_N}</strong>
              </td>
              <td>
                <strong>1.00</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.small}>
        <MathText text={tex`Example: $P(\text{exactly 2 books}) = 18/40 = 0.45$.`} />
      </p>
    </SceneFrame>
  );
}

function SubjectiveDsmeScene() {
  const sum = DSME.reduce((s, o) => s + o.p, 0);
  return (
    <SceneFrame kicker="Subjective method" title="An analyst assigns probabilities to DSME outcomes.">
      <p className={styles.lead}>
        Markets change fast — history alone may not be enough. An analyst combines judgment with available information.
        Check: do the eight probabilities sum to 1?
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Outcome (ICBC, Mobile)</th>
              <th>Net ($000)</th>
              <th>
                <InlineMath tex={tex`P`} />
              </th>
            </tr>
          </thead>
          <tbody>
            {DSME.map((o) => (
              <tr key={o.id}>
                <td>
                  ({o.icbc}, {o.mobile})
                </td>
                <td>{o.gain > 0 ? `+${o.gain}` : o.gain}</td>
                <td>{o.p.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        <MathText text={tex`$\sum P = ${sum.toFixed(2)}$`} />{" "}
        {Math.abs(sum - 1) < 1e-9 ? "✓ valid assignment" : "✗ must equal 1"}
      </p>
    </SceneFrame>
  );
}

function EventsScene() {
  const [show, setShow] = useState<"I" | "C" | "intersection" | "union" | "neither">("I");

  const activeFor = (o: (typeof DSME)[number]) => {
    if (show === "I") return o.i;
    if (show === "C") return o.c;
    if (show === "intersection") return o.i && o.c;
    if (show === "union") return o.i || o.c;
    return !o.i && !o.c;
  };

  const note =
    show === "I" ? (
      <MathText
        text={tex`$I$ = ICBC profitable (ICBC gain $> 0$). Four outcomes. $P(I) = ${formatProb(P_I)}$ ($= 0.20+0.08+0.16+0.26$).`}
      />
    ) : show === "C" ? (
      <MathText
        text={tex`$C$ = China Mobile profitable (Mobile $= +8$). Four outcomes. $P(C) = ${formatProb(P_C)}$ ($= 0.20+0.16+0.10+0.02$).`}
      />
    ) : show === "intersection" ? (
      <MathText
        text={tex`$I \cap C$ = both stocks profitable — only $(10, 8)$ and $(5, 8)$. $P(I \cap C) = ${formatProb(P_I_AND_C)}$.`}
      />
    ) : show === "union" ? (
      <MathText
        text={tex`$I \cup C$ = ICBC profitable or Mobile profitable or both (six outcomes). $P(I \cup C) = ${formatProb(P_I_OR_C)}$.`}
      />
    ) : (
      <MathText
        text={tex`Neither = not in $I$ and not in $C$: $(0, -2)$ and $(-20, -2)$. ICBC is not profitable ($0$ or loss) and Mobile loses $2$ — so these points miss both events.`}
      />
    );

  return (
    <SceneFrame kicker="Events" title="An event is a collection of sample points.">
      <p className={styles.lead}>
        <MathText
          text={tex`Each chip is one DSME outcome (ICBC, Mobile). An event is just a subset of these chips. $P(\text{event})$ = sum of the probabilities on the chips in the subset.`}
        />
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={`${styles.toolBtn} ${show === "I" ? styles.toolBtnActive : ""}`} type="button" onClick={() => setShow("I")}>
            I · ICBC PROFIT
          </button>
          <button className={`${styles.toolBtn} ${show === "C" ? styles.toolBtnActive : ""}`} type="button" onClick={() => setShow("C")}>
            C · MOBILE PROFIT
          </button>
          <button
            className={`${styles.toolBtn} ${show === "intersection" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setShow("intersection")}
          >
            I ∩ C · BOTH PROFIT
          </button>
          <button className={`${styles.toolBtn} ${show === "union" ? styles.toolBtnActive : ""}`} type="button" onClick={() => setShow("union")}>
            I ∪ C · AT LEAST ONE
          </button>
          <button
            className={`${styles.toolBtn} ${show === "neither" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setShow("neither")}
          >
            NEITHER
          </button>
        </div>
      </LiveOnly>
      <div className={styles.chips}>
        {DSME.map((o) => (
          <span key={o.id} className={`${styles.chip} ${activeFor(o) ? styles.chipActive : ""}`}>
            ({o.icbc},{o.mobile}) · {o.p.toFixed(2)}
          </span>
        ))}
      </div>
      <p className={styles.note}>{note}</p>
      <PrintOnly>
        <p className={styles.small}>
          <MathText
            text={tex`$I$ = ICBC profitable; $C$ = Mobile profitable; $I \cap C$ = both; $I \cup C$ = at least one. $(0,-2)$ and $(-20,-2)$ are in neither $I$ nor $C$.`}
          />
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

type VennMode = "complement" | "union" | "intersection";

function VennDiagram({ mode }: { mode: VennMode }) {
  // Sample space rectangle; circle A left, circle B right
  const titleText =
    mode === "complement"
      ? tex`$A^c$ — outside circle $A$ (inside the sample space)`
      : mode === "union"
        ? tex`$A \cup B$ — everything in $A$ or $B$ (or both)`
        : tex`$A \cap B$ — only the overlapping lens`;
  const ariaLabel =
    mode === "complement"
      ? "A complement — outside circle A"
      : mode === "union"
        ? "A union B"
        : "A intersection B";

  return (
    <figure className={styles.vennFigure}>
      <figcaption>
        <MathText text={titleText} />
      </figcaption>
      <svg viewBox="0 0 420 220" role="img" aria-label={ariaLabel} className={styles.vennSvg}>
        <defs>
          <clipPath id={`venn-a-${mode}`}>
            <circle cx="155" cy="110" r="72" />
          </clipPath>
          <clipPath id={`venn-b-${mode}`}>
            <circle cx="255" cy="110" r="72" />
          </clipPath>
          <clipPath id={`venn-s-${mode}`}>
            <rect x="28" y="28" width="364" height="164" rx="8" />
          </clipPath>
        </defs>

        {/* Sample space */}
        <rect x="28" y="28" width="364" height="164" rx="8" className={styles.vennSpace} />

        {mode === "complement" && (
          <>
            {/* Shade S, then punch out A with a white circle so only Aᶜ shows colour */}
            <rect
              x="28"
              y="28"
              width="364"
              height="164"
              rx="8"
              className={styles.vennHighlight}
              clipPath={`url(#venn-s-${mode})`}
            />
            <circle cx="155" cy="110" r="72" className={styles.vennPunch} />
            <text x="155" y="115" textAnchor="middle" className={styles.vennLabel}>
              A
            </text>
            <text x="320" y="55" textAnchor="middle" className={styles.vennAnnotate}>
              Aᶜ
            </text>
          </>
        )}

        {mode === "union" && (
          <>
            <circle cx="155" cy="110" r="72" className={styles.vennHighlight} />
            <circle cx="255" cy="110" r="72" className={styles.vennHighlight} />
            <text x="125" y="115" textAnchor="middle" className={styles.vennLabel}>
              A
            </text>
            <text x="285" y="115" textAnchor="middle" className={styles.vennLabel}>
              B
            </text>
          </>
        )}

        {mode === "intersection" && (
          <>
            <circle cx="155" cy="110" r="72" className={styles.vennOutline} />
            <circle cx="255" cy="110" r="72" className={styles.vennOutline} />
            {/* Overlap = B clipped to A */}
            <circle
              cx="255"
              cy="110"
              r="72"
              className={styles.vennHighlight}
              clipPath={`url(#venn-a-${mode})`}
            />
            <text x="120" y="115" textAnchor="middle" className={styles.vennLabel}>
              A
            </text>
            <text x="290" y="115" textAnchor="middle" className={styles.vennLabel}>
              B
            </text>
            <text x="205" y="115" textAnchor="middle" className={styles.vennAnnotateDark}>
              ∩
            </text>
          </>
        )}

        {/* Circle strokes on top for clarity */}
        {(mode === "complement" || mode === "union" || mode === "intersection") && (
          <>
            <circle cx="155" cy="110" r="72" className={styles.vennStroke} fill="none" />
            {mode !== "complement" && <circle cx="255" cy="110" r="72" className={styles.vennStroke} fill="none" />}
          </>
        )}

        <text x="48" y="48" className={styles.vennSpaceLabel}>
          S
        </text>
      </svg>
    </figure>
  );
}

function RelationsScene() {
  const print = usePrintMode();
  const [modeLive, setModeLive] = useState<VennMode>("union");
  const mode = print ? "union" : modeLive;

  return (
    <SceneFrame kicker="Relationships" title="Complement, union, and intersection.">
      <p className={styles.lead}>
        <MathText text={tex`Think of the rectangle as the sample space $S$. Circles are events. Shaded = the set we mean.`} />
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button
            className={`${styles.toolBtn} ${mode === "complement" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setModeLive("complement")}
          >
            COMPLEMENT
          </button>
          <button
            className={`${styles.toolBtn} ${mode === "union" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setModeLive("union")}
          >
            UNION
          </button>
          <button
            className={`${styles.toolBtn} ${mode === "intersection" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setModeLive("intersection")}
          >
            INTERSECTION
          </button>
        </div>
      </LiveOnly>

      <VennDiagram mode={mode} />

      {mode === "complement" && (
        <>
          <p className={styles.lead}>
            <MathText
              text={tex`$A^c$ = everything in $S$ that is outside circle $A$. Always: $P(A) + P(A^c) = 1$, so $P(A^c) = 1 - P(A)$.`}
            />
          </p>
          <Formula tex={tex`P(I^c) = 1 - P(I) = 1 - ${formatProb(P_I)} = ${formatProb(1 - P_I)}`} />
        </>
      )}
      {mode === "union" && (
        <>
          <p className={styles.lead}>
            <MathText
              text={tex`$A \cup B$ = the region covered by either circle (including the overlap). For DSME: $I \cup C$ = ICBC or Mobile (or both) profitable.`}
            />
          </p>
          <Formula tex={tex`P(I \cup C) = ${formatProb(P_I_OR_C)} \text{ (sum of six sample points)}`} />
        </>
      )}
      {mode === "intersection" && (
        <>
          <p className={styles.lead}>
            <MathText
              text={tex`$A \cap B$ = only the lens where the circles overlap. For DSME: $I \cap C$ = both stocks profitable → $(10, 8)$ and $(5, 8)$.`}
            />
          </p>
          <Formula tex={tex`P(I \cap C) = 0.20 + 0.16 = ${formatProb(P_I_AND_C)}`} />
        </>
      )}
      <PrintOnly>
        <div className={styles.vennPrintRow}>
          <VennDiagram mode="complement" />
          <VennDiagram mode="intersection" />
        </div>
        <p className={styles.note}>
          <MathText
            text={tex`Complement: outside $A$. Union: $A$ or $B$ (shaded above). Intersection: overlap only. DSME: $P(I)=${formatProb(P_I)}$, $P(C)=${formatProb(P_C)}$, $P(I \cap C)=${formatProb(P_I_AND_C)}$.`}
          />
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function AdditionLawScene() {
  const addition = P_I + P_C - P_I_AND_C;
  return (
    <SceneFrame
      kicker="Addition law"
      title={<MathText text={tex`$P(A \cup B) = P(A) + P(B) - P(A \cap B)$`} />}
    >
      <p className={styles.lead}>
        <MathText
          text={tex`Adding $P(A)$ and $P(B)$ double-counts the intersection. Subtract it once. If $A$ and $B$ are mutually exclusive (no points in common), $P(A \cap B) = 0$ and the formula simplifies to $P(A) + P(B)$.`}
        />
      </p>
      <Formula
        tex={tex`P(I \cup C) = ${formatProb(P_I)} + ${formatProb(P_C)} - ${formatProb(P_I_AND_C)} = ${formatProb(addition)}`}
      />
      <p className={styles.note}>
        <MathText text={tex`Matches the direct sum of sample points in $I \cup C$. Always a useful check.`} />
      </p>
      <div className={styles.splitWide} style={{ marginTop: 16 }}>
        <article className={styles.card}>
          <p className={styles.kicker}>MUTUALLY EXCLUSIVE</p>
          <p>No shared sample points. Knowing one occurred makes the other impossible → dependent, not independent.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>NOT MUTUALLY EXCLUSIVE</p>
          <p>
            <MathText text={tex`$I$ and $C$ can both happen (both stocks profitable). Use the full addition law.`} />
          </p>
        </article>
      </div>
    </SceneFrame>
  );
}

type SetLawMode = "distributive" | "demorgan";

function DeMorganVenn({ form }: { form: "union" | "intersect" }) {
  const titleText =
    form === "union"
      ? tex`$(A \cup B)^c = A^c \cap B^c$ — outside both circles`
      : tex`$(A \cap B)^c = A^c \cup B^c$ — everything except the overlap`;
  const ariaLabel = form === "union" ? "De Morgan: complement of union" : "De Morgan: complement of intersection";

  return (
    <figure className={styles.vennFigure}>
      <figcaption>
        <MathText text={titleText} />
      </figcaption>
      <svg viewBox="0 0 420 220" role="img" aria-label={ariaLabel} className={styles.vennSvg}>
        <defs>
          <clipPath id={`dm-a-${form}`}>
            <circle cx="155" cy="110" r="72" />
          </clipPath>
          <clipPath id={`dm-b-${form}`}>
            <circle cx="255" cy="110" r="72" />
          </clipPath>
          <clipPath id={`dm-s-${form}`}>
            <rect x="28" y="28" width="364" height="164" rx="8" />
          </clipPath>
        </defs>
        <rect x="28" y="28" width="364" height="164" rx="8" className={styles.vennSpace} />
        {form === "union" ? (
          <>
            {/* Shade S, then punch out A∪B */}
            <rect x="28" y="28" width="364" height="164" rx="8" className={styles.vennHighlight} />
            <circle cx="155" cy="110" r="72" className={styles.vennPunch} />
            <circle cx="255" cy="110" r="72" className={styles.vennPunch} />
          </>
        ) : (
          <>
            {/* Everything except intersection: shade S, punch only the lens */}
            <rect x="28" y="28" width="364" height="164" rx="8" className={styles.vennHighlight} />
            <circle cx="255" cy="110" r="72" className={styles.vennPunch} clipPath={`url(#dm-a-${form})`} />
          </>
        )}
        <circle cx="155" cy="110" r="72" className={styles.vennStroke} fill="none" />
        <circle cx="255" cy="110" r="72" className={styles.vennStroke} fill="none" />
        <text x="125" y="115" textAnchor="middle" className={styles.vennLabel}>
          A
        </text>
        <text x="285" y="115" textAnchor="middle" className={styles.vennLabel}>
          B
        </text>
        <text x="48" y="48" className={styles.vennSpaceLabel}>
          S
        </text>
      </svg>
    </figure>
  );
}

function SetLawsScene() {
  const print = usePrintMode();
  const [modeLive, setModeLive] = useState<SetLawMode>("demorgan");
  const [dmFormLive, setDmFormLive] = useState<"union" | "intersect">("union");
  const mode = print ? "demorgan" : modeLive;
  const dmForm = print ? "union" : dmFormLive;

  // De Morgan check with DSME: (I ∪ C)^c = neither = I^c ∩ C^c
  const neither = DSME.filter((o) => !o.i && !o.c);
  const neitherP = neither.reduce((s, o) => s + o.p, 0);

  return (
    <SceneFrame kicker="More set rules" title="Distributive law and De Morgan’s laws.">
      <p className={styles.lead}>
        These identities let you rewrite complicated events before you compute probabilities.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button
            className={`${styles.toolBtn} ${mode === "distributive" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setModeLive("distributive")}
          >
            DISTRIBUTIVE LAW
          </button>
          <button
            className={`${styles.toolBtn} ${mode === "demorgan" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setModeLive("demorgan")}
          >
            DE MORGAN’S LAWS
          </button>
        </div>
      </LiveOnly>

      {mode === "distributive" && (
        <>
          <p className={styles.lead}>
            <MathText
              text={tex`Union and intersection distribute over each other — the same idea as $a(b+c) = ab+ac$ in algebra, with $\cup$ like “$+$” and $\cap$ like “$\times$” (or the other way around).`}
            />
          </p>
          <div className={styles.splitWide}>
            <article className={styles.card}>
              <p className={styles.kicker}>∪ OVER ∩</p>
              <Formula tex={tex`A \cup (B \cap C) = (A \cup B) \cap (A \cup C)`} />
              <p className={styles.muted}>“A or (B and C)” = “(A or B) and (A or C)”.</p>
            </article>
            <article className={styles.card}>
              <p className={styles.kicker}>∩ OVER ∪</p>
              <Formula tex={tex`A \cap (B \cup C) = (A \cap B) \cup (A \cap C)`} />
              <p className={styles.muted}>“A and (B or C)” = “(A and B) or (A and C)”.</p>
            </article>
          </div>
          <p className={styles.note}>
            Use these when an event is written with nested “and/or.” Expand or factor before summing sample-point
            probabilities.
          </p>
        </>
      )}

      {mode === "demorgan" && (
        <>
          <p className={styles.lead}>
            De Morgan’s laws say: <strong>negate and flip the connectives</strong> — complement of a union is the
            intersection of complements, and vice versa.
          </p>
          <LiveOnly>
            <div className={styles.tools}>
              <button
                className={`${styles.toolBtn} ${dmForm === "union" ? styles.toolBtnActive : ""}`}
                type="button"
                onClick={() => setDmFormLive("union")}
              >
                (A ∪ B)ᶜ
              </button>
              <button
                className={`${styles.toolBtn} ${dmForm === "intersect" ? styles.toolBtnActive : ""}`}
                type="button"
                onClick={() => setDmFormLive("intersect")}
              >
                (A ∩ B)ᶜ
              </button>
            </div>
          </LiveOnly>
          <DeMorganVenn form={dmForm} />
          <Formula
            tex={
              dmForm === "union"
                ? tex`(A \cup B)^c = A^c \cap B^c`
                : tex`(A \cap B)^c = A^c \cup B^c`
            }
          />
          <p className={styles.note}>
            <MathText
              text={tex`DSME check: $(I \cup C)^c$ = “neither stock profitable” = ${neither.map((o) => `(${o.icbc},${o.mobile})`).join(", ")} $= I^c \cap C^c$. Probability $= ${formatProb(neitherP)} = 1 - P(I \cup C)$.`}
            />
          </p>
        </>
      )}

      <PrintOnly>
        <Formula
          tex={tex`\begin{aligned}
A \cup (B \cap C) &= (A \cup B) \cap (A \cup C) \\
A \cap (B \cup C) &= (A \cap B) \cup (A \cap C) \\
(A \cup B)^c &= A^c \cap B^c \\
(A \cap B)^c &= A^c \cup B^c
\end{aligned}`}
        />
      </PrintOnly>
    </SceneFrame>
  );
}

function ConditionalScene() {
  const pGiven = P_I_AND_C / P_I;
  return (
    <SceneFrame
      kicker="Conditional probability"
      title={<MathText text={tex`$P(A \mid B)$ — probability of $A$ given that $B$ occurred`} />}
    >
      <p className={styles.lead}>
        <MathText
          text={tex`Conditioning restricts the sample space to $B$. The formula uses the intersection over the probability of the given event.`}
        />
      </p>
      <Formula tex={tex`P(A \mid B) = \dfrac{P(A \cap B)}{P(B)}`} />
      <p className={styles.note}>
        <MathText
          text={tex`China Mobile profitable given ICBC profitable: $P(C \mid I) = \dfrac{P(I \cap C)}{P(I)} = \dfrac{${formatProb(P_I_AND_C)}}{${formatProb(P_I)}} = ${formatProb(pGiven)}$.`}
        />
      </p>
      <p className={styles.small}>About 51% chance Mobile is profitable if we already know ICBC is profitable.</p>
    </SceneFrame>
  );
}

function JointTableScene() {
  const joint = {
    i_c: P_I_AND_C,
    i_not: P_I - P_I_AND_C,
    not_c: P_C - P_I_AND_C,
    not_not: 1 - P_I - P_C + P_I_AND_C,
  };
  return (
    <SceneFrame kicker="Joint probability table" title="Body = joints. Margins = totals.">
      <p className={styles.lead}>
        <MathText
          text={tex`Joint probabilities sit inside the table. Marginal probabilities are the row and column totals. Multiplication law: $P(A \cap B) = P(B) \times P(A \mid B)$.`}
        />
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th />
              <th>
                <MathText text={tex`$C$ (Mobile profit)`} />
              </th>
              <th>
                <InlineMath tex={tex`C^c`} />
              </th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>
                  <MathText text={tex`$I$ (ICBC profit)`} />
                </strong>
              </td>
              <td>{formatProb(joint.i_c)}</td>
              <td>{formatProb(joint.i_not)}</td>
              <td>{formatProb(P_I)}</td>
            </tr>
            <tr>
              <td>
                <strong>
                  <InlineMath tex={tex`I^c`} />
                </strong>
              </td>
              <td>{formatProb(joint.not_c)}</td>
              <td>{formatProb(joint.not_not)}</td>
              <td>{formatProb(1 - P_I)}</td>
            </tr>
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>{formatProb(P_C)}</td>
              <td>{formatProb(1 - P_C)}</td>
              <td>1.00</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Formula
        tex={tex`P(I \cap C) = P(I) \times P(C \mid I) = ${formatProb(P_I)} \times ${formatProb(P_I_AND_C / P_I)} = ${formatProb(P_I_AND_C)}`}
      />
    </SceneFrame>
  );
}

function IndependenceScene() {
  const product = P_I * P_C;
  const independent = Math.abs(product - P_I_AND_C) < 1e-9;
  return (
    <SceneFrame kicker="Independence" title="Independent ≠ mutually exclusive.">
      <p className={styles.lead}>
        <MathText
          text={tex`$A$ and $B$ are independent if $P(A \mid B) = P(A)$ (knowing $B$ does not change $P(A)$). Equivalent test: $P(A \cap B) = P(A) \times P(B)$.`}
        />
      </p>
      <Formula
        tex={tex`\begin{aligned}
P(I) \times P(C) &= ${formatProb(P_I)} \times ${formatProb(P_C)} = ${formatProb(product)} \\
P(I \cap C) &= ${formatProb(P_I_AND_C)} ${independent ? "=" : "\\ne"} P(I)P(C) \Rightarrow ${independent ? "I,C \\text{ independent}" : "I,C \\text{ not independent}"}
\end{aligned}`}
      />
      <div className={styles.splitWide}>
        <article className={styles.card}>
          <p className={styles.kicker}>MUTUALLY EXCLUSIVE</p>
          <p>
            <MathText text={tex`Cannot both occur. If $P(A), P(B) > 0$, they cannot be independent.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>INDEPENDENT</p>
          <p>Information about one does not change the probability of the other.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function BayesStoryScene() {
  return (
    <SceneFrame kicker="Bayes’ theorem" title="Update beliefs when new information arrives." tone="dark">
      <p className={styles.lead}>
        <MathText
          text={tex`Dennis Fashion faces a proposed shopping centre. Let $A_1$ = town council approves the zoning change, $A_2$ = does not approve. Prior: $P(A_1) = 0.70$, $P(A_2) = 0.30$.`}
        />
      </p>
      <p className={styles.lead}>
        <MathText
          text={tex`New information: planning board recommends against the change (event $B$). History suggests $P(B \mid A_1) = 0.20$ and $P(B \mid A_2) = 0.90$. Bayes revises the priors into posterior probabilities.`}
        />
      </p>
      <p className={styles.darkNote}>
        Prior → new data → posterior. Same logic as medical tests, spam filters, and credit scoring.
      </p>
    </SceneFrame>
  );
}

function BayesComputeScene() {
  const print = usePrintMode();
  const [revealed, setRevealed] = useState(print);
  const prior1 = 0.7;
  const prior2 = 0.3;
  const lik1 = 0.2;
  const lik2 = 0.9;
  const joint1 = prior1 * lik1;
  const joint2 = prior2 * lik2;
  const pB = joint1 + joint2;
  const post1 = joint1 / pB;
  const post2 = joint2 / pB;

  return (
    <SceneFrame kicker="Bayes’ theorem" title="Tabular approach — Dennis Fashion." tone="white">
      <p className={styles.lead}>
        <MathText
          text={tex`Columns: events → prior → $P(B \mid A_i)$ → joint $P(A_i \cap B)$ → posterior $P(A_i \mid B)$.`}
        />
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>
                <MathText text={tex`Prior $P(A_i)$`} />
              </th>
              <th>
                <InlineMath tex={tex`P(B \mid A_i)`} />
              </th>
              <th>Joint</th>
              <th>
                <MathText text={tex`Posterior $P(A_i \mid B)$`} />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <MathText text={tex`$A_1$ approve`} />
              </td>
              <td>{prior1.toFixed(2)}</td>
              <td>{lik1.toFixed(2)}</td>
              <td>{revealed ? joint1.toFixed(2) : "—"}</td>
              <td>{revealed ? post1.toFixed(2) : "—"}</td>
            </tr>
            <tr>
              <td>
                <MathText text={tex`$A_2$ reject`} />
              </td>
              <td>{prior2.toFixed(2)}</td>
              <td>{lik2.toFixed(2)}</td>
              <td>{revealed ? joint2.toFixed(2) : "—"}</td>
              <td>{revealed ? post2.toFixed(2) : "—"}</td>
            </tr>
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>1.00</td>
              <td />
              <td>
                {revealed ? (
                  <MathText text={tex`$P(B)=${pB.toFixed(2)}$`} />
                ) : (
                  "—"
                )}
              </td>
              <td>{revealed ? "1.00" : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setRevealed(true)}>
            COMPUTE POSTERIORS
          </button>
        </div>
      </LiveOnly>
      {revealed ? (
        <p className={styles.answer}>
          <MathText
            text={tex`Posterior $P(A_1 \mid B) \approx ${post1.toFixed(2)}$ — down from prior $0.70$. Bad news for the shopping centre; good news for Dennis Fashion.`}
          />
        </p>
      ) : (
        <p className={styles.small}>
          <MathText text={tex`Joint $= \text{prior} \times \text{likelihood}$. Posterior $= \text{joint} / P(B)$. Tap to fill the table.`} />
        </p>
      )}
      <Formula tex={tex`P(A_i \mid B) = \dfrac{P(B \mid A_i)\, P(A_i)}{\sum_j P(B \mid A_j)\, P(A_j)}`} />
    </SceneFrame>
  );
}

function BayesGame() {
  const print = usePrintMode();
  const [choice, setChoice] = useState<string | null>(print ? "down" : null);
  return (
    <SceneFrame
      kicker="Game 2 · Bayes"
      title={<MathText text={tex`What did the board’s “no” do to $P(\text{approve})$?`} />}
      tone="gold"
    >
      <p className={styles.lead}>
        <MathText
          text={tex`Prior $P(\text{approve}) = 0.70$. After a negative planning-board recommendation, the posterior is about $0.34$. What happened?`}
        />
      </p>
      <div className={styles.choices}>
        {[
          { id: "up", label: "Belief that council will approve went up", ok: false },
          { id: "down", label: "Belief that council will approve went down", ok: true },
          { id: "same", label: "Belief did not change — priors never update", ok: false },
          { id: "zero", label: "Approval became impossible (probability 0)", ok: false },
        ].map((item) => (
          <button
            key={item.id}
            className={`${styles.choice} ${choice === item.id ? (item.ok ? styles.choiceCorrect : styles.choiceWrong) : ""}`}
            type="button"
            onClick={() => setChoice(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {choice ? (
        <p className={styles.answer}>
          {choice === "down" ? (
            <MathText text={tex`Correct — Bayes updated $0.70 \to \approx 0.34$. New information revised the prior downward.`} />
          ) : (
            <MathText
              text={tex`The negative recommendation lowered $P(\\text{approve})$. Bayes does not force probability to $0$ unless the data make the event impossible.`}
            />
          )}
        </p>
      ) : (
        <p className={styles.small}>Tap an answer.</p>
      )}
    </SceneFrame>
  );
}

function PromptsToTryScene() {
  const prompts = [
    {
      topic: "Simulate a die",
      text: tex`Write Python to simulate rolling a fair six-sided die 10,000 times. Plot a bar chart of relative frequencies. Do they approach $1/6$?`,
    },
    {
      topic: "Combinations",
      text: tex`Compute $C(20, 3)$ and $P(20, 3)$ with math.comb / math.perm. Explain in one sentence when each applies.`,
    },
    {
      topic: "Mark Six",
      text: tex`Mark Six draws $6$ numbers from $1$–$49$. Compute $C(49,6)$ and $P(\text{1st prize})$ for one single entry. Explain why picking $7$ numbers costs $7\times$HK\$10 $=$ HK\$70.`,
    },
    {
      topic: "Horse racing",
      text: tex`A race has $14$ horses (equal chance). Compute $P(14,2)$, $C(14,2)$, $P(14,3)$, $C(14,3)$. Map them to Forecast, Quinella, Tierce, Trio. Why is Forecast twice Quinella?`,
    },
    {
      topic: "Joint table",
      text: tex`DSME joint table ($I$ = ICBC profitable, $C$ = Mobile profitable): $P(I \cap C)=0.36$, $P(I \cap C^c)=0.34$, $P(I^c \cap C)=0.12$, $P(I^c \cap C^c)=0.18$. In a notebook, compute $P(C \mid I)$ and $P(I \mid C)$. Confirm each with $P(A \cap B)/P(B)$.`,
    },
    {
      topic: "Bayes medical test",
      text: tex`Disease prevalence $1\%$. Test sensitivity $99\%$, false positive rate $5\%$. Given a positive test, what is $P(\text{disease} \mid \text{positive})$? Show the Bayes table.`,
    },
  ];
  return (
    <SceneFrame kicker="Prompts to try" title="Practice probability with an AI coding assistant." tone="gold">
      <p className={styles.lead}>
        Use these prompts on your own machine. For graded work, follow the course AI policy.
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
      <div className={styles.promptList}>
        {prompts.map((item) => (
          <article key={item.topic} className={styles.promptItem}>
            <strong>{item.topic.toUpperCase()}</strong>
            <p>
              <MathText text={item.text} />
            </p>
          </article>
        ))}
      </div>
    </SceneFrame>
  );
}

function CloseScene() {
  return (
    <SceneFrame kicker="Take into the next topics" title="Count → assign → update.">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>01</p>
          <h2 className={styles.cardTitle}>Sample space</h2>
          <p className={styles.muted}>
            <MathText text={tex`List outcomes; count with trees, $C(N,n)$, $P(N,n)$ — Mark Six and horse racing are local examples.`} />
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>02</p>
          <h2 className={styles.cardTitle}>Events & laws</h2>
          <p className={styles.muted}>Unions, intersections, addition, conditioning.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>03</p>
          <h2 className={styles.cardTitle}>Bayes</h2>
          <p className={styles.muted}>Priors meet new data → posteriors.</p>
        </article>
      </div>
      <PrintOnly>
        <p className={styles.footerNote}>DOTE2011G · Probability · CUHK</p>
      </PrintOnly>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Welcome", label: "Cover", Scene: CoverScene },
  { id: "what", chapter: "Basics", label: "What is probability", Scene: WhatIsProbScene },
  { id: "experiment", chapter: "Basics", label: "Experiments & sample space", Scene: ExperimentScene },
  { id: "dsme", chapter: "Basics", label: "DSME sample space", Scene: DsmeSpaceScene },
  { id: "multi", chapter: "Counting", label: "Multiple-step counting", Scene: CountingMultiScene },
  { id: "combo", chapter: "Counting", label: "Combinations & permutations", Scene: CombinationsScene },
  { id: "marksix", chapter: "Counting", label: "Mark Six", Scene: MarkSixScene },
  { id: "racing", chapter: "Counting", label: "Horse racing", Scene: HorseRacingScene },
  { id: "count-game", chapter: "Counting", label: "Game · counting", Scene: CountingGame },
  { id: "methods", chapter: "Assigning", label: "Three methods", Scene: AssignMethodsScene },
  { id: "relative", chapter: "Assigning", label: "Relative frequency", Scene: RelativeFreqScene },
  { id: "subjective", chapter: "Assigning", label: "Subjective · DSME", Scene: SubjectiveDsmeScene },
  { id: "events", chapter: "Events", label: "Events as sets", Scene: EventsScene },
  { id: "relations", chapter: "Events", label: "Complement · union · ∩", Scene: RelationsScene },
  { id: "addition", chapter: "Events", label: "Addition law", Scene: AdditionLawScene },
  { id: "set-laws", chapter: "Events", label: "Distributive · De Morgan", Scene: SetLawsScene },
  { id: "conditional", chapter: "Conditioning", label: "Conditional probability", Scene: ConditionalScene },
  { id: "joint", chapter: "Conditioning", label: "Joint probability table", Scene: JointTableScene },
  { id: "independent", chapter: "Conditioning", label: "Independence", Scene: IndependenceScene },
  { id: "bayes-story", chapter: "Bayes", label: "Bayes story", Scene: BayesStoryScene },
  { id: "bayes-table", chapter: "Bayes", label: "Bayes table", Scene: BayesComputeScene },
  { id: "bayes-game", chapter: "Bayes", label: "Game · Bayes", Scene: BayesGame },
  { id: "prompts", chapter: "Practice", label: "Prompts to try", Scene: PromptsToTryScene },
  { id: "close", chapter: "Wrap-up", label: "Takeaways", Scene: CloseScene },
];
