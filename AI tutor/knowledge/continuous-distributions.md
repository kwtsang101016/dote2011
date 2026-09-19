# DOTE2011G · Continuous Probability Distributions

**Live lecture:** https://kwtsang101016.github.io/dote2011/continuous-distributions/

Interactive slides condensed from *6 Continuous Probability Distributions.pdf* (Healthy Canteen, William Automobile, invoice errors, Al’s pump).

---

## Page 01 · Cover

Continuous Probability Distributions — uniform, normal (including z and the central limit theorem), normal approximation to the binomial, and exponential.

## Page 02 · Intervals, not points

A continuous random variable can take any value in an interval. P(X = x) = 0. Ask for P(x1 < X < x2). Endpoints do not change the probability.

## Page 03 · Area under f(x)

P(x1 < X < x2) is the area under the density between x1 and x2. Total area is 1. Same idea for uniform, normal, and exponential. The slide shows a density curve with the interval (x1, x2) shaded.

## Page 04 · Distribution function

F(x)=P(X ≤ x). Side-by-side plots: continuous Unif(0,6) has F(x)=x/6 on (0,6) with no jumps; discrete uniform on {1,2,3,4,5,6} (fair die) jumps by 1/6 at each integer. Continuous: f=F' and P(a<X<b)=F(b)−F(a). Discrete: f(k)=F(k)−F(k−1). In both cases F is nondecreasing, from 0 to 1.

## Page 05 · Expected value

Same idea as the discrete lecture, with a sum replaced by an integral: E(X)=μ=∫ x f(x) dx. Properties are unchanged: E(c)=c, E(c g(X))=c E(g(X)), linearity, and E(X+Y)=E(X)+E(Y) without requiring independence.

## Page 06 · Variance

Var(X)=E[(X-μ)^2]=∫ (x-μ)^2 f(x) dx = E(X^2)-[E(X)]^2. σ is the positive square root. Same properties as the discrete case: Var(c)=0, Var(cX)=c^2 Var(X), and Var(X+Y)=Var(X)+Var(Y) only if X and Y are independent.

## Page 07 · Uniform density, mean, variance

f(x) = 1/(b − a) for a < x < b, else 0. E(X) = (a + b)/2. Var(X) = (b − a)^2 / 12. Students move a and b on a density plot: a wider interval lowers the bar so the area stays 1.

## Page 08 · Healthy Canteen

Salad weight uniform from 5 to 15 oz. f(x) = 1/10. Mean 10 oz. Variance 100/12 ≈ 8.33. P(12 < X < 15) = 0.30. Sliders recompute other intervals.

## Page 09 · Normal density

f(x) = (1/(σ√(2π))) exp(−½((x−μ)/σ)^2). Used for heights, rainfall, test scores, measurements. de Moivre, 1733. Central to inference.

## Page 10 · μ and σ

Symmetric (skewness 0). Peak = mean = median = mode. μ any real number. Larger σ → wider, flatter curve. Area 0.5 each side of the mean.

## Page 11 · Empirical rule

Within 1 SD: 68.26%. Within 2 SD: 95.44%. Within 3 SD: 99.72%. These are normal areas, not a rule for every data set.

## Page 12 · The z score

Standard normal: mean 0, SD 1, letter z. z = (x − μ)/σ = number of SDs from the mean.

## Page 13 · William stockout

Assume lead-time demand is normal with μ = 15 and σ = 6. Reorder at 20: z = (20−15)/6 = 0.83. Stockout probability is the area to the right of that z. The slider changes the reorder point and shows one probability.

## Page 14 · Reorder point

Want a small stockout probability. The standard normal plot shades that right-tail area in pink and marks the z that cuts it off. Convert with x = 15 + z×6. Raising the reorder point from 20 to about 25 gallons cuts the stockout chance from roughly 0.20 to 0.05.

## Page 15 · Central limit theorem

Assume X_1, …, X_n are i.i.d. with the same mean μ and the same finite variance σ². The population need not be normal. For large n, the sample mean is approximately normal with mean μ and standard deviation σ/√n. Related exact fact: if X and Y are independent and each is normal, then aX + bY is normal for any constants a and b.

## Page 16 · Bernoulli sum

A binomial count is the sum of n i.i.d. Bernoulli trials. Mean np, variance np(1−p). By the central limit theorem the count is approximately normal when n is large enough that np > 5 and n(1−p) > 5. Sliders show whether both products exceed 5.

## Page 17 · Half-unit correction

The normal curve is continuous, so an integer count is a bar of width 1. A height reading 1.75 m means [1.745, 1.755). A count of 12 means [11.5, 12.5). Rules: P(X ≤ x) uses cutoff x+0.5; P(X ≥ x) uses cutoff x−0.5; P(X = k) is the area from k−0.5 to k+0.5.

## Page 18 · Which approximation is closer?

Two comparisons, switched on the slide: P(X ≤ k) and P(X = k). Each shows normal without the half-unit, normal with the half-unit, and the exact binomial. Students pick which normal answer is closer. Default n = 100, p = 0.1, k = 12.

## Page 19 · Exponential waiting times

f(x) = (1/μ) e^(−x/μ) for x > 0. E(X) = μ, Var(X) = μ², so the standard deviation equals the mean. Skewness 2. CDF: P(X ≤ x0) = 1 − e^(−x0/μ). Al’s pump, mean 3 minutes: variance 9, P(X ≤ 2) = 1 − e^(−2/3) ≈ 0.4866.

## Page 20 · Poisson link

Poisson describes the number of events in an interval. Exponential describes the length of the gap between events. If the Poisson mean is λ events per unit time, the exponential mean wait is 1/λ.

## Page 21 · Which expression?

Multiple choice (no calculator): salad P(12<X<15)=3/10; z=(20−15)/6; reorder 15+1.645×6; continuity P(11.5<X<12.5); exponential mean equals SD.

## Page 22 · Prompts to try

Two download-and-plot prompts. Apple daily returns (yfinance, ticker AAPL): histogram, boxplot, and a normal curve using the sample mean and sample standard deviation. Earthquake waits: download the hours between successive earthquakes in 2025 from https://earthquake.usgs.gov, save as CSV, plot a histogram and a boxplot, and report the mean and standard deviation. You may try: paste into Microsoft Copilot (https://copilot.microsoft.com/), run Python in Google Colab (https://colab.research.google.com/).

## Page 23 · Takeaways

Distribution function F(x)=P(X≤x), with f=F' in the continuous case. Expectation and variance use integrals and the same properties as the discrete lecture. Uniform length rule; standardize and invert the normal; continuity correction for a large binomial; exponential CDF and Poisson pairing.
