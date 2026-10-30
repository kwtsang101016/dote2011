#!/usr/bin/env python3
"""Write interval-estimation.md and hypothesis-tests.md tutor notes from slide outlines."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / "knowledge"

IE_NOTES: list[tuple[str, str]] = [
    ("Title", "Interval Estimation — confidence intervals for means, proportions, sample size, and differences of means/proportions."),
    ("Roadmap", "Six blocks: mean σ known; mean σ unknown (t); one-sided bounds; sample size; proportion; two means & two proportions (pooled / Welch / paired, then p1−p2)."),
    ("Warm-up: CUHK heights", "μ=168, σ=5, n=25 → P(166<x̄<170)≈0.9545. Motivates: with unknown μ, x̄±2 catches μ about 95% of the time."),
    ("Margin of error", "Interval estimate = point estimate ± margin of error. For a mean: x̄ ± ME; for a proportion: p̂ ± ME."),
    ("When is σ known?", "Use historical or process σ when it is trusted. Then the sampling distribution of x̄ uses σ/√n and z critical values."),
    ("1 − α of all x̄", "About 100(1−α)% of all sample means lie within z_{α/2} σ/√n of μ. That statement rearranges into a CI for μ."),
    ("Derivation", "Start from P(−z_{α/2} ≤ (x̄−μ)/(σ/√n) ≤ z_{α/2})=1−α and rearrange to x̄ − z_{α/2}σ/√n ≤ μ ≤ x̄ + z_{α/2}σ/√n."),
    ("Interval formula", "Two-sided CI (σ known): x̄ ± z_{α/2} σ/√n. Confidence coefficient 1−α."),
    ("Common z values", "Common: 90% → z=1.645; 95% → 1.960; 99% → 2.576."),
    ("Meaning of confidence", "“95% confident” describes the method’s long-run success rate, not P(μ in this one interval). μ is fixed; the interval is random."),
    ("Coverage simulator", "Game: simulate many intervals; green covers μ, red misses. Higher confidence → wider bars, fewer misses."),
    ("HMV setup", "HMV retail outlet: n=36, x̄=41100, σ=4500. Plan a CI for mean annual income."),
    ("HMV margin and interval", "95%: ME = 1.96×4500/√36 = 1470 → [39630, 42570]. Higher confidence widens the interval."),
    ("Adequate sample size", "For a planned margin E with σ known: n = (z_{α/2} σ / E)²; always round up."),
    ("Light bulbs", "Example: normal lifetime, σ known, n=27, x̄=1478 → 95% CI for μ."),
    ("Orange juice", "Example: large-n approximate CI even if population is not normal (n>30 rule of thumb)."),
    ("When σ is unknown", "Replace σ by s and z by t_{α/2}(n−1). Requires normal population or large n."),
    ("From Z to t", "(x̄−μ)/(s/√n) ~ t(n−1) when sampling from N(μ,σ²). t has heavier tails than z."),
    ("Degrees of freedom", "df = n−1. As df grows, t → z. Interactive compare of t vs standard normal."),
    ("z versus t", "Game: for the same confidence, t critical value > z, so the t-interval is wider."),
    ("Interval formula (σ unknown)", "x̄ ± t_{α/2}(n−1) s/√n."),
    ("Apartment rents", "Example: n=16, x̄=750, s=55 → use t with 15 df for a CI for mean rent."),
    ("Non-normal data", "If population is skewed and n is small, t-interval coverage can miss the target; n≳30 helps."),
    ("Butterfat", "Example: n=20 cows, σ unknown → 90% t-interval for mean butterfat."),
    ("Bounds, σ known", "One-sided: put all α in one tail → use z_α. Lower CI [x̄−z_α σ/√n, ∞); upper (−∞, x̄+z_α σ/√n]."),
    ("Which formula for μ?", "Summary flow: σ known → z; σ unknown → t. One-sided written with brackets including equality on the finite end."),
    ("Plastic containers", "Example: σ=15, n=20, x̄=246 → 95% lower bound ≈ 240.48 → [240.48, ∞)."),
    ("Bounds, σ unknown", "One-sided with s: use t_α(n−1). Same bracket forms as the z case."),
    ("Alloy specimens", "Example: n=22, x̄=13.71, s=3.55 → 95% lower bound ≈ 12.41 → [12.41, ∞)."),
    ("Interval lab", "Game: switch normal/skewed, σ known/unknown, one-/two-sided; watch simulated coverage."),
    ("Which interval?", "A–D Live Poll: pick the right CI type for each story (σ known/unknown, lower/upper/two-sided)."),
    ("AI · Apple mean CI", "Practice prompt: download AAPL returns; build one-sided 95% CIs treating s like σ (z) and with t."),
    ("Formula for a mean", "n ≥ z_{α/2}² σ² / E² for desired margin E."),
    ("Planning value of σ", "Use historical σ, a pilot sample, or a conservative planning value."),
    ("HMV: n = 312", "Example: E=500, 95%, σ=4500 → n = (1.96×4500/500)² ≈ 312 (round up)."),
    ("Sampling distribution of p̂", "E(p̂)=p; σ_p̂=√(p(1−p)/n). Normal approx when np and n(1−p) > 5."),
    ("Interval formula (proportion)", "p̂ ± z_{α/2} √(p̂(1−p̂)/n)."),
    ("PSI poll", "Example: 220/500 favour → 95% CI about [.3965, .4835]."),
    ("Formula for a proportion", "n = z_{α/2}² p*(1−p*) / E². With no information use p*=0.5 (largest n)."),
    ("PSI: n = 1817", "Example: E=0.03, 99%, p*=0.44 → n≈1817."),
    ("Two-sided, known variances", "μ_X−μ_Y: x̄−ȳ ± z_{α/2} √(σ_X²/n + σ_Y²/m). Also OK for large n,m if non-normal."),
    ("Filling machines", "Example: two machines, known σ’s, n=m=10 → 95% CI for difference of mean fills; covers 0."),
    ("One-sided bounds (two means)", "Use z_α: lower [L, ∞) and upper (−∞, U] for μ_X−μ_Y."),
    ("Three designs (σ unknown)", "Independent equal σ² → pooled t; unequal → Welch; matched units → paired t on D_i=X_i−Y_i."),
    ("Equal variances (pooled)", "x̄−ȳ ± t_{α/2}(n+m−2) s_p √(1/n+1/m), with s_p² = [(n−1)s_X²+(m−1)s_Y²]/(n+m−2)."),
    ("Two schools", "Example: n=9, m=15, common variance assumed → 95% pooled CI ≈ [−3.65, 9.05], covers 0."),
    ("Unequal variances (Welch)", "x̄−ȳ ± t_{α/2}(r) √(s_X²/n+s_Y²/m); r = floored Welch–Satterthwaite df."),
    ("Schools, no pooling", "Same school data without pooling → slightly wider CI than pooled; still covers 0."),
    ("Paired samples", "Each X matched to a Y (before/after, same subject). Analyse differences, not two independent lists."),
    ("Paired CI", "d̄ ± t_{α/2}(n−1) s_D/√n — same as a one-sample t for μ_D=μ_X−μ_Y."),
    ("Reaction times", "Example: n=8, d̄=−0.0625, s_D=0.0765 → 95% paired CI barely covers 0; unpaired CIs are wider."),
    ("Width comparison", "Same center d̄=x̄−ȳ. Typical order when ρ>0: paired < pooled < Welch. Var(X−Y)=σ_X²+σ_Y²−2ρσ_Xσ_Y."),
    ("Difference p1 − p2", "Special case of two means for 0–1 data: p̂1−p̂2 ± z_{α/2} √(p̂1(1−p̂1)/n1 + p̂2(1−p̂2)/n2). CI does not pool p̂."),
    ("Gaming example", "p̂1=0.6 (n1=2000), p̂2=0.4 (n2=2200) → 95% CI ≈ [0.17, 0.23], entirely above 0."),
    ("Which answer?", "A–D practice quiz: confidence width, t df, sample size ×4, meaning of CI, p*, one-sided z_α, pooled vs paired, SE for p1−p2."),
    ("Takeaways", "Point ± critical × SE. Mean: z or t; one-sided brackets; sample-size formulas; proportions; two means (z / pooled / Welch / paired) and p1−p2."),
]

HT_NOTES: list[tuple[str, str]] = [
    ("Title", "Hypothesis Tests — H0/H1, Type I/II errors, p-values, z/t tests for means and proportions."),
    ("Roadmap", "Setup → errors & α/β → p-value → eight-step procedure → one mean (z then t) → two means → proportions → menu & practice."),
    ("Aircrew escape system", "Motivating example: burn rate must be 50 cm/s; too slow or too fast is unsafe → two-sided alternative."),
    ("H0 versus H1", "H0 = status quo / claim under test (contains “=”); H1 = what we want evidence for. Never put the equality only in H1."),
    ("Which hypotheses?", "Class activity / Live Poll A–D: choose the (H0,H1) pair for coin fairness (one-sided or two-sided) and similar stories."),
    (
        "Predetermined critical region",
        "Before seeing x̄, call |x̄−50|≥1.5 “too far” (x̄≤48.5 or x̄≥51.5); do not redefine afterward. Examples: x̄=52 reject; x̄=47 reject; x̄=51 cannot reject. Critical region = values that reject H0. P(reject H0) = P(x̄ in critical region) once the sampling distribution is known.",
    ),
    ("Test statistic and regions", "Compute a test statistic; reject H0 if it falls in the rejection region determined by α."),
    ("Types of hypothesis", "Lower-tail, upper-tail, or two-sided alternatives. Critical values use α or α/2 accordingly."),
    ("Type I / Type II table", "Type I: reject H0 when H0 true (probability α). Type II: fail to reject when H0 false (probability β). Power = 1−β."),
    ("Propellant: two-sided α", "Two-sided propellant example: reject if x̄<48.5 or x̄>51.5; compute α under μ=50."),
    ("Propellant: two-sided β", "Same two-sided rule; Type II at μ=52 is P(48.5≤x̄≤51.5|μ=52)."),
    ("Propellant: upper α", "Upper-tail rule reject if x̄>51.5; α = P(x̄>51.5|μ=50) (one tail)."),
    ("Propellant: upper β", "Upper-tail Type II at μ=52: β = P(x̄≤51.5|μ=52)."),
    ("Propellant: lower α", "Lower-tail rule reject if x̄<48.5; α = P(x̄<48.5|μ=50)."),
    ("Propellant: lower β", "Lower-tail Type II at μ=48: β = P(x̄≥48.5|μ=48)."),
    ("Cutoff α–β explorer", "Game: switch two-sided / upper / lower; move c and n; watch α–β trade-off."),
    (
        "Significance level",
        "Fix α → from α=P(reject H0|H0)=P(x̄≤50−c or x̄≥50+c|μ=50) solve c=z_{α/2}σ/√n → then β under μ=52. Worked α=0.05; table for 0.10,0.05,0.01. One-sided: c=z_α σ/√n.",
    ),
    ("Simulate α", "Game: when H0 is true, about α of repeated tests reject H0."),
    ("Definition (p-value)", "p-value = P(statistic at least as extreme as observed | H0 true). Not P(H0 true | data)."),
    ("Power supply: region", "Example setup: critical-region approach for a two-sided (or one-sided) test of a mean."),
    ("Power supply: p-values", "Same data via p-value: reject iff p < α. Agrees with the critical-region decision."),
    ("p-value explorer", "Game: drag Z0 and change the alternative; see rejection region and p-value area."),
    ("Concept check: errors", "A–D quiz: Type I/II language, α–β trade-off, what “fail to reject” means, larger n reduces both α and β."),
    ("Concept check: p-value", "A–D quiz: definition, decide with p vs α, two-sided p from Z0, upper-tail p when Z0 is negative."),
    ("Eight steps", "Parameter → H0 → H1 → test statistic → reject rule → compute → decide → report in context."),
    ("Three approaches", "Critical region, p-value, and CI: for the same α they give the same reject/fail-to-reject decision."),
    ("Which tail?", "Game: the alternative decides which tail(s) count for the p-value and rejection region."),
    ("z-test table", "H0: μ=μ0, σ known: Z0=(x̄−μ0)/(σ/√n) ~ N(0,1) under H0. Critical values z_{α/2} or z_α."),
    ("Battery life", "Example: H1: μ>40, σ=1.25, n=10, x̄=40.5 → Z0≈1.26 < 1.645 → fail to reject at α=0.05."),
    ("Response time", "Example: H1: μ>75, σ=8, n=25, x̄=79.25 → reject H0; lower CI excludes 75."),
    ("t-test table", "σ unknown: t0=(x̄−μ0)/(s/√n) ~ t(n−1). Use t critical values."),
    ("Body temperature", "Example: test mean body temperature with sample s (t-test)."),
    ("Known variances (two means)", "Z0 for μ_X−μ_Y with known σ_X, σ_Y; rejection region or CI for the difference."),
    ("Comparing paints", "Example: two paints, known SDs → two-sample z-test for mean drying times."),
    ("Pooled t-test", "Independent samples, equal unknown variances: pool into s_p; df = n+m−2."),
    ("Comparing catalysts", "Example: two catalysts, small n, assume equal variances → pooled t."),
    ("Welch t-test", "Unequal variances: SE = √(s_X²/n+s_Y²/m); Welch–Satterthwaite df. Safer default if equality is doubtful."),
    ("Paired t-test", "Matched pairs: test μ_D with t0 = d̄/(s_D/√n), df = n−1. Before/after on the same units."),
    ("One-proportion test", "H0: p=p0; Z0=(p̂−p0)/√(p0(1−p0)/n). Large-sample normal under H0."),
    ("Higher education", "Example: one-proportion z-test for a claimed education rate."),
    ("Fair die", "Example: test whether P(six)=1/6 with a sample proportion."),
    ("Proportion calculator", "Game: enter n, x, p0, α, side → Z0, p-value, decision."),
    ("Two proportions", "H0: p1=p2; under H0 use pooled p̂ in the SE. CI for p1−p2 does not pool."),
    ("Sparrows", "Example: male vs female return rates → two-proportion z-test."),
    ("Low birth weight", "Example: compare two proportions (treatment vs control)."),
    ("The test menu", "Summary table: which statistic/distribution for one mean, two means (z/pooled/Welch/paired), one/two proportions."),
    ("Which test?", "A–D Live Poll: match each story to z-mean, t-mean, two-mean z, pooled, Welch, paired, or proportion tests."),
    ("Three methods agree", "Battery-style demo: critical region, p-value, and one-sided CI flip together as x̄ moves."),
    ("Which answer?", "Final A–D quiz: z_α vs z_{α/2}, t critical value, pooled df, CI rejection rule, paired design, pooled p̂ in two-prop SE."),
    ("Takeaways", "State H0/H1; pick the statistic; decide via region / p / CI; report. Fail to reject ≠ prove H0."),
]


def write_lecture(slug: str, title: str, url: str, blurb: str, notes: list[tuple[str, str]]) -> Path:
    lines = [
        f"# DOTE2011G · {title}",
        "",
        f"**Live lecture:** {url}",
        "",
        blurb,
        "",
        "---",
        "",
    ]
    for i, (label, body) in enumerate(notes, 1):
        lines.append(f"## Page {i:02d} · {label}")
        lines.append("")
        lines.append(body)
        lines.append("")
    path = KNOWLEDGE / f"{slug}.md"
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return path


def main() -> None:
    ie = write_lecture(
        "interval-estimation",
        "Interval Estimation",
        "https://kwtsang101016.github.io/dote2011/interval-estimation/",
        "Interactive slides condensed from *8 Interval Estimation.pdf*, plus pooled / Welch / paired and two-proportion intervals.",
        IE_NOTES,
    )
    ht = write_lecture(
        "hypothesis-tests",
        "Hypothesis Tests",
        "https://kwtsang101016.github.io/dote2011/hypothesis-tests/",
        "Interactive slides condensed from *9 Hypothesis Test.pdf* (H0/H1, errors, p-values, z/t tests, proportions).",
        HT_NOTES,
    )
    print(f"Wrote {ie} ({len(IE_NOTES)} pages)")
    print(f"Wrote {ht} ({len(HT_NOTES)} pages)")


if __name__ == "__main__":
    main()
