# Slide to website map

Which slide sends students to which part of the site.

Generated from the built `.pptx` files by `docs/build_slide_map.py`, so
it cannot drift out of date. Rerun it after rebuilding the slides.

Each slide listed here is a full-slide **Try this interactively**
call-out on the MTU layout. It names the activity and prints the page
path in monospace, so it can be read aloud or typed in a lecture
theatre.

## The mapping

| Week | Slide | Lecture topic | Website activity | Type | Path |
|---|---|---|---|---|---|
| 1 | 14 | Machine learning in biology, and an introduction to foundation models | Watch: Biology Meets Computer Science | Video | `weeks/week01.html#videos` |
| 1 | 26 | Machine learning in biology, and an introduction to foundation models | What type of ML problem is this? | Interactive | `weeks/week01.html#interactive` |
| 1 | 36 | Machine learning in biology, and an introduction to foundation models | Watch: AlphaFold, the making of a scientific breakthrough | Video | `weeks/week01.html#videos` |
| 2 | 51 | Decision trees and explainable biological prediction | Decision Tree Builder, Entropy Visualiser and the Deployment demonstration | Interactive | `weeks/week02.html#interactive` |
| 3 | 18 | The complete machine-learning workflow | Train/Test Leakage Simulator | Interactive | `weeks/week03.html#interactive` |
| 4 | 17 | Probability, Bayes and medical decision making | Medical Test Calculator | Interactive | `weeks/week04.html#interactive` |
| 5 | 16 | Naive Bayes for biomedical and food-safety text | Naive Bayes Word Probability Explorer | Interactive | `weeks/week05.html#interactive` |
| 6 | 18 | Biological and nutrition data preparation | Data Quality Explorer | Interactive | `weeks/week06.html#interactive` |
| 7 | 20 | Dimensionality reduction and foundation-model embeddings | PCA Visualiser | Interactive | `weeks/week07.html#interactive` |
| 7 | 21 | Dimensionality reduction and foundation-model embeddings | Foundation Model Embedding Explorer | Interactive | `weeks/week07.html#interactive` |
| 8 | 18 | k-NN and biological similarity | Biological Similarity Explorer | Interactive | `weeks/week08.html#interactive` |
| 9 | 18 | Clustering biological data | Clustering Simulator | Interactive | `weeks/week09.html#interactive` |
| 10 | 17 | Random forests and foundation-model representations | Random Forest Visualiser | Interactive | `weeks/week10.html#interactive` |
| 10 | 18 | Random forests and foundation-model representations | Model Comparison Lab | Interactive | `weeks/week10.html#interactive` |
| 11 | 19 | Boosting and foundation-model adaptation | Fine-Tuning Simulator | Interactive | `weeks/week11.html#interactive` |
| 12 | 19 | Can we trust the model? | Would You Trust This Model? | Interactive | `weeks/week12.html#interactive` |
| 12 | 20 | Can we trust the model? | Should I Use a Foundation Model? | Interactive | `weeks/week12.html#interactive` |

## Deck sizes and downloads

| Week | Slides | PowerPoint | PDF |
|---|---|---|---|
| 1 | 49 | `slides/week01/COMP9085_Week01.pptx` | `slides/week01/COMP9085_Week01.pdf` |
| 2 | 58 | `slides/week02/COMP9085_Week02.pptx` | `slides/week02/COMP9085_Week02.pdf` |
| 3 | 27 | `slides/week03/COMP9085_Week03.pptx` | `slides/week03/COMP9085_Week03.pdf` |
| 4 | 26 | `slides/week04/COMP9085_Week04.pptx` | `slides/week04/COMP9085_Week04.pdf` |
| 5 | 25 | `slides/week05/COMP9085_Week05.pptx` | `slides/week05/COMP9085_Week05.pdf` |
| 6 | 27 | `slides/week06/COMP9085_Week06.pptx` | `slides/week06/COMP9085_Week06.pdf` |
| 7 | 30 | `slides/week07/COMP9085_Week07.pptx` | `slides/week07/COMP9085_Week07.pdf` |
| 8 | 27 | `slides/week08/COMP9085_Week08.pptx` | `slides/week08/COMP9085_Week08.pdf` |
| 9 | 27 | `slides/week09/COMP9085_Week09.pptx` | `slides/week09/COMP9085_Week09.pdf` |
| 10 | 27 | `slides/week10/COMP9085_Week10.pptx` | `slides/week10/COMP9085_Week10.pdf` |
| 11 | 28 | `slides/week11/COMP9085_Week11.pptx` | `slides/week11/COMP9085_Week11.pdf` |
| 12 | 29 | `slides/week12/COMP9085_Week12.pptx` | `slides/week12/COMP9085_Week12.pdf` |

Both formats are linked at the top of every week page, on the resources page and on `canvas.html`.

## Every interactive, and the teaching question it answers

An interactive that does not answer a question is decoration. These are the questions.

| Interactive | Week | Teaching question |
|---|---|---|
| ML Problem Classifier | 1 | Which kind of ML problem is this, and why is the tempting answer wrong? |
| Decision Tree Builder | 2 | What does changing depth do to generalisation, on real data? |
| Entropy and Information Gain Visualiser | 2 | What does information gain actually compute? |
| Train/Test Leakage Simulator | 3 | How much does a leaky protocol inflate the reported score? |
| Medical Test Calculator | 4 | Why can a 99% accurate test be wrong most of the time it fires? |
| Naive Bayes Word Probability Explorer | 5 | Which words drive the classification, and what does smoothing do? |
| Data Quality Explorer | 6 | What does each preprocessing choice cost, when the damage is known? |
| PCA Visualiser | 7 | How much is lost by reducing, and does it matter downstream? |
| Foundation Model Embedding Explorer | 7 | When does a learned representation beat hand-engineered features? |
| Biological Similarity Explorer | 8 | Is it the classifier or the representation that decides the neighbours? |
| Clustering Simulator | 9 | Is this cluster structure biological, or is it the batch? |
| Random Forest Visualiser | 10 | What can a feature-importance ranking actually bear? |
| Model Comparison Lab | 10 | What changes when you sort by something other than accuracy? |
| Fine-Tuning Simulator | 11 | What does each rung of the adaptation ladder really cost? |
| Would You Trust This Model? | 12 | What questions must a performance claim survive? |
| Should I Use a Foundation Model? | 12 | Should I use a foundation model for this problem at all? |

## QR codes for classroom use

The slides print the page path in monospace, which is enough to type. For QR codes on a printed handout, encode your deployed base URL plus the path from the table above, for example:

```
https://USERNAME.github.io/REPO/weeks/week02.html#interactive
```

They are not committed to the repository, because the base URL is not known until you deploy. To generate them:

```bash
pip install "qrcode[pil]"
python3 docs/build_slide_map.py --qr \
    --base https://USERNAME.github.io/REPO/
```

This writes one PNG per week into `slides/qr/`, which you can drop onto the title slide of each deck.

