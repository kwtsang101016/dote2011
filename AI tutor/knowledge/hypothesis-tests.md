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

Fix α → from α=P(reject H0|H0)=P(x̄≤50−c or x̄≥50+c|μ=50) solve c=z_{α/2}σ/√n → then β under μ=52. Worked α=0.05; table for 0.10,0.05,0.01. One-sided: c=z_α σ/√n.

## Page 18 · Sample-size planning

Budget view: fix α and β at a planning alternative μ1, then solve for required n and cutoff c (n is not given).

## Page 19 · Plan n (one-sided)

Upper-tail: c=μ0+z_α σ/√n = μ1−z_β σ/√n ⇒ n=((z_α+z_β)σ/(μ1−μ0))². Propellant α=0.05, β=0.10, μ1=52, σ=2.5.

## Page 20 · Plan n (two-sided)

From α=2P(Z≥d/(σ/√n)) get d=z_{α/2}σ/√n; if μ1>μ0 then β≈P(X̄≤c+|μ1) ⇒ c+=μ1−z_β σ/√n; equate ⇒ n=((z_{α/2}+z_β)σ/(μ1−μ0))².

## Page 21 · Budget explorer

Game: choose one-/two-sided, α, β, and gap |μ1−μ0|; see required n and cutoffs on the propellant scale.

## Page 22 · Simulate α

Game: when H0 is true, about α of repeated tests reject H0.

## Page 23 · Definition (p-value)

Z=(X̄−μ0)/(σ/√n)~N(0,1) under H0; observed Z0=(x̄−μ0)/(σ/√n). p-value = P(Z at least as extreme as Z0|H0): two-sided 2P(Z>|Z0|), upper P(Z>Z0), lower P(Z<Z0).

## Page 24 · Power supply: region

Example setup: critical-region approach for a two-sided (or one-sided) test of a mean.

## Page 25 · Power supply: p-values

Same data via p-value: reject iff p < α. Agrees with the critical-region decision.

## Page 26 · p-value explorer

Game: drag Z0 and change the alternative; see rejection region and p-value area.

## Page 27 · Concept check: errors

A–D quiz: Type I/II language, α–β trade-off, what “fail to reject” means, larger n reduces both α and β.

## Page 28 · Concept check: p-value

A–D quiz: definition; decide with p vs α; two-sided p-value = 2P(Z>2) when Z0=2; upper-tail with Z0=−1.2 equals P(Z>−1.2). Options are expressions, not table lookups.

## Page 29 · Eight steps

Parameter → H0 → H1 → test statistic → reject rule → compute → decide → report in context.

## Page 30 · Three approaches

Critical region, p-value, and CI: for the same α they give the same reject/fail-to-reject decision.

## Page 31 · Which tail?

Game: the alternative decides which tail(s) count for the p-value and rejection region.

## Page 32 · z-test table

H0: μ=μ0, σ known: Z0=(x̄−μ0)/(σ/√n) ~ N(0,1) under H0. Critical values z_{α/2} or z_α.

## Page 33 · Battery life

Battery life ~N with σ=1.25; n=10, x̄=40.5. Evidence mean life exceeds 40 hours? α=0.05 upper-tail z-test.

## Page 34 · Response time

Distributed system: does mean response to a command exceed 75 ms? σ=8, n=25, x̄=79.25; α=0.05.

## Page 35 · t-test table

σ unknown: t0=(x̄−μ0)/(s/√n) ~ t(n−1). Use t critical values.

## Page 36 · Body temperature

JAMA 1992 critique of 98.6°F; n=25 women, x̄=98.264, s²=0.2324. Two-sided t-test of μ=98.6 at α=0.05.

## Page 37 · Known variances (two means)

Z0 for μ_X−μ_Y with known σ_X, σ_Y; rejection region or CI for the difference.

## Page 38 · Comparing paints

Primer drying: formulation 1 (standard) vs 2 (new ingredient); σ=8 both; n=m=10; x̄1=121, x̄2=112. Upper-tail z for μ1>μ2.

## Page 39 · Pooled t-test

Independent samples, equal unknown variances: pool into s_p; df = n+m−2.

## Page 40 · Comparing catalysts

Catalyst 1 in use vs cheaper catalyst 2; adopt 2 if mean yield unchanged. Pilot Table 10-1; pooled t, α=0.05.

## Page 41 · Welch t-test

Unequal variances: SE = √(s_X²/n+s_Y²/m); df r = floor of the Welch formula. Safer default if equality is doubtful.

## Page 42 · Paired t-test

24 girls, ultraheavy rope-jumping program; W=before−after 40-yard time; H1:μW>0; paired t.

## Page 43 · One-proportion test

H0: p=p0; Z0=(p̂−p0)/√(p0(1−p0)/n). Large-sample normal under H0.

## Page 44 · Higher education

Fortune (1992) claim ~1/2 of engineers continue past B.S.; Engineering Horizons 117/484 planning graduate study.

## Page 45 · Fair die

Dice spots are indentations so 6-side lighter; H0:p=1/6 vs H1:p>1/6; n=8000, y=1389 sixes, α=0.05.

## Page 46 · Proportion calculator

Game: enter n, x, p0, α, side → Z0, p-value, decision.

## Page 47 · Two proportions

H0: p1=p2; under H0 use pooled p̂ in the SE. CI for p1−p2 does not pool.

## Page 48 · Sparrows

White-crowned sparrows (The Condor 1992): 124/894 males vs 70/700 females return; CI and two-sided test for pm−pf.

## Page 49 · Low birth weight

Two countries: 22/200 vs 16/100 low-birth-weight infants; two-proportion z for equal rates.

## Page 50 · The test menu

Summary table: which statistic/distribution for one mean, two means (z/pooled/Welch/paired), one/two proportions.

## Page 51 · Which test?

A–D Live Poll: match each story to z-mean, t-mean, two-mean z, pooled, Welch, paired, or proportion tests.

## Page 52 · Three methods agree

Battery-style demo: critical region, p-value, and one-sided CI flip together as x̄ moves.

## Page 53 · Which answer?

Final A–D quiz: z_α vs z_{α/2}, t critical value, pooled df, CI rejection rule, paired design, pooled p̂ in two-prop SE.

## Page 54 · Takeaways

State H0/H1; pick the statistic; decide via region / p / CI; report. Fail to reject ≠ prove H0.
