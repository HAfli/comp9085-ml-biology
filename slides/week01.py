"""
COMP9085 Week 1 — Machine learning in biology, and an introduction to
foundation models.

PROVENANCE
----------
This deck is a rebuild of Week1_MLinBiology_Introduction_final.pptx (52 slides),
not a replacement for it. Retained from the original, with the original slide
numbers noted:

  s2      the roadmap structure of the lecture
  s3      lecturer introduction (compressed from 11 images to one slide)
  s5-6    the module descriptor link, courses.cit.ie moduleId 15193
  s7-9    resources and the Jupyter/Python setup
  s12-16  what machine learning is; the categorisation wheel
  s17-24  the credit-decision example, compressed from 8 slides to 2 and then
          transferred onto the biological problem
  s25-31  Build/Deploy two-step, D = [(d1,t1),...], M = Learn(D), t = M(q)
  s32     generalisation
  s33-36  "A Bigger Dataset". The original speaker note reads: "don't actually
          ask them to do this one - the point here is that this is hard!"
          That instruction is preserved verbatim in the notes here, because it
          is the pedagogical payload of the whole sequence.
  s38     Quanta Magazine video, "Biology Meets Computer Science"
  s40-44  basic terminology and the categories of ML algorithms
  s45     DeepMind AlphaFold video
  s47-49  the carbon footprint material, with the Dan Jurafsky quotation and
          the Stanford HAI source

Dropped: the 34-second hype clip on s4, whose only provenance is a blogspot
aggregator. See docs/VIDEO_SOURCES.md.

Added: module orientation, the biological data landscape, why biological ML is
hard, and a conceptual introduction to foundation models.
"""
from template import *          # noqa: F401,F403

WEEK = 1
STRAND = "classical"


