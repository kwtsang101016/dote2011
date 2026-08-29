export const RATING_LABELS = [
  "Poor",
  "Below Average",
  "Average",
  "Above Average",
  "Excellent",
] as const;

export type RatingLabel = (typeof RATING_LABELS)[number];

export type NamedCount = {
  label: string;
  count: number;
};

export type HistogramBin = {
  label: string;
  lower: number;
  upper: number;
  midpoint: number;
  count: number;
};

export type StemLeafRow = {
  stem: number;
  leaves: number[];
};

export type FiveNumberSummary = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export type BoxPlotStats = FiveNumberSummary & {
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outliers: number[];
  whiskerMin: number;
  whiskerMax: number;
};

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundTo(value, digits);
  return Number.isInteger(rounded) && digits === 0
    ? String(rounded)
    : rounded.toFixed(digits);
}

export function sortedCopy(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    throw new Error("Mean requires at least one observation.");
  }
  return sum(values) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("Median requires at least one observation.");
  }
  const ordered = sortedCopy(values);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle];
  return (ordered[middle - 1] + ordered[middle]) / 2;
}

export function mode(values: number[]): number[] {
  if (values.length === 0) {
    throw new Error("Mode requires at least one observation.");
  }
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const highest = Math.max(...counts.values());
  if (highest === 1) return [];
  return [...counts.entries()]
    .filter(([, count]) => count === highest)
    .map(([value]) => value)
    .sort((a, b) => a - b);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error("Percentile requires at least one observation.");
  }
  if (p < 0 || p > 100) {
    throw new Error("Percentile p must be between 0 and 100.");
  }
  const ordered = sortedCopy(values);
  if (p === 0) return ordered[0];
  if (p === 100) return ordered[ordered.length - 1];
  const index = (p / 100) * ordered.length;
  if (Number.isInteger(index)) {
    return (ordered[index - 1] + ordered[index]) / 2;
  }
  return ordered[Math.ceil(index) - 1];
}

export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(values, 25),
    q2: percentile(values, 50),
    q3: percentile(values, 75),
  };
}

export function dataRange(values: number[]): number {
  if (values.length === 0) {
    throw new Error("Range requires at least one observation.");
  }
  return Math.max(...values) - Math.min(...values);
}

export function iqr(values: number[]): number {
  const { q1, q3 } = quartiles(values);
  return q3 - q1;
}

export function sampleVariance(values: number[]): number {
  if (values.length < 2) {
    throw new Error("Sample variance requires at least two observations.");
  }
  const xBar = mean(values);
  return sum(values.map((value) => (value - xBar) ** 2)) / (values.length - 1);
}

export function sampleStdev(values: number[]): number {
  return Math.sqrt(sampleVariance(values));
}

export function sampleSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) {
    throw new Error("Skewness requires at least three observations.");
  }
  const xBar = mean(values);
  const s = sampleStdev(values);
  if (s === 0) {
    return 0;
  }
  const sumCubedZ = values.reduce((sum, value) => sum + ((value - xBar) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sumCubedZ;
}

export function coefficientOfVariation(values: number[]): number {
  const xBar = mean(values);
  if (xBar === 0) {
    throw new Error("Coefficient of variation is undefined when the mean is 0.");
  }
  return (sampleStdev(values) / xBar) * 100;
}

export function zScore(value: number, xBar: number, s: number): number {
  if (s === 0) {
    throw new Error("z-score is undefined when the standard deviation is 0.");
  }
  return (value - xBar) / s;
}

export function fiveNumber(values: number[]): FiveNumberSummary {
  if (values.length === 0) {
    throw new Error("Five-number summary requires at least one observation.");
  }
  const { q1, q2, q3 } = quartiles(values);
  return {
    min: Math.min(...values),
    q1,
    median: q2,
    q3,
    max: Math.max(...values),
  };
}

export function boxPlotStats(values: number[]): BoxPlotStats {
  const summary = fiveNumber(values);
  const spread = summary.q3 - summary.q1;
  const lowerFence = summary.q1 - 1.5 * spread;
  const upperFence = summary.q3 + 1.5 * spread;
  const outliers = values.filter((value) => value < lowerFence || value > upperFence);
  const inside = sortedCopy(values.filter((value) => value >= lowerFence && value <= upperFence));
  return {
    ...summary,
    iqr: spread,
    lowerFence,
    upperFence,
    outliers,
    whiskerMin: inside[0] ?? summary.min,
    whiskerMax: inside[inside.length - 1] ?? summary.max,
  };
}

export function covariance(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length) {
    throw new Error("Covariance requires paired observations of equal length.");
  }
  if (xs.length < 2) {
    throw new Error("Sample covariance requires at least two pairs.");
  }
  const xBar = mean(xs);
  const yBar = mean(ys);
  return sum(xs.map((x, index) => (x - xBar) * (ys[index] - yBar))) / (xs.length - 1);
}

