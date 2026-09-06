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
        A probability is always a number on the scale from <strong>0</strong> to <strong>1</strong>. Near 0 → very unlikely.
        Near 1 → almost certain. Around 0.5 → about as likely as not.
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
        In statistics an <strong>experiment</strong> is any process with well-defined outcomes. The{" "}
        <strong>sample space</strong> S is the set of all outcomes (sample points). Repeat the same procedure and you may
        still get a different outcome — that is why we call them random experiments.
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
      <p className={styles.small}>8 sample points = 4 ICBC results × 2 China Mobile results. We will return to this example all lecture.</p>
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
        If an experiment has <strong>k</strong> steps with n₁, n₂, …, nₖ possible results, the number of outcomes is{" "}
        <strong>n₁ × n₂ × … × nₖ</strong>. A <strong>tree diagram</strong> shows the paths.
      </p>
      <p className={styles.formula}>n₁ × n₂ = 4 × 2 = 8 outcomes (DSME)</p>
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
        Pool of <strong>N</strong> letters; pick <strong>n</strong>. Each <em>circle</em> is one combination (same people).
        Inside the circle are the <strong>n!</strong> different orders — those are the permutations.
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
              Combination {"{"}
              {group.combo.join(", ")}
              {"}"}
            </p>
            <div className={styles.permChips}>
              {group.perms.map((perm) => (
                <span key={perm.join("")} className={styles.permChip}>
                  {perm.join(" → ")}
                </span>
              ))}
            </div>
            <p className={styles.comboFoot}>{group.perms.length} order{group.perms.length === 1 ? "" : "s"} (= {n}!)</p>
          </article>
        ))}
      </div>
      <p className={styles.note}>
        <strong>C({N}, {n}) = {cCount}</strong> circles (unordered teams)
        &nbsp;·&nbsp;
        <strong>P({N}, {n}) = {pCount}</strong> ordered lists
        &nbsp;·&nbsp;
        P = C × n! = {cCount} × {permsPerCombo}
      </p>
      <p className={styles.formula} style={{ fontSize: 15 }}>
        C(N, n) = N! / [n!(N − n)!] &nbsp;&nbsp;|&nbsp;&nbsp; P(N, n) = N! / (N − n)!
      </p>
      <PrintOnly>
        <p className={styles.small}>
          Example N=3, n=2: combinations {"{A,B}"}, {"{A,C}"}, {"{B,C}"}; each has 2! = 2 orders. C(3,2)=3, P(3,2)=6.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function CountingGame() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const items = useMemo(
    () =>
      shuffle(
        [
          { q: "A PIN has 4 digits; each digit 0–9. How many PINs?", a: 10 ** 4, hint: "10 × 10 × 10 × 10" },
          { q: "Choose 3 committee members from 8 people (order irrelevant).", a: combinations(8, 3), hint: "C(8,3)" },
          { q: "Award gold, silver, bronze to 3 of 10 runners (order matters).", a: permutations(10, 3), hint: "P(10,3)" },
          { q: "A lunch has 3 mains × 2 sides × 4 drinks. How many meals?", a: 3 * 2 * 4, hint: "Multiply steps" },
        ],
        createRng(print ? 1 : seed + 3),
      ),
    [print, seed],
  );
  const current = items[0];

  const check = () => {
    const value = Number(guess);
    if (!Number.isFinite(value)) {
      setFeedback("Enter a number.");
      return;
    }
    setFeedback(value === current.a ? `Correct — ${current.hint}.` : `Not quite. Hint: ${current.hint}. Answer = ${current.a}.`);
  };

  return (
    <SceneFrame kicker="Game 1 · Counting" title="Which counting rule fits?" tone="gold">
      <p className={styles.lead}>{current.q}</p>
      <LiveOnly>
        <div className={styles.tools}>
          <input
            className={styles.numberInput}
            style={{ width: 120 }}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="answer"
          />
          <button className={styles.toolBtn} type="button" onClick={check}>
            CHECK
          </button>
          <button
            className={styles.ghost}
            type="button"
            onClick={() => {
              setSeed((s) => s + 1);
              setGuess("");
              setFeedback("");
            }}
          >
            NEW QUESTION
          </button>
        </div>
        {feedback ? <p className={styles.answer}>{feedback}</p> : null}
      </LiveOnly>
      <PrintOnly>
        <p className={styles.note}>
          Answer: {current.a} ({current.hint}). Practice more questions on the interactive site.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function AssignMethodsScene() {
  return (
    <SceneFrame kicker="Assigning probabilities" title="Three ways to put numbers on outcomes.">
      <p className={styles.lead}>
        Whatever method you use, two rules always hold: each P(Eᵢ) is between 0 and 1, and the probabilities of all
        sample points sum to 1.
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>CLASSICAL</p>
          <p>Equally likely outcomes → each gets 1/n. Fair die: P(each face) = 1/6.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>RELATIVE FREQUENCY</p>
          <p>From data: P ≈ (times outcome occurred) / (trials). Historical frequencies.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>SUBJECTIVE</p>
          <p>Judgment / degree of belief when history is thin or conditions change fast.</p>
        </article>
      </div>
      <p className={styles.formula}>0 ≤ P(Eᵢ) ≤ 1 &nbsp;and&nbsp; Σ P(Eᵢ) = 1</p>
    </SceneFrame>
  );
}

function RelativeFreqScene() {
  return (
    <SceneFrame kicker="Relative frequency" title="William Mini-Library — books borrowed per day.">
      <p className={styles.lead}>
        Over {LIBRARY_N} days, William recorded how many books students borrowed. Relative frequency = days with that
        count ÷ {LIBRARY_N}.
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
      <p className={styles.small}>Example: P(exactly 2 books) = 18/40 = 0.45.</p>
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
              <th>P</th>
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
        Σ P = {sum.toFixed(2)} {Math.abs(sum - 1) < 1e-9 ? "✓ valid assignment" : "✗ must equal 1"}
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
      <>
        <strong>I</strong> = ICBC profitable (ICBC gain &gt; 0). Four outcomes. P(I) = {formatProb(P_I)} (= 0.20+0.08+0.16+0.26).
      </>
    ) : show === "C" ? (
      <>
        <strong>C</strong> = China Mobile profitable (Mobile = +8). Four outcomes. P(C) = {formatProb(P_C)} (= 0.20+0.16+0.10+0.02).
      </>
    ) : show === "intersection" ? (
      <>
        <strong>I ∩ C</strong> = <em>both</em> stocks profitable — only (10, 8) and (5, 8). P(I ∩ C) = {formatProb(P_I_AND_C)}.
      </>
    ) : show === "union" ? (
      <>
        <strong>I ∪ C</strong> = ICBC profitable <em>or</em> Mobile profitable <em>or both</em> (six outcomes). P(I ∪ C) ={" "}
        {formatProb(P_I_OR_C)}.
      </>
    ) : (
      <>
        <strong>Neither</strong> = not in I and not in C: (0, −2) and (−20, −2). ICBC is not profitable (0 or loss){" "}
        <em>and</em> Mobile loses 2 — so these points miss both events.
      </>
    );

  return (
    <SceneFrame kicker="Events" title="An event is a collection of sample points.">
      <p className={styles.lead}>
        Each chip is one DSME outcome (ICBC, Mobile). An event is just a subset of these chips. P(event) = sum of the
        probabilities on the chips in the subset.
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
          I = ICBC profitable; C = Mobile profitable; I ∩ C = both; I ∪ C = at least one. (0,−2) and (−20,−2) are in
          neither I nor C.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

type VennMode = "complement" | "union" | "intersection";

function VennDiagram({ mode }: { mode: VennMode }) {
  // Sample space rectangle; circle A left, circle B right
  const title =
    mode === "complement"
      ? "Aᶜ — outside circle A (inside the sample space)"
      : mode === "union"
        ? "A ∪ B — everything in A or B (or both)"
        : "A ∩ B — only the overlapping lens";

  return (
    <figure className={styles.vennFigure}>
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 420 220" role="img" aria-label={title} className={styles.vennSvg}>
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
        Think of the rectangle as the sample space <strong>S</strong>. Circles are events. Shaded = the set we mean.
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
            A<sup>c</sup> = everything in <strong>S</strong> that is <strong>outside</strong> circle A. Always: P(A) +
            P(A<sup>c</sup>) = 1, so P(A<sup>c</sup>) = 1 − P(A).
          </p>
          <p className={styles.formula}>
            P(I<sup>c</sup>) = 1 − P(I) = 1 − {formatProb(P_I)} = {formatProb(1 - P_I)}
          </p>
        </>
      )}
      {mode === "union" && (
        <>
          <p className={styles.lead}>
            A ∪ B = the region covered by <strong>either circle</strong> (including the overlap). For DSME: I ∪ C = ICBC
            or Mobile (or both) profitable.
          </p>
          <p className={styles.formula}>P(I ∪ C) = {formatProb(P_I_OR_C)} (sum of six sample points)</p>
        </>
      )}
      {mode === "intersection" && (
        <>
          <p className={styles.lead}>
            A ∩ B = <strong>only the lens</strong> where the circles overlap. For DSME: I ∩ C = both stocks profitable →
            (10, 8) and (5, 8).
          </p>
          <p className={styles.formula}>P(I ∩ C) = 0.20 + 0.16 = {formatProb(P_I_AND_C)}</p>
        </>
      )}
      <PrintOnly>
        <div className={styles.vennPrintRow}>
          <VennDiagram mode="complement" />
          <VennDiagram mode="intersection" />
        </div>
        <p className={styles.note}>
          Complement: outside A. Union: A or B (shaded above). Intersection: overlap only. DSME: P(I)={formatProb(P_I)},
          P(C)={formatProb(P_C)}, P(I∩C)={formatProb(P_I_AND_C)}.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function AdditionLawScene() {
  const addition = P_I + P_C - P_I_AND_C;
  return (
    <SceneFrame kicker="Addition law" title="P(A ∪ B) = P(A) + P(B) − P(A ∩ B).">
      <p className={styles.lead}>
        Adding P(A) and P(B) double-counts the intersection. Subtract it once. If A and B are{" "}
        <strong>mutually exclusive</strong> (no points in common), P(A ∩ B) = 0 and the formula simplifies to P(A) + P(B).
      </p>
      <p className={styles.formula}>
        P(I ∪ C) = {formatProb(P_I)} + {formatProb(P_C)} − {formatProb(P_I_AND_C)} = {formatProb(addition)}
      </p>
      <p className={styles.note}>Matches the direct sum of sample points in I ∪ C. Always a useful check.</p>
      <div className={styles.splitWide} style={{ marginTop: 16 }}>
        <article className={styles.card}>
          <p className={styles.kicker}>MUTUALLY EXCLUSIVE</p>
          <p>No shared sample points. Knowing one occurred makes the other impossible → dependent, not independent.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>NOT MUTUALLY EXCLUSIVE</p>
          <p>I and C can both happen (both stocks profitable). Use the full addition law.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

type SetLawMode = "distributive" | "demorgan";

function DeMorganVenn({ form }: { form: "union" | "intersect" }) {
  const title =
    form === "union"
      ? "(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ — outside both circles"
      : "(A ∩ B)ᶜ = Aᶜ ∪ Bᶜ — everything except the overlap";

  return (
    <figure className={styles.vennFigure}>
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 420 220" role="img" aria-label={title} className={styles.vennSvg}>
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
            Union and intersection <strong>distribute</strong> over each other — the same idea as a(b+c) = ab+ac in algebra,
            with ∪ like “+” and ∩ like “×” (or the other way around).
          </p>
          <div className={styles.splitWide}>
            <article className={styles.card}>
              <p className={styles.kicker}>∪ OVER ∩</p>
              <p className={styles.formula} style={{ marginTop: 8, fontSize: 15 }}>
                A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C)
              </p>
              <p className={styles.muted}>“A or (B and C)” = “(A or B) and (A or C)”.</p>
            </article>
            <article className={styles.card}>
              <p className={styles.kicker}>∩ OVER ∪</p>
              <p className={styles.formula} style={{ marginTop: 8, fontSize: 15 }}>
                A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)
              </p>
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
          <p className={styles.formula} style={{ fontSize: 16 }}>
            {dmForm === "union" ? (
              <>(A ∪ B)<sup>c</sup> = A<sup>c</sup> ∩ B<sup>c</sup></>
            ) : (
              <>(A ∩ B)<sup>c</sup> = A<sup>c</sup> ∪ B<sup>c</sup></>
            )}
          </p>
          <p className={styles.note}>
            DSME check: (I ∪ C)<sup>c</sup> = “neither stock profitable” = {(neither.map((o) => `(${o.icbc},${o.mobile})`).join(", "))}{" "}
            = I<sup>c</sup> ∩ C<sup>c</sup>. Probability = {formatProb(neitherP)} = 1 − P(I ∪ C).
          </p>
        </>
      )}

      <PrintOnly>
        <p className={styles.formula} style={{ fontSize: 14 }}>
          Distributive: A∪(B∩C)=(A∪B)∩(A∪C) and A∩(B∪C)=(A∩B)∪(A∩C). De Morgan: (A∪B)<sup>c</sup>=A<sup>c</sup>∩B<sup>c</sup>{" "}
          and (A∩B)<sup>c</sup>=A<sup>c</sup>∪B<sup>c</sup>.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function ConditionalScene() {
  const pGiven = P_I_AND_C / P_I;
  return (
    <SceneFrame kicker="Conditional probability" title="P(A | B) — probability of A given that B occurred.">
      <p className={styles.lead}>
        Conditioning restricts the sample space to B. The formula uses the intersection over the probability of the
        given event.
      </p>
      <p className={styles.formula}>P(A | B) = P(A ∩ B) / P(B)</p>
      <p className={styles.note}>
        China Mobile profitable <em>given</em> ICBC profitable:
        <br />
        P(C | I) = P(I ∩ C) / P(I) = {formatProb(P_I_AND_C)} / {formatProb(P_I)} = <strong>{formatProb(pGiven)}</strong>
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
        Joint probabilities sit inside the table. Marginal probabilities are the row and column totals. Multiplication
        law: P(A ∩ B) = P(B) × P(A | B).
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th />
              <th>C (Mobile profit)</th>
              <th>C<sup>c</sup></th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>I (ICBC profit)</strong>
              </td>
              <td>{formatProb(joint.i_c)}</td>
              <td>{formatProb(joint.i_not)}</td>
              <td>{formatProb(P_I)}</td>
            </tr>
            <tr>
              <td>
                <strong>I<sup>c</sup></strong>
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
      <p className={styles.formula}>P(I ∩ C) = P(I) × P(C | I) = {formatProb(P_I)} × {formatProb(P_I_AND_C / P_I)} = {formatProb(P_I_AND_C)}</p>
    </SceneFrame>
  );
}

function IndependenceScene() {
  const product = P_I * P_C;
  const independent = Math.abs(product - P_I_AND_C) < 1e-9;
  return (
    <SceneFrame kicker="Independence" title="Independent ≠ mutually exclusive.">
      <p className={styles.lead}>
        A and B are <strong>independent</strong> if P(A | B) = P(A) (knowing B does not change P(A)). Equivalent test:{" "}
        P(A ∩ B) = P(A) × P(B).
      </p>
      <p className={styles.formula}>
        P(I) × P(C) = {formatProb(P_I)} × {formatProb(P_C)} = {formatProb(product)}
        <br />
        P(I ∩ C) = {formatProb(P_I_AND_C)} {independent ? "=" : "≠"} product → I and C are{" "}
        <strong>{independent ? "independent" : "not independent"}</strong>
      </p>
      <div className={styles.splitWide}>
        <article className={styles.card}>
          <p className={styles.kicker}>MUTUALLY EXCLUSIVE</p>
          <p>Cannot both occur. If P(A), P(B) &gt; 0, they cannot be independent.</p>
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
        <strong>Dennis Fashion</strong> faces a proposed shopping centre. Let A₁ = town council approves the zoning
        change, A₂ = does not approve. Prior: P(A₁) = 0.70, P(A₂) = 0.30.
      </p>
      <p className={styles.lead}>
        New information: planning board recommends <em>against</em> the change (event B). History suggests P(B | A₁) =
        0.20 and P(B | A₂) = 0.90. Bayes revises the priors into <strong>posterior</strong> probabilities.
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
        Columns: events → prior → P(B | Aᵢ) → joint P(Aᵢ ∩ B) → posterior P(Aᵢ | B).
      </p>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Prior P(Aᵢ)</th>
              <th>P(B | Aᵢ)</th>
              <th>Joint</th>
              <th>Posterior P(Aᵢ | B)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A₁ approve</td>
              <td>{prior1.toFixed(2)}</td>
              <td>{lik1.toFixed(2)}</td>
              <td>{revealed ? joint1.toFixed(2) : "—"}</td>
              <td>{revealed ? post1.toFixed(2) : "—"}</td>
            </tr>
            <tr>
              <td>A₂ reject</td>
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
              <td>{revealed ? `P(B)=${pB.toFixed(2)}` : "—"}</td>
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
          Posterior P(A₁ | B) ≈ {post1.toFixed(2)} — down from prior 0.70. Bad news for the shopping centre; good news
          for Dennis Fashion.
        </p>
      ) : (
        <p className={styles.small}>Joint = prior × likelihood. Posterior = joint / P(B). Tap to fill the table.</p>
      )}
      <p className={styles.formula} style={{ fontSize: 15 }}>
        P(Aᵢ | B) = [P(B | Aᵢ) P(Aᵢ)] / Σⱼ P(B | Aⱼ) P(Aⱼ)
      </p>
    </SceneFrame>
  );
}

function BayesGame() {
  const print = usePrintMode();
  const [choice, setChoice] = useState<string | null>(print ? "down" : null);
  return (
    <SceneFrame kicker="Game 2 · Bayes" title="What did the board’s “no” do to P(approve)?" tone="gold">
      <p className={styles.lead}>
        Prior P(approve) = 0.70. After a negative planning-board recommendation, the posterior is about 0.34. What
        happened?
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
          {choice === "down"
            ? "Correct — Bayes updated 0.70 → ≈0.34. New information revised the prior downward."
            : "The negative recommendation lowered P(approve). Bayes does not force probability to 0 unless the data make the event impossible."}
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
      text: "Write Python to simulate rolling a fair six-sided die 10,000 times. Plot a bar chart of relative frequencies. Do they approach 1/6?",
    },
    {
      topic: "Combinations",
      text: "Compute C(20, 3) and P(20, 3) with math.comb / math.perm. Explain in one sentence when each applies.",
    },
    {
      topic: "Joint table",
      text:
        "DSME joint table (I = ICBC profitable, C = Mobile profitable): P(I∩C)=0.36, P(I∩Cᶜ)=0.34, P(Iᶜ∩C)=0.12, P(Iᶜ∩Cᶜ)=0.18. In a notebook, compute P(C|I) and P(I|C). Confirm each with P(A∩B)/P(B).",
    },
    {
      topic: "Bayes medical test",
      text: "Disease prevalence 1%. Test sensitivity 99%, false positive rate 5%. Given a positive test, what is P(disease|positive)? Show the Bayes table.",
    },
  ];
  return (
    <SceneFrame kicker="Prompts to try" title="Practice probability with an AI coding assistant." tone="gold">
      <p className={styles.lead}>
        Use these prompts on your own machine. For graded work, follow the course AI policy.
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
    <SceneFrame kicker="Take into the next topics" title="Count → assign → update.">
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>01</p>
          <h2 className={styles.cardTitle}>Sample space</h2>
          <p className={styles.muted}>List outcomes; count with trees, C(N,n), P(N,n).</p>
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
