# Agent Configuration — DOTE2011G Teaching Assistant

Copy [`agent-prompt-copypaste.txt`](agent-prompt-copypaste.txt) into your platform **system prompt**.

Upload **five HTML** files from `AI tutor/html/` (not the `.md` files). Always include:

- course-admin.html  
- faq-and-index.html  
- older-lectures.html  

Plus **two lecture HTML files** you choose (current week + previous week), e.g.:

- introduction.html  
- descriptive-statistics.html  
- probability.html  

**All lecture HTML files are kept on disk.** Do not delete them when switching which two you upload. Do not add a lecture to older-lectures unless you explicitly ask an agent to do so.

**Lecture hub:** https://kwtsang101016.github.io/dote2011/

After slide edits: run `python "AI tutor/scripts/build_knowledge_html.py"` and re-upload changed HTML.

See [`knowledge/README.md`](knowledge/README.md) for the full policy for AI agents editing this folder.

---

The short prompt for the platform is in **agent-prompt-copypaste.txt** (keep that file as the source of truth for paste).