export function correlation(xs: number[], ys: number[]): number {
  const sx = sampleStdev(xs);
  const sy = sampleStdev(ys);
  if (sx === 0 || sy === 0) {
    throw new Error("Correlation is undefined when a variable has no variation.");
  }
  return covariance(xs, ys) / (sx * sy);
}

export function frequencyTable(labels: string[]): NamedCount[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export function relativeFrequency(count: number, total: number): number {
  if (total === 0) {
    throw new Error("Relative frequency is undefined when n = 0.");
  }
  return count / total;
}

export function classHistogram(values: number[], start: number, width: number, classCount: number): HistogramBin[] {
  if (values.length === 0) {
    throw new Error("Histogram requires at least one observation.");
  }
  if (width <= 0 || classCount < 1) {
    throw new Error("Class width and class count must be positive.");
  }
  const bins: HistogramBin[] = [];
  for (let index = 0; index < classCount; index += 1) {
    const lower = start + index * width;
    const upper = lower + width - 1;
    const isLast = index === classCount - 1;
    const count = values.filter((value) => (isLast ? value >= lower : value >= lower && value <= upper)).length;
    bins.push({
      label: `${lower}–${upper}`,
      lower,
      upper,
      midpoint: (lower + upper) / 2,
      count,
    });
  }
  return bins;
}

export function equalWidthHistogram(values: number[], classCount: number): HistogramBin[] {
  if (values.length === 0) {
    throw new Error("Histogram requires at least one observation.");
  }
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const classWidth = Math.max(1, Math.round((maxValue - minValue) / classCount) || 1);
  return classHistogram(values, minValue, classWidth, classCount);
}

export function cumulativeFromBins(bins: HistogramBin[]): Array<HistogramBin & { cumulative: number; cumulativeRelative: number }> {
  const total = sum(bins.map((bin) => bin.count)) || 1;
  let running = 0;
  return bins.map((bin) => {
    running += bin.count;
    return {
      ...bin,
      cumulative: running,
      cumulativeRelative: running / total,
    };
  });
}

export function stemAndLeaf(values: number[], leafUnit = 1, stretched = false): StemLeafRow[] {
  if (leafUnit <= 0) {
    throw new Error("Leaf unit must be positive.");
  }
  const scaled = values.map((value) => Math.round(value / leafUnit));
  const groups = new Map<string, number[]>();
  for (const item of scaled) {
    const stem = Math.trunc(item / 10);
    const leaf = Math.abs(item % 10);
    const key = stretched ? `${stem}:${leaf < 5 ? "low" : "high"}` : String(stem);
    const leaves = groups.get(key) ?? [];
    leaves.push(leaf);
    groups.set(key, leaves);
  }
  return [...groups.entries()]
    .map(([key, leaves]) => ({
      stem: Number(key.split(":")[0]),
      half: key.includes("high") ? 1 : 0,
      leaves: leaves.sort((a, b) => a - b),
    }))
    .sort((a, b) => a.stem - b.stem || a.half - b.half)
    .map(({ stem, leaves }) => ({ stem, leaves }));
}

export function groupedMean(bins: HistogramBin[]): number {
  const n = sum(bins.map((bin) => bin.count));
  if (n === 0) {
    throw new Error("Grouped mean requires a positive total frequency.");
  }
  return sum(bins.map((bin) => bin.count * bin.midpoint)) / n;
}

export function groupedVariance(bins: HistogramBin[]): number {
  const n = sum(bins.map((bin) => bin.count));
  if (n < 2) {
    throw new Error("Grouped variance requires at least two observations.");
  }
  const xBar = groupedMean(bins);
  return sum(bins.map((bin) => bin.count * (bin.midpoint - xBar) ** 2)) / (n - 1);
}

export function weightedMean(values: number[], weights: number[]): number {
  if (values.length !== weights.length || values.length === 0) {
    throw new Error("Weighted mean requires matching non-empty value and weight lists.");
  }
  const weightTotal = sum(weights);
  if (weightTotal === 0) {
    throw new Error("Weighted mean requires a positive total weight.");
  }
  return sum(values.map((value, index) => value * weights[index])) / weightTotal;
}

export function chebyshevMinimum(z: number): number {
  if (z <= 1) {
    throw new Error("Chebyshev’s theorem requires z > 1.");
  }
  return 1 - 1 / z ** 2;
}

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(rng() * (index + 1));
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
  }
  return next;
}

