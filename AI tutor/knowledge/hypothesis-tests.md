# DOTE2011G · Hypothesis Tests

**Live lecture:** https://kwtsang101016.github.io/dote2011/hypothesis-tests/

Interactive slides condensed from *9 Hypothesis Test.pdf* (H0/H1, errors, p-values, z/t tests, proportions).

---

## Page 01 · Title

Hypothesis Tests — H0/H1, Type I/II errors, p-values, z/t tests for means and proportions.

## Page 02 · Roadmap

Setup → errors & α/β → p-value → eight-step procedure → one mean (z then t) → two means → proportions → menu & practice.

## Page 03 · Aircrew escape system

Motivating example: burn rate must be 50 cm/s; too slow or too fast is unsafe → two-sided alternative.

## Page 04 · H0 versus H1

H0 = status quo / claim under test (contains “=”); H1 = what we want evidence for. Never put the equality only in H1.

## Page 05 · Which hypotheses?

Class activity / Live Poll A–D: choose the (H0,H1) pair for coin fairness (one-sided or two-sided) and similar stories.

## Page 06 · Predetermined critical region

Before seeing x̄, call |x̄−50|≥1.5 “too far” (x̄≤48.5 or x̄≥51.5); do not redefine afterward. Examples: x̄=52 reject; x̄=47 reject; x̄=51 cannot reject. Critical region = values that reject H0. P(reject H0) = P(x̄ in critical region) once the sampling distribution is known.

## Page 07 · Test statistic and regions

Compute a test statistic; reject H0 if it falls in the rejection region determined by α.

## Page 08 · Types of hypothesis

Lower-tail, upper-tail, or two-sided alternatives. Critical values use α or α/2 accordingly.

## Page 09 · Type I / Type II table

Type I: reject H0 when H0 true (probability α). Type II: fail to reject when H0 false (probability β). Power = 1−β.

## Page 10 · Propellant: two-sided α

Two-sided propellant example: reject if x̄<48.5 or x̄>51.5; compute α under μ=50.

## Page 11 · Propellant: two-sided β

Same two-sided rule; Type II at μ=52 is P(48.5≤x̄≤51.5|μ=52).

## Page 12 · Propellant: upper α

Upper-tail rule reject if x̄>51.5; α = P(x̄>51.5|μ=50) (one tail).

## Page 13 · Propellant: upper β

Upper-tail Type II at μ=52: β = P(x̄≤51.5|μ=52).

## Page 14 · Propellant: lower α

Lower-tail rule reject if x̄<48.5; α = P(x̄<48.5|μ=50).

## Page 15 · Propellant: lower β

Lower-tail Type II at μ=48: β = P(x̄≥48.5|μ=48).

## Page 16 · Cutoff α–β explorer

Game: switch two-sided / upper / lower; move c and n; watch α–β trade-off.

## Page 17 · Significance level

Fix α first → two-sided cutoffs c± = μ0 ± z_{α/2} σ/√n → then β = P(c−≤x̄≤c+|μ=μ1). Worked α=0.05 propellant example; table compares α=0.10,0.05,0.01. One-sided uses z_α and one cutoff.

## Page 18 · Simulate α

Game: when H0 is true, about α of repeated tests reject H0.

## Page 19 · Definition (p-value)

p-value = P(statistic at least as extreme as observed | H0 true). Not P(H0 true | data).

## Page 20 · Power supply: region

Example setup: critical-region approach for a two-sided (or one-sided) test of a mean.

## Page 21 · Power supply: p-values

Same data via p-value: reject iff p < α. Agrees with the critical-region decision.

## Page 22 · p-value explorer

Game: drag Z0 and change the alternative; see rejection region and p-value area.

## Page 23 · Concept check: errors

A–D quiz: Type I/II language, α–β trade-off, what “fail to reject” means, larger n reduces both α and β.

## Page 24 · Concept check: p-value

A–D quiz: definition, decide with p vs α, two-sided p from Z0, upper-tail p when Z0 is negative.

## Page 25 · Eight steps

Parameter → H0 → H1 → test statistic → reject rule → compute → decide → report in context.

## Page 26 · Three approaches

Critical region, p-value, and CI: for the same α they give the same reject/fail-to-reject decision.

## Page 27 · Which tail?

Game: the alternative decides which tail(s) count for the p-value and rejection region.

## Page 28 · z-test table

H0: μ=μ0, σ known: Z0=(x̄−μ0)/(σ/√n) ~ N(0,1) under H0. Critical values z_{α/2} or z_α.

## Page 29 · Battery life

Example: H1: μ>40, σ=1.25, n=10, x̄=40.5 → Z0≈1.26 < 1.645 → fail to reject at α=0.05.

## Page 30 · Response time

Example: H1: μ>75, σ=8, n=25, x̄=79.25 → reject H0; lower CI excludes 75.

## Page 31 · t-test table

σ unknown: t0=(x̄−μ0)/(s/√n) ~ t(n−1). Use t critical values.

## Page 32 · Body temperature

Example: test mean body temperature with sample s (t-test).

## Page 33 · Known variances (two means)

Z0 for μ_X−μ_Y with known σ_X, σ_Y; rejection region or CI for the difference.

## Page 34 · Comparing paints

Example: two paints, known SDs → two-sample z-test for mean drying times.

## Page 35 · Pooled t-test

Independent samples, equal unknown variances: pool into s_p; df = n+m−2.

## Page 36 · Comparing catalysts

Example: two catalysts, small n, assume equal variances → pooled t.

## Page 37 · Welch t-test

Unequal variances: SE = √(s_X²/n+s_Y²/m); Welch–Satterthwaite df. Safer default if equality is doubtful.

## Page 38 · Paired t-test

Matched pairs: test μ_D with t0 = d̄/(s_D/√n), df = n−1. Before/after on the same units.

## Page 39 · One-proportion test

H0: p=p0; Z0=(p̂−p0)/√(p0(1−p0)/n). Large-sample normal under H0.

## Page 40 · Higher education

Example: one-proportion z-test for a claimed education rate.

## Page 41 · Fair die

Example: test whether P(six)=1/6 with a sample proportion.

## Page 42 · Proportion calculator

Game: enter n, x, p0, α, side → Z0, p-value, decision.

## Page 43 · Two proportions

H0: p1=p2; under H0 use pooled p̂ in the SE. CI for p1−p2 does not pool.

## Page 44 · Sparrows

Example: male vs female return rates → two-proportion z-test.

## Page 45 · Low birth weight

Example: compare two proportions (treatment vs control).

## Page 46 · The test menu

Summary table: which statistic/distribution for one mean, two means (z/pooled/Welch/paired), one/two proportions.

## Page 47 · Which test?

A–D Live Poll: match each story to z-mean, t-mean, two-mean z, pooled, Welch, paired, or proportion tests.

## Page 48 · Three methods agree

Battery-style demo: critical region, p-value, and one-sided CI flip together as x̄ moves.

## Page 49 · Which answer?

Final A–D quiz: z_α vs z_{α/2}, t critical value, pooled df, CI rejection rule, paired design, pooled p̂ in two-prop SE.

## Page 50 · Takeaways

State H0/H1; pick the statistic; decide via region / p / CI; report. Fail to reject ≠ prove H0.
