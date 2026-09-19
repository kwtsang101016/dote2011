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

/** Inverse standard normal via binary search — accurate enough for lecture tables. */
export function invStdNormal(p: number): number {
  const prob = Math.min(1 - 1e-10, Math.max(1e-10, p));
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (stdNormalCdf(mid) < prob) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function formatProb(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function uniformPdf(x: number, a: number, b: number): number {
  if (b <= a) return 0;
  return x > a && x < b ? 1 / (b - a) : 0;
}

export function uniformCdfInterval(x1: number, x2: number, a: number, b: number): number {
  if (b <= a || x2 <= x1) return 0;
  const left = Math.max(x1, a);
  const right = Math.min(x2, b);
  if (right <= left) return 0;
  return (right - left) / (b - a);
}

/** Binomial probability in log space so large n does not underflow. */
export function binomialPmf(n: number, p: number, k: number): number {
  const trials = Math.floor(n);
  const successes = Math.floor(k);
  if (successes < 0 || successes > trials || p < 0 || p > 1) return 0;
  if (p === 0) return successes === 0 ? 1 : 0;
  if (p === 1) return successes === trials ? 1 : 0;
  const take = Math.min(successes, trials - successes);
  let logCoeff = 0;
  for (let i = 0; i < take; i += 1) {
    logCoeff += Math.log(trials - i) - Math.log(i + 1);
  }
  const logP = logCoeff + successes * Math.log(p) + (trials - successes) * Math.log(1 - p);
  const value = Math.exp(logP);
  return Number.isFinite(value) ? value : 0;
}

export function binomialCdf(n: number, p: number, k: number): number {
  const top = Math.min(Math.floor(n), Math.max(0, Math.floor(k)));
  let sum = 0;
  for (let i = 0; i <= top; i += 1) sum += binomialPmf(n, p, i);
  return Math.min(1, sum);
}
