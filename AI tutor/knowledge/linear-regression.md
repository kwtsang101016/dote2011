# DOTE2011G · Linear Regression

**Live lecture:** https://kwtsang101016.github.io/dote2011/linear-regression/

Interactive slides for simple linear regression. ANOVA is not taught this year. Notation used on every page: S_xy = (1/n) Σ (x_i − x̄)(y_i − ȳ) and S_xx = (1/n) Σ (x_i − x̄)². The divisor is n, not n−1. Do not call S_xx the sample variance (that name is reserved for the n−1 estimator). When a formula needs the raw sum of squares, it uses n S_xx (and n S_xy).

---

## Page 01 · Cover

Linear Regression. Covariance, least squares, residual checks, confidence intervals, and hypothesis tests for the coefficients.

## Page 02 · How do X and Y move together?

Cov(X,Y) = E[(X − μ_X)(Y − μ_Y)] = E(XY) − μ_X μ_Y. Same direction (both above or both below their means) tends to make the product positive, so covariance is positive. Opposite directions tend to make covariance negative.

## Page 03 · Useful properties

Cov(X, c) = 0 for a constant c. Cov(X, X) = Var(X). Cov(βX, Y) = Cov(X, βY) = β Cov(X, Y). Cov(X_1 + X_2, Y) = Cov(X_1, Y) + Cov(X_2, Y). If X and Y are independent, then Cov(X, Y) = 0. The converse is false: zero covariance does not imply independence.

## Page 04 · Sign of Cov(X,Y) for a perfect line

Live Poll A–D. Each equation holds exactly (no noise). Answers: Y = 3 + 0.2X → Positive (A), because Cov = 0.2 Var(X) > 0. Y = 5 − 1.5X → Negative (C). Y = 3 + 0·X and Y = −4 and Y = 10 − 0·X → Zero (B), because Y is constant. Y = 0.2X → Positive (A).

## Page 05 · If Y = β₀ + β₁ X, then Cov(X,Y) = β₁ Var(X)

Steps: Cov(X, β₀ + β₁ X) = Cov(X, β₀) + Cov(X, β₁ X) = 0 + β₁ Cov(X, X) = β₁ Var(X). Uses additivity, pulling out a constant, Cov(X, c) = 0, and Cov(X, X) = Var(X).

## Page 06 · β₁ Estimation

So β₁ = Cov(X, Y) / Var(X) when Var(X) > 0. From pairs (x_i, y_i), S_xx = (1/n) Σ (x_i − x̄)² and S_xy = (1/n) Σ (x_i − x̄)(y_i − ȳ). Then β̂₁ = S_xy / S_xx. S_xy estimates Cov(X, Y) and S_xx estimates Var(X), but the divisor is n, not n−1.

## Page 07 · y = β₀ + β₁ x

Explorer: drag β₀ from −3 to 3 and β₁ from −2 to 2 and watch the straight line. Intercept shifts the line up or down; slope sets the direction and steepness.

## Page 08 · Relationships between two variables

A scatter diagram is the first look at two quantitative variables before fitting a line.

## Page 09 · Oxygen purity and hydrocarbon levels

Table 11-1, n = 20. Response y is oxygen purity (%); predictor x is hydrocarbon level (%). The cloud slopes upward.

## Page 10 · Mean of Y related to X by a straight line

Model: Y_i = β₀ + β₁ X_i + ε_i, i = 1,…,n, with ε_i ~ N(0, σ²). Then E(Y | x) = β₀ + β₁ x and V(Y | x) = σ². Y is the response, X the predictor, β₀ the intercept, β₁ the slope. Simple linear regression means one predictor and one response.

## Page 11 · Minimize vertical squared gaps

Least squares estimates β₀ and β₁ by minimizing L = Σ (y_i − β₀ − β₁ x_i)², the sum of squared vertical deviations. The minimizers are β̂₁ = S_xy / S_xx and β̂₀ = ȳ − β̂₁ x̄. Fitted values ŷ_i = β̂₀ + β̂₁ x_i and residuals e_i = y_i − ŷ_i. No derivatives are shown. Because S_xx and S_xy already divide by n, later formulas that need the raw sum use n S_xx.

## Page 12 · Purity vs hydrocarbon — find the least-squares line

