/** Standard normal CDF via the error function (Abramowitz–Stegun). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function stdNormalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function normalCdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return x >= mu ? 1 : 0;
  return stdNormalCdf((x - mu) / sigma);
}

export function formatProb(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** Finite population correction √((N−n)/(N−1)). Returns 1 when n/N < 0.05 or N is infinite. */
export function finiteCorrection(n: number, N: number | null): number {
  if (N == null || !Number.isFinite(N) || N <= 1) return 1;
  if (n / N < 0.05) return 1;
  return Math.sqrt((N - n) / (N - 1));
}

export function seMean(sigma: number, n: number, N: number | null = null): number {
  if (n <= 0 || sigma < 0) return NaN;
  return (sigma / Math.sqrt(n)) * finiteCorrection(n, N);
}

export function seProportion(p: number, n: number, N: number | null = null): number {
  if (n <= 0 || p < 0 || p > 1) return NaN;
  return Math.sqrt((p * (1 - p)) / n) * finiteCorrection(n, N);
}

export function normalIntervalProb(lo: number, hi: number, mu: number, sigma: number): number {
  if (hi <= lo || sigma <= 0) return 0;
  return Math.max(0, normalCdf(hi, mu, sigma) - normalCdf(lo, mu, sigma));
}

/** Simple LCG for reproducible demos in the browser. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type Population = {
  id: string;
  label: string;
  /** Integer-valued populations have lattice sample sums, so bins must align to 1/n. */
  discrete: boolean;
  mean: number;
  sd: number;
  skewness: number;
  draw: (rng: () => number) => number;
};

function drawBinomial(trials: number, p: number, rng: () => number): number {
  let count = 0;
  for (let i = 0; i < trials; i += 1) if (rng() < p) count += 1;
  return count;
}

/** Knuth's method; fine for the small means used in class. */
function drawPoisson(mu: number, rng: () => number): number {
  const limit = Math.exp(-mu);
  let k = 0;
  let prod = rng();
  while (prod > limit) {
    k += 1;
    prod *= rng();
  }
  return k;
}

function binomialPopulation(id: string, trials: number, p: number): Population {
  const variance = trials * p * (1 - p);
  return {
    id,
    label: `Binomial (n = ${trials}, p = ${p})`,
    discrete: true,
    mean: trials * p,
    sd: Math.sqrt(variance),
    skewness: (1 - 2 * p) / Math.sqrt(variance),
    draw: (rng) => drawBinomial(trials, p, rng),
  };
}

export const POPULATIONS: Population[] = [
  {
    id: "die",
    label: "Discrete uniform {1, …, 6} (fair die)",
    discrete: true,
    mean: 3.5,
    sd: Math.sqrt(35 / 12),
    skewness: 0,
    draw: (rng) => Math.floor(rng() * 6) + 1,
  },
  binomialPopulation("binom-sym", 10, 0.5),
  binomialPopulation("binom-skew", 10, 0.1),
  {
    id: "poisson",
    label: "Poisson (μ = 1)",
    discrete: true,
    mean: 1,
    sd: 1,
    skewness: 1,
    draw: (rng) => drawPoisson(1, rng),
  },
  {
    id: "exp",
    label: "Exponential (μ = 1)",
    discrete: false,
    mean: 1,
    sd: 1,
    skewness: 2,
    draw: (rng) => -Math.log(1 - rng()),
  },
];

export function sampleMean(population: Population, n: number, rng: () => number): number {
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += population.draw(rng);
  return sum / n;
}

export type HistogramBin = { lo: number; hi: number; count: number };

const MAX_BINS = 24;

/**
 * Bin sample means over their observed (min, max). For integer populations the edges sit
 * halfway between attainable means (multiples of 1/n) so no bin is artificially empty.
 */
export function histogramOfMeans(means: number[], population: Population, n: number): HistogramBin[] {
  if (means.length === 0) return [];
  const min = Math.min(...means);
  const max = Math.max(...means);
  let edges: number[];
  if (population.discrete) {
    const step = 1 / n;
    const lattice = Math.round((max - min) / step) + 1;
    const group = Math.max(1, Math.ceil(lattice / MAX_BINS));
    const start = min - step / 2;
    const binCount = Math.ceil(lattice / group);
    edges = Array.from({ length: binCount + 1 }, (_, i) => start + i * group * step);
  } else {
    const span = Math.max(max - min, 1e-9);
    edges = Array.from({ length: MAX_BINS + 1 }, (_, i) => min + (span * i) / MAX_BINS);
  }
  const bins: HistogramBin[] = edges.slice(0, -1).map((lo, i) => ({
    lo,
    hi: edges[i + 1],
    count: 0,
  }));
  const first = edges[0];
  const width = edges[1] - edges[0];
  for (const m of means) {
    const idx = Math.min(bins.length - 1, Math.max(0, Math.floor((m - first) / width)));
    bins[idx].count += 1;
  }
  return bins;
}
