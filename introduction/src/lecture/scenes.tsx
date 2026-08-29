import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { createRng, sampleIndices, shuffle } from "../utils";
import { ETHICS_FLAGS, EthicsDemo } from "./ethicsDemos";
import styles from "./Lecture.module.css";
import { LiveOnly, PrintOnly, usePrintMode } from "./printContext";

export type SceneDef = {
  id: string;
  chapter: string;
  label: string;
  Scene: () => ReactElement;
};

const COMPANIES = [
  { name: "Dataram", sales: 73.1, eps: 0.86, exchange: "N" },
  { name: "EnergySouth", sales: 74.0, eps: 1.67, exchange: "N" },
  { name: "Keystone", sales: 365.7, eps: 0.86, exchange: "NQ" },
  { name: "LandCare", sales: 111.4, eps: 0.33, exchange: "N" },
  { name: "Psychemedics", sales: 17.6, eps: 0.13, exchange: "N" },
];

const BUSINESS_USES = [
  { id: "finance", label: "Finance", example: "Price–earnings ratios and dividend yields guide investment advice." },
  { id: "economics", label: "Economics", example: "Forecast models turn historical data into views about the economy ahead." },
  { id: "production", label: "Production", example: "Quality-control charts watch whether a process is drifting off target." },
  { id: "marketing", label: "Marketing", example: "Checkout scanners feed data on what customers buy together." },
];

const CLASSIFY_ITEMS = [
  { text: "CUHK student blood type", answer: "categorical" },
  { text: "Number of siblings", answer: "quantitative" },
  { text: "Country of residence", answer: "categorical" },
  { text: "Height (cm)", answer: "quantitative" },
  { text: "Annual sales ($M)", answer: "quantitative" },
  { text: "Stock exchange: N or NQ", answer: "categorical" },
];

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

const COVER_HINT_LIVE =
  "Use ← → or the buttons above. Numbers in every example can be redrawn. Download PDF for a printable handout.";
const COVER_HINT_PRINT = "Printed handout · interactive examples on the website";

function CoverScene() {
  const print = usePrintMode();
  return (
    <section className={`${styles.scene} ${styles.cover}`} id="cover">
      <div className={styles.coverInner}>
        <p className={styles.kicker}>DOTE2011G · Statistical Analysis for Business Decisions</p>
        <h1 className={styles.coverTitle}>Introduction</h1>
        <p className={styles.lead}>Turn data into decisions — without drowning in definitions on day one.</p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function WhyScene() {
  return (
    <SceneFrame kicker="Start here" title="Business runs on uncertainty.">
      <p className={styles.lead}>
        Should we launch the product? Which supplier is safer? Is wait time really above five minutes?
        You rarely see the whole population — you see a sample, noise, and competing stories.
      </p>
      <div className={styles.statPair}>
        <article>
          <span>WITHOUT STATISTICS</span>
          <strong>Gut feel</strong>
          <p>“Sales look fine.” “The last customer was angry.” Anecdotes swap places with evidence.</p>
        </article>
        <article>
          <span>WITH STATISTICS</span>
          <strong>Structured doubt</strong>
          <p>Summarise what you saw. Quantify uncertainty. Separate signal from wishful thinking.</p>
        </article>
      </div>
    </SceneFrame>
  );
}

function TwoMeaningsScene() {
  const [mode, setMode] = useState<"numbers" | "discipline">("numbers");
  return (
    <SceneFrame kicker="Two meanings" title="“Statistics” is a noun and a subject.">
      <p className={styles.lead}>Same word — different job. Confusing them is how intro slides lose the room.</p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("numbers")}>STATISTICS AS NUMBERS</button>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("discipline")}>STATISTICS AS A DISCIPLINE</button>
        </div>
      </LiveOnly>
      <div className={`${styles.card} ${styles.bigCard}`}>
        {mode === "numbers" ? (
          <>
            <p className={styles.kicker}>NUMBERS IN THE WILD</p>
            <p>“HK inflation <strong>2.1%</strong>.” “Median rent <strong>$8,200</strong>.” “On-time delivery <strong>94%</strong>.”</p>
            <p className={styles.muted}>These published figures are statistics — numerical summaries someone computed from data.</p>
          </>
        ) : (
          <>
            <p className={styles.kicker}>THE WORK BEHIND THE NUMBERS</p>
            <p>Collect → organise → display → analyse → interpret — with rules for when a claim is fair.</p>
            <p className={styles.muted}>That process is statistics the discipline. This course trains you in both reading and doing.</p>
          </>
        )}
      </div>
      <PrintOnly>
        <p className={styles.note}>
          Statistics can mean published figures (averages, medians, percents) or the art and science of working with data. We need both senses in business.
        </p>
      </PrintOnly>
    </SceneFrame>
  );
}

