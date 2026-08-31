# DOTE2011G · Introduction (interactive lecture)

**Live site:** https://kwtsang101016.github.io/dote2011/introduction/  
**Page numbers** match the website slide counter and downloadable PDF (01/14 … 14/14).

---

## Index

| Page | Title |
|------|-------|
| 01 | Cover |
| 02 | Why statistics |
| 03 | Two meanings of “statistics” |
| 04 | Business uses |
| 05 | Data vocabulary |
| 06 | Game · label or number? |
| 07 | Cross-section vs time series |
| 08 | Data sources |
| 09 | Describe vs infer |
| 10 | Pail metaphor (population vs sample) |
| 11 | Population & sample (bearings) |
| 12 | Inference preview |
| 13 | AI · get data |
| 14 | AI · plot data |
| 15 | Ethics game |
| 16 | Takeaways |

---

## Page 01 · Cover

**Title:** Introduction  
**Lead:** Turn data into decisions — without drowning in definitions on day one.  
**Navigation:** Use arrow keys or on-screen buttons. Numbers in examples can be redrawn. Download PDF for a printable handout.

---

## Page 02 · Why statistics

**Title:** Business runs on uncertainty.

**Questions statistics helps with:** Should we launch the product? Which supplier is safer? Is wait time really above five minutes?

You rarely see the whole population — you see a sample, noise, and competing stories.

| Without statistics | With statistics |
|--------------------|-----------------|
| Gut feel — anecdotes swap places with evidence | Structured doubt — summarise, quantify uncertainty, separate signal from wishful thinking |

---

## Page 03 · Two meanings of “statistics”

**Title:** “Statistics” is a noun and a subject.

**As numbers (published figures):** “HK inflation 2.1%.” “Median rent $8,200.” “On-time delivery 94%.” — numerical summaries someone computed from data.

**As a discipline:** Collect → organise → display → analyse → interpret — with rules for when a claim is fair. This course trains both reading and doing.

---

## Page 04 · Business uses

**Title:** Statistics shows up everywhere in business.

| Function | Example use |
|----------|-------------|
| Finance | Price–earnings ratios and dividend yields guide investment advice |
| Economics | Forecast models turn historical data into views about the economy ahead |
| Production | Quality-control charts watch whether a process is drifting off target |
| Marketing | Checkout scanners feed data on what customers buy together |

Accounting audits use statistical sampling too — same idea, different vocabulary.

---

## Page 05 · Data vocabulary

**Title:** One row = one observation.

- **Data set** — every case you measured  
- **Element** — one case (e.g. one company)  
- **Variable** — what you record (sales, exchange)  
- **Observation** — one row (all values for one company)

**Example table (5 companies × 3 variables → 5 observations):**

| Company | Sales ($M) | Earn/Share | Exchange |
|---------|------------|------------|----------|
| Dataram | 73.1 | 0.86 | N |
| EnergySouth | 74.0 | 1.67 | N |
| Keystone | 365.7 | 0.86 | NQ |
| LandCare | 111.4 | 0.33 | N |
| Psychemedics | 17.6 | 0.13 | N |

**Tip:** Ask first — label or number? You do not need every scale-of-measurement label on day one.

---

## Page 06 · Game · label or number?

**Title:** Label or number?  
**Rule:** Is this a **name/label** (categorical) or a **number** (quantitative)?

| Observation | Type | Why |
|-------------|------|-----|
| CUHK student blood type | **Categorical** | Label/category |
| Number of siblings | **Quantitative** | Count |
| Country of residence | **Categorical** | Label |
| Height (cm) | **Quantitative** | Measured number |
| Annual sales ($M) | **Quantitative** | Measured amount |
| Stock exchange: N or NQ | **Categorical** | Label/code |

---

## Page 07 · Cross-section vs time series

**Title:** Same variable — different snapshot.

**Cross-section (one point in time):** Salary of *all* fresh graduates at *each* HK university in **2021** — compare places at the same moment.

**Time series (many periods):** Salary of CUHK fresh graduates in **2022, 2023, 2024** — same group moving forward. Gasoline price by month is a classic time-series picture.

---

## Page 08 · Data sources

**Title:** Who collected it — and did they control anything?

