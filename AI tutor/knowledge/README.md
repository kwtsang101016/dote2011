# AI tutor — knowledge base

## CRITICAL — for agents / future edits

**Do NOT delete lecture HTML files.** Keep every lecture knowledge HTML forever once generated:

- `introduction.html`
- `descriptive-statistics.html`
- `probability.html`
- `discrete-distributions.html`
- (and any future lecture HTML)

Reasons:

1. The course may not have started yet — there are **no** “past” lectures to archive automatically.
2. Moving a lecture into `older-lectures` is **not** automatic and is **not** a reason to delete its full HTML.
3. The instructor manually chooses which **two** lecture HTML files to upload to the AI platform (current week + previous week). All other lecture HTML files stay on disk for later use.

### When to touch `older-lectures`

Only when the instructor explicitly says something like:

> Please add XX.html to older-lectures.html

Until then, leave `older-lectures.md` / `.html` as a light placeholder (upcoming topics, routing notes). Do **not** compress Introduction (or any lecture) into older-lectures on your own.

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
