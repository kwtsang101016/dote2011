# DOTE2011G · FAQ and lecture index

**Course hub:** https://kwtsang101016.github.io/dote2011/

---

## How page numbers work

- **Page N** = the N-th slide in the interactive lecture (same order as the PDF handout).
- **Introduction** = 16 pages · **Descriptive Statistics** = 27 pages · **Probability** = 22 pages · **Discrete Distributions** = 28 pages · **Continuous Distributions** = 23 pages · **Sampling Distributions** = 22 pages.
- If a student says “Page 3” without naming the lecture, ask which topic.

| Lecture | Page 3 title |
|---------|--------------|
| Introduction | Two meanings of “statistics” |
| Descriptive Statistics | Game · Name, or number? |
| Probability | Experiments & sample space |
| Discrete Distributions | Finite vs infinite |
| Continuous Distributions | Area under f(x) |
| Sampling Distributions | Why we sample |

---

## Live lecture links

| Lecture | URL |
|---------|-----|
| Introduction | https://kwtsang101016.github.io/dote2011/introduction/ |
| Descriptive Statistics | https://kwtsang101016.github.io/dote2011/descriptive-statistics/ |
| Probability | https://kwtsang101016.github.io/dote2011/probability/ |
| Discrete Probability Distributions | https://kwtsang101016.github.io/dote2011/discrete-distributions/ |
| Continuous Probability Distributions | https://kwtsang101016.github.io/dote2011/continuous-distributions/ |
| Sampling and Sampling Distributions | https://kwtsang101016.github.io/dote2011/sampling-distributions/ |

---

## Categorical vs quantitative (decision rule)

Ask: **Is this a name/label, or a number with meaning?**

| Categorical (label) | Quantitative (number) |
|---------------------|-------------------------|
| Blood type, home type, rating label, supplier name, exchange N/NQ | Height (cm), cost ($), rent ($), counts, sales ($M) |

---

## Quick probability facts

- 0 ≤ P ≤ 1; sample-space probabilities sum to 1  
- Addition: P(A∪B)=P(A)+P(B)−P(A∩B)  
- Conditional: P(A|B)=P(A∩B)/P(B)  
- Independent iff P(A∩B)=P(A)P(B)  
- Bayes: revise priors with new data → posteriors  

## Quick discrete-distribution facts

- Discrete RV: countable values; continuous: interval values  
- Distribution function: F(x)=P(X≤x). Discrete: f(x)=F(x)−F(x−1) for an integer count. Continuous: F(x)=∫ f, and f=F'  
- E(x)=Σxf(x) for discrete, ∫x f(x) dx for continuous. Same linearity: E(c)=c, E(X+Y)=E(X)+E(Y) always  
- Var(c)=0; Var(cX)=c²Var(X); Var(X+Y)=Var(X)+Var(Y) if independent. Same in both cases  
- Binomial: f(x)=C(n,x)p^x(1−p)^(n−x); E=np; Var=np(1−p)  
- Poisson: f(x)=e^(−μ)μ^x/x!; mean=variance=μ  
- Hypergeometric: without replacement; ≈ binomial when N is large  

## Quick continuous-distribution facts

- Continuous: probability is area; P(X = x) = 0  
- F(x)=P(X≤x)=∫_{-∞}^{x} f; f=F'. E and Var use integrals, with the same properties as the discrete case  
- Uniform on (a, b): f(x)=1/(b−a); E=(a+b)/2; Var=(b−a)²/12  
- Normal: z=(x−μ)/σ; within 1/2/3 SD: 68.26% / 95.44% / 99.72%  
- Inverse: x = μ + zσ (oil reorder: 15 + 1.645×6 ≈ 24.87)  
- Binomial approx when np>5 and n(1−p)>5; continuity ±0.5  
- Exponential: f(x)=(1/μ)e^(−x/μ); E(X)=μ; Var(X)=μ² so SD = μ; P(X≤x0)=1−e^(−x0/μ)  
- Poisson counts ↔ exponential gaps (mean wait 1/λ)

## Quick sampling-distribution facts

- SRS of size n from N: every sample of size n equally likely  
- Point estimators: x̄ → μ, s → σ, p̂ → p  
- E(x̄)=μ (unbiased); σ_x̄=σ/√n; FPC √((N−n)/(N−1)) if n/N ≥ 0.05  
- CLT / n ≥ 30: sampling distribution of x̄ approximately normal  
- E(p̂)=p; σ_p̂=√(p(1−p)/n); normal approx when np>5 and n(1−p)>5  
- St. Stephen’s: N=900, n=30, μ=1090, σ=80, p=0.72; σ_x̄≈14.6; σ_p̂≈0.082  

---

## Population vs sample

| Term | Meaning |
|------|---------|
| Population | Every element you care about |
| Sample | Subset you measure |
| Inference | Use sample to learn about population |

---

## Common misconceptions

| Wrong | Right |
|-------|-------|
| Correlation proves cause | Association ≠ causation |
| Mutually exclusive = independent | Mutually exclusive events with P&gt;0 cannot be independent |
| Prior probabilities never change | Bayes updates priors with new information |

---

## Which knowledge file to search

The platform allows **5 uploads**. Prof. Tsang chooses **two** lecture HTML files each time (current + previous). Every lecture’s full notes are also copied into older-lectures.html, which is always uploaded. The separate lecture HTML files stay on disk.

| Question type | Primary HTML file |
|---------------|-------------------|
| Midterm, grading, schedule, policies | course-admin.html |
| A lecture that was uploaded | That lecture’s HTML (introduction / descriptive-statistics / probability / discrete-distributions / continuous-distributions / sampling-distributions) |
| Any lecture, including one not in the two lecture uploads | older-lectures.html |
| “Which page?” / routing | faq-and-index.html |

Live lecture URLs (always available to students):

- Introduction — https://kwtsang101016.github.io/dote2011/introduction/
- Descriptive Statistics — https://kwtsang101016.github.io/dote2011/descriptive-statistics/
- Probability — https://kwtsang101016.github.io/dote2011/probability/
- Discrete Probability Distributions — https://kwtsang101016.github.io/dote2011/discrete-distributions/
- Continuous Probability Distributions — https://kwtsang101016.github.io/dote2011/continuous-distributions/
- Sampling and Sampling Distributions — https://kwtsang101016.github.io/dote2011/sampling-distributions/

---

## Games quick reference

**Probability:** Page 07 counting game · Page 19 Bayes game  

**Discrete Distributions:** Page 04 classify · Page 12 compute E(X) · Page 15 variance quiz · Page 21 is it binomial?  

**Continuous Distributions:** Page 04 distribution function · Page 18 which approximation is closer? · Page 21 which expression?  

**Sampling Distributions:** Page 13 CLT histogram · Page 15 / 20 probability sliders · Page 21 which statement?  

**Descriptive Statistics:** Pages 3, 6, 8, 13, 18, 20, 21, 25 (see descriptive-statistics.html)