Computational forms: S_xx = (1/n) Σ x_i² − x̄² and S_xy = (1/n) Σ x_i y_i − x̄ ȳ. Oxygen sums: Σ x = 23.92, Σ y = 1843.21, Σ x² = 29.2892, Σ xy = 2214.6566.

## Page 13 · Oxygen purity least-squares line

S_xx = 0.03404, S_xy = 0.50887, so β̂₁ = 14.94748 and β̂₀ = 74.28331. Fitted line ŷ = 74.283 + 14.947 x. At x = 1.00, ŷ = 89.23%. That number is a point estimate of the mean purity at x = 1 and also a point forecast for a new observation. Both are subject to error; intervals come later.

## Page 14 · Body fat vs BMI

n = 250 men. BMI x = mass(kg) / height(m)² is a proxy for body fat y. Sums: Σ x = 6322.28, Σ x² = 162674.18, Σ y = 4757.90, Σ y² = 107679.27, Σ xy = 125471.10.

## Page 15 · Body fat least-squares estimates

x̄ = 25.28912, ȳ = 19.0316, S_xx = 11.157, S_xy = 20.592. β̂₁ = 1.846, β̂₀ = −27.643. Fitted: body fat ≈ −27.643 + 1.846 (BMI).

## Page 16 · Prediction and a residual

At BMI = 30, ŷ = −27.643 + 1.846×30 = 27.726. At BMI = 25 with observed fat 25%, ŷ = 18.498 and the residual e = 25 − 18.498 = 6.502.

## Page 17 · Check residuals' assumptions

After fitting, e_i = y_i − ŷ_i. To check leftover association with the predictor, plot (x_i, e_i) or compute S_xe = (1/n) Σ (x_i − x̄)(e_i − ē). Hope S_xe ≈ 0. A trend means the straight-line mean is wrong; a funnel means the variance is not constant. Do not diagnose this by plotting residuals against Y. Oxygen data: S_xe is about 0.

## Page 18 · Normality of residuals: histogram and QQ-plot

s_e² = (1/(n−2)) Σ e_i². This is the sample variance of the residuals, and it equals σ̂². The denominator is n−2 because β̂₀ and β̂₁ were both estimated. The histogram is overlaid with the N(0, s_e²) density. The QQ-plot has both axes; points near a straight line support approximate normality. Oxygen: s_e² = 1.18.

## Page 19 · Before confidence intervals — quick poll

Answers: (1) β₁ > 0 implies Cov(X, Y) positive — A. (2) Slope estimator is S_xy / S_xx — B. (3) Residual is e_i = y_i − ŷ_i — C. (4) Check leftover link to the predictor by plotting (x_i, e_i) or checking S_xe ≈ 0 — B. Plotting (y_i, e_i) is the wrong check. (5) A residual QQ-plot checks normality — C. (6) Independence of X and Y implies Cov(X, Y) = 0 — B. Zero covariance does not imply independence.

## Page 20 · Confidence intervals

Section divider for interval estimation on the regression model.

## Page 21 · Model for inference

Y_i = β₀ + β₁ X_i + ε_i with ε_i ~ N(0, σ²), so Y_i ~ N(β₀ + β₁ X_i, σ²). Estimates remain β̂₁ = S_xy / S_xx and β̂₀ = ȳ − β̂₁ x̄. Next: the distribution of those estimates.

## Page 22 · Estimates are linear combinations of the y_i

β̂₁ = (1/(n S_xx)) Σ y_i (x_i − x̄). β̂₀ = Σ y_i [1/n − (x̄ /(n S_xx))(x_i − x̄)]. If the Y_i are normal, these linear combinations are normal.

## Page 23 · A linear combination of independent normals is still normal

If Y_1 ~ N(μ_1, σ_1²) and Y_2 ~ N(μ_2, σ_2²) are independent, then a_1 Y_1 + a_2 Y_2 ~ N(a_1 μ_1 + a_2 μ_2, a_1² σ_1² + a_2² σ_2²). This is how the sampling distribution of a difference of two means is derived. In general, Σ a_i Y_i ~ N(Σ a_i μ_i, Σ a_i² σ_i²) when the Y_i are independent normals.

## Page 24 · Means, variances, and normal laws

