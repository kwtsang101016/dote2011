# DOTE2011G · Discrete Probability Distributions

**Live lecture:** https://kwtsang101016.github.io/dote2011/discrete-distributions/

Interactive slides condensed from *5 Discrete Probability Distributions.pdf* (Broadway TVs, Café de Coral, Mercy Hospital, batteries).

---

## Page 01 · Cover

Discrete Probability Distributions — random variables, expectation/variance, binomial, Poisson, hypergeometric.

## Page 02 · What is a random variable

A random variable is a numerical description of an experiment’s outcome. **Discrete:** finite list or infinite sequence 0,1,2,… **Continuous:** any value in an interval.

## Page 03 · Finite vs infinite

Broadway: x = TVs sold in a day ∈ {0,1,2,3,4} (finite). Customers arriving: x = 0,1,2,… (infinite sequence). Both are discrete because we count.

## Page 04 · Game · classify

Family size / dependents → discrete. Distance home→store (miles) → continuous. Pet ownership coded 1–4 → discrete.

## Page 05 · Probability distributions

A discrete probability distribution describes how probability is spread over values of x (table, graph, or formula). f(x)=P(X=x) with f(x)≥0 and Σf(x)=1.

## Page 06 · Broadway table

Broadway Electronics tracked 200 days of TV sales. Relative frequencies: f(0)=0.40, f(1)=0.25, f(2)=0.20, f(3)=0.05, f(4)=0.10.

## Page 07 · Broadway graph

Bar chart of Broadway f(x) vs x (TV sales).

## Page 08 · Distribution function

The distribution function is F(x)=P(X ≤ x), also called the CDF. For an integer-valued count, f(x)=F(x)-F(x-1) with F(-1)=0. F is a step function: a jump of size f(x) at each possible x. F never decreases, starts at 0, and ends at 1. Broadway: F(2)=0.85, so f(2)=F(2)-F(1)=0.20.

## Page 09 · Discrete uniform

f(x)=1/n when n values are equally likely (e.g. fair die n=6).

## Page 10 · Expected value

For discrete X: E(X)=μ=Σ x f(x). Interpretation: average value of X (need not be attainable). Broadway E(x)=1.20 TVs.

## Page 11 · Expectation properties

(a) E(c)=c. (b) E(c g(X))=c E(g(X)). (c) E[c₁g₁(X)+c₂g₂(X)]=c₁E[g₁(X)]+c₂E[g₂(X)]. Expectation is a linear operator. For any RVs: E(X+Y)=E(X)+E(Y) (independence not required).

## Page 12 · Variance & SD

Var(X)=E[(X−E(X))²]=Σ(x−μ)²f(x)=E(X²)−[E(X)]². σ=√Var(X). Broadway σ²≈1.660, σ≈1.288.

## Page 13 · Variance properties

Var(c)=0. Var(cX)=c² Var(X). For independent X,Y: Var(X+Y)=Var(X)+Var(Y).

## Page 14 · Broadway E and Var

Full computation table for Broadway moments (xf(x) and (x−μ)²f(x) columns).

## Page 15 · Binomial properties

(1) n identical trials (2) success/failure each trial (3) constant p (stationarity) (4) independent trials. x = number of successes.

## Page 16 · Binomial formula

f(x)=C(n,x) p^x (1−p)^(n−x). Running story: Café de Coral (大家樂) restaurant chain; try n=3, p=0.10, x=1 → f(1)=0.243.

## Page 17 · Café de Coral

Café de Coral is concerned about retention: ~10% annual turnover among hourly staff. Pick 3 hourly employees at random; P(exactly one leaves). Sequences (L,S,S), (S,L,S), (S,S,L) each 0.081; total 0.243. E(x)=np=0.3; Var=np(1−p)=0.27; σ≈0.52.

## Page 18 · Binomial mean & Var

E(x)=np; Var(x)=np(1−p); σ=√[np(1−p)]. Interactive: choose n and p to compute the three quantities. Café de Coral check: n=3, p=0.10 → 0.3, 0.27, ≈0.52.

## Page 19 · Game · is it binomial

Large shipment, 5 items, each independently defective with p=0.02 → binomial (p≈constant). If the lot is small and sampling is without replacement, each draw changes the remaining fraction defective → dependent trials, non-constant p → hypergeometric instead. Large N is why binomial often approximates.

## Page 20 · Poisson idea

Counts occurrences in an interval of time/space; x=0,1,2,… Equal-length intervals same rate; disjoint intervals independent. Examples: toll booths, phone calls, ER arrivals.

## Page 21 · Poisson formula

f(x)=e^(−μ) μ^x / x!. Mean = variance = μ. Mercy default μ=3 (30 min), x=4 → ≈0.168.

## Page 22 · Mercy Hospital

Weekend evenings at Mercy Hospital ER average 6 arrivals/hour. For staffing a 30-minute window, μ=3; P(X=4)≈0.168; σ²=μ=3.

## Page 23 · Hypergeometric idea

Finite population without replacement: trials not independent; success probability changes. N population size; r successes in population; n draws; x successes in sample.

## Page 24 · Hypergeometric formula

f(x)=[C(r,x) C(N−r,n−x)] / C(N,n). Zero if x>r or n−x>N−r. Story: Tom mixed 2 good + 2 dead batteries (N=4, r=2).

## Page 25 · Batteries example

Tom accidentally mingled 2 dead batteries with 2 good ones; draws 2 for the flashlight. P(both good)=C(2,2)C(2,0)/C(4,2)=1/6≈0.167. μ=n(r/N)=1; Var≈0.333.

## Page 26 · Large-N approximation

If N ≫ n, hypergeometric ≈ binomial with p=r/N; E≈np, Var≈np(1−p).

## Page 27 · Prompts to try

Two real-data prompts. Earthquakes: use Python to download daily counts in 2025 from https://earthquake.usgs.gov, save as CSV, histogram, mean, and variance. Typhoons: the yearly counts are an HTML table, not a CSV, at https://www.hko.gov.hk/en/publica/tc/tc2023/table45.html. The assistant must download and parse that page in Python and must not ask the student to paste the table. The table has three columns: Year, annual number in Hong Kong's area of responsibility, and annual number necessitating warning signals. Keep only Year and the area-of-responsibility count. Drop the third column before renaming. Years 1956–2023. Skip the mean row. Save as CSV, then histogram, mean, and variance. A Poisson count has mean equal to variance; students should compare the two numbers themselves. Do not give the sample mean or variance.

**You may try:** paste the prompt into Microsoft Copilot (https://copilot.microsoft.com/), then run the Python in Google Colab (https://colab.research.google.com/) — download any files, and still read the code so you know what the assistant did.

## Page 28 · Takeaways

(1) Distributions: f≥0, sum=1. F(x)=P(X≤x) jumps by f(x). (2) Moments: expectation & variance (with linearity / scale properties). (3) Families: binomial, Poisson, hypergeometric.
