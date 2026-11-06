# DOTE2011G · Interval Estimation

**Live lecture:** https://kwtsang101016.github.io/dote2011/interval-estimation/

Interactive slides condensed from *8 Interval Estimation.pdf*, plus pooled / Welch / paired and two-proportion intervals.

---

## Page 01 · Title

Interval Estimation — confidence intervals for means, proportions, sample size, and differences of means/proportions.

## Page 02 · Roadmap

Six blocks: mean σ known; mean σ unknown (t); one-sided bounds; sample size; proportion; two means & two proportions (pooled / Welch / paired, then p1−p2).

## Page 03 · Warm-up: CUHK heights

μ=168, σ=5, n=25 → P(166<x̄<170)≈0.9545. Motivates: with unknown μ, x̄±2 catches μ about 95% of the time.

## Page 04 · Margin of error

Interval estimate = point estimate ± margin of error. For a mean: x̄ ± ME; for a proportion: p̂ ± ME.

## Page 05 · When is σ known?

Use historical or process σ when it is trusted. Then the sampling distribution of x̄ uses σ/√n and z critical values.

## Page 06 · 1 − α of all x̄

About 100(1−α)% of all sample means lie within z_{α/2} σ/√n of μ. That statement rearranges into a CI for μ.

## Page 07 · Derivation

Start from P(−z_{α/2} ≤ (x̄−μ)/(σ/√n) ≤ z_{α/2})=1−α and rearrange to x̄ − z_{α/2}σ/√n ≤ μ ≤ x̄ + z_{α/2}σ/√n.

## Page 08 · Interval formula

Two-sided CI (σ known): x̄ ± z_{α/2} σ/√n. Confidence coefficient 1−α.

## Page 09 · Common z values

Common: 90% → z=1.645; 95% → 1.960; 99% → 2.576.

## Page 10 · Meaning of confidence

“95% confident” describes the method’s long-run success rate, not P(μ in this one interval). μ is fixed; the interval is random.

## Page 11 · Coverage simulator

Game: simulate many intervals; green covers μ, red misses. Higher confidence → wider bars, fewer misses.

## Page 12 · HMV setup

HMV retail outlet: n=36, x̄=41100, σ=4500. Plan a CI for mean annual income.

## Page 13 · HMV margin and interval

95%: ME = 1.96×4500/√36 = 1470 → [39630, 42570]. Higher confidence widens the interval.

## Page 14 · Adequate sample size

For a planned margin E with σ known: n = (z_{α/2} σ / E)²; always round up.

## Page 15 · Light bulbs

Example: normal lifetime, σ known, n=27, x̄=1478 → 95% CI for μ.

## Page 16 · Orange juice

Example: large-n approximate CI even if population is not normal (n>30 rule of thumb).

## Page 17 · When σ is unknown

Replace σ by s and z by t_{α/2}(n−1). Requires normal population or large n.

## Page 18 · From Z to t

(x̄−μ)/(s/√n) ~ t(n−1) when sampling from N(μ,σ²). t has heavier tails than z.

## Page 19 · Degrees of freedom

df = n−1. As df grows, t → z. Interactive compare of t vs standard normal.

## Page 20 · z versus t

Game: for the same confidence, t critical value > z, so the t-interval is wider.

## Page 21 · Interval formula (σ unknown)

x̄ ± t_{α/2}(n−1) s/√n.

## Page 22 · Apartment rents

Example: n=16, x̄=750, s=55 → use t with 15 df for a CI for mean rent.

## Page 23 · Non-normal data

If population is skewed and n is small, t-interval coverage can miss the target; n≳30 helps.

## Page 24 · Butterfat

Example: n=20 cows, σ unknown → 90% t-interval for mean butterfat.

## Page 25 · Bounds, σ known

One-sided: put all α in one tail → use z_α. Lower CI [x̄−z_α σ/√n, ∞); upper (−∞, x̄+z_α σ/√n].

## Page 26 · Which formula for μ?

Summary flow: σ known → z; σ unknown → t. One-sided written with brackets including equality on the finite end.

## Page 27 · Plastic containers

Example: σ=15, n=20, x̄=246 → 95% lower bound ≈ 240.48 → [240.48, ∞).

## Page 28 · Bounds, σ unknown

One-sided with s: use t_α(n−1). Same bracket forms as the z case.