E(β̂₁) = β₁ and V(β̂₁) = σ² / (n S_xx), so β̂₁ ~ N(β₁, σ²/(n S_xx)). E(β̂₀) = β₀ and V(β̂₀) = σ² [1/n + x̄²/(n S_xx)], so β̂₀ is normal with that mean and variance. The extra n in the denominator is there because S_xx already divides by n.

## Page 25 · Unbiased estimator of σ²

σ̂² = SS_E / (n − 2). SS_E = Σ e_i² = Σ (y_i − ŷ_i)² = Σ (y_i − β̂₀ − β̂₁ x_i)² = n (S_yy − β̂₁ S_xy). S_yy = (1/n) Σ (y_i − ȳ)². There is no SS_T in this lecture.

## Page 26 · Oxygen purity: SSE and σ̂²

S_yy = 8.6688, S_xy = 0.50887, β̂₁ = 14.94748. SS_E = n(S_yy − β̂₁ S_xy) = 21.2498. σ̂² = 21.2498 / 18 = 1.18.

## Page 27 · Body fat: SSE and σ̂²

S_yy = 68.515. SS_E = 7627.50. σ̂² = 7627.50 / 248 = 30.76.

## Page 28 · Student-t pivots

Replace σ by σ̂. Then (β̂₁ − β₁) / (σ̂ / √(n S_xx)) ~ t(n−2), and (β̂₀ − β₀) / (σ̂ √[1/n + x̄²/(n S_xx)]) ~ t(n−2). σ̂² = (1/(n−2)) Σ (y_i − β̂₀ − β̂₁ x_i)².

## Page 29 · Intervals for β₁ and β₀

Slope: β̂₁ ± t_{α/2}(n−2) √(σ̂² / (n S_xx)). Intercept: β̂₀ ± t_{α/2}(n−2) √{σ̂² [1/n + x̄²/(n S_xx)]}. Width describes the quality of the fitted line.

## Page 30 · 95% CI on the slope

Oxygen: β̂₁ = 14.947, S_xx = 0.03404, σ̂² = 1.18, n S_xx = 0.68088, t_{0.025, 18} = 2.101. Interval is 14.947 ± 2.766, so 12.181 ≤ β₁ ≤ 17.714. It excludes 0, so at α = 0.05 there is strong evidence the slope is not zero.

## Page 31 · CI for the mean response

A 100(1−α)% CI for μ_{Y|x₀} = β₀ + β₁ x₀ is ŷ at x₀ ± t_{α/2}(n−2) √{σ̂² [1/n + (x₀ − x̄)²/(n S_xx)]}, where the center is β̂₀ + β̂₁ x₀.

## Page 32 · 95% CI on mean purity at x₀ = 1.00

Center ŷ = 89.23. Interval 89.23 ± 0.74, so 88.49 ≤ μ_{Y|1.00} ≤ 89.98.

## Page 33 · Predicting a new response

The new observation is independent of the data used to fit the line. Prediction interval: ŷ₀ ± t_{α/2}(n−2) √{σ̂² [1 + 1/n + (x₀ − x̄)²/(n S_xx)]}.

## Page 34 · 95% prediction interval at x₀ = 1.00

Same center 89.23. The interval is 86.83 ≤ Y_0 ≤ 91.63. It is wider than the mean-response CI at the same x₀.

## Page 35 · Why the prediction interval is wider

The prediction interval includes both the error from fitting the line and the randomness of a new observation. The mean CI uses √[1/n + (x₀ − x̄)²/(n S_xx)]. The prediction interval uses √[1 + 1/n + (x₀ − x̄)²/(n S_xx)]. The extra 1 is the new error.

## Page 36 · Move x₀: mean CI vs prediction

Explorer. Blue band is the mean-response CI; red band is the prediction interval. Both get wider as x₀ moves away from x̄. The red band stays wider.

## Page 37 · Parameters, estimates, and CIs

Summary. Model Y_i = β₀ + β₁ X_i + ε_i. β̂₁ = S_xy / S_xx is normal with variance σ²/(n S_xx); its CI uses √(σ̂²/(n S_xx)). β̂₀ is normal with variance σ²[1/n + x̄²/(n S_xx)]. σ̂² = (1/(n−2)) Σ (y_i − β̂₀ − β̂₁ x_i)².

## Page 38 · Intervals and sampling distributions — quick poll