function BusinessScene() {
  const [focus, setFocus] = useState(BUSINESS_USES[0].id);
  const active = BUSINESS_USES.find((item) => item.id === focus) ?? BUSINESS_USES[0];
  return (
    <SceneFrame kicker="Why managers care" title="Statistics shows up everywhere in business.">
      <p className={styles.lead}>Pick a function — the question changes, but the pattern is the same: data → summary → decision.</p>
      <div className={styles.three}>
        {BUSINESS_USES.map((item) => (
          <button
            key={item.id}
            className={`${styles.choice} ${styles.roadmapBtn} ${focus === item.id ? styles.choiceCorrect : ""}`}
            type="button"
            onClick={() => setFocus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className={styles.note}>{active.example}</p>
      <p className={styles.small}>Accounting audits use statistical sampling too — same idea, different vocabulary.</p>
    </SceneFrame>
  );
}

function VocabularyScene() {
  const [highlight, setHighlight] = useState<"element" | "variable" | "observation">("observation");
  const cellClass = (colIndex: number, rowIndex?: number) => {
    if (highlight === "observation" && rowIndex === 2) return styles.hlCell;
    if (highlight === "element" && colIndex === 0) return styles.hlCell;
    if (highlight === "variable" && colIndex >= 1) return styles.hlCell;
    return "";
  };
  const highlightNote =
    highlight === "element"
      ? "Element = one company (one case in the data set). The name column identifies each element."
      : highlight === "variable"
        ? "Variables = what we measure for each company — sales, earnings per share, exchange."
        : "Observation = one row — all values recorded for Keystone in this sample.";

  return (
    <SceneFrame kicker="Data vocabulary" title="One row = one observation.">
      <p className={styles.lead}>
        A <strong>data set</strong> holds every case you measured. An <strong>element</strong> is one case (a company).
        A <strong>variable</strong> is what you record (sales, exchange). One row is one <strong>observation</strong>.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button
            className={`${styles.toolBtn} ${highlight === "element" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setHighlight("element")}
          >
            HIGHLIGHT ELEMENT
          </button>
          <button
            className={`${styles.toolBtn} ${highlight === "variable" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setHighlight("variable")}
          >
            HIGHLIGHT VARIABLES
          </button>
          <button
            className={`${styles.toolBtn} ${highlight === "observation" ? styles.toolBtnActive : ""}`}
            type="button"
            onClick={() => setHighlight("observation")}
          >
            HIGHLIGHT ONE ROW
          </button>
        </div>
      </LiveOnly>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th className={cellClass(0)}>Company</th>
              <th className={cellClass(1)}>Sales ($M)</th>
              <th className={cellClass(2)}>Earn/Share</th>
              <th className={cellClass(3)}>Exchange</th>
            </tr>
          </thead>
          <tbody>
            {COMPANIES.map((company, rowIndex) => (
              <tr key={company.name}>
                <td className={cellClass(0, rowIndex)}>{company.name}</td>
                <td className={cellClass(1, rowIndex)}>{company.sales.toFixed(2)}</td>
                <td className={cellClass(2, rowIndex)}>{company.eps.toFixed(2)}</td>
                <td className={cellClass(3, rowIndex)}>{company.exchange}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{highlightNote}</p>
      <p className={styles.small}>5 companies × 3 variables → 5 observations. You do not need every scale-of-measurement label on day one — ask first: label or number?</p>
    </SceneFrame>
  );
}

function ClassifyGame() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const deck = useMemo(() => shuffle(CLASSIFY_ITEMS, createRng(seed + 11)), [seed]);
  const current = deck[index % deck.length];

  const choose = (guess: string) => {
    const ok = guess === current.answer;
    if (ok) setScore((value) => value + 1);
    setFeedback(ok ? "Correct — label or number?" : `This one is ${current.answer === "categorical" ? "categorical (label)" : "quantitative (number)"}.`);
    window.setTimeout(() => {
      setFeedback("");
      setIndex((value) => value + 1);
    }, 900);
  };

  if (print) {
    return (
      <SceneFrame kicker="Game 1" title="Label or number?" tone="gold">
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Observation</th><th>Type</th></tr></thead>
            <tbody>
              {CLASSIFY_ITEMS.map((item) => (
                <tr key={item.text}>
                  <td>{item.text}</td>
                  <td>{item.answer === "categorical" ? "Categorical" : "Quantitative"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SceneFrame>
    );
  }

  return (
    <SceneFrame kicker="Game 1" title="Label or number?" tone="gold">
      <p className={styles.lead}>{current.text}</p>
      <div className={styles.choices}>
        <button className={styles.choice} type="button" onClick={() => choose("categorical")}>Categorical · label</button>
        <button className={styles.choice} type="button" onClick={() => choose("quantitative")}>Quantitative · number</button>
      </div>
      {feedback ? <p className={styles.answer}>{feedback}</p> : null}
      <div className={styles.tools}>
        <button className={styles.ghost} type="button" onClick={() => { setSeed((value) => value + 1); setIndex(0); setScore(0); }}>New deck</button>
        <span className={styles.score}>{score} correct</span>
      </div>
    </SceneFrame>
  );
}

function TimeDataScene() {
  const [mode, setMode] = useState<"cross" | "series">("cross");
  return (
    <SceneFrame kicker="How data sits in time" title="Same variable — different snapshot.">
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("cross")}>CROSS-SECTION</button>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("series")}>TIME SERIES</button>
        </div>
      </LiveOnly>
      <div className={styles.card}>
        {mode === "cross" ? (
          <>
            <p className={styles.kicker}>ONE POINT IN TIME</p>
            <p>Salary of <strong>all</strong> fresh graduates at <strong>each</strong> HK university in <strong>2021</strong>.</p>
            <p className={styles.muted}>Compare places at the same moment — not the same people followed through time.</p>
          </>
        ) : (
          <>
            <p className={styles.kicker}>MANY TIME PERIODS</p>
            <p>Salary of CUHK fresh graduates in <strong>2022, 2023, 2024</strong> — same group, moving forward.</p>
            <p className={styles.muted}>Gasoline price by month is the classic time-series picture from the textbook.</p>
          </>
        )}
      </div>
    </SceneFrame>
  );
}

function SourcesScene() {
  const [mode, setMode] = useState<"existing" | "experiment" | "observe">("existing");
  const copy = {
    existing: {
      title: "Existing sources",
      body: "Company records, Census & Statistics Department, industry reports, databases, web scrapes — fast, but ask who collected it and why.",
    },
    experiment: {
      title: "Designed experiment",
      body: "You control inputs and measure outputs — e.g. Salk polio trial with nearly two million children. Strong for cause, expensive and ethical limits apply.",
    },
    observe: {
      title: "Observational study",
      body: "You watch without assigning treatment — surveys, smoker vs non-smoker comparisons. Useful, but lurking variables can fool you.",
    },
  }[mode];

  return (
    <SceneFrame kicker="Where data comes from" title="Who collected it — and did they control anything?">
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("existing")}>EXISTING DATA</button>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("experiment")}>EXPERIMENT</button>
          <button className={styles.toolBtn} type="button" onClick={() => setMode("observe")}>OBSERVATIONAL</button>
        </div>
      </LiveOnly>
      <div className={styles.card}>
        <p className={styles.kicker}>{copy.title.toUpperCase()}</p>
        <p>{copy.body}</p>
      </div>
      <p className={styles.small}>Bad data cheaply acquired can be worse than no data — garbage in, confident nonsense out.</p>
    </SceneFrame>
  );
}

function DescribeInferScene() {
  return (
    <SceneFrame kicker="Two big jobs" title="Describe the sample. Infer about the population.">
      <div className={styles.splitWide}>
        <article className={styles.card}>
          <p className={styles.kicker}>DESCRIPTIVE</p>
          <p>Compress what is <strong>in front of you</strong> — tables, charts, averages.</p>
          <p className={styles.muted}>William Auto: 50 tune-up invoices → histogram → “parts average about $79.”</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>INFERENTIAL</p>
          <p>Use a <strong>sample</strong> to learn about a <strong>larger group</strong> you did not fully measure.</p>
          <p className={styles.muted}>Estimate mean wait time, test if a drug beats placebo, predict sales from ad spend.</p>
        </article>
      </div>
      <p className={styles.note}>Most headlines show descriptive statistics. Most business decisions need inferential ones — with uncertainty attached.</p>
    </SceneFrame>
  );
}

type MarbleKind = "square" | "circle";
type Marble = { kind: MarbleKind; id: number };

const PAIL_SQUARES = 10;
const PAIL_CIRCLES = 5;
const HANDFUL_SIZE = 6;
const DEFAULT_SAMPLE_IDS = [0, 2, 4, 6, 10, 11];

function buildMarblePopulation(): Marble[] {
  const marbles: Marble[] = [];
  for (let index = 0; index < PAIL_SQUARES; index += 1) {
    marbles.push({ kind: "square", id: index });
  }
  for (let index = 0; index < PAIL_CIRCLES; index += 1) {
    marbles.push({ kind: "circle", id: PAIL_SQUARES + index });
  }
  return marbles;
}

function countByKind(marbles: Marble[]) {
  let squares = 0;
  let circles = 0;
  for (const marble of marbles) {
    if (marble.kind === "square") squares += 1;
    else circles += 1;
  }
  return { squares, circles };
}

function formatMix(counts: { squares: number; circles: number }) {
  return `${counts.squares} squares · ${counts.circles} circles`;
}

function MarbleShape({ kind, inSample, faded }: { kind: MarbleKind; inSample?: boolean; faded?: boolean }) {
  const shapeClass = kind === "square" ? styles.marbleSquare : styles.marbleCircle;
  const stateClass = inSample ? styles.marbleInSample : faded ? styles.marbleFaded : "";
  return <span className={`${shapeClass} ${stateClass}`.trim()} aria-hidden="true" />;
}

function PailScene() {
  const print = usePrintMode();
  const [modeLive, setModeLive] = useState<"probability" | "statistics">("statistics");
  const [drawSeed, setDrawSeed] = useState(0);
  const mode = print ? "statistics" : modeLive;
  const population = useMemo(() => buildMarblePopulation(), []);
  const pailDisplay = useMemo(() => shuffle(population, createRng(42)), [population]);
  const sampleIds = useMemo(() => {
    if (print || drawSeed === 0) return new Set(DEFAULT_SAMPLE_IDS);
    return new Set(sampleIndices(population.length, HANDFUL_SIZE, createRng(drawSeed)));
  }, [drawSeed, population.length, print]);
  const sampleMarbles = useMemo(
    () => population.filter((marble) => sampleIds.has(marble.id)),
    [population, sampleIds],
  );
  const pailCounts = countByKind(population);
  const sampleCounts = countByKind(sampleMarbles);

  return (
    <SceneFrame kicker="Classic metaphor" title="Probability and statistics ask opposite questions." tone="dark">
      <p className={styles.lead}>
        The <strong>pail</strong> is the population — every item you care about. A <strong>handful</strong> scooped from
        it is the sample: the same kinds of items, just fewer. Here the pail holds {formatMix(pailCounts)}.
      </p>
      <div className={styles.pailGrid}>
        <div>
          <div className={styles.pailBucket}>
            <p className={styles.pailTitle}>Population · the pail · N = {population.length}</p>
            <p className={styles.pailMix}>{formatMix(pailCounts)}</p>
            <div className={styles.marbleGrid}>
              {pailDisplay.map((marble) => (
                <MarbleShape
                  key={marble.id}
                  kind={marble.kind}
                  inSample={sampleIds.has(marble.id)}
                  faded={!sampleIds.has(marble.id)}
                />
              ))}
            </div>
          </div>
          <p className={styles.mapArrow}>↓ scoop a handful →</p>
          <div className={styles.pailHandful}>
            <p className={styles.pailTitle}>Sample · your handful · n = {sampleMarbles.length}</p>
            <p className={styles.pailMix}>{formatMix(sampleCounts)}</p>
            <div className={styles.marbleGrid}>
              {sampleMarbles.map((marble) => (
                <MarbleShape key={marble.id} kind={marble.kind} inSample />
              ))}
            </div>
          </div>
          <p className={styles.mapLegend}>
            Same shapes in both places — the handful is drawn <em>from</em> the pail, not a different kind of object.
          </p>
          <LiveOnly>
            {mode === "probability" && (
              <div className={styles.tools} style={{ marginTop: 12 }}>
                <button className={styles.toolBtn} type="button" onClick={() => setDrawSeed((seed) => seed + 1)}>
                  DRAW AGAIN
                </button>
              </div>
            )}
          </LiveOnly>
        </div>
        <div>
          <LiveOnly>
            <div className={styles.tools}>
              <button
                className={`${styles.toolBtn} ${mode === "probability" ? styles.toolBtnActive : ""}`}
                type="button"
                onClick={() => setModeLive("probability")}
              >
                PROBABILITY
              </button>
              <button
                className={`${styles.toolBtn} ${mode === "statistics" ? styles.toolBtnActive : ""}`}
                type="button"
                onClick={() => setModeLive("statistics")}
              >
                STATISTICS
              </button>
            </div>
          </LiveOnly>
          <p className={styles.lead}>
            {mode === "probability"
              ? `The pail mix is known (${formatMix(pailCounts)}). If you scoop ${HANDFUL_SIZE} items, what mix might land in your hand — e.g. ${formatMix(sampleCounts)}?`
              : `You scooped ${formatMix(sampleCounts)} (${sampleMarbles.length} items). What mix in the full pail is plausible?`}
          </p>
          <p className={styles.darkNote}>
            {mode === "probability"
              ? "Forward direction — population → sample. Coming in the probability topics: chance models, randomness, and probability distributions."
              : "Backward direction — sample → population. Coming later: sampling distributions, confidence intervals, hypothesis tests, ANOVA, and regression."}
          </p>
          <PrintOnly>
            <p className={styles.darkNote}>
              Probability: known pail ({formatMix(pailCounts)}) → possible handful. Statistics: observed handful ({formatMix(sampleCounts)}) → plausible pail. Same objects, opposite questions.
            </p>
          </PrintOnly>
        </div>
      </div>
    </SceneFrame>
  );
}

function PopulationScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const populationSize = 48;
  const sampleSize = 10;
  const sample = useMemo(
    () => sampleIndices(populationSize, sampleSize, createRng(print ? 0 : seed)),
    [print, seed],
  );
  const sampleSet = new Set(sample);

  return (
    <SceneFrame kicker="Population vs sample" title="You almost never weigh every bearing.">
      <p className={styles.lead}>
        <strong>Population</strong> = every element you care about. <strong>Sample</strong> = the subset you actually measure.
        Inference uses the sample to speak about the population.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>DRAW NEW SAMPLE</button>
        </div>
      </LiveOnly>
      <div className={styles.chips}>
        {Array.from({ length: populationSize }, (_, index) => (
          <span key={index} className={`${styles.chip} ${sampleSet.has(index) ? styles.chipActive : ""}`}>
            {index + 1}
          </span>
        ))}
      </div>
      <p className={styles.small}>
        {sampleSize} bearings inspected today (highlighted) out of {populationSize} produced — census if you measure all {populationSize}; sample survey if you measure {sampleSize}.
      </p>
    </SceneFrame>
  );
}

function InferencePreviewScene() {
  return (
    <SceneFrame kicker="Coming later" title="Inference in one picture." tone="white">
      <div className={styles.splitWide}>
        <article className={styles.card}>
          <p className={styles.kicker}>ESTIMATION</p>
          <p>Sample average wait = <strong>5.07</strong> min → “best guess” for the population mean.</p>
          <p className={styles.muted}>Later: confidence interval — how far can 5.07 move given variability?</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>HYPOTHESIS TEST</p>
          <p>Claim: mean wait ≤ 5 min. Data average = 5.07. Is that enough evidence to reject the claim?</p>
          <p className={styles.muted}>
            Same pattern for any yes/no claim about a population: could the sample result happen by chance if the claim were true?
          </p>
        </article>
      </div>
      <article className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.kicker}>LINEAR REGRESSION</p>
        <p>
          A campus café logs average wait time each week. More baristas should shorten lines; more order stations (capacity)
          should help throughput; lunch rush (time of day) should lengthen waits — so managers want to <strong>predict</strong> wait
          time from factors they can control or plan for.
        </p>
        <p className={styles.formula} style={{ marginTop: 14 }}>
          Y = β₀ + β₁X₁ + β₂X₂ + β₃X₃ + ε
        </p>
        <p className={styles.small} style={{ marginTop: 10 }}>
          Y = wait time (minutes) &nbsp;·&nbsp; X₁ = staff on duty &nbsp;·&nbsp; X₂ = service capacity (stations) &nbsp;·&nbsp; X₃ = time of day (rush vs off-peak) &nbsp;·&nbsp; ε = leftover noise
        </p>
      </article>
    </SceneFrame>
  );
}

function EthicsGame() {
  const print = usePrintMode();
  const [selectedLive, setSelectedLive] = useState<string | null>(null);
  const selected = print ? (selectedLive ?? "axis") : selectedLive;
  const active = ETHICS_FLAGS.find((item) => item.id === selected);

  return (
    <SceneFrame kicker="Practice matters" title="Spot the shady statistics." tone="gold">
      <p className={styles.lead}>Ethics is not a separate chapter — it is what keeps your summary honest.</p>
      <div className={styles.choices}>
        {ETHICS_FLAGS.map((item) => {
          const picked = selected === item.id;
          const showAnswer = print || picked;
          return (
            <button
              key={item.id}
              className={`${styles.choice} ${picked ? styles.choiceSelected : ""} ${
                showAnswer ? (item.bad ? styles.choiceWrong : styles.choiceCorrect) : ""
              }`}
              type="button"
              onClick={() => setSelectedLive(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <>
          <EthicsDemo id={active.id} />
          <p className={styles.answer}>{active.verdict}</p>
        </>
      ) : (
        <p className={styles.small}>Tap a statement to see a story and example. Red flag = misleading · Blue = healthy habit.</p>
      )}
      {print ? (
        <p className={styles.printNote}>PDF shows one example (axis at zero). Open the interactive lecture to click through every story and chart.</p>
      ) : null}
    </SceneFrame>
  );
}

function CloseScene() {
  return (
    <SceneFrame kicker="Take into the semester" title="Data → picture → number → honest claim.">
      <div className={styles.three}>
        <article className={styles.card}><p className={styles.kicker}>01</p><h2 className={styles.cardTitle}>Ask the type</h2><p className={styles.muted}>Label or number? Sample or population?</p></article>
        <article className={styles.card}><p className={styles.kicker}>02</p><h2 className={styles.cardTitle}>Describe first</h2><p className={styles.muted}>Tables and charts before you quote an average.</p></article>
        <article className={styles.card}><p className={styles.kicker}>03</p><h2 className={styles.cardTitle}>Infer carefully</h2><p className={styles.muted}>Correlation ≠ cause. Show your sample. Report uncertainty.</p></article>
      </div>
      <PrintOnly>
        <p className={styles.footerNote}>DOTE2011G · Introduction · CUHK</p>
      </PrintOnly>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Welcome", label: "Cover", Scene: CoverScene },
  { id: "why", chapter: "Welcome", label: "Why statistics", Scene: WhyScene },
  { id: "meanings", chapter: "Welcome", label: "Two meanings", Scene: TwoMeaningsScene },
  { id: "business", chapter: "Welcome", label: "Business uses", Scene: BusinessScene },
  { id: "vocab", chapter: "Data basics", label: "Vocabulary", Scene: VocabularyScene },
  { id: "classify", chapter: "Data basics", label: "Game · types", Scene: ClassifyGame },
  { id: "time", chapter: "Data basics", label: "Cross vs time", Scene: TimeDataScene },
  { id: "sources", chapter: "Data basics", label: "Data sources", Scene: SourcesScene },
  { id: "describe", chapter: "Core ideas", label: "Describe vs infer", Scene: DescribeInferScene },
  { id: "pail", chapter: "Core ideas", label: "Pail metaphor", Scene: PailScene },
  { id: "population", chapter: "Core ideas", label: "Population & sample", Scene: PopulationScene },
  { id: "infer", chapter: "Core ideas", label: "Inference preview", Scene: InferencePreviewScene },
  { id: "ethics", chapter: "Course", label: "Ethics game", Scene: EthicsGame },
  { id: "close", chapter: "Course", label: "Takeaways", Scene: CloseScene },
];
