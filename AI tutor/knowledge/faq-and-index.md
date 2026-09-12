# DOTE2011G · FAQ and lecture index

**Course hub:** https://kwtsang101016.github.io/dote2011/

---

## How page numbers work

- **Page N** = the N-th slide in the interactive lecture (same order as the PDF handout).
- **Introduction** = 16 pages · **Descriptive Statistics** = 27 pages · **Probability** = 22 pages · **Discrete Distributions** = 27 pages.
- If a student says “Page 3” without naming the lecture, ask which topic.

| Lecture | Page 3 title |
|---------|--------------|
| Introduction | Two meanings of “statistics” |
| Descriptive Statistics | Game · Name, or number? |
| Probability | Experiments & sample space |
| Discrete Distributions | Finite vs infinite |

---

## Live lecture links

| Lecture | URL |
|---------|-----|
| Introduction | https://kwtsang101016.github.io/dote2011/introduction/ |
| Descriptive Statistics | https://kwtsang101016.github.io/dote2011/descriptive-statistics/ |
| Probability | https://kwtsang101016.github.io/dote2011/probability/ |
| Discrete Probability Distributions | https://kwtsang101016.github.io/dote2011/discrete-distributions/ |

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
- E(x)=Σxf(x); Var(x)=Σ(x−μ)²f(x)=E(X²)−[E(X)]²  
- E is linear: E(c)=c, E(cg(X))=cE(g(X)), E(X+Y)=E(X)+E(Y) always  
- Var(c)=0; Var(cX)=c²Var(X); Var(X+Y)=Var(X)+Var(Y) if independent  
- Binomial: f(x)=C(n,x)p^x(1−p)^(n−x); E=np; Var=np(1−p)  
- Poisson: f(x)=e^(−μ)μ^x/x!; mean=variance=μ  
- Hypergeometric: without replacement; ≈ binomial when N is large  

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

The platform allows **5 uploads**. Prof. Tsang chooses **two** lecture HTML files each time (current + previous). All lecture HTML files still exist on disk; only the uploaded ones are searchable in the agent.

| Question type | Primary HTML file |
|---------------|-------------------|
| Midterm, grading, schedule, policies | course-admin.html |
| A lecture that was uploaded | That lecture’s HTML (introduction / descriptive-statistics / probability / …) |
| Topics only if Prof. Tsang added them here | older-lectures.html |
| “Which page?” / routing | faq-and-index.html |

Live lecture URLs (always available to students):

- Introduction — https://kwtsang101016.github.io/dote2011/introduction/
- Descriptive Statistics — https://kwtsang101016.github.io/dote2011/descriptive-statistics/
- Probability — https://kwtsang101016.github.io/dote2011/probability/
- Discrete Probability Distributions — https://kwtsang101016.github.io/dote2011/discrete-distributions/

---

## Games quick reference

**Probability:** Page 07 counting game · Page 19 Bayes game  

**Discrete Distributions:** Page 04 classify · Page 16 binomial check  

**Descriptive Statistics:** Pages 3, 6, 8, 13, 18, 20, 21, 25 (see descriptive-statistics.html)
