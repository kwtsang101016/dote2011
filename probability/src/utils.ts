export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function factorial(n: number): number {
  if (n < 0) throw new Error("factorial of negative");
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

/** Combinations: C(N, n) = N! / (n!(N-n)!) */
export function combinations(N: number, n: number): number {
  const pool = Math.floor(N);
  const take = Math.floor(n);
  if (take < 0 || take > pool) return 0;
  if (take === 0 || take === pool) return 1;
  const k = Math.min(take, pool - take);
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (pool - k + i)) / i;
  }
  return Math.round(result);
}

/** Permutations: P(N, n) = N! / (N-n)! */
export function permutations(N: number, n: number): number {
  const pool = Math.floor(N);
  const take = Math.floor(n);
  if (take < 0 || take > pool) return 0;
  let result = 1;
  for (let i = 0; i < take; i += 1) result *= pool - i;
  return result;
}

/** All combinations of `take` labels from `labels` (order in each combo sorted). */
export function listCombinations(labels: string[], take: number): string[][] {
  if (take < 0 || take > labels.length) return [];
  if (take === 0) return [[]];
  const result: string[][] = [];
  const walk = (start: number, path: string[]) => {
    if (path.length === take) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < labels.length; i += 1) {
      path.push(labels[i]);
      walk(i + 1, path);
      path.pop();
    }
  };
  walk(0, []);
  return result;
}

/** All permutations of a fixed set of labels. */
export function listPermutations(labels: string[]): string[][] {
  if (labels.length === 0) return [[]];
  const result: string[][] = [];
  const used = new Array(labels.length).fill(false);
  const path: string[] = [];
  const walk = () => {
    if (path.length === labels.length) {
      result.push([...path]);
      return;
    }
    for (let i = 0; i < labels.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      path.push(labels[i]);
      walk();
      path.pop();
      used[i] = false;
    }
  };
  walk();
  return result;
}

export function formatProb(value: number, digits = 4): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(digits).replace(/\.?0+$/, "");
}