| Source | Description |
|--------|-------------|
| **Existing data** | Company records, Census & Statistics Department, industry reports, databases — fast, but ask who collected it and why |
| **Designed experiment** | You control inputs and measure outputs (e.g. Salk polio trial). Strong for cause; expensive; ethical limits |
| **Observational study** | Watch without assigning treatment — surveys, smoker vs non-smoker comparisons. Lurking variables can fool you |

Bad data cheaply acquired can be worse than no data.

---

## Page 09 · Describe vs infer

**Title:** Describe the sample. Infer about the population.

| Descriptive | Inferential |
|-------------|-------------|
| Compress what is **in front of you** — tables, charts, averages | Use a **sample** to learn about a **larger group** you did not fully measure |
| Example: 50 tune-up invoices → histogram → “parts average about $79” | Example: estimate mean wait time; test a claim; predict sales from ad spend |

Most headlines show descriptive statistics. Most business decisions need inferential ones — with uncertainty attached.

---

## Page 10 · Pail metaphor

**Title:** Probability and statistics ask opposite questions.

**Population** = the whole pail (e.g. 10 squares + 5 circles = 15 items).  
**Sample** = a handful scooped from the pail (e.g. 4 squares + 2 circles = 6 items). Same shapes in both — the handful is drawn *from* the pail.

| Direction | Question |
|-----------|----------|
| **Probability** (population → sample) | The pail mix is known. If you scoop 6 items, what mix might land in your hand? |
| **Statistics** (sample → population) | You scooped 4 squares and 2 circles. What mix in the full pail is plausible? |

Later topics: probability & distributions; then sampling, confidence intervals, hypothesis tests, ANOVA, regression.

---

## Page 11 · Population & sample

**Title:** You almost never weigh every bearing.

- **Population** = every element you care about (e.g. 48 bearings produced today)  
- **Sample** = the subset you actually measure (e.g. 10 inspected)  
- **Census** = measure all 48; **sample survey** = measure 10  

Inference uses the sample to speak about the population.

---

## Page 12 · Inference preview

**Title:** Inference in one picture.

**Estimation:** Sample average wait = 5.07 min → best guess for population mean. Later: confidence interval — how far can 5.07 move?

**Hypothesis test:** Claim: mean wait ≤ 5 min. Data average = 5.07. Enough evidence to reject? Same pattern for any yes/no claim about a population.

**Linear regression:** Campus café — predict wait time (Y) from staff (X₁), capacity (X₂), time of day (X₃):

**Y = β₀ + β₁X₁ + β₂X₂ + β₃X₃ + ε**

Y = wait time (minutes); ε = leftover noise.

---

## Page 13 · AI · get data

**Title:** Step 1 — ask an assistant to download data.

Use an AI coding assistant to fetch public data for **practice** (follow course AI policy for graded work).

**Example prompt:** Download Apple (AAPL) daily stock data for the past year using Python (yfinance or akshare). Save as `aapl_daily.csv`. Show first five rows and column names.

**Check:** CSV should have Date, Open, High, Low, Close, Volume.

---

## Page 14 · AI · plot data

**Title:** Step 2 — ask for a chart, then read it like a statistician.

**Example prompt:** Read `aapl_daily.csv` and plot a candlestick chart for the past year. Label axes. Save as `aapl_candles.png`.

**Ask yourself:** Trend up or down? Wide candles (volatility)? Correct date range?

---

## Page 15 · Ethics game

**Title:** Spot the shady statistics.

| Statement | Verdict |
|-----------|---------|
| Convenience sample dressed up as representative | **Problem** — easy-to-reach people ≠ the population you claim |
| Chart axis starts at zero when comparing amounts | **Good** — avoids exaggerating small differences |
| Report only the subgroup that supports the story | **Problem** — cherry-picking hides the full study |
| Call correlation “proof of cause” | **Problem** — two trends can move together for other reasons |
| Show sample size and how data were collected | **Good** — context builds trust |

**Axis example:** Revenue $101M vs $102M — axis from 0 shows ~1% gap (honest); axis from 100 makes 102 look twice 101 (misleading).

---

## Page 16 · Takeaways

**Title:** Data → picture → number → honest claim.

1. **Ask the type** — Label or number? Sample or population?  
2. **Describe first** — Tables and charts before you quote an average.  
3. **Infer carefully** — Correlation ≠ cause. Show your sample. Report uncertainty.