function boxMuller(rng: () => number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = Math.max(rng(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sampleNormal(n: number, mu: number, sigma: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => mu + sigma * boxMuller(rng));
}

export function sampleRatings(n: number, rng: () => number): RatingLabel[] {
  const probabilities = [0.1, 0.15, 0.25, 0.45, 0.05];
  return Array.from({ length: n }, () => {
    const draw = rng();
    let cumulative = 0;
    for (let index = 0; index < probabilities.length; index += 1) {
      cumulative += probabilities[index];
      if (draw <= cumulative) return RATING_LABELS[index];
    }
    return RATING_LABELS[RATING_LABELS.length - 1];
  });
}

export function sampleTuneUpCosts(n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => {
    const raw = 76 + 14 * boxMuller(rng) + (rng() < 0.18 ? 18 : 0);
    return Math.min(109, Math.max(50, Math.round(raw)));
  });
}

export function sampleHotelRates(n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => {
    const raw = 470 + 38 * Math.abs(boxMuller(rng)) + 8 * boxMuller(rng);
    return Math.min(620, Math.max(420, Math.round(raw / 5) * 5));
  });
}

export function sampleScatter(
  n: number,
  slope: number,
  noise: number,
  rng: () => number,
): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, () => {
    const x = roundTo(4 + rng() * 22, 1);
    const y = roundTo(18 + slope * (x - 13) + noise * boxMuller(rng), 1);
    return { x, y };
  });
}

export type CorrelationQuizKind = "strong-pos" | "strong-neg" | "weak" | "moderate";

const CORRELATION_QUIZ_KINDS: CorrelationQuizKind[] = ["strong-pos", "strong-neg", "weak", "moderate"];

function correlationBucket(r: number): CorrelationQuizKind {
  if (Math.abs(r) < 0.3) return "weak";
  if (r > 0.7) return "strong-pos";
  if (r < -0.7) return "strong-neg";
  return "moderate";
}

