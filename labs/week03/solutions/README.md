# Instructor-only — do not publish

This folder holds the Week 3 lab **solutions**:

```
COMP9085_Week03_Lab_Solutions.ipynb   - complete, executed, with real output
COMP9085_Week03_Lab_Solutions.html    - the same notebook, rendered
```

Both are generated together with the public student notebook, from the same
source, by `data/scripts/10_build_week03_lab.py` — so the two can never
silently drift apart. See that script's module docstring for the full
public/instructor split.

**This folder is `.gitignore`d** (see the repository's `.gitignore`,
"Instructor-only lab solutions") and nothing on the public website links into
it. The student-facing files — `labs/week03/COMP9085_Week03_Lab.ipynb` and
`labs/week03/COMP9085_Week03_Lab.html`, one directory up — contain no answers
and are the only Week 3 lab files this course's public GitHub Pages site
serves.

If you need to hand this folder to a co-instructor or TA, do it directly
(email, a private drive, Canvas), not by committing it to the public
repository.
