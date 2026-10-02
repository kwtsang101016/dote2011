# DOTE2011G · Sampling and Sampling Distributions

**Live lecture:** https://kwtsang101016.github.io/dote2011/sampling-distributions/

Interactive slides condensed from *7 Sampling and Sampling Distribution.pdf*. Running example: St. Stephen’s College (N = 900 applicants, n = 30, SAT μ = 1090, σ = 80, on-campus housing p = 0.72).

---

## Page 01 · Cover

Sampling and Sampling Distributions — selecting a sample, point estimation, sampling distributions of x̄ and p̂, and the central limit theorem.

## Page 02 · Population and sample

Running example: St. Stephen’s College, N = 900 applicants; later a sample of n = 30. Population = all 900 applicants. Sample = the 30 chosen for detailed review. Element = one applicant (SAT, housing preference, …). Frame = the numbered list of applicants 1–900; that list is the sampled population.

## Page 03 · Why we sample

We sample to answer a research question about a population. Sample results estimate population characteristics. They are still only estimates because the sample is a portion of the population. A census is often too costly or impossible (ongoing processes).

## Page 04 · Simple random sample

Finite populations often come from lists (rosters, accounts, inventory). A simple random sample (SRS) of size n from N gives every possible sample of size n the same probability. Sampling without replacement is usual; with replacement puts each selected element back before the next draw.

## Page 05 · St. Stephen's selection

N = 900 applicants numbered 1–900; want n = 30. Assign each a random number, then take the 30 with the smallest random numbers (or sort and take the first 30).

## Page 06 · Infinite population

Ongoing processes (production line, bank transactions, help desk, store customers) have no complete frame. A random sample from an infinite population: each element comes from the population of interest, and selections are independent.

## Page 07 · Estimators

Point estimation: use a sample statistic to estimate a population parameter. x̄ estimates μ; s estimates σ; p̂ estimates p. This is statistical inference.

## Page 08 · St. Stephen's estimates

Sample of 30 before the full database was ready. Later population values: μ = 1090 (SAT), σ = 80, p = 0.72 (housing). Sample: x̄ = 1097, s = 75.2, p̂ = 0.67. Formulas: x̄ = (Σ x_i)/n with x_i = SAT of applicant i; p̂ = x/n with x = number in the sample wanting on-campus housing (here x ≈ 20). Different random samples give different estimates.

## Page 09 · Inference pipeline

(1) Select an SRS of size n from a population with mean μ. (2) Compute x̄. (3) Use x̄ to make inferences about μ.

## Page 10 · Definition and expected value

The sampling distribution of x̄ is the probability distribution of all possible sample means of size n. E(x̄) = μ. An estimator is unbiased when its expected value equals the parameter. Sample mean and sample variance are unbiased for μ and σ².

## Page 11 · Standard error

σ_x̄ is the standard error of the mean. Infinite population: σ_x̄ = σ/√n. Finite: multiply by √((N−n)/(N−1)). Treat a finite population as infinite when n/N < 0.05 (omit the correction).

## Page 12 · Form / normality

Central limit theorem (CLT): for large n, x̄ is approximately N(μ, σ²/n) — mean μ and variance σ²/n (standard error σ_x̄ = σ/√n; apply the finite-population correction when n/N ≥ 0.05). If the population is already normal, the sampling distribution is exactly that normal for any n. In most applications the CLT approximation is usable when n ≥ 30; highly skewed populations or outliers may need n near 50. The next slide shows how different populations need different n before the histogram looks like that normal curve.

## Page 13 · Central limit theorem

Whatever the population, for large n the sampling distribution of x̄ is approximately N(μ, σ²/n). Live demo: choose a population students already know — fair die (discrete uniform 1–6), Binomial(10, 0.5), Binomial(10, 0.1), Poisson(μ = 1), or exponential(μ = 1) — then raise n. The histogram of simulated sample means spans their own (min, max), with the CLT normal curve overlaid. Symmetric populations (die, Binomial p = 0.5) look normal by about n = 5; skewed ones (Poisson, Binomial p = 0.1, exponential with skewness 2) need a larger n, roughly n ≥ 30 for the exponential.

## Page 14 · SE for n = 30

St. Stephen’s: μ = 1090, σ = 80, n = 30. n/N = 0.033 < 0.05, so σ_x̄ = 80/√30 ≈ 14.61. E(x̄) = 1090.

## Page 15 · P within ±10

P(1080 < x̄ < 1100). z = (1100 − 1090)/14.6 ≈ 0.68. P(−0.68 < Z < 0.68) ≈ 0.5034. Interactive slider changes the margin around μ.

## Page 16 · n = 30 vs 100

E(x̄) stays 1090. For n = 100, σ_x̄ = 80/√100 = 8. P(1080 < x̄ < 1100) rises to about 0.7888. Larger n shrinks the SE, so x̄ tends to lie closer to μ.

## Page 17 · Definition and expected value

Inference for a proportion: sample → p̂ = x/n → statements about p. Sampling distribution of p̂ = distribution of all possible sample proportions. E(p̂) = p (unbiased).

## Page 18 · SE and normal rule

Infinite: σ_p̂ = √(p(1−p)/n). Finite: times √((N−n)/(N−1)). Approximate normality of p̂ when np > 5 and n(1−p) > 5.

## Page 19 · np checks

St. Stephen’s housing: p = 0.72, n = 30. np = 21.6 > 5 and n(1−p) = 8.4 > 5 → normal OK. E(p̂) = 0.72, σ_p̂ ≈ 0.082.

## Page 20 · P within ±0.05

P(0.67 < p̂ < 0.77). z = 0.05/0.082 ≈ 0.61. Probability ≈ 0.4582. Interactive margin slider.

## Page 21 · Which statement?

Practice quiz: E(x̄)=μ; skip FPC when n/N < 0.05; normal for p̂ needs np and n(1−p) > 5; larger n shrinks σ_x̄.

## Page 22 · Takeaways

SRS (finite equal chance / infinite independent from population of interest). Point estimators x̄, s, p̂. Mean: E(x̄)=μ, σ_x̄=σ/√n (+ FPC). Proportion: E(p̂)=p, σ_p̂=√(p(1−p)/n), normal if np and n(1−p) > 5. CLT / n ≥ 30 for the shape of x̄.