## Page 29 · Alloy specimens

Example: n=22, x̄=13.71, s=3.55 → 95% lower bound ≈ 12.41 → [12.41, ∞).

## Page 30 · Interval lab

Game: switch normal/skewed, σ known/unknown, one-/two-sided; watch simulated coverage.

## Page 31 · Which interval?

A–D Live Poll: pick the right CI type for each story (σ known/unknown, lower/upper/two-sided).

## Page 32 · AI · Apple mean CI

Practice prompt: download AAPL returns; build one-sided 95% CIs treating s like σ (z) and with t.

## Page 33 · Formula for a mean

n ≥ z_{α/2}² σ² / E² for desired margin E.

## Page 34 · Planning value of σ

Use historical σ, a pilot sample, or a conservative planning value.

## Page 35 · HMV: n = 312

Example: E=500, 95%, σ=4500 → n = (1.96×4500/500)² ≈ 312 (round up).

## Page 36 · Sampling distribution of p̂

E(p̂)=p; σ_p̂=√(p(1−p)/n). Normal approx when np and n(1−p) > 5.

## Page 37 · Interval formula (proportion)

p̂ ± z_{α/2} √(p̂(1−p̂)/n).

## Page 38 · PSI poll

Example: 220/500 favour → 95% CI about [.3965, .4835].

## Page 39 · Formula for a proportion

n = z_{α/2}² p*(1−p*) / E². With no information use p*=0.5 (largest n).

## Page 40 · PSI: n = 1817

Example: E=0.03, 99%, p*=0.44 → n≈1817.

## Page 41 · Two-sided, known variances

μ_X−μ_Y: x̄−ȳ ± z_{α/2} √(σ_X²/n + σ_Y²/m). Also OK for large n,m if non-normal.

## Page 42 · Filling machines

Example: two machines, known σ’s, n=m=10 → 95% CI for difference of mean fills; covers 0.

## Page 43 · One-sided bounds (two means)

Use z_α: lower [L, ∞) and upper (−∞, U] for μ_X−μ_Y.

## Page 44 · Three designs (σ unknown)

Independent equal σ² → pooled t; unequal → Welch; matched units → paired t on D_i=X_i−Y_i.

## Page 45 · Equal variances (pooled)

x̄−ȳ ± t_{α/2}(n+m−2) s_p √(1/n+1/m), with s_p² = [(n−1)s_X²+(m−1)s_Y²]/(n+m−2).

## Page 46 · Two schools

Example: n=9, m=15, common variance assumed → 95% pooled CI ≈ [−3.65, 9.05], covers 0.

## Page 47 · Unequal variances (Welch)

x̄−ȳ ± t_{α/2}(r) √(s_X²/n+s_Y²/m); r = floored Welch–Satterthwaite df.

## Page 48 · Schools, no pooling

Same school data without pooling → slightly wider CI than pooled; still covers 0.

## Page 49 · Paired samples

Each X matched to a Y (before/after, same subject). Analyse differences, not two independent lists.

## Page 50 · Paired CI

d̄ ± t_{α/2}(n−1) s_D/√n — same as a one-sample t for μ_D=μ_X−μ_Y.

## Page 51 · Reaction times

Example: n=8, d̄=−0.0625, s_D=0.0765 → 95% paired CI barely covers 0; unpaired CIs are wider.

## Page 52 · Width comparison

Same center d̄=x̄−ȳ. Typical order when ρ>0: paired < pooled < Welch. Var(X−Y)=σ_X²+σ_Y²−2ρσ_Xσ_Y.

## Page 53 · Difference p1 − p2

Special case of two means for 0–1 data: p̂1−p̂2 ± z_{α/2} √(p̂1(1−p̂1)/n1 + p̂2(1−p̂2)/n2). CI does not pool p̂.

## Page 54 · Gaming example

p̂1=0.6 (n1=2000), p̂2=0.4 (n2=2200) → 95% CI ≈ [0.17, 0.23], entirely above 0.

## Page 55 · Which answer?

A–D practice quiz: confidence width, t df, sample size ×4, meaning of CI, p*, one-sided z_α, pooled vs paired, SE for p1−p2.

## Page 56 · Takeaways

Point ± critical × SE. Mean: z or t; one-sided brackets; sample-size formulas; proportions; two means (z / pooled / Welch / paired) and p1−p2.