def build(prs):
    # ---------------------------------------------------------------- Part 0
    title_slide(
        prs, WEEK,
        "Machine learning in biology",
        "and an introduction to foundation models",
        STRAND,
        notes="Welcome. Establish three things in the first ten minutes: what "
              "the module is, that it is assessed entirely by coursework, and "
              "that there is no lab this week. Everything else can wait.")

    bullets(
        prs, WEEK, "This lecture",
        ["Part 1  Welcome and module orientation",
         "Part 2  Why machine learning for biology, healthcare and nutrition",
         "Part 3  What machine learning is: the vocabulary and the workflow",
         "Part 4  From a generic example to a biological one",
         "Part 5  Foundation models, conceptually",
         "Part 6  Cost, sustainability and choosing the right size of model"],
        sub="Roughly two hours, with two short videos and one interactive activity.",
        strand=STRAND, size=18,
        notes="Retained from slide 2 of the original deck. Flag now that the "
              "credit-scoring example in Part 4 is deliberate and brief, and "
              "that it turns into a cancer-diagnosis problem within two slides.")

    section_slide(prs, WEEK, 1, "Welcome and module orientation",
                  "What this module is, and how it works", STRAND)

    bullets(
        prs, WEEK, "Your lecturer",
        ["Dr Haithem Afli, Department of Computer Science, MTU",
         "Principal Investigator, national ADAPT Centre; ADAPT lead at MTU",
         "Lead of the Human-Centred AI research group",
         "Research: natural language processing, trustworthy and explainable "
         "AI, machine learning for biology and the social sciences",
         "Chair of the Computer Science postgraduate research board",
         "IEEE Senior Member; ACM and ACL member",
         "Several themes in this module, particularly Week 12 on trust and "
         "evaluation, come directly out of that research"],
        strand=STRAND,
        notes="Compressed from slide 3 of the original, which carried eleven "
              "logos. Keep it to ninety seconds; the point is credibility and "
              "where the module's opinions come from, not a CV.")

    table_slide(
        prs, WEEK, "The module",
        ["", ""],
        [["Code and title", "COMP9085 Machine Learning in Biology"],
         ["Credits and level", "5 credits, NFQ Level 9 (MSc)"],
         ["Contact", "2 h lecture + 2 h laboratory each week"],
         ["Independent study", "About 3 h each week"],
         ["Assessment", "Coursework only. Project 1 (50%) and Project 2 (50%)"],
         ["Examination", "None"],
         ["Reassessment", "Resubmitted coursework only"],
         ["Descriptor", "courses.cit.ie  ·  moduleId 15193"]],
        strand=STRAND, col_widths=[1, 3], size=14,
        notes="From slides 5 and 6. The descriptor link is on the website "
              "footer so students can find it later.")

    bullets(
        prs, WEEK, "Learning outcomes",
        ["LO1  Analyse machine learning workflows to facilitate "
         "pre-processing, dimensionality reduction and model selection",
         "LO2  Compare and apply appropriate machine learning algorithms to "
         "specific biological datasets",
         "LO3  Develop supervised machine learning models for classification "
         "tasks",
         "LO4  Develop unsupervised machine learning models for clustering "
         "tasks",
         "LO5  Evaluate the accuracy of predictive models using standard "
         "methods and interpret their results"],
        sub="Unchanged from the approved module descriptor.",
        strand=STRAND, size=15,
        notes="Worth saying explicitly that these are the approved outcomes and "
              "that the foundation-model content sits inside LO2 and LO1 "
              "rather than replacing anything. Students sometimes ask whether "
              "the module has been rewritten; it has been modernised, and the "
              "outcomes are the same.")

    table_slide(
        prs, WEEK, "Assessment",
        ["", "Weight", "What it asks of you"],
        [["Project 1: supervised biological machine learning", "50%",
          "Build, tune and honestly evaluate a supervised model on "
          "biological or clinical data"],
         ["Project 2: unsupervised biological machine learning", "50%",
          "Find structure in unlabelled biological data, and show it is not "
          "an artefact"],
         ["Written examination", "None",
          "The module is assessed entirely by coursework"]],
        sub="Unchanged from the approved descriptor. Marks are for the "
            "reasoning, not for the tool: using a foundation model earns "
            "nothing on its own.",
        strand=STRAND, col_widths=[2.2, 0.7, 3.4], size=13,
        notes="Say the last sentence out loud. Every year a few submissions "
              "assume that calling a pretrained model is itself the "
              "contribution. The marks are for the justification, the "
              "evaluation and the honesty about limitations. Both briefs are "
              "on the website and on Canvas from today.")

    two_col(
        prs, WEEK, "How the parts fit together",
        "Each week", [
            "Lecture, two hours. Slides on Canvas and the website beforehand, "
            "as PowerPoint and PDF",
            "Website: concepts, worked example, an interactive figure you "
            "manipulate, a self-check",
            "Laboratory, two hours, from Week 2",
            "One recommended reading, chosen because it is the most useful "
            "thing to read at that point",
        ],
        "Where things live", [
            "Teaching material: the course website",
            "Announcements, submission and grades: Canvas",
            "Slides: both, as PPTX and PDF",
            "Your weekly check-in: your own browser, private to you",
        ],
        sub="One copy of the teaching material, linked from Canvas, rather than "
            "two copies that drift apart.",
        strand=STRAND, right_colour=SPECIMEN,
        notes="Emphasise that the website figures are live models, not "
              "screenshots. Students consistently under-use them because they "
              "assume they are pictures.")

    figure_note(
        prs, WEEK,
        "There is no laboratory in Week 1.",
        "The first practical is in Week 2, once you have the decision-tree "
        "material to work with. Before then: install Python, watch the two "
        "videos, read Greener et al. (2022). None of it is assessed.",
        kind="key", strand=STRAND,
        notes="Say this twice. It appears on the website too. Students who "
              "miss it turn up to a lab that does not exist, or worse, assume "
              "they have missed an assessment.")

    bullets(
        prs, WEEK, "Software and resources",
        ["Python 3 with NumPy, pandas, scikit-learn, Matplotlib, seaborn",
         "Jupyter for the labs",
         "Nothing in this module needs a GPU",
         "Install before Week 2 so the first lab starts with the material",
         ("pip install numpy pandas scikit-learn matplotlib seaborn jupyter", 1),
         "UCI Machine Learning Repository, CDC NHANES, openFDA and the NCI "
         "Genomic Data Commons are the main data sources",
         "The full list, with links, is on the resources page of the website"],
        sub="Retained from the original resources slides.",
        strand=STRAND,
        notes="From slides 7 to 9. Do not spend long here; point at the "
              "resources page and move on. Offer help at the end of the "
              "lecture for anyone whose install fails.")

    # ---------------------------------------------------------------- Part 2
    section_slide(prs, WEEK, 2,
                  "Why machine learning for biology, healthcare and nutrition",
                  "The data, and why it is difficult", STRAND)

    diagram_pipeline(
        prs, WEEK, "The biological data landscape",
        [("Five families of data, five different problems", CLINICAL,
          ["Genomics\nlong discrete sequences",
           "Proteomics\nsequence with 3-D consequences",
           "Medical imaging\nhigh-dimensional pixel grids",
           "Clinical records\nsparse, irregular, confounded",
           "Nutrition\nself-reported, high error"])],
        sub="Recognising which kind of problem you have decides everything "
            "downstream.",
        strand=STRAND,
        notes="Ask the room which of these they work with. It is usually a "
              "wide spread, and it sets up why the module keeps returning to "
              "'what representation does this problem need'.")

    bullets(
        prs, WEEK, "Why these domains are harder than the usual benchmarks",
        ["Small n, large p. Hundreds of samples, tens of thousands of features",
         "Labels are expensive, and are often a clinician's judgement rather "
         "than a measurement",
         "Rows are not independent: several samples come from one patient, one "
         "site, one batch",
         "Measurement error is substantial and systematic, not random noise",
         "The two kinds of error almost never cost the same",
         "Populations are unevenly represented, and the gaps are rarely recorded",
         "A model that is accurate and unusable is a common outcome"],
        sub="None of this is a reason not to do it. All of it is a reason to "
            "evaluate carefully.",
        strand=STRAND,
        notes="This slide is new. It is the honest framing that the original "
              "deck did not have, and it justifies why Weeks 3 and 12 exist.")

    interactive(
        prs, WEEK, "Watch: Biology Meets Computer Science",
        "Quanta Magazine  ·  3 min 46 s  ·  on the Week 1 page",
        "What is it about modern biological data that makes computation "
        "necessary rather than merely convenient?",
        strand=STRAND,
        notes="Original slide 38. Play it here rather than at the end: it "
              "motivates the whole module before any algorithm appears. The "
              "website embeds the same video from Quanta's YouTube channel.")

    # ---------------------------------------------------------------- Part 3
    section_slide(prs, WEEK, 3, "What machine learning is",
                  "Vocabulary, workflow, generalisation", STRAND)

    concept(
        prs, WEEK, "Machine learning",
        "Fitting a function from data rather than specifying it by hand.",
        "The data, not the programmer, determines the rule. Everything else in "
        "this module is a consequence of that one sentence.",
        strand=STRAND,
        notes="From slide 12. Keep the definition this short; the vocabulary "
              "slides that follow do the work.")

    picture_slide(
        prs, WEEK, "Where machine learning sits",
        "w1_ai_ml_dl_circles.png",
        caption="Artificial intelligence contains machine learning, which "
                "contains deep learning. Foundation models are deep learning "
                "at a scale that changes what is practical, not a fourth ring.",
        credit="Figure retained from the 2025/26 COMP9085 Week 1 deck "
               "(slide 11).",
        strand=STRAND,
        notes="Retained from the original deck. The useful question to ask "
              "here: which ring does a decision tree live in? Answer: the "
              "middle one. Students often assume everything modern is deep "
              "learning, and eight of the twelve weeks are not.")

    picture_slide(
        prs, WEEK, "Artificial intelligence: the domains",
        "w1_ai_domain_wheel.png",
        caption="Machine learning is one cognitive domain of AI among several. "
                "This module is the inner segment marked machine learning, and "
                "the application sub-domains it reaches in biology.",
        credit="Figure retained from the 2025/26 COMP9085 Week 1 deck "
               "(slides 4 and 11).",
        strand=STRAND,
        notes="Retained from the original deck; it is the clearest picture in "
              "it. Point out that supervised, unsupervised and reinforcement "
              "learning are siblings on this wheel, and that this module "
              "covers the first two.")

    equation(
        prs, WEEK, "Step 1: building a machine-learning solution",
        "D = [(d₁, t₁), (d₂, t₂), ... , (dₙ, tₙ)]\nM = Learn(D)",
        "A training dataset D pairs each instance description d with its target "
        "value t. A learning algorithm consumes D and returns a model M.",
        [("d", "the descriptive features of one instance: the measurements you have"),
         ("t", "the target feature: what you are trying to predict"),
         ("D", "the training dataset, n such pairs"),
         ("M", "the fitted model, the output of learning")],
        strand=STRAND,
        notes="Retained from slides 25 and 26 with the original notation. "
              "Students find the two-step framing genuinely clarifying, and it "
              "pays off in Week 3 when the split boundary matters.")

    equation(
        prs, WEEK, "Step 2: deploying a machine-learning solution",
        "t = M(q)",
        "A query instance q, described by the same features, is passed to the "
        "fitted model, which returns a prediction t.",
        [("q", "a new instance the model has never seen"),
         ("M", "the model fitted in step 1"),
         ("t", "the prediction: a class, or a value")],
        strand=STRAND,
        notes="Slides 30 and 31. Emphasise that building and deploying are "
              "distinct, because Week 3's leakage material is entirely about "
              "what may cross between them.")

    bullets(
        prs, WEEK, "The vocabulary, precisely",
        ["Feature (descriptive feature): an input column",
         "Label (target feature): what you are predicting",
         "Training data: the examples the algorithm learns from",
         "Model: the function produced by learning",
         "Prediction: the model applied to a new instance",
         "Generalisation: performance on data the model has never seen",
         "Evaluation: measuring generalisation honestly, which is harder than "
         "it sounds and is the subject of Weeks 3 and 12"],
        strand=STRAND,
        notes="Slide 40. This is the terminology that recurs every week.")

    table_slide(
        prs, WEEK, "The three task types you will build",
        ["Task", "The label is", "A biological example", "Weeks"],
        [["Classification", "one of a fixed set of classes",
          "Is this breast-mass biopsy benign or malignant?", "2-6, 8, 10-11"],
         ["Regression", "a number on a continuous scale",
          "Predict a patient's HbA1c from dietary recall data", "3, 10"],
         ["Clustering", "not given at all",
          "Which tumour subtypes are present in this expression matrix?",
          "7, 9"]],
        sub="LO3 is the first row, LO4 is the third. The second is supervised "
            "learning with a continuous target and is treated alongside it.",
        strand=STRAND, col_widths=[1, 1.3, 2.4, 1], size=13,
        notes="Ask the room for a fourth example of each before showing the "
              "column. The distinction that causes the most trouble later is "
              "regression versus classification on a thresholded measurement: "
              "predicting HbA1c is regression, predicting diabetic or not from "
              "the same measurement is classification, and the choice changes "
              "the loss, the metric and the failure mode.")

    figure_note(
        prs, WEEK,
        "Generalisation is the only thing that matters.",
        "A model that reproduces its training data perfectly and fails on a new "
        "patient has learned nothing useful. Week 3 measures this properly; "
        "Week 12 asks whether the measurement can be believed.",
        kind="key", strand=STRAND,
        notes="Slide 32 made this point with the Sean Murphy example. The "
              "statement stands on its own.")

    two_col(
        prs, WEEK, "Categories of machine learning",
        "By supervision", [
            "Supervised: every example is labelled. Classification predicts a "
            "category, regression predicts a quantity",
            "Unsupervised: no labels. Find structure",
            "Semi-supervised: a little labelled data, a lot unlabelled. The "
            "common situation in biology",
            "Reinforcement: learning from interaction and reward. Not covered "
            "in this module",
        ],
        "By what you are asking for", [
            "Classification: benign or malignant",
            "Regression: serum vitamin D in nmol/L",
            "Clustering: are there subtypes in these tumours?",
            "Dimensionality reduction: 20,000 genes into a few useful axes",
            "Representation learning: learn the features rather than choose them",
        ],
        sub="Retained from slides 41 to 44, with the examples made biological.",
        strand=STRAND, right_colour=SPECIMEN,
        notes="The right-hand column is the version students actually use when "
              "framing their own projects. Point at the ML Problem Classifier "
              "activity on the website.")

    concept(
        prs, WEEK, "Prediction is not explanation",
        "A model can predict an outcome accurately while encoding no causal "
        "mechanism.",
        "The two goals need different evidence. Conflating them is the most "
        "common error in applied biological machine learning, and it is the "
        "error this module works hardest to prevent.",
        strand=STRAND,
        notes="New. This is the sentence to repeat in Weeks 9, 10 and 12.")

    interactive(
        prs, WEEK, "What type of ML problem is this?",
        "weeks/week01.html  ·  Interactive exploration",
        "Eight real biological scenarios. Classify each one, then read why the "
        "tempting wrong answer is tempting.",
        strand=STRAND,
        notes="Run two or three scenarios live, take answers from the room, "
              "then let them finish it themselves. The RNA-seq subtype one and "
              "the ESM-2 embedding one produce the most useful arguments.")

    # ---------------------------------------------------------------- Part 4
    section_slide(prs, WEEK, 4,
                  "From a generic example to a biological one",
                  "Why we start with loans and finish with tumours", STRAND)

    table_slide(
        prs, WEEK, "A small, deliberately generic example",
        ["Applicant", "Occupation", "Age", "Loan", "Loan-salary ratio", "Outcome"],
        [["Pierre Lundi", "professional", "36", "20,000", "3.22", "?"],
         ["Astrid Karlsson", "professional", "41", "15,000", "4.64", "?"],
         ["Mary Smyth", "industrial", "34", "50,000", "2.96", "?"],
         ["Heidi Fischer", "industrial", "61", "5,000", "2.52", "?"],
         ["Klaus Haller", "professional", "37", "60,000", "1.51", "?"],
         ["Luis Lopez", "industrial", "33", "6,000", "5.25", "?"]],
        sub="Six applicants. Can you write a rule that separates those who "
            "repay from those who default?",
        strand=STRAND, size=13,
        notes="Retained from slides 17 to 24, compressed from eight slides to "
              "two. Take answers. Someone will propose 'ratio above 3 means "
              "default' within a minute, and they will be roughly right.")

    figure_note(
        prs, WEEK,
        "Now make it twenty-five rows and seven features.",
        "Do not attempt this by hand. The original slide carries the "
        "instruction: 'don't actually ask them to do this one - the point here "
        "is that this is hard!' That difficulty is the entire argument for "
        "machine learning.",
        kind="warn", strand=STRAND,
        notes="The original speaker note on slide 34 reads exactly: \"don't "
              "actually ask them to do this one - the point here is that this "
              "is hard!\" Show the 25-row table for about ten seconds, let the "
              "room feel it become impossible, and move on. Do not let anyone "
              "start solving it.")

    table_slide(
        prs, WEEK, "Now change the columns and keep the structure",
        ["The generic example", "The biological version"],
        [["Loan applicant", "Breast-mass biopsy from one patient"],
         ["Occupation, age, loan-salary ratio",
          "Nuclear radius, texture, concavity: 30 measurements"],
         ["Repaid or defaulted", "Benign or malignant"],
         ["A wrong decision costs money",
          "A false negative is a missed cancer"],
         ["Data is abundant and cheaply labelled",
          "Labels need a pathologist or a five-year follow-up"],
         ["Nobody asks who is in the dataset",
          "Who is in the dataset determines who the model works for"]],
        sub="The machine-learning problem is identical. Everything around it "
            "is not.",
        strand=STRAND, col_widths=[1, 1.3], size=14,
        notes="This is the pivot of the whole lecture. The algorithm is the "
              "easy part; the surrounding judgement is the module. From Week 2 "
              "onwards every example is biological, clinical or nutritional.")

    figure_note(
        prs, WEEK,
        "The algorithms are the easy part.",
        "Where the measurements came from, how reliable they are, who is in "
        "the data, what each error costs, and what you would have to show "
        "before anyone should act on the output. That is the module.",
        kind="key", strand=STRAND,
        notes="Pause here. This is the sentence students should leave with.")

    deflist(
        prs, WEEK, "Feature engineering",
        [("What it is",
          "deciding, by hand, which numbers describe the object well enough "
          "for a model to work with: amino-acid composition, molecular weight, "
          "nuclear radius, mean daily energy intake"),
         ("Why it works",
          "a good feature encodes real domain knowledge, so a small model "
          "trained on little data can still succeed"),
         ("Why it is the bottleneck",
          "the features fix a ceiling on what any downstream model can learn; "
          "no algorithm recovers information the features threw away"),
         ("Who does it",
          "someone who knows the biology, which makes it slow, expensive and "
          "hard to transfer to a new problem")],
        sub="Every method in Weeks 2 to 6 takes engineered features as given. "
            "Week 7 asks where they come from.",
        strand=STRAND, size=15,
        notes="This slide is new and it is the hinge of the redesigned module. "
              "Make the ceiling point concrete: if you describe a protein only "
              "by how much of each amino acid it contains, you have discarded "
              "the order, and no classifier downstream can recover it. That is "
              "exactly the experiment on the Week 7 page.")

    figure_note(
        prs, WEEK,
        "Two proteins can have identical composition and opposite function.",
        "Amino-acid composition is order-blind by construction. Any model built "
        "on it alone is at chance on any question that depends on order. Week 7 "
        "runs this comparison on real data and reports both numbers.",
        kind="warn", strand=STRAND,
        notes="Do not give the numbers here. They are measured on the Week 7 "
              "page and students should meet them with the data in front of "
              "them. The point today is only that the ceiling exists.")

    concept(
        prs, WEEK, "Representation learning",
        "Letting the model learn the description instead of specifying it.",
        "The model is trained on a very large amount of unlabelled biological "
        "data first, with no task in mind, and learns a vector representation "
        "of each sequence. That vector is then used as the input to an ordinary "
        "classifier. Nobody chose what goes into it.",
        strand=STRAND,
        notes="This is the one-sentence definition students should be able to "
              "repeat in Week 7. Emphasise the phrase 'no task in mind': the "
              "pretraining objective is not the task you care about, which is "
              "both why it generalises and why it can quietly fail.")

    # ---------------------------------------------------------------- Part 5
    section_slide(prs, WEEK, 5, "Foundation models, conceptually",
                  "What they are, and where they fit", STRAND)

    interactive(
        prs, WEEK, "Watch: AlphaFold, the making of a scientific breakthrough",
        "Google DeepMind  ·  7 min 54 s  ·  on the Week 1 page",
        "What information must a model learn about proteins before it can "
        "predict a structure at all? Where would that information come from?",
        strand=STRAND,
        notes="Original slide 45. Play it after the biological framing, not at "
              "the start: it lands far better once students know what CASP was "
              "and why a fifty-year-old problem mattered. Ask the question "
              "before pressing play.")

    bullets(
        prs, WEEK, "AlphaFold, read carefully",
        ["Predicting 3-D protein structure from sequence was open for fifty years",
         "AlphaFold 2 produced predictions competitive with experiment for many "
         "CASP14 targets (Jumper et al., Nature 2021)",
         "AlphaFold DB now covers over 214 million protein sequences, openly "
         "(Varadi et al., NAR 2024)",
         "It reports its own confidence as pLDDT: above 90 very high, 70 to 90 "
         "confident, 50 to 70 low, below 50 very low",
         "Very low pLDDT correlates with intrinsic disorder, so it is often "
         "information rather than failure",
         "It does not tell you what a protein does, or which conformation "
         "matters in a cell",
         "It is not a conventional supervised classifier: learned "
         "representations plus strong geometric assumptions"],
        sub="A striking result and a careful reading of its limits are not in "
            "tension. Both are required.",
        strand=STRAND, size=15,
        notes="The last two bullets matter most. Students arrive believing "
              "AlphaFold 'solved protein folding' and that it is a big "
              "classifier. Neither is right, and correcting both here saves "
              "confusion in Week 7.")

    diagram_pipeline(
        prs, WEEK, "Three workflows, at a conceptual level",
        [("Classical machine learning", CLINICAL,
          ["Biological data", "Feature engineering\nby a human",
           "Model training", "Prediction"]),
         ("The foundation-model workflow", SIGNAL,
          ["Sequence, image\nor text", "Pre-trained model",
           "Representation\n(embedding)", "Downstream model", "Prediction"]),
         ("Fine-tuning", NUCLEUS,
          ["Pre-trained model", "Adaptation to your\nbiological task",
           "Prediction"])],
        sub="You are not expected to implement any of these this week.",
        strand=STRAND,
        notes="The point to land: the last box of the middle row is an "
              "ordinary supervised model. The foundation model changed the "
              "input representation, not the discipline. Week 7 is where this "
              "becomes concrete.")

    concept(
        prs, WEEK, "Foundation model",
        "A large model pretrained with self-supervision on a broad corpus, "
        "intended to be adapted to many downstream tasks rather than built "
        "for one.",
        "Note what is not in the definition. Size is not: ESM-2 is released as "
        "small as 8 million parameters and is still a foundation model. "
        "Architecture is not either.",
        strand=STRAND,
        notes="Self-supervision is the word to dwell on: no human labelled the "
              "pretraining corpus, which is why it can be enormous.")

    table_slide(
        prs, WEEK, "Biological foundation models you will meet",
        ["Model", "Trained on", "Turns this into a vector", "First met in"],
        [["ESM-2", "protein sequences (UniRef)", "an amino-acid sequence",
          "Week 7"],
         ["ProtT5", "protein sequences", "an amino-acid sequence", "Week 7"],
         ["DNABERT-2", "genomic DNA", "a DNA sequence", "Week 7"],
         ["Nucleotide Transformer", "genomes across many species",
          "a DNA sequence", "Week 7"],
         ["HyenaDNA", "genomic DNA, very long context",
          "a long DNA sequence", "Week 11"]],
        sub="Five names, one idea: biological input goes in, a fixed-length "
            "vector comes out, and an ordinary classifier goes on top.",
        strand=STRAND, col_widths=[1.1, 1.7, 1.7, 0.8], size=13,
        notes="Do not ask students to remember the names. Ask them to remember "
              "the shape of the pipeline, which is the same for all five. The "
              "names are on the foundation-models page of the website with "
              "citations, parameter counts and licences, so nobody needs to "
              "write them down. If asked which to use: Week 7 answers that "
              "with a measurement, not an opinion.")

    figure_note(
        prs, WEEK,
        "Foundation models do not replace machine-learning fundamentals. "
        "They build on them.",
        "This is the argument of the whole module. It is why Weeks 2 to 6 are "
        "classical machine learning taught properly, and why the foundation-"
        "model weeks come afterwards rather than instead.",
        kind="fm", strand=STRAND,
        notes="If students remember one sentence from Week 1, this is the one.")

    figure_note(
        prs, WEEK,
        "What is the simplest appropriate machine-learning approach for this "
        "biological problem, and what evidence do you have that it is "
        "appropriate?",
        "The central question of the module. Both halves matter, and the "
        "second one is the hard part.",
        kind="key", strand=STRAND,
        notes="Every week returns to this. It is also, in effect, the marking "
              "rubric for both projects.")

    # ---------------------------------------------------------------- Part 6
    section_slide(prs, WEEK, 6, "Cost, sustainability and model choice",
                  "Why the biggest model is not the default answer", STRAND)

    bullets(
        prs, WEEK, "The carbon footprint of training large models",
        ["Training large models has a measurable energy and carbon cost "
         "(Strubell, Ganesh and McCallum, ACL 2019)",
         "The full development cycle, including architecture search and "
         "retraining, is very much larger than a single training run",
         "“There's a big push to scale up machine learning to solve bigger "
         "and bigger problems, using more compute power and more data. As that "
         "happens, we have to be mindful of whether the benefits of these "
         "heavy-compute models are worth the cost of the impact on the "
         "environment.”  Dan Jurafsky",
         "Inference at scale is not free either, and is often the larger "
         "lifetime cost",
         "Source: Stanford HAI, “AI's carbon footprint problem”"],
        sub="Retained from the original deck, and promoted from a closing "
            "remark to a model-selection criterion.",
        strand=STRAND, size=15,
        notes="Slides 47 and 48. The original note reads 'And I'm quoting Dan "
              "Jurafsky here'. Keep the quotation; it does the work. The "
              "change from the original is that this is no longer a "
              "conscience-clearing slide at the end, it is an input to model "
              "choice.")

    table_slide(
        prs, WEEK, "Measured on the dataset this module uses throughout",
        ["Model", "Accuracy", "Cost"],
        [["Majority-class baseline", "62.7%", "None"],
         ["Decision tree, depth 3", "91.7%", "A laptop, instantly"],
         ["Random forest, 500 trees", "95.4%", "A laptop, seconds"],
         ["Logistic regression", "97.4%", "A laptop, instantly"],
         ["PCA (10) + logistic regression", "97.7%", "A laptop, instantly"]],
        sub="Real measured results: UCI Breast Cancer Wisconsin (Diagnostic), "
            "569 samples, 5-fold cross-validation. The simplest model wins.",
        strand=STRAND, col_widths=[2, 1, 1.4], size=14,
        notes="These are genuinely measured, by data/scripts/"
              "02_build_benchmarks.py in the course repository, and the "
              "website recomputes the same models live in the browser. Worth "
              "saying so: students assume numbers on slides are decorative.")

    figure_note(
        prs, WEEK,
        "A bigger model is not automatically a better scientific model.",
        "Computational and environmental cost belong beside accuracy as a "
        "model-selection criterion, not as an afterthought. Week 12 returns to "
        "this with the full trust checklist.",
        kind="key", strand=STRAND,
        notes="Closing argument of the lecture, and it connects directly to "
              "Week 12.")

    # ---------------------------------------------------------------- Close
    bullets(
        prs, WEEK, "Before Week 2",
        ["No lab this week. The first practical is in Week 2",
         "Install Python and the scientific stack",
         "Watch the two videos on the Week 1 page and answer the question "
         "attached to each",
         "Read Greener, Kandathil, Moffat and Jones (2022), "
         "“A guide to machine learning for biologists”, "
         "Nature Reviews Molecular Cell Biology",
         "Try the ML Problem Classifier activity on the website",
         "Fill in the weekly check-in; it takes a minute and it shapes the "
         "next lecture"],
        sub="Next week: decision trees, entropy and information gain, on real "
            "diagnostic data.",
        strand=STRAND,
        notes="The original slide 50 said 'Next Week: NumPy / Pandas "
              "Overview'. In the redesigned module that setup material moves "
              "into independent study, and Week 2 goes straight to decision "
              "trees, which is a better use of contact time.")

    references(
        prs, WEEK, [
            "Greener, J. G., Kandathil, S. M., Moffat, L. & Jones, D. T. (2022). "
            "A guide to machine learning for biologists. Nature Reviews "
            "Molecular Cell Biology 23:40-55. doi:10.1038/s41580-021-00407-0",
            "Jones, D. T. (2019). Setting the standards for machine learning in "
            "biology. Nature Reviews Molecular Cell Biology 20:659-660. "
            "doi:10.1038/s41580-019-0176-5",
            "Jumper, J. et al. (2021). Highly accurate protein structure "
            "prediction with AlphaFold. Nature 596:583-589. "
            "doi:10.1038/s41586-021-03819-2",
            "Abramson, J. et al. (2024). Accurate structure prediction of "
            "biomolecular interactions with AlphaFold 3. Nature. "
            "doi:10.1038/s41586-024-07487-w",
            "Varadi, M. et al. (2024). AlphaFold Protein Structure Database in "
            "2024. Nucleic Acids Research 52(D1):D368-D375. "
            "doi:10.1093/nar/gkad1011",
            "Strubell, E., Ganesh, A. & McCallum, A. (2019). Energy and Policy "
            "Considerations for Deep Learning in NLP. ACL 2019. "
            "arXiv:1906.02243",
            "Wolberg, W., Mangasarian, O., Street, N. & Street, W. (1993). "
            "Breast Cancer Wisconsin (Diagnostic). UCI Machine Learning "
            "Repository. doi:10.24432/C5DW2B",
            "Videos: Quanta Magazine, “Biology Meets Computer Science”; "
            "Google DeepMind, “AlphaFold: The making of a scientific "
            "breakthrough”",
        ], strand=STRAND)

    closing(prs, WEEK,
            "Next week: Decision trees and explainable biological prediction. "
            "The first laboratory runs in Week 2.",
            strand=STRAND,
            notes="Offer to stay for installation problems. Remind them once "
                  "more that there is no lab this week.")