export function sampleCorrelationQuiz(
  n: number,
  kind: CorrelationQuizKind,
  rng: () => number,
): { a: number[]; b: number[] } {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const a =
      kind === "weak"
        ? Array.from({ length: n }, () => Math.round(10 + rng() * 60))
        : Array.from({ length: n }, (_, index) => Math.round(5 + index * 7 + rng() * 8));
    const b =
      kind === "weak"
        ? Array.from({ length: n }, () => Math.round(15 + rng() * 55))
        : kind === "strong-neg"
          ? a.map((value) => Math.round(95 - 1.1 * value + rng() * 6))
          : kind === "moderate"
            ? a.map((value) => Math.round(20 + 0.2 * value + rng() * 32))
            : a.map((value) => Math.round(10 + 1.15 * value + rng() * 6));

    const sx = sampleStdev(a);
    const sy = sampleStdev(b);
    if (sx === 0 || sy === 0) {
      continue;
    }
    const r = covariance(a, b) / (sx * sy);
    if (correlationBucket(r) === kind) {
      return { a, b };
    }
  }

  if (kind === "weak") {
    return {
      a: [1, 2, 3, 4, 5, 6, 7, 8],
      b: [8, 2, 7, 1, 6, 3, 5, 4],
    };
  }
  if (kind === "strong-neg") {
    const a = [8, 15, 22, 29, 36, 43, 50, 57];
    return { a, b: a.map((value) => 92 - value) };
  }
  if (kind === "moderate") {
    const a = [8, 15, 22, 29, 36, 43, 50, 57];
    return { a, b: [30, 18, 38, 22, 42, 28, 48, 32] };
  }
  const a = [8, 15, 22, 29, 36, 43, 50, 57];
  return { a, b: a.map((value) => 12 + value) };
}

export function nextCorrelationQuizKind(seed: number): CorrelationQuizKind {
  return CORRELATION_QUIZ_KINDS[(seed - 1) % CORRELATION_QUIZ_KINDS.length];
}

export const TEXTBOOK = {
  hyattRatings: [
    "Below Average",
    "Above Average",
    "Above Average",
    "Average",
    "Above Average",
    "Average",
    "Above Average",
    "Average",
    "Above Average",
    "Below Average",
    "Poor",
    "Excellent",
    "Above Average",
    "Average",
    "Above Average",
    "Above Average",
    "Below Average",
    "Poor",
    "Above Average",
    "Average",
  ] as RatingLabel[],
  tuneUpCosts: [
    52, 57, 62, 62, 62, 62, 65, 66, 67, 68, 68, 68, 69, 69, 69, 71, 71, 72, 72, 73, 74, 74, 75, 75, 75, 76, 77, 78, 79,
    79, 79, 80, 80, 82, 83, 85, 88, 89, 91, 93, 97, 97, 97, 98, 99, 101, 104, 105, 105, 109,
  ],
  hotelRates: [
    425, 430, 430, 435, 435, 435, 435, 435, 440, 440, 440, 440, 440, 445, 445, 445, 445, 445, 450, 450, 450, 450, 450,
    450, 450, 460, 460, 460, 465, 465, 465, 470, 470, 472, 475, 475, 475, 480, 480, 480, 480, 485, 490, 490, 490, 500,
    500, 500, 500, 510, 510, 515, 525, 525, 525, 535, 549, 550, 570, 570, 575, 575, 580, 590, 600, 600, 600, 600, 615,
    615,
  ],
  shatinHomes: {
    columns: ["HOS", "House", "Flat", "HOS (G)"],
    rows: [
      { label: "< $5,000,000", values: [18, 6, 19, 12] },
      { label: "≥ $5,000,000", values: [12, 14, 16, 3] },
    ],
  },
  united: [
    { goals: 1, shots: 14 },
    { goals: 3, shots: 24 },
    { goals: 2, shots: 18 },
    { goals: 1, shots: 17 },
    { goals: 3, shots: 30 },
  ],
  golf: {
    distance: [277.6, 259.5, 269.1, 267.0, 255.6, 272.9],
    score: [69, 71, 70, 70, 71, 69],
  },
  correlationTrap: {
    a: [1, 6, 23, 28, 55, 56, 64, 66],
    b: [12, 18, 25, 43, 52, 73, 75, 94],
  },
};
