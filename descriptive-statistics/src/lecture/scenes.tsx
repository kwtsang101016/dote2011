import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  RATING_LABELS,
  TEXTBOOK,
  type RatingLabel,
  boxPlotStats,
  chebyshevMinimum,
  classHistogram,
  coefficientOfVariation,
  correlation,
  covariance,
  createRng,
  cumulativeFromBins,
  dataRange,
  equalWidthHistogram,
  formatNumber,
  groupedVariance,
  iqr,
  mean,
  median,
  mode,
  percentile,
  quartiles,
  sampleHotelRates,
  sampleCorrelationQuiz,
  nextCorrelationQuizKind,
  sampleRatings,
  sampleScatter,
  sampleSkewness,
  sampleStdev,
  sampleTuneUpCosts,
  sampleVariance,
  shuffle,
  stemAndLeaf,
  weightedMean,
  zScore,
} from "../stats";
import { BarChart, BoxPlotChart, DotPlot, HistogramChart, OgiveChart, ParetoChart, PieChart, ScatterChart } from "./charts";
import styles from "./Lecture.module.css";
import { LiveOnly, PrintOnly, usePrintMode } from "./printContext";

export type SceneDef = {
  id: string;
  chapter: string;
  label: string;
  Scene: () => ReactElement;
};

function ratingCounts(ratings: RatingLabel[]) {
  return RATING_LABELS.map((label) => ({
    label,
    count: ratings.filter((item) => item === label).length,
  }));
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
        <h1 className={styles.coverTitle}>Descriptive Statistics</h1>
        <p className={styles.lead}>From a pile of numbers to a picture — and a decision you can defend.</p>
        <p className={styles.hint}>{print ? COVER_HINT_PRINT : COVER_HINT_LIVE}</p>
      </div>
    </section>
  );
}

function WhySummarizeScene() {
  const preview = TEXTBOOK.tuneUpCosts.slice(0, 24).join("  ");
  return (
    <SceneFrame kicker="The problem" title="Raw data is not a story.">
      <div className={styles.split}>
        <div>
          <p className={styles.lead}>A manager at William Auto looks at 50 tune-up invoices. The parts costs look like this:</p>
          <p className={styles.chip} style={{ display: "block", marginTop: 20, lineHeight: 1.8 }}>
            {preview} …
          </p>
          <p className={styles.note}>
            You cannot hold 50 numbers in your head. Descriptive statistics compresses them into a table, a picture, or a few honest numbers.
          </p>
        </div>
        <div className={styles.statPair} style={{ marginTop: 0 }}>
          <article>
            <span>CATEGORICAL</span>
            <strong>Labels</strong>
            <p>Names of groups: rating, home type, supplier.</p>
          </article>
          <article>
            <span>QUANTITATIVE</span>
            <strong>Amounts</strong>
            <p>How much or how many: cost, rate, shots.</p>
          </article>
        </div>
      </div>
    </SceneFrame>
  );
}

const CLASSIFY_ITEMS = [
  { text: "Hyatt guest rating: Above Average", answer: "categorical" },
  { text: "Tune-up parts cost: $91", answer: "quantitative" },
  { text: "Shatin home type: Flat", answer: "categorical" },
  { text: "Number of shots on goal", answer: "quantitative" },
  { text: "Supplier name: FastGo", answer: "categorical" },
  { text: "Daily studio rent in Tai Po", answer: "quantitative" },
];

function ClassifyGame() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState("");
  const deck = useMemo(() => shuffle(CLASSIFY_ITEMS, createRng(seed + 11)), [seed]);
  const current = deck[index % deck.length];

  const choose = (guess: string) => {
    const ok = guess === current.answer;
    setTries((value) => value + 1);
    if (ok) setScore((value) => value + 1);
    setFeedback(ok ? "Correct. Ask: is this a name, or a number?" : `Not quite. This one is ${current.answer}.`);
    window.setTimeout(() => {
      setFeedback("");
      setIndex((value) => value + 1);
    }, 900);
  };

  if (print) {
    return (
      <SceneFrame kicker="Game 1 · Warm-up" title="Name, or number?" tone="gold">
        <p className={styles.lead}>Ask for every observation: is this a label, or a number?</p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Observation</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {CLASSIFY_ITEMS.map((item) => (
                <tr key={item.text}>
                  <td>{item.text}</td>
                  <td>{item.answer === "categorical" ? "Categorical · label" : "Quantitative · number"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="printNote">On the website, tap your answer and draw a new deck to keep practising.</p>
      </SceneFrame>
    );
  }

  return (
    <SceneFrame kicker="Game 1 · Warm-up" title="Name, or number?" tone="gold">
      <p className={styles.lead}>Tap the type. A new item appears each time — including after you redraw the deck.</p>
      <div className={styles.card} style={{ marginTop: 24, maxWidth: 720 }}>
        <p className={styles.kicker}>THIS OBSERVATION</p>
        <h1 style={{ fontSize: 34 }}>{current.text}</h1>
        <div className={styles.choices}>
          <button className={styles.choice} type="button" onClick={() => choose("categorical")}>
            Categorical · a label
          </button>
          <button className={styles.choice} type="button" onClick={() => choose("quantitative")}>
            Quantitative · a number
          </button>
        </div>
        {feedback ? <p className={styles.answer}>{feedback}</p> : null}
        <p className={styles.score}>
          {score} / {tries} correct
        </p>
      </div>
      <div className={styles.tools}>
        <button className={styles.toolBtn} type="button" onClick={() => { setSeed((value) => value + 1); setIndex(0); setScore(0); setTries(0); setFeedback(""); }}>
          NEW DECK
        </button>
      </div>
    </SceneFrame>
  );
}

function HyattLive() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const ratings = useMemo(
    () => (print || seed === 0 ? TEXTBOOK.hyattRatings : sampleRatings(20, createRng(seed))),
    [print, seed],
  );
  const rows = ratingCounts(ratings);
  const n = ratings.length;

  return (
    <SceneFrame kicker="Categorical data · Hyatt" title="Twenty guests. One table. Two pictures.">
      <p className={styles.lead}>
        Guests rated their stay. Frequency = count. Relative frequency = count ÷ n. Percent frequency = relative frequency × 100.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>
            DRAW 20 NEW RATINGS
          </button>
          <button className={styles.ghost} type="button" onClick={() => setSeed(0)}>
            Restore textbook sample
          </button>
          <span className={styles.muted}>{seed === 0 ? "Textbook Hyatt sample" : `Random sample #${seed}`}</span>
        </div>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.muted} style={{ marginBottom: 12 }}>Textbook Hyatt sample (n = 20)</p>
      </PrintOnly>
      <div className={styles.chips} style={{ marginBottom: 18 }}>
        {ratings.map((rating, index) => (
          <span className={styles.chip} key={`${rating}-${index}`}>
            {rating}
          </span>
        ))}
      </div>
      <div className={styles.splitWide}>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Rating</th>
                <th>Frequency</th>
                <th>Relative</th>
                <th>Percent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.count}</td>
                  <td>{formatNumber(row.count / n, 2)}</td>
                  <td>{formatNumber((row.count / n) * 100, 0)}%</td>
                </tr>
              ))}
              <tr>
                <td>Total</td>
                <td>{n}</td>
                <td>1.00</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <BarChart data={rows.map((row) => ({ label: row.label.replace(" Average", ""), value: row.count }))} title="Bar chart · frequency" yLabel="Guests" />
          <div style={{ height: 14 }} />
          <PieChart data={rows.map((row) => ({ label: row.label, value: row.count }))} title="Pie chart · percent" />
        </div>
      </div>
      <p className={styles.formula}>relative frequency = f / n &nbsp;&nbsp;|&nbsp;&nbsp; pie slice = relative frequency × 360°</p>
    </SceneFrame>
  );
}

const PARETO_CAUSES = ["Check-in", "Cleanliness", "Wi-Fi", "Noise", "Billing"] as const;
const PARETO_TEXTBOOK = [48, 24, 12, 9, 7];

function sampleComplaints(rng: () => number): number[] {
  const draws = PARETO_CAUSES.map((_, index) => {
    const base = PARETO_TEXTBOOK[index];
    return Math.max(3, Math.round(base * (0.65 + rng() * 0.7)));
  });
  return draws;
}

function ParetoScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const counts = useMemo(
    () => (print || seed === 0 ? PARETO_TEXTBOOK : sampleComplaints(createRng(seed))),
    [print, seed],
  );
  const rows = PARETO_CAUSES.map((label, index) => ({ label, count: counts[index] }));
  const n = counts.reduce((sum, value) => sum + value, 0);
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const topTwo = sorted[0].count + sorted[1].count;
  const topTwoPercent = (topTwo / n) * 100;
  const unsortedBars = rows.map((row) => ({ label: row.label, value: row.count }));
  const sortedBars = sorted.map((row) => ({ label: row.label, value: row.count }));

  return (
    <SceneFrame kicker="Quality control · Pareto" title="Sort the bars. The biggest problems come first.">
      <p className={styles.lead}>
        A Pareto diagram is a bar chart of causes ordered from most frequent to least frequent — often with a cumulative-percent line. Named for Vilfredo Pareto; still the standard first picture in quality and operations work.
      </p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW COMPLAINT COUNTS</button>
          <button className={styles.ghost} type="button" onClick={() => setSeed(0)}>Textbook mix</button>
          <span className={styles.muted}>{seed === 0 ? "Hyatt guest complaints · textbook mix" : `Random mix #${seed}`}</span>
        </div>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.muted} style={{ marginBottom: 12 }}>Hyatt guest complaints · textbook mix (n = {n})</p>
      </PrintOnly>
      <div className={styles.splitWide}>
        <BarChart data={unsortedBars} title="Ordinary bar chart · category order" yLabel="Complaints" />
        <ParetoChart data={sortedBars} title="Pareto diagram · tallest first + cumulative %" />
      </div>
      <div className={styles.tableWrap} style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Cause (sorted)</th>
              <th>f</th>
              <th>%</th>
              <th>Cum. %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const cum = sorted.slice(0, index + 1).reduce((sum, item) => sum + item.count, 0);
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.count}</td>
                  <td>{formatNumber((row.count / n) * 100, 0)}%</td>
                  <td>{formatNumber((cum / n) * 100, 0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        The two tallest bars — {sorted[0].label} and {sorted[1].label} — already account for {formatNumber(topTwoPercent, 0)}% of complaints.
        Fix those first. That is the 80/20 idea: a few causes usually explain most of the problem.
      </p>
    </SceneFrame>
  );
}

function ChartReadGame() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(4);
  const [picked, setPicked] = useState<number | null>(null);
  const ratings = useMemo(
    () => (print ? TEXTBOOK.hyattRatings : sampleRatings(20, createRng(seed))),
    [print, seed],
  );
  const rows = ratingCounts(ratings);
  const target = print ? "Above Average" : RATING_LABELS[seed % RATING_LABELS.length];
  const count = rows.find((row) => row.label === target)?.count ?? 0;
  const percent = Math.round((count / ratings.length) * 100);
  const options = useMemo(() => {
    const distractorPool = [
      Math.max(0, percent - 10),
      Math.min(100, percent + 15),
      Math.max(5, 100 - percent),
      Math.max(0, percent - 20),
      Math.min(100, percent + 25),
    ].filter((value, index, list) => value !== percent && list.indexOf(value) === index);
    const distractors = shuffle(distractorPool, createRng((print ? 1 : seed) + 3)).slice(0, 2);
    return shuffle([percent, ...distractors], createRng((print ? 1 : seed) + 17));
  }, [percent, print, seed]);

  return (
    <SceneFrame
      kicker="Game 2 · Read the chart"
      title={print ? "What percent of guests said “Above Average”?" : `What percent of guests said “${target}”?`}
      tone="white"
    >
      <p className={styles.lead}>Count the bar, then divide by n = 20.</p>
      <div className={styles.split}>
        <BarChart data={rows.map((row) => ({ label: row.label.replace(" Average", ""), value: row.count }))} title="Hyatt quality ratings" yLabel="Guests" />
        <div>
          {options.map((option) =>
            print ? (
              <div
                key={option}
                className={`${styles.choice} ${option === percent ? styles.choiceCorrect : ""}`}
                style={{ width: "100%", marginBottom: 12 }}
              >
                {option}%
              </div>
            ) : (
              <button
                key={option}
                className={`${styles.choice} ${picked === option ? (option === percent ? styles.choiceCorrect : styles.choiceWrong) : ""}`}
                type="button"
                onClick={() => setPicked(option)}
                style={{ width: "100%", marginBottom: 12 }}
              >
                {option}%
              </button>
            ),
          )}
          {(print || picked !== null) ? (
            <p className={styles.answer}>
              {count} out of 20 is {percent}%. Relative frequency = {formatNumber(count / 20, 2)}; percent frequency = that × 100.
            </p>
          ) : null}
          <LiveOnly>
            <div className={styles.tools}>
              <button className={styles.toolBtn} type="button" onClick={() => { setSeed((value) => value + 1); setPicked(null); }}>
                NEW RATINGS
              </button>
            </div>
          </LiveOnly>
          <p className={styles.small}>The website redraws this sample so the answer is not something to memorise.</p>
        </div>
      </div>
    </SceneFrame>
  );
}

function BinningScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [classesLive, setClassesLive] = useState(6);
  const classCount = print ? 6 : classesLive;
  const costs = useMemo(
    () => (print || seed === 0 ? TEXTBOOK.tuneUpCosts : sampleTuneUpCosts(50, createRng(seed))),
    [print, seed],
  );
  const minValue = Math.min(...costs);
  const maxValue = Math.max(...costs);
  const start = print || seed === 0 ? 50 : minValue;
  const width = Math.max(1, Math.round((maxValue - start) / classCount) || 10);
  const bins = classHistogram(costs, start, width, classCount);
  const approx = (maxValue - minValue) / classCount;
  const lastUpper = bins[bins.length - 1]?.upper ?? maxValue;

  return (
    <SceneFrame kicker="Quantitative data · William Auto" title="Classes are a choice. Make them honest.">
      <p className={styles.lead}>Three decisions: how many classes, how wide, and where the limits sit. Each number belongs in exactly one class.</p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW 50 INVOICES</button>
          <button className={styles.ghost} type="button" onClick={() => setSeed(0)}>Textbook costs</button>
        </div>
        <div className={styles.sliderRow}>
          <b>NUMBER OF CLASSES</b>
          <input type="range" min={5} max={12} value={classesLive} onChange={(event) => setClassesLive(Number(event.target.value))} />
          <span>{classesLive}</span>
        </div>
      </LiveOnly>
      <PrintOnly>
        <p className={styles.muted}>Textbook sample · 6 classes · width 10 · start $50</p>
      </PrintOnly>
      <p className={styles.muted} style={{ marginBottom: 8 }}>
        Raw parts costs for {costs.length} tune-ups ($) · smallest {minValue} · largest {maxValue}
      </p>
      <div className={styles.chips} style={{ marginBottom: 18 }}>
        {costs.map((cost, index) => (
          <span className={styles.chip} key={`${cost}-${index}`}>
            {cost}
          </span>
        ))}
      </div>
      <p className={styles.formula}>
        approx. width = (largest − smallest) / k = ({maxValue} − {minValue}) / {classCount} = {formatNumber(approx, 1)}
        &nbsp;→ used width {width}
        {lastUpper > start + classCount * width - 1
          ? ` · last class extended to ${lastUpper} so the largest cost is included`
          : ""}
      </p>
      <div className={styles.splitWide}>
        <HistogramChart bins={bins} title="Histogram · parts cost ($)" />
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Class</th><th>f</th><th>Rel.</th><th>%</th></tr>
            </thead>
            <tbody>
              {bins.map((bin) => (
                <tr key={bin.label}>
                  <td>{bin.label}</td>
                  <td>{bin.count}</td>
                  <td>{formatNumber(bin.count / costs.length, 2)}</td>
                  <td>{formatNumber((bin.count / costs.length) * 100, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.small}>Guideline: 5–20 classes. Too few hides shape; too many makes every bar a spike.</p>
        </div>
      </div>
    </SceneFrame>
  );
}

function SkewnessScene() {
  const rates = TEXTBOOK.hotelRates;
  const n = rates.length;
  const xBar = mean(rates);
  const med = median(rates);
  const s = sampleStdev(rates);
  const skew = sampleSkewness(rates);
  const bins = equalWidthHistogram(rates, 8);

  return (
    <SceneFrame kicker="Distribution shape" title="Skewness turns the histogram into one number." tone="white">
      <p className={styles.lead}>
        Seventy Shatin / Tai Po studio rates. The histogram is moderately right-skewed — a longer tail on the right.
        Skewness measures that lack of symmetry.
      </p>
      <p className={styles.formula}>
        Skewness = [n / ((n − 1)(n − 2))] × Σᵢ [(xᵢ − x̄) / s]³
      </p>
      <p className={styles.formula}>
        = [{n} / ({n - 1})({n - 2})] × Σᵢ [(xᵢ − {formatNumber(xBar, 1)}) / {formatNumber(s, 2)}]³ = {formatNumber(skew, 2)}
      </p>
      <div className={styles.splitWide}>
        <HistogramChart bins={bins} title="Hotel studio rates ($)" />
        <div>
          <div className={styles.statPair}>
            <article>
              <span>SKEWNESS</span>
              <strong>{formatNumber(skew, 2)}</strong>
              <p className={styles.muted}>0 = symmetric · negative = left tail · positive = right tail</p>
            </article>
            <article>
              <span>MEAN vs MEDIAN</span>
              <strong>{formatNumber(xBar, 1)} vs {formatNumber(med, 0)}</strong>
              <p className={styles.muted}>Right skew: mean usually above median</p>
            </article>
          </div>
          <p className={styles.note}>
            Textbook check: skewness = 0.92 for these 70 hotel rates. Positive skewness matches the right tail in the histogram.
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}

function shapeHistogramBins(counts: number[]): ReturnType<typeof classHistogram> {
  return counts.map((count, index) => {
    const lower = 50 + index * 10;
    const upper = lower + 9;
    return {
      label: `${lower}–${upper}`,
      lower,
      upper,
      midpoint: (lower + upper) / 2,
      count,
    };
  });
}

const SHAPE_HISTOGRAMS = {
  symmetric: shapeHistogramBins([2, 6, 12, 12, 6, 2]),
  left: shapeHistogramBins([1, 2, 4, 8, 14, 11]),
  right: shapeHistogramBins([11, 14, 8, 4, 2, 1]),
  "high-right": shapeHistogramBins([18, 12, 6, 3, 2, 1]),
} as const;

function ShapeScene() {
  const print = usePrintMode();
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const shapes = [
    { id: "symmetric", label: "Symmetric", why: "Left tail mirrors the right. Heights and weights often look like this." },
    { id: "left", label: "Skewed left", why: "A longer tail on the left. Exam scores after a fair test can look like this." },
    { id: "right", label: "Skewed right", why: "A longer tail on the right. Property prices and salaries usually do this." },
    { id: "high-right", label: "Highly skewed right", why: "A very long right tail. A few huge values pull the mean with them." },
  ] as const;
  const current = shapes[round % shapes.length];
  const optionOrder = useMemo(
    () => shuffle([...shapes], createRng(round * 31 + 11)),
    [round],
  );

  if (print) {
    return (
      <SceneFrame kicker="Game 3 · Shape" title="Which way does the tail point?" tone="gold">
        <p className={styles.lead}>Same style of histogram as on the previous slide. Skewness is named for the long tail, not the pile.</p>
        <div className="printGrid4">
          {shapes.map((shape) => (
            <div key={shape.id}>
              <HistogramChart bins={[...SHAPE_HISTOGRAMS[shape.id]]} title={shape.label} />
              <p className={styles.small} style={{ marginTop: 8 }}>{shape.why}</p>
            </div>
          ))}
        </div>
      </SceneFrame>
    );
  }

  return (
    <SceneFrame kicker="Game 3 · Shape" title="Which way does the tail point?" tone="gold">
      <p className={styles.lead}>
        Same kind of histogram as before — class intervals and bar heights. Skewness is named for the long tail, not the pile.
      </p>
      <div className={styles.split}>
        <HistogramChart bins={[...SHAPE_HISTOGRAMS[current.id]]} title={`Mystery histogram ${round + 1}`} />
        <div>
          {optionOrder.map((shape) => (
            <button
              key={shape.id}
              className={`${styles.choice} ${picked === shape.id ? (shape.id === current.id ? styles.choiceCorrect : styles.choiceWrong) : ""}`}
              type="button"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={() => {
                if (picked) return;
                setPicked(shape.id);
                if (shape.id === current.id) setScore((value) => value + 1);
              }}
            >
              {shape.label}
            </button>
          ))}
          {picked ? (
            <>
              <p className={styles.answer}>{current.why}</p>
              <button
                className={styles.toolBtn}
                type="button"
                onClick={() => {
                  setPicked(null);
                  setRound((value) => value + 1);
                }}
              >
                NEXT SHAPE
              </button>
            </>
          ) : null}
          <p className={styles.score}>{score} correct</p>
        </div>
      </div>
    </SceneFrame>
  );
}

function StemLeafScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [stretched, setStretched] = useState(false);
  const costs = useMemo(
    () => (print || seed === 0 ? TEXTBOOK.tuneUpCosts : sampleTuneUpCosts(50, createRng(seed))),
    [print, seed],
  );
  const rows = stemAndLeaf(costs, 1, print ? false : stretched);

  return (
    <SceneFrame kicker="A picture that keeps the numbers" title="Stem-and-leaf is a histogram that still shows the data.">
      <p className={styles.lead}>Stem = leading digits. Leaf = last digit. Stretch a stem when one row is too crowded.</p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setStretched((value) => !value)}>
            {stretched ? "COMPACT STEMS" : "STRETCH STEMS (0–4 / 5–9)"}
          </button>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW SAMPLE</button>
          <button className={styles.ghost} type="button" onClick={() => setSeed(0)}>Textbook</button>
        </div>
      </LiveOnly>
      <div className={styles.split}>
        <pre className={`${styles.card} ${styles.stem}`}>
          {rows.map((row) => `${String(row.stem).padStart(2, " ")} | ${row.leaves.join(" ")}`).join("\n")}
        </pre>
        <div>
          <DotPlot values={costs} title="Dot plot of the same sample" xLabel="Parts cost ($)" />
          <p className={styles.note}>Leaf unit = 1 here. If the data were 8.6, 9.1, 10.2, a leaf unit of 0.1 would keep one digit on the leaf.</p>
        </div>
      </div>
    </SceneFrame>
  );
}

function CumulativeScene() {
  const costs = TEXTBOOK.tuneUpCosts;
  const bins = classHistogram(costs, 50, 10, 6);
  const running = cumulativeFromBins(bins);

  return (
    <SceneFrame kicker="Cumulative views" title="How many costs fall at or below each limit?">
      <p className={styles.lead}>
        A histogram counts how many observations fall <strong>inside</strong> each class. A cumulative table adds them up: how many tune-up costs are <strong>at most</strong> $59? At most $69? At most $79?
      </p>
      <p className={styles.note}>
        Example: {running[1].cumulative} of {costs.length} tune-ups cost ≤ ${running[1].upper} — that is {formatNumber(running[1].cumulativeRelative * 100, 0)}%. Read the table as “at most,” not “exactly.”
      </p>
      <div className={styles.splitWide}>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr><th>Cost ($)</th><th>Cum. f</th><th>Cum. rel.</th><th>Cum. %</th></tr>
            </thead>
            <tbody>
              {running.map((row) => (
                <tr key={row.label}>
                  <td>≤ {row.upper}</td>
                  <td>{row.cumulative}</td>
                  <td>{formatNumber(row.cumulativeRelative, 2)}</td>
                  <td>{formatNumber(row.cumulativeRelative * 100, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <OgiveChart
          title="Ogive · cumulative percent"
          points={running.map((row) => ({ x: row.upper + 0.5, y: row.cumulativeRelative * 100 }))}
        />
      </div>
      <p className={styles.formula}>
        Cumulative frequency = count with value ≤ upper limit &nbsp;|&nbsp; ogive x-axis uses 59.5, 69.5, … (midpoints between classes) &nbsp;|&nbsp; last row = n = {costs.length}
      </p>
    </SceneFrame>
  );
}

function CrosstabScene() {
  const print = usePrintMode();
  const table = TEXTBOOK.shatinHomes;
  const rowTotals = table.rows.map((row) => row.values.reduce((sum, value) => sum + value, 0));
  const colTotals = table.columns.map((_, index) => table.rows.reduce((sum, row) => sum + row.values[index], 0));
  const [modeLive, setModeLive] = useState<"count" | "row" | "col">("count");
  const mode = print ? "count" : modeLive;

  const cell = (rowIndex: number, colIndex: number) => {
    const value = table.rows[rowIndex].values[colIndex];
    if (mode === "count") return String(value);
    if (mode === "row") return `${formatNumber((value / rowTotals[rowIndex]) * 100, 1)}%`;
    return `${formatNumber((value / colTotals[colIndex]) * 100, 1)}%`;
  };

  return (
    <SceneFrame kicker="Two variables at once" title="A crosstab is two frequency distributions sharing one table." tone="white">
      <p className={styles.lead}>100 Shatin homes: type (categorical) by price band (quantitative, grouped). Totals on the edges are ordinary frequency distributions.</p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setModeLive("count")}>COUNTS</button>
          <button className={styles.toolBtn} type="button" onClick={() => setModeLive("row")}>ROW %</button>
          <button className={styles.toolBtn} type="button" onClick={() => setModeLive("col")}>COLUMN %</button>
        </div>
      </LiveOnly>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Price \ Type</th>
              {table.columns.map((column) => <th key={column}>{column}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                {row.values.map((_, colIndex) => <td key={colIndex}>{cell(rowIndex, colIndex)}</td>)}
                <td>{mode === "col" ? "" : mode === "row" ? "100%" : rowTotals[rowIndex]}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              {colTotals.map((total, index) => <td key={table.columns[index]}>{mode === "row" ? "" : mode === "col" ? "100%" : total}</td>)}
              <td>{mode === "count" ? 100 : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        HOS: Home Ownership Scheme flat; HOS (G): HOS under Green Form.
      </p>
      <p className={styles.note}>
        Row % asks: given the price band, what type? Column % asks: given the type, what price? Those are different business questions.
      </p>
    </SceneFrame>
  );
}

function SimpsonGame() {
  const print = usePrintMode();
  const [revealed, setRevealed] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const showSplit = print || revealed;
  const choices = useMemo(
    () =>
      shuffle(
        [
          { id: "B", label: "Contract with B. Higher overall rate." },
          { id: "wait", label: "Wait. Ask about weekdays vs weekends." },
        ],
        createRng(41),
      ),
    [],
  );

  return (
    <SceneFrame kicker="Game 4 · Simpson’s paradox" title="The total can reverse every subgroup." tone="gold">
      <p className={styles.lead}>Two campus cafés report 5-star rates. Shop B looks better overall. Should the university contract with B?</p>
      <div className={styles.splitWide}>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th></th><th>5-star</th><th>Orders</th><th>Rate</th></tr></thead>
            <tbody>
              <tr><td>Shop A</td><td>273</td><td>350</td><td>78%</td></tr>
              <tr><td>Shop B</td><td>289</td><td>350</td><td>83%</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          {print ? (
            <p className="printAnswer">Wait. Ask about weekdays vs weekends before you trust the overall rate.</p>
          ) : !pick ? (
            <div className={styles.choices}>
              {choices.map((choice) => (
                <button key={choice.id} className={styles.choice} type="button" onClick={() => setPick(choice.id)}>
                  {choice.label}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.answer}>
              {pick === "wait"
                ? "Good instinct. Always ask what mix of easy and hard cases sits inside a total."
                : "Overall B wins — but the mix of weekday vs weekend orders is doing the work. Reveal the split."}
            </p>
          )}
          <LiveOnly>
            <div className={styles.tools}>
              <button className={styles.primary} type="button" onClick={() => setRevealed(true)}>REVEAL THE SPLIT</button>
            </div>
          </LiveOnly>
        </div>
      </div>
      {showSplit ? (
        <>
          <div className={styles.splitWide} style={{ marginTop: 18 }}>
            <div className={styles.tableWrap}>
              <p className={styles.kicker}>WEEKDAY</p>
              <table>
                <tbody>
                  <tr><td>A</td><td>81 / 87</td><td>93%</td></tr>
                  <tr><td>B</td><td>234 / 270</td><td>87%</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.tableWrap}>
              <p className={styles.kicker}>WEEKEND</p>
              <table>
                <tbody>
                  <tr><td>A</td><td>192 / 263</td><td>73%</td></tr>
                  <tr><td>B</td><td>55 / 80</td><td>69%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className={styles.note}>
            A is better on weekdays and on weekends. B only wins the total because B takes many easier weekday orders. Aggregating hid the lurking variable. That reversal is Simpson’s paradox.
          </p>
        </>
      ) : null}
    </SceneFrame>
  );
}

function ScatterScene() {
  const print = usePrintMode();
  const [kind, setKind] = useState<"pos" | "neg" | "none">("pos");
  const [seed, setSeed] = useState(0);
  const united = TEXTBOOK.united.map((row) => ({ x: row.goals, y: row.shots }));
  const generated = useMemo(() => {
    const rng = createRng(print ? 20 : 20 + seed);
    const k = print ? "pos" : kind;
    if (k === "pos") return sampleScatter(18, 1.4, 2.2, rng);
    if (k === "neg") return sampleScatter(18, -1.4, 2.2, rng);
    return sampleScatter(18, 0, 4.5, rng);
  }, [print, kind, seed]);
  const r = correlation(united.map((p) => p.x), united.map((p) => p.y));
  const liveKind = print ? "pos" : kind;
  const associationLabel =
    liveKind === "none" ? "no linear pattern" : liveKind === "pos" ? "positive association" : "negative association";

  return (
    <SceneFrame kicker="Scatter diagrams" title="The cloud is the relationship.">
      <p className={styles.lead}>One axis each. A trendline is only a sketch of the cloud — not a proof that one variable causes the other.</p>
      <div className={styles.splitWide}>
        <div>
          <ScatterChart points={united} title="Manchester United · shots vs goals" xLabel="Goals scored" yLabel="Shots" showTrend />
          <p className={styles.small}>Textbook sample: r = {formatNumber(r, 2)}. Higher goals come with more shots, but the points are not on a line.</p>
        </div>
        <div>
          <LiveOnly>
            <div className={styles.tools}>
              <button className={styles.toolBtn} type="button" onClick={() => setKind("pos")}>POSITIVE</button>
              <button className={styles.toolBtn} type="button" onClick={() => setKind("neg")}>NEGATIVE</button>
              <button className={styles.toolBtn} type="button" onClick={() => setKind("none")}>NONE</button>
              <button className={styles.ghost} type="button" onClick={() => setSeed((value) => value + 1)}>redraw</button>
            </div>
          </LiveOnly>
          <PrintOnly>
            <p className={styles.muted}>Example · positive association</p>
          </PrintOnly>
          <ScatterChart
            points={generated}
            title={`${print ? "Example cloud" : "Live cloud"} · ${associationLabel}`}
            xLabel="x"
            yLabel="y"
            showTrend={liveKind !== "none"}
          />
        </div>
      </div>
    </SceneFrame>
  );
}

function MapScene() {
  return (
    <SceneFrame kicker="Tool map" title="Pick the tool from the data type." tone="dark">
      <div className={styles.splitWide} style={{ marginTop: 28 }}>
        <article className={styles.card}>
          <p className={styles.kicker}>CATEGORICAL</p>
          <p>Frequency / relative / percent tables. Bar chart. Pie chart. Pareto diagram. Crosstab.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>QUANTITATIVE</p>
          <p>Frequency tables, histogram, dot plot, stem-and-leaf, ogive, scatter, crosstab.</p>
        </article>
      </div>
      <p className={styles.lead}>Next: turn the picture into numbers — center, spread, shape, and association.</p>
    </SceneFrame>
  );
}

function MeanMedianScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [starLive, setStarLive] = useState(0);
  const star = print ? 0 : starLive;
  const base = useMemo(
    () => (print || seed === 0 ? [12, 14, 18, 19, 26, 27, 27] : sampleTuneUpCosts(7, createRng(seed)).map((value) => Math.round(value / 5))),
    [print, seed],
  );
  const values = star > 0 ? [...base, star] : base;
  const xBar = mean(values);
  const med = median(values);
  const modes = mode(values);

  return (
    <SceneFrame kicker="Measures of location" title="The mean walks toward the outlier. The median does not.">
      <p className={styles.lead}>Mean = average. Median = middle of the ordered list. Mode = the value that appears most often.</p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>ADD A STAR SALARY</b>
          <input type="range" min={0} max={120} step={5} value={starLive} onChange={(event) => setStarLive(Number(event.target.value))} />
          <span>{starLive === 0 ? "off" : starLive}</span>
        </div>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW SMALL SAMPLE</button>
          <button className={styles.ghost} type="button" onClick={() => { setSeed(0); setStarLive(0); }}>Textbook 7 values</button>
        </div>
      </LiveOnly>
      <div className={styles.chips}>
        {[...values].sort((a, b) => a - b).map((value, index) => (
          <span className={styles.chip} key={`${value}-${index}`}>{value}</span>
        ))}
      </div>
      <div className={styles.three} style={{ marginTop: 22 }}>
        <article className={styles.card}><p className={styles.kicker}>MEAN x̄</p><h1 style={{ fontSize: 42 }}>{formatNumber(xBar, 1)}</h1><p className={styles.muted}>Σxᵢ / n</p></article>
        <article className={styles.card}><p className={styles.kicker}>MEDIAN</p><h1 style={{ fontSize: 42 }}>{formatNumber(med, 1)}</h1><p className={styles.muted}>{values.length % 2 ? "middle value" : "average of two middle values"}</p></article>
        <article className={styles.card}><p className={styles.kicker}>MODE</p><h1 style={{ fontSize: 42 }}>{modes.length ? modes.join(", ") : "—"}</h1><p className={styles.muted}>{modes.length > 1 ? "bimodal / multimodal" : modes.length === 1 ? "most frequent" : "no repeated value"}</p></article>
      </div>
      <p className={styles.note}>
        A statistician has his head in the oven and his feet in the fridge. “On average,” he says, “pretty good.” If Hong Kong mean income rises while the median falls, a typical person is not better off.
      </p>
    </SceneFrame>
  );
}

function describePercentileStep(n: number, p: number, rates: number[]) {
  const i = (p / 100) * n;
  if (p === 0) {
    return {
      i,
      method: "endpoint" as const,
      highlightIndices: [0],
      stepText: `x₁ = ${rates[0]}`,
      shortRule: "endpoint",
    };
  }
  if (p === 100) {
    return {
      i,
      method: "endpoint" as const,
      highlightIndices: [n - 1],
      stepText: `x${n} = ${rates[n - 1]}`,
      shortRule: "endpoint",
    };
  }
  if (Number.isInteger(i)) {
    return {
      i,
      method: "average" as const,
      highlightIndices: [i - 1, i],
      stepText: `(${rates[i - 1]} + ${rates[i]}) / 2`,
      shortRule: `i = ${i} is whole → average #${i} and #${i + 1}`,
    };
  }
  const rank = Math.ceil(i);
  return {
    i,
    method: "round-up" as const,
    highlightIndices: [rank - 1],
    stepText: `x${rank} = ${rates[rank - 1]}`,
    shortRule: `i = ${formatNumber(i, 1)} → round up to #${rank}`,
  };
}

function PercentileScene() {
  const print = usePrintMode();
  const [pLive, setPLive] = useState(80);
  const p = print ? 80 : pLive;
  const rates = TEXTBOOK.hotelRates;
  const n = rates.length;
  const value = percentile(rates, p);
  const { q1, q2, q3 } = quartiles(rates);
  const step = describePercentileStep(n, p, rates);
  const q1Step = describePercentileStep(n, 25, rates);
  const q2Step = describePercentileStep(n, 50, rates);
  const q3Step = describePercentileStep(n, 75, rates);
  const activeMethod = step.method === "endpoint" ? null : step.method;

  return (
    <SceneFrame kicker="Percentiles and quartiles" title="A percentile is a position, not a percent of the value." tone="white">
      <p className={styles.lead}>70 Shatin / Tai Po studio rates, already ordered. At least p% of rooms cost this much or less.</p>
      <div className={styles.rulePair}>
        <article className={`${styles.ruleCard} ${activeMethod === "average" ? styles.ruleCardActive : ""}`}>
          <span>CASE A · i IS A WHOLE NUMBER</span>
          Average the two neighbours: x<sub>i</sub> and x<sub>i+1</sub>. Example at n = 70: p = 50 → i = 35 → average #35 and #36.
        </article>
        <article className={`${styles.ruleCard} ${activeMethod === "round-up" ? styles.ruleCardActive : ""}`}>
          <span>CASE B · i HAS A DECIMAL</span>
          Round i <strong>up</strong> to the next position and take that one value: x<sub>⌈i⌉</sub>. Example: p = 25 → i = 17.5 → take #18.
        </article>
      </div>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setPLive(25)}>25TH · ROUND UP</button>
          <button className={styles.toolBtn} type="button" onClick={() => setPLive(50)}>50TH · AVERAGE</button>
          <button className={styles.toolBtn} type="button" onClick={() => setPLive(75)}>75TH · ROUND UP</button>
          <button className={styles.toolBtn} type="button" onClick={() => setPLive(80)}>80TH · AVERAGE</button>
        </div>
        <div className={styles.sliderRow}>
          <b>p TH PERCENTILE</b>
          <input type="range" min={0} max={100} value={pLive} onChange={(event) => setPLive(Number(event.target.value))} />
          <span>{pLive}</span>
        </div>
      </LiveOnly>
      <p className={styles.small}>Ordered sample (n = {n}). Position labels show where each rate sits; highlighted cells are the ones used in the step below.</p>
      <div className={styles.chipsScroll}>
        <div className={styles.chips}>
          {rates.map((rate, index) => (
            <span
              className={`${styles.chip} ${step.highlightIndices.includes(index) ? styles.chipActive : ""}`}
              key={`${rate}-${index}`}
            >
              <span className={styles.chipIndex}>{index + 1}</span>
              {rate}
            </span>
          ))}
        </div>
      </div>
      <p className={styles.note}>
        {step.method === "endpoint"
          ? `At p = ${p}, use the ${p === 0 ? "smallest" : "largest"} ordered value.`
          : step.method === "average"
            ? `Right now: i = ${step.i} is a whole number → Case A → average positions ${step.i} and ${step.i + 1}.`
            : `Right now: i = ${formatNumber(step.i, 1)} is not whole → Case B → round up to position ${Math.ceil(step.i)}.`}
      </p>
      <p className={styles.formula}>
        i = (p/100) × n = ({p}/100) × {n} = {formatNumber(step.i, 1)} → {step.stepText} = {formatNumber(value, 1)}
      </p>
      <div className={styles.three}>
        <article className={styles.card}>
          <p className={styles.kicker}>FIRST QUARTILE · Q1</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>25th percentile</p>
          <h1 style={{ fontSize: 36 }}>{q1}</h1>
          <p className={styles.muted}>{q1Step.shortRule}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>SECOND QUARTILE · Q2</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>50th percentile · median</p>
          <h1 style={{ fontSize: 36 }}>{q2}</h1>
          <p className={styles.muted}>{q2Step.shortRule}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>THIRD QUARTILE · Q3</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>75th percentile</p>
          <h1 style={{ fontSize: 36 }}>{q3}</h1>
          <p className={styles.muted}>{q3Step.shortRule}</p>
        </article>
      </div>
      <p className={styles.small}>Textbook check: 80th percentile of the hotel rates is 542; Q3 is 525.</p>
    </SceneFrame>
  );
}

function ComputeGame() {
  const print = usePrintMode();
  const [seedLive, setSeedLive] = useState(3);
  const activeSeed = print ? 3 : seedLive;
  const [guessMean, setGuessMean] = useState("");
  const [guessMed, setGuessMed] = useState("");
  const [message, setMessage] = useState("");
  const values = useMemo(() => sampleTuneUpCosts(8, createRng(activeSeed)), [activeSeed]);
  const trueMean = mean(values);
  const trueMed = median(values);

  const check = () => {
    const meanOk = Math.abs(Number(guessMean) - trueMean) < 0.15;
    const medOk = Math.abs(Number(guessMed) - trueMed) < 0.15;
    if (!Number.isFinite(Number(guessMean)) || !Number.isFinite(Number(guessMed))) {
      setMessage("Enter both numbers first.");
      return;
    }
    if (meanOk && medOk) setMessage(`Both right. Mean ${formatNumber(trueMean, 2)}, median ${formatNumber(trueMed, 1)}.`);
    else setMessage(`Mean is ${formatNumber(trueMean, 2)} (you ${meanOk ? "got it" : "missed"}). Median is ${formatNumber(trueMed, 1)} (you ${medOk ? "got it" : "missed"}).`);
  };

  return (
    <SceneFrame kicker="Game 5 · Compute" title="Eight new numbers. Two answers." tone="gold">
      <p className={styles.lead}>Order them first. Median cares about position; mean cares about every value.</p>
      <div className={styles.chips}>
        {values.map((value, index) => <span className={styles.chip} key={`${value}-${index}`}>{value}</span>)}
      </div>
      {print ? (
        <p className="printAnswer">
          Answers (ordered first): mean = {formatNumber(trueMean, 2)}, median = {formatNumber(trueMed, 1)}.
        </p>
      ) : (
        <div className={styles.tools}>
          <label>
            Mean
            <input className={styles.numberInput} value={guessMean} onChange={(event) => setGuessMean(event.target.value)} />
          </label>
          <label>
            Median
            <input className={styles.numberInput} value={guessMed} onChange={(event) => setGuessMed(event.target.value)} />
          </label>
          <button className={styles.primary} type="button" onClick={check}>CHECK</button>
          <button className={styles.toolBtn} type="button" onClick={() => { setSeedLive((value) => value + 1); setGuessMean(""); setGuessMed(""); setMessage(""); }}>
            NEW SAMPLE
          </button>
        </div>
      )}
      {message ? <p className={styles.answer}>{message}</p> : null}
    </SceneFrame>
  );
}

function VariabilityScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [focusLive, setFocusLive] = useState<"range" | "iqr">("range");
  const rates = useMemo(
    () => (print || seed === 0 ? TEXTBOOK.hotelRates : sampleHotelRates(70, createRng(seed))),
    [print, seed],
  );
  const ordered = useMemo(() => [...rates].sort((a, b) => a - b), [rates]);
  const n = ordered.length;
  const xBar = mean(ordered);
  const s2 = sampleVariance(ordered);
  const s = sampleStdev(ordered);
  const cv = coefficientOfVariation(ordered);
  const spread = iqr(ordered);
  const { q1, q3 } = quartiles(ordered);
  const focus = print ? "range" : focusLive;
  const minVal = ordered[0];
  const maxVal = ordered[n - 1];
  const rangeHighlight = useMemo(
    () => ordered.map((value, index) => (value === minVal || value === maxVal ? index : -1)).filter((index) => index >= 0),
    [ordered, minVal, maxVal],
  );
  const iqrHighlight = useMemo(() => {
    const q1Step = describePercentileStep(n, 25, ordered);
    const q3Step = describePercentileStep(n, 75, ordered);
    return [...new Set([...q1Step.highlightIndices, ...q3Step.highlightIndices])];
  }, [ordered, n]);
  const highlightSet = new Set(focus === "range" ? rangeHighlight : iqrHighlight);

  return (
    <SceneFrame kicker="Measures of variability" title="Same average, very different risk.">
      <p className={styles.lead}>Range uses two points and panics at outliers. IQR keeps the middle 50%. Variance averages squared deviations; standard deviation puts that back in the original units.</p>
      <LiveOnly>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW 70 RATES</button>
          <button className={styles.ghost} type="button" onClick={() => setSeed(0)}>Textbook hotels</button>
        </div>
      </LiveOnly>
      <p className={styles.small}>
        Ordered sample (n = {n}).
        <LiveOnly> Click <strong>Range</strong> or <strong>IQR</strong> below to highlight the values each measure uses.</LiveOnly>
        {focus === "range"
          ? ` Highlighted: min = ${minVal}, max = ${maxVal}.`
          : ` Highlighted: positions used for Q1 (${q1}) and Q3 (${q3}).`}
      </p>
      <div className={styles.chipsScroll}>
        <div className={styles.chips}>
          {ordered.map((rate, index) => (
            <span
              className={`${styles.chip} ${highlightSet.has(index) ? styles.chipActive : ""}`}
              key={`${rate}-${index}`}
            >
              <span className={styles.chipIndex}>{index + 1}</span>
              {rate}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.three}>
        <article
          className={`${styles.card} ${styles.statCard} ${focus === "range" ? styles.statCardActive : ""}`}
          onClick={() => setFocusLive("range")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setFocusLive("range");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <p className={styles.kicker}>RANGE</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>maximum − minimum</p>
          <h1 style={{ fontSize: 36 }}>{formatNumber(dataRange(ordered), 0)}</h1>
          <p className={styles.muted}>{maxVal} − {minVal}</p>
        </article>
        <article
          className={`${styles.card} ${styles.statCard} ${focus === "iqr" ? styles.statCardActive : ""}`}
          onClick={() => setFocusLive("iqr")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setFocusLive("iqr");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <p className={styles.kicker}>INTERQUARTILE RANGE · IQR</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>Q3 − Q1 · spread of the middle 50%</p>
          <h1 style={{ fontSize: 36 }}>{formatNumber(spread, 0)}</h1>
          <p className={styles.muted}>Q3 {q3} − Q1 {q1}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.kicker}>SAMPLE STANDARD DEVIATION · s</p>
          <p className={styles.small} style={{ margin: "4px 0 0" }}>typical distance from the mean, in original units</p>
          <h1 style={{ fontSize: 36 }}>{formatNumber(s, 2)}</h1>
          <p className={styles.muted}>
            Coefficient of Variation (CV) = {formatNumber(cv, 1)}% of mean {formatNumber(xBar, 2)}
          </p>
        </article>
      </div>
      <p className={styles.formula}>
        s² = Σ(xᵢ − x̄)² / (n − 1) = {formatNumber(s2, 2)} &nbsp;&nbsp; s = √s² = {formatNumber(s, 2)} &nbsp;&nbsp; sample uses n − 1
      </p>
      <p className={styles.formula}>
        CV = (s / x̄) × 100% = ({formatNumber(s, 2)} / {formatNumber(xBar, 2)}) × 100% = {formatNumber(cv, 1)}%
      </p>
    </SceneFrame>
  );
}

function SupplierGame() {
  const print = usePrintMode();
  const [pick, setPick] = useState<string | null>(null);
  const a = [4, 5, 5, 5, 6, 14];
  const b = [6, 7, 7, 8, 8, 9];
  const choices = useMemo(
    () =>
      shuffle(
        [
          { id: "A", label: "FastGo · slightly shorter average" },
          { id: "B", label: "Steady · almost the same average, much less scatter" },
        ],
        createRng(53),
      ),
    [],
  );

  return (
    <SceneFrame kicker="Game 6 · Two suppliers" title="Who do you award the contract to?" tone="gold">
      <p className={styles.lead}>Both promise parts in about a week. You care about on-time production, not just the average.</p>
      <div className={styles.splitWide}>
        <div>
          <DotPlot values={a} title={`FastGo · mean ${formatNumber(mean(a), 1)} days`} xLabel="Delivery time (days)" />
          <DotPlot values={b} title={`Steady · mean ${formatNumber(mean(b), 1)} days`} xLabel="Delivery time (days)" />
        </div>
        <div>
          {print ? (
            <p className="printAnswer">
              Steady · almost the same average, much less scatter. FastGo mean {formatNumber(mean(a), 1)}, s = {formatNumber(sampleStdev(a), 2)}. Steady mean {formatNumber(mean(b), 1)}, s = {formatNumber(sampleStdev(b), 2)}. One disastrous 14-day delay is the business risk.
            </p>
          ) : (
            <>
              <div className={styles.choices} style={{ gridTemplateColumns: "1fr" }}>
                {choices.map((choice) => (
                  <button key={choice.id} className={styles.choice} type="button" onClick={() => setPick(choice.id)}>
                    {choice.label}
                  </button>
                ))}
              </div>
              {pick ? (
                <p className={styles.answer}>
                  FastGo mean {formatNumber(mean(a), 1)}, s = {formatNumber(sampleStdev(a), 2)}. Steady mean {formatNumber(mean(b), 1)}, s = {formatNumber(sampleStdev(b), 2)}.
                  The extra “fast” average is one disastrous 14-day delay. Variability is the business risk.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

function ZScene() {
  const print = usePrintMode();
  const rates = TEXTBOOK.hotelRates;
  const xBar = mean(rates);
  const s = sampleStdev(rates);
  const smallest = Math.min(...rates);
  const largest = Math.max(...rates);
  const [zLive, setZLive] = useState(2);
  const z = print ? 2 : zLive;
  const [seed, setSeed] = useState(1);
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("");
  const challenge = useMemo(() => {
    const rng = createRng(40 + (print ? 0 : seed));
    const x = print ? 425 : rates[Math.floor(rng() * rates.length)];
    return { x, z: zScore(x, xBar, s) };
  }, [print, seed, xBar, s, rates]);
  const cheb = z > 1 ? chebyshevMinimum(z) : 0;
  const lo = xBar - z * s;
  const hi = xBar + z * s;

  return (
    <SceneFrame kicker="z-scores, Chebyshev, empirical rule" title="How surprising is this room rate?">
      <p className={styles.lead}>
        A <strong>z-score</strong> (also called a <strong>standardized value</strong>) counts how many standard deviations a data point sits from the mean. Positive z is above x̄; negative z is below.
      </p>
      <div className={styles.split}>
        <div>
          <p className={styles.formula}>z = (x − x̄) / s &nbsp;&nbsp; x̄ = {formatNumber(xBar, 2)} &nbsp; s = {formatNumber(s, 2)}</p>
          <p className={styles.muted}>
            Smallest rate {smallest} → z = {formatNumber(zScore(smallest, xBar, s), 2)}.
            Largest {largest} → z = {formatNumber(zScore(largest, xBar, s), 2)}.
            |z| &gt; 3 is a common outlier flag — none here.
          </p>
          <p className={styles.note}>
            <strong>Chebyshev&apos;s theorem.</strong> For <em>any</em> data set, if z &gt; 1 then at least (1 − 1/z²) of the values lie within z standard deviations of the mean — between x̄ − zs and x̄ + zs. z need not be a whole number.
          </p>
          <LiveOnly>
            <div className={styles.sliderRow}>
              <b>CHEBYSHEV · z</b>
              <input type="range" min={15} max={40} value={Math.round(zLive * 10)} onChange={(event) => setZLive(Number(event.target.value) / 10)} />
              <span>{formatNumber(zLive, 1)}</span>
            </div>
          </LiveOnly>
          <p className={styles.formula}>
            At least (1 − 1/{formatNumber(z, 1)}²) = {formatNumber(cheb * 100, 0)}% lie in [{formatNumber(lo, 0)}, {formatNumber(hi, 0)}]
          </p>
          <p className={styles.small}>
            Empirical rule (bell-shaped data only): about 68% within ±1s, 95% within ±2s, 99.7% within ±3s.
          </p>
        </div>
        <div className={styles.card}>
          <p className={styles.kicker}>GAME 7 · COMPUTE A Z-SCORE</p>
          <h1 style={{ fontSize: 32 }}>x = {challenge.x}</h1>
          <p className={styles.muted}>Standardize this room rate using x̄ and s above.</p>
          {print ? (
            <p className="printAnswer">z = {formatNumber(challenge.z, 2)}</p>
          ) : (
            <div className={styles.tools}>
              <input className={styles.numberInput} value={guess} onChange={(event) => setGuess(event.target.value)} />
              <button className={styles.primary} type="button" onClick={() => {
                const value = Number(guess);
                if (!Number.isFinite(value)) { setMsg("Enter a number."); return; }
                setMsg(Math.abs(value - challenge.z) < 0.08 ? `Correct: z = ${formatNumber(challenge.z, 2)}` : `z = ${formatNumber(challenge.z, 2)}. Sign tells you which side of the mean.`);
              }}>CHECK</button>
              <button className={styles.toolBtn} type="button" onClick={() => { setSeed((value) => value + 1); setGuess(""); setMsg(""); }}>NEW x</button>
            </div>
          )}
          {msg ? <p className={styles.answer}>{msg}</p> : null}
        </div>
      </div>
    </SceneFrame>
  );
}

function BoxPlotScene() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [spikeLive, setSpikeLive] = useState(0);
  const spike = print ? 0 : spikeLive;
  const base = useMemo(
    () => (print || seed === 0 ? TEXTBOOK.hotelRates : sampleHotelRates(70, createRng(seed))),
    [print, seed],
  );
  const values = spike > 0 ? [...base, spike] : base;
  const stats = boxPlotStats(values);

  return (
    <SceneFrame kicker="Five-number summary" title="A box plot is a five-number summary you can see." tone="white">
      <p className={styles.lead}>Min, Q1, median, Q3, max. Whiskers stop at the last point inside 1.5 × IQR of the quartiles. Stars beyond the fences are outliers.</p>
      <LiveOnly>
        <div className={styles.sliderRow}>
          <b>DROP IN A PENTHOUSE</b>
          <input type="range" min={0} max={1200} step={25} value={spikeLive} onChange={(event) => setSpikeLive(Number(event.target.value))} />
          <span>{spikeLive === 0 ? "off" : spikeLive}</span>
        </div>
        <div className={styles.tools}>
          <button className={styles.toolBtn} type="button" onClick={() => setSeed((value) => value + 1)}>NEW SAMPLE</button>
          <button className={styles.ghost} type="button" onClick={() => { setSeed(0); setSpikeLive(0); }}>Textbook hotels</button>
        </div>
      </LiveOnly>
      <BoxPlotChart stats={stats} title="Hotel studio rates ($)" />
      <p className={styles.formula}>
        fences: Q1 − 1.5×IQR = {formatNumber(stats.lowerFence, 0)} &nbsp;·&nbsp; Q3 + 1.5×IQR = {formatNumber(stats.upperFence, 0)}
        &nbsp;·&nbsp; outliers: {stats.outliers.length ? stats.outliers.join(", ") : "none"}
      </p>
    </SceneFrame>
  );
}

function CorrelationScene() {
  const print = usePrintMode();
  const { distance, score } = TEXTBOOK.golf;
  const cov = covariance(distance, score);
  const sx = sampleStdev(distance);
  const sy = sampleStdev(score);
  const r = correlation(distance, score);
  const [seed, setSeed] = useState(2);
  const [kindLive, setKindLive] = useState<"pos" | "neg" | "none">("neg");
  const kind = print ? "pos" : kindLive;
  const live = useMemo(() => {
    const rng = createRng(print ? 2 : seed);
    if (kind === "pos") return sampleScatter(16, 1.1, 1.8, rng);
    if (kind === "neg") return sampleScatter(16, -1.1, 1.8, rng);
    return sampleScatter(16, 0, 4.5, rng);
  }, [print, seed, kind]);
  const liveR = correlation(live.map((p) => p.x), live.map((p) => p.y));
  const liveLabel =
    kind === "none" ? "weak / no linear pattern" : kind === "pos" ? "positive association" : "negative association";

  return (
    <SceneFrame kicker="Association" title="Correlation measures the straight-line cloud — not a cause.">
      <p className={styles.lead}>
        Golfing study: across six rounds, a player logs <strong>average driving distance</strong> (how far the ball travels off the tee with the driver, in yards) and <strong>18-hole score</strong> (total strokes for the round). In golf, a <em>lower</em> score is better — 69 beats 71.
      </p>
      <p className={styles.note}>
        Idea being tested: if longer drives leave shorter approach shots, rounds with more distance might also show fewer strokes. That would look like a <strong>negative</strong> correlation — distance up, score down. The data are just six rounds; r ≈ −0.96 describes the pattern, not proof that the driver caused the result.
      </p>
      <div className={styles.splitWide}>
        <div>
          <ScatterChart
            points={distance.map((x, index) => ({ x, y: score[index] }))}
            title="Driving distance vs 18-hole score · 6 rounds"
            xLabel="Distance (yds)"
            yLabel="Score (strokes · lower is better)"
            showTrend
          />
          <p className={styles.note}>
            <strong>s<sub>x</sub></strong> = sample standard deviation of x (driving distance).
            &nbsp;<strong>s<sub>y</sub></strong> = sample standard deviation of y (score).
            &nbsp;<strong>s<sub>xy</sub></strong> = sample covariance — average signed product of deviations; positive when x and y move together, negative when they move in opposite directions.
            &nbsp;<strong>r</strong> = sample correlation coefficient — strength and direction of the <em>linear</em> association; always between −1 and +1.
          </p>
          <p className={styles.formula}>
            s<sub>xy</sub> = Σ(xᵢ − x̄)(yᵢ − ȳ) / (n − 1) = {formatNumber(cov, 2)}
          </p>
          <p className={styles.formula}>
            r = s<sub>xy</sub> / (s<sub>x</sub> s<sub>y</sub>) = {formatNumber(cov, 2)} / ({formatNumber(sx, 2)} × {formatNumber(sy, 2)}) = {formatNumber(r, 3)}
          </p>
          <p className={styles.small}>
            r ≈ −0.96 here — strong negative linear association (near −1). Near 0 would mean little linear pattern. Correlation is not causation: course management, putting, or easier courses could explain both distance and score.
          </p>
        </div>
        <div>
          <LiveOnly>
            <div className={styles.tools}>
              <button className={styles.toolBtn} type="button" onClick={() => setKindLive("pos")}>POSITIVE</button>
              <button className={styles.toolBtn} type="button" onClick={() => setKindLive("neg")}>NEGATIVE</button>
              <button className={styles.toolBtn} type="button" onClick={() => setKindLive("none")}>NONE</button>
              <button className={styles.ghost} type="button" onClick={() => setSeed((value) => value + 1)}>redraw</button>
            </div>
          </LiveOnly>
          <ScatterChart
            points={live}
            title={`${print ? "Example cloud" : "Live sample"} · ${liveLabel} · r = ${formatNumber(liveR, 2)}`}
            xLabel="x"
            yLabel="y"
            showTrend={kind !== "none"}
          />
          <p className={styles.note}>
            <strong>r</strong> = sample correlation coefficient — between −1 and +1. Positive r: upward cloud. Negative r: downward cloud. Near 0: little linear association (there may still be a curve).
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}

function GroupedScene() {
  const bins = classHistogram(TEXTBOOK.hotelRates, 425, 40, 5);
  const n = bins.reduce((sum, bin) => sum + bin.count, 0);
  const approxMean = weightedMean(bins.map((bin) => bin.midpoint), bins.map((bin) => bin.count));
  const trueMean = mean(TEXTBOOK.hotelRates);
  const groupedVar = groupedVariance(bins);
  const groupedS = Math.sqrt(groupedVar);
  const trueS = sampleStdev(TEXTBOOK.hotelRates);
  const sumFM = bins.reduce((sum, bin) => sum + bin.count * bin.midpoint, 0);
  const sumFMDevSq = bins.reduce((sum, bin) => sum + bin.count * (bin.midpoint - approxMean) ** 2, 0);
  const courses = [
    { code: "DOTE2011", name: "Statistics", credits: 3, points: 4.0 },
    { code: "FIN2010", name: "Finance", credits: 3, points: 3.0 },
    { code: "ECON1010", name: "Economics", credits: 2, points: 3.3 },
    { code: "MKT3020", name: "Marketing", credits: 4, points: 3.7 },
  ];
  const credits = courses.map((course) => course.credits);
  const points = courses.map((course) => course.points);
  const creditTotal = credits.reduce((sum, value) => sum + value, 0);
  const gpa = weightedMean(points, credits);
  const plainMean = mean(points);

  return (
    <SceneFrame kicker="Weighted mean and grouped data" title="When some values count more, stop using a plain average." tone="white">
      <p className={styles.lead}>
        Example: one student&apos;s semester GPA. Each course has <strong>grade points</strong> (xᵢ) and <strong>credits</strong> (wᵢ).
        A 4-credit A− should count more than a 2-credit B+ — that is a weighted mean, not a plain average of the four grades.
      </p>
      <div className={styles.splitWide}>
        <div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Course</th><th>Credits wᵢ</th><th>Points xᵢ</th><th>wᵢxᵢ</th></tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.code}>
                    <td>{course.code} · {course.name}</td>
                    <td>{course.credits}</td>
                    <td>{formatNumber(course.points, 1)}</td>
                    <td>{formatNumber(course.credits * course.points, 1)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Semester total</strong></td>
                  <td>{creditTotal}</td>
                  <td></td>
                  <td>{formatNumber(courses.reduce((sum, course) => sum + course.credits * course.points, 0), 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.formula}>
            x̄ = Σ wᵢxᵢ / Σ wᵢ = ({courses.map((course) => `${course.credits}×${formatNumber(course.points, 1)}`).join(" + ")}) / {creditTotal} = {formatNumber(gpa, 2)}
          </p>
          <p className={styles.small}>
            Plain average of the four grade points = {formatNumber(plainMean, 2)}. GPA = {formatNumber(gpa, 2)} because the 4-credit marketing grade pulls harder than the 2-credit economics grade.
          </p>
        </div>
        <div>
          <p className={styles.muted}>Grouped data uses the same idea: class midpoints Mᵢ stand in for every value in the bin; frequencies fᵢ are the weights.</p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Class</th><th>M</th><th>f</th><th>fM</th><th>f(M−x̄)²</th></tr>
              </thead>
              <tbody>
                {bins.map((bin) => (
                  <tr key={bin.label}>
                    <td>{bin.label}</td>
                    <td>{bin.midpoint}</td>
                    <td>{bin.count}</td>
                    <td>{bin.count * bin.midpoint}</td>
                    <td>{formatNumber(bin.count * (bin.midpoint - approxMean) ** 2, 0)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total</strong></td>
                  <td></td>
                  <td>{n}</td>
                  <td>{formatNumber(sumFM, 0)}</td>
                  <td>{formatNumber(sumFMDevSq, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.formula}>
            x̄ = Σ fᵢMᵢ / n = {formatNumber(sumFM, 0)} / {n} = {formatNumber(approxMean, 2)}
          </p>
          <p className={styles.formula}>
            s² = Σ fᵢ(Mᵢ − x̄)² / (n − 1) = {formatNumber(sumFMDevSq, 0)} / {n - 1} = {formatNumber(groupedVar, 2)}
          </p>
          <p className={styles.formula}>s = √s² = {formatNumber(groupedS, 2)}</p>
          <p className={styles.small}>
            Hotel rates (n = {n}) · grouped x̄ = {formatNumber(approxMean, 2)} vs actual {formatNumber(trueMean, 2)} · grouped s = {formatNumber(groupedS, 2)} vs actual {formatNumber(trueS, 2)}. Approximations — close, not exact.
          </p>
        </div>
      </div>
    </SceneFrame>
  );
}

function FinalQuiz() {
  const print = usePrintMode();
  const [seed, setSeed] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const data = useMemo(() => {
    if (print || seed === 0) return TEXTBOOK.correlationTrap;
    const kind = nextCorrelationQuizKind(seed);
    return sampleCorrelationQuiz(8, kind, createRng(90 + seed));
  }, [print, seed]);
  const r = correlation(data.a, data.b);
  const answer = Math.abs(r) < 0.3 ? "weak" : r > 0.7 ? "strong-pos" : r < -0.7 ? "strong-neg" : "moderate";
  const answerNote = (() => {
    if (print || seed === 0) {
      return `r = ${formatNumber(r, 2)}. The textbook table climbs in both columns, so many students guess about 0.95 without plotting — plot first, then read r.`;
    }
    if (answer === "weak") {
      return `r = ${formatNumber(r, 2)}. Both columns can look busy in the table while the cloud shows little linear association.`;
    }
    if (answer === "strong-neg") {
      return `r = ${formatNumber(r, 2)}. A downward cloud is easy to miss if you only scan the table — plot, then compute r.`;
    }
    if (answer === "moderate") {
      return `r = ${formatNumber(r, 2)}. Neither “no link” nor “perfect line” — let the scatter and r decide.`;
    }
    return `r = ${formatNumber(r, 2)}. Strong positive linear pattern — still plot before you trust the table.`;
  })();

  const options = useMemo(
    () =>
      shuffle(
        [
          { id: "strong-neg", label: "Strong negative linear relationship" },
          { id: "weak", label: "Little linear relationship" },
          { id: "strong-pos", label: "Strong positive linear relationship" },
          { id: "moderate", label: "A moderate linear relationship — look at r before you shout" },
        ],
        createRng((print ? 0 : seed) * 19 + 7),
      ),
    [print, seed],
  );

  return (
    <SceneFrame kicker="Game 8 · Check your understanding" title="Do not trust a table until you see the cloud." tone="gold">
      <p className={styles.lead}>
        Plot the table, then compute <strong>r</strong> — the sample correlation coefficient — do not guess from the numbers alone.
        r measures linear association only; it always lies between −1 and +1.
      </p>
      <div className={styles.split}>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>A</th><th>B</th></tr></thead>
            <tbody>
              {data.a.map((value, index) => (
                <tr key={`${value}-${index}`}><td>{value}</td><td>{data.b[index]}</td></tr>
              ))}
            </tbody>
          </table>
          <LiveOnly>
            <div className={styles.tools}>
              <button className={styles.toolBtn} type="button" onClick={() => { setSeed((value) => value + 1); setPick(null); }}>NEW NUMBERS</button>
              <button className={styles.ghost} type="button" onClick={() => { setSeed(0); setPick(null); }}>Textbook table</button>
            </div>
            <p className={styles.small}>Each new draw cycles: strong positive → strong negative → weak → moderate.</p>
          </LiveOnly>
        </div>
        <div>
          <ScatterChart
            points={data.a.map((x, index) => ({ x, y: data.b[index] }))}
            title={`Scatter · r (correlation) = ${formatNumber(r, 2)}`}
            xLabel="Variable A"
            yLabel="Variable B"
            showTrend
          />
          {options.map((option) =>
            print ? (
              <div
                key={option.id}
                className={`${styles.choice} ${option.id === answer ? styles.choiceCorrect : ""}`}
                style={{ width: "100%", marginBottom: 10 }}
              >
                {option.label}
              </div>
            ) : (
              <button
                key={option.id}
                className={`${styles.choice} ${pick === option.id ? (option.id === answer ? styles.choiceCorrect : styles.choiceWrong) : ""}`}
                type="button"
                style={{ width: "100%", marginBottom: 10 }}
                onClick={() => setPick(option.id)}
              >
                {option.label}
              </button>
            ),
          )}
          {(print || pick) ? (
            <p className={styles.answer}>{answerNote}</p>
          ) : null}
        </div>
      </div>
    </SceneFrame>
  );
}

function PromptsToTryScene() {
  const prompts = [
    {
      topic: "Histogram · daily returns",
      text: "From aapl_daily.csv, compute daily % return from Close. Plot a histogram with about 15 classes. Report the mean and standard deviation of daily returns.",
    },
    {
      topic: "Center & spread",
      text: "Using aapl_daily.csv, report the mean, median, and sample standard deviation of the Close price. Which centre is more affected if one day had a bad data entry?",
    },
    {
      topic: "Time series",
      text: "Plot Close price against Date as a line chart. Add a 20-day moving average on the same axes.",
    },
    {
      topic: "Box plot · volatility",
      text: "Split the past year into weeks. For each week, compute the range (max Close − min Close). Draw a box plot of weekly ranges.",
    },
    {
      topic: "Two variables",
      text: "Scatter plot: Volume (x) vs absolute daily % return (y). Describe the cloud — positive, negative, or no clear linear pattern?",
    },
    {
      topic: "Compare two stocks",
      text: "Download Microsoft (MSFT) for the same period. Overlay normalized Close prices (start = 100) for AAPL and MSFT on one chart.",
    },
  ];

  return (
    <SceneFrame kicker="Prompts to try" title="Practice descriptive statistics on your own CSV." tone="gold">
      <p className={styles.lead}>
        Use an AI coding assistant with the <strong>aapl_daily.csv</strong> file from Introduction (or any ticker you downloaded).
        Each prompt below practises a tool from this lecture — adapt the ticker, dates, or chart type.
      </p>
      <div className={styles.promptList}>
        {prompts.map((item) => (
          <article key={item.topic} className={styles.promptItem}>
            <strong>{item.topic.toUpperCase()}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <p className={styles.small} style={{ marginTop: 16 }}>
        For graded work, follow the course AI policy. These prompts are for your own practice and exploration.
      </p>
    </SceneFrame>
  );
}

function CloseScene() {
  return (
    <SceneFrame kicker="Take this into the rest of the course" title="A picture, a table, then one honest number.">
      <p className={styles.lead}>Descriptive statistics does not prove a claim about a population. It makes the sample legible. Inference, later in the semester, asks how far that story can travel.</p>
      <div className={styles.three} style={{ marginTop: 28 }}>
        <article className={styles.card}><p className={styles.kicker}>01</p><h1 style={{ fontSize: 28 }}>See the type</h1><p className={styles.muted}>Categorical vs quantitative decides the tool.</p></article>
        <article className={styles.card}><p className={styles.kicker}>02</p><h1 style={{ fontSize: 28 }}>Show the shape</h1><p className={styles.muted}>Table, bar, histogram, box, scatter — before you quote a mean.</p></article>
        <article className={styles.card}><p className={styles.kicker}>03</p><h1 style={{ fontSize: 28 }}>Name the risk</h1><p className={styles.muted}>Outliers, lurking variables, and correlation dressed up as cause.</p></article>
      </div>
      <PrintOnly>
        <p className={styles.footerNote}>DOTE2011G · Descriptive Statistics · CUHK</p>
      </PrintOnly>
    </SceneFrame>
  );
}

export const SCENES: SceneDef[] = [
  { id: "cover", chapter: "Introduction", label: "Cover", Scene: CoverScene },
  { id: "why", chapter: "Introduction", label: "Why summarise", Scene: WhySummarizeScene },
  { id: "classify", chapter: "Introduction", label: "Game · type", Scene: ClassifyGame },
  { id: "hyatt", chapter: "Categorical data", label: "Hyatt live", Scene: HyattLive },
  { id: "pareto", chapter: "Categorical data", label: "Pareto diagram", Scene: ParetoScene },
  { id: "read", chapter: "Categorical data", label: "Game · read the chart", Scene: ChartReadGame },
  { id: "bins", chapter: "Histograms", label: "Classes and histogram", Scene: BinningScene },
  { id: "shape", chapter: "Histograms", label: "Game · skewness", Scene: ShapeScene },
  { id: "skewness", chapter: "Histograms", label: "Skewness formula", Scene: SkewnessScene },
  { id: "stem", chapter: "Dot plot & stem-and-leaf", label: "Stem-and-leaf", Scene: StemLeafScene },
  { id: "ogive", chapter: "Cumulative distributions", label: "Cumulative / ogive", Scene: CumulativeScene },
  { id: "crosstab", chapter: "Two variables", label: "Crosstab", Scene: CrosstabScene },
  { id: "simpson", chapter: "Two variables", label: "Game · Simpson", Scene: SimpsonGame },
  { id: "scatter", chapter: "Two variables", label: "Scatter", Scene: ScatterScene },
  { id: "map", chapter: "Summary", label: "Tool map", Scene: MapScene },
  { id: "center", chapter: "Location", label: "Mean / median / mode", Scene: MeanMedianScene },
  { id: "percentile", chapter: "Location", label: "Percentiles", Scene: PercentileScene },
  { id: "compute", chapter: "Location", label: "Game · compute", Scene: ComputeGame },
  { id: "spread", chapter: "Variability", label: "Variability", Scene: VariabilityScene },
  { id: "supplier", chapter: "Variability", label: "Game · suppliers", Scene: SupplierGame },
  { id: "z", chapter: "Variability", label: "z and rules", Scene: ZScene },
  { id: "box", chapter: "Variability", label: "Box plot", Scene: BoxPlotScene },
  { id: "corr", chapter: "Association", label: "Correlation", Scene: CorrelationScene },
  { id: "grouped", chapter: "Association", label: "Weighted / grouped", Scene: GroupedScene },
  { id: "final", chapter: "Wrap-up", label: "Game · cloud vs table", Scene: FinalQuiz },
  { id: "prompts", chapter: "Wrap-up", label: "Prompts to try", Scene: PromptsToTryScene },
  { id: "end", chapter: "Wrap-up", label: "Takeaways", Scene: CloseScene },
];