Answers: (1) t critical value for a CI on β₁ uses df = n−2 — C. (2) σ̂² = Σ e_i² / (n−2) — C. (3) V(β̂₁) = σ² / (n S_xx) — B. (4) A prediction interval is wider than the mean CI at the same x₀ because of the extra 1 under the square root — B. (5) Moving x₀ away from x̄ makes both intervals wider — C. (6) A 95% CI for β₁ that excludes 0 rejects H₀: β₁ = 0 at α = 0.05 — B.

## Page 39 · Hypothesis tests

Section divider. Tests on the regression parameters, especially H₀: β₁ = 0 (significance of regression).

## Page 40 · Slope and intercept

Slope: H₀: β₁ = β_{1,0} vs H₁: β₁ ≠ β_{1,0}, with t₀ = (β̂₁ − β_{1,0}) / √(σ̂² / (n S_xx)). Intercept: H₀: β₀ = β_{0,0} vs H₁: β₀ ≠ β_{0,0}, with t₀ = (β̂₀ − β_{0,0}) / √{σ̂² [1/n + x̄²/(n S_xx)]}. Reject H₀ if |t₀| > t_{α/2, n−2}. The matching confidence interval can be used for the same two-sided test.

## Page 41 · Special case: H₀: β₁ = 0

H₀: β₁ = 0 vs H₁: β₁ ≠ 0 is the significance-of-regression test. Failing to reject H₀ means there is no linear relationship between x and Y. A curve can still be present. The slide contrasts a cloud with no pattern and a nonlinear pattern.

## Page 42 · Test H₀: β₁ = 0 for oxygen data

t₀ = β̂₁ / √(σ̂² / (n S_xx)) = 14.947 / 1.317 = 11.35. Critical value t_{0.025, 18} = 2.101. Two-sided p-value = 2 P(T_18 > |t₀|) < 0.0001. Reject H₀ at the usual levels: hydrocarbon level is a significant linear predictor of purity.

## Page 43 · Inference on the slope β₁

Under H₀: β₁ = β_{1,0}, t₀ = (β̂₁ − β_{1,0}) / √(σ̂² / (n S_xx)) ~ t(n−2). Two-sided H₁: reject if |t₀| > t_{α/2}(n−2); p-value 2 P(T > |t₀|); CI is β̂₁ ± t_{α/2}(n−2) √(σ̂²/(n S_xx)). Upper tail H₁: β₁ > β_{1,0}: reject if t₀ > t_α(n−2); p-value P(T > t₀); interval [β̂₁ − t_α(n−2) √(σ̂²/(n S_xx)), ∞). Lower tail: reject if t₀ < −t_α(n−2); p-value P(T < t₀); interval (−∞, β̂₁ + t_α(n−2) √(σ̂²/(n S_xx))]. Reject when the p-value is less than α, or when the interval does not include β_{1,0}.

## Page 44 · Inference on the intercept β₀

t₀ = (β̂₀ − β_{0,0}) / √{σ̂² [1/n + x̄²/(n S_xx)]} ~ t(n−2) under H₀. Same three alternatives as the slope: two-sided uses |t₀| and t_{α/2}; upper tail uses t₀ > t_α and P(T > t₀); lower tail uses t₀ < −t_α and P(T < t₀). Two-sided CI: β̂₀ ± t_{α/2}(n−2) √{σ̂² (1/n + x̄²/(n S_xx))}. Reject when the p-value is less than α, or when the CI does not include β_{0,0}.

## Page 45 · Hypothesis tests for the coefficients — quick poll

Answers: (1) The statistic for H₀: β₁ = β_{1,0} is (β̂₁ − β_{1,0}) / √(σ̂² / (n S_xx)) — B. (2) Two-sided level-α test rejects when |t₀| > t_{α/2, n−2} — C. (3) For H₁: β₁ > β_{1,0}, the p-value is P(T > t₀) — B. (4) Failing to reject H₀: β₁ = 0 means there is no linear relationship between x and Y — C. It does not prove independence, and it does not rule out a curve. (5) The denominator of t₀ for β₀ is √{σ̂² [1/n + x̄²/(n S_xx)]} — C. (6) A 95% CI for β₁ that excludes β_{1,0} rejects the two-sided test of that value at α = 0.05 — B.
