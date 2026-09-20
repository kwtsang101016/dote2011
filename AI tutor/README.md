# AI tutor (DOTE2011G)

## Agent reminder — HTML file management

1. **Never delete** lecture HTML under `html/` (`introduction.html`, `descriptive-statistics.html`, `probability.html`, `discrete-distributions.html`, `continuous-distributions.html`, …).
2. The platform only uploads **5** files; the instructor **manually** picks which **two** lecture HTMLs to upload.
3. **Whenever a new lecture HTML is created**, add it to `FILES` in `scripts/build_knowledge_html.py` and regenerate. `older-lectures.html` then copies that lecture in full. Do not delete the separate lecture HTML.
4. Regenerate everything with: `python "AI tutor/scripts/build_knowledge_html.py"`.

Details: [`knowledge/README.md`](knowledge/README.md).
