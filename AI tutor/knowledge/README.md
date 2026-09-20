# AI tutor — knowledge base

## CRITICAL — for agents / future edits

**Do NOT delete lecture HTML files.** Keep every lecture knowledge HTML forever once generated:

- `introduction.html`
- `descriptive-statistics.html`
- `probability.html`
- `discrete-distributions.html`
- `continuous-distributions.html`
- (and any future lecture HTML)

Reasons:

1. The instructor manually chooses which **two** lecture HTML files to upload to the AI platform (current week + previous week). All other lecture HTML files stay on disk for later use.
2. `older-lectures.html` is a **copy** of every lecture note, not a replacement. Never delete a lecture HTML because its text is also in older-lectures.

### When to update `older-lectures`

`older-lectures.html` is rebuilt from every lecture in `FILES` (the entries with a slug) each time the build script runs. It already contains Introduction, Descriptive Statistics, Probability, Discrete Probability Distributions, and Continuous Probability Distributions.

When a **new** lecture HTML is created:

1. Add `("lecture-name.md", "lecture-name")` to `FILES` in `scripts/build_knowledge_html.py`.
2. Run `python "AI tutor/scripts/build_knowledge_html.py"`.

Do not paste lecture text into `older-lectures.md` by hand. That file is only the preamble (upcoming topics and the midterm reminder). The script appends the lectures.

### Platform limit (5 uploads)

The AI platform accepts **5 HTML files**. Typical upload set (instructor chooses the two lecture slots):

| Slot | File |
|------|------|
| 1 | course-admin.html |
| 2–3 | **Two** lecture HTMLs (manual pick) |
| 4 | faq-and-index.html |
| 5 | older-lectures.html |

Full lecture sources stay in `knowledge/*.md` and are always regenerated into `html/`.

## Regenerate HTML

```bash
python "AI tutor/scripts/build_knowledge_html.py"
```

This builds **all** listed knowledge files, including every lecture HTML. Never remove a lecture from the build list just because it is not currently among the five uploads.

## Source markdown

Edit `.md` here; HTML is generated into [`../html/`](../html/).
