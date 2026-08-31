# AI tutor — knowledge base

## For the AI platform

1. **System prompt:** copy from [`../agent-prompt.md`](../agent-prompt.md) (everything under “Language” through “Routing cheat sheet”).
2. **Upload these 5 HTML files** from [`../html/`](../html/):

| File | Size (approx.) |
|------|----------------|
| course-admin.html | ~5 KB |
| introduction.html | ~12 KB |
| descriptive-statistics.html | ~17 KB |
| faq-and-index.html | ~5 KB |
| older-lectures.html | ~4 KB |

## Regenerate HTML after editing slides

Edit the `.md` files in this folder, then run:

```bash
python "AI tutor/scripts/build_knowledge_html.py"
```

Re-upload any changed `.html` files to the platform.

## Source files

| Markdown (edit here) | HTML (upload) |
|------------------------|---------------|
| course-admin.md | course-admin.html |
| introduction.md | introduction.html |
| descriptive-statistics.md | descriptive-statistics.html |
| faq-and-index.md | faq-and-index.html |
| older-lectures.md | older-lectures.html |

## Mid-semester rotation

When **Probability** becomes the focus: replace one recent HTML slot with `probability.html`, compress finished lectures into `older-lectures.html`, keep `course-admin.html` and `faq-and-index.html`.
