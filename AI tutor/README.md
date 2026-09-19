# AI tutor (DOTE2011G)

## Agent reminder — HTML file management

1. **Never delete** lecture HTML under `html/` (`introduction.html`, `descriptive-statistics.html`, `probability.html`, `discrete-distributions.html`, `continuous-distributions.html`, …).
2. The platform only uploads **5** files; the instructor **manually** picks which **two** lecture HTMLs to upload.
3. **Do not** auto-move lectures into `older-lectures`. Only update older-lectures when the instructor says e.g. “Please add XX.html to older-lectures.html”.
4. Regenerate everything with: `python "AI tutor/scripts/build_knowledge_html.py"`.

Details: [`knowledge/README.md`](knowledge/README.md).
