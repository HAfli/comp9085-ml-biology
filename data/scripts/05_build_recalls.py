#!/usr/bin/env python3
"""
COMP9085 build script 05: an illustrative food-recall corpus for the in-browser
naive Bayes explorer.

WHAT THIS IS AND IS NOT
-----------------------
These notices are NOT real FDA records. They are generated from hand-written
phrase templates for each hazard class, using vocabulary drawn from the way
food-recall reasons are typically worded. They exist so that the naive Bayes
explorer works offline in a browser, with a corpus small enough that a student
can read the word-probability table and check the arithmetic by hand.

The real data is used in the Week 5 lab, where students query the live openFDA
food enforcement endpoint directly. That is deliberate: the browser gets a
readable teaching corpus, and the lab gets the real thing with all its mess.

The three hazard classes follow the FDA definitions:
  Class I   reasonable probability of serious adverse health consequences or death
  Class II  temporary or medically reversible adverse health consequences
  Class III use is unlikely to cause adverse health consequences

Run:  python3 data/scripts/05_build_recalls.py
Out:  js/data/recalls.js
"""
import json
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "js", "data", "recalls.js")
SEED = 9085

# Phrase pools per class. The overlap between them is deliberate: "labeling",
# "product" and "packaging" appear across all three, so the classifier has to
# rely on the discriminating terms rather than on a single give-away word.
TEMPLATES = {
    "Class I": [
        "product may be contaminated with {pathogen}",
        "undeclared {allergen} in {product}",
        "{product} contains undeclared {allergen} not listed on the label",
        "potential {pathogen} contamination detected during routine sampling",
        "product recalled due to possible presence of {pathogen}",
        "undeclared {allergen} allergen may cause serious or life threatening reaction",
        "{product} may contain undeclared {allergen} posing risk to allergic consumers",
        "finished product tested positive for {pathogen}",
        "possible {pathogen} contamination in ready to eat {product}",
        "product distributed without required allergen labeling for {allergen}",
        "botulism hazard due to inadequate thermal processing of {product}",
        "elevated levels of {toxin} detected in {product}",
    ],
    "Class II": [
        "{product} may contain small fragments of {foreign}",
        "product may contain extraneous {foreign} material",
        "temperature abuse during transport of refrigerated {product}",
        "product exceeds regulatory limit for {additive}",
        "incorrect {nutrient} declaration on the nutrition facts panel",
        "{product} packaged in film that may allow spoilage",
        "product may contain trace amounts of undeclared {additive}",
        "mould growth observed in a limited number of {product} units",
        "{product} may be adulterated due to unapproved {additive}",
        "underprocessing of {product} may permit spoilage organisms",
        "product may contain low levels of {toxin} below acute hazard threshold",
        "seal integrity failure on a portion of {product} lots",
    ],
    "Class III": [
        "product label bears incorrect net weight statement",
        "{product} labeled with wrong flavour designation",
        "minor printing error on the {product} carton",
        "product labeled in the wrong language for the market of distribution",
        "incorrect lot code printed on {product} packaging",
        "product label omits the required country of origin statement",
        "{product} shipped with outdated packaging artwork",
        "incorrect best before date format printed on {product}",
        "product name misspelled on the retail carton",
        "barcode on {product} does not match the intended item",
        "package contains fewer units than declared on the outer case",
        "typographical error in the ingredient statement of {product}",
    ],
}

FILL = {
    "pathogen": ["listeria monocytogenes", "salmonella", "escherichia coli o157h7",
                 "clostridium botulinum", "hepatitis a virus", "cronobacter"],
    "allergen": ["milk", "peanut", "tree nut", "soy", "wheat", "egg", "sesame",
                 "fish", "shellfish"],
    "product": ["frozen vegetables", "ready to eat salad", "ice cream",
                "infant formula", "bakery items", "smoked fish", "cheese",
                "protein bars", "breakfast cereal", "sauces", "deli meat",
                "nut butter", "juice", "canned soup", "granola"],
    "foreign": ["metal", "plastic", "glass", "rubber", "wood"],
    "additive": ["sulfites", "food colouring", "preservative", "nitrite",
                 "flavour enhancer"],
    "nutrient": ["sodium", "sugar", "fat", "fibre", "protein"],
    "toxin": ["histamine", "aflatoxin", "patulin", "mycotoxin"],
}

# Roughly the shape of the real distribution, where Class II dominates and
# Class III is least common. The imbalance is a teaching feature.
N_PER_CLASS = {"Class I": 90, "Class II": 110, "Class III": 60}


def main():
    rng = random.Random(SEED)
    records = []
    for cls, n in N_PER_CLASS.items():
        for i in range(n):
            tpl = rng.choice(TEMPLATES[cls])
            text = tpl
            for key, pool in FILL.items():
                token = "{" + key + "}"
                while token in text:
                    text = text.replace(token, rng.choice(pool), 1)
            # A little natural variation in phrasing.
            if rng.random() < 0.25:
                text = "firm is recalling product because " + text
            if rng.random() < 0.18:
                text = text + " no illnesses have been reported to date"
            if rng.random() < 0.12:
                text = text + " the issue was discovered during internal review"
            records.append({"id": f"{cls.replace(' ', '')}-{i+1:03d}",
                            "text": text, "cls": cls})

    # The templates alone separate the classes almost perfectly, which makes
    # the classifier look better than any text classifier on real data ever is.
    # Two sources of realistic difficulty are added:
    #
    #   1. Shared boilerplate. Real notices carry a lot of common regulatory
    #      language that carries no class signal at all, which dilutes the
    #      informative vocabulary exactly as it does in the real corpus.
    #   2. Borderline cases. A small fraction of notices are drawn from a
    #      neighbouring class's template but keep their own label, standing in
    #      for the genuine judgement calls in FDA classification. These are the
    #      cases a classifier cannot get right, and their presence is why the
    #      reported accuracy should not be 100%.
    boilerplate = [
        "the firm has initiated a voluntary recall of the affected lots",
        "distribution was nationwide and to retail customers",
        "consumers who have purchased the product are urged to return it",
        "the recall was initiated after routine testing by the firm",
        "product was distributed to distributors and retail stores",
        "the firm has notified its customers by letter",
    ]
    for r in records:
        if rng.random() < 0.55:
            r["text"] = r["text"] + " " + rng.choice(boilerplate)

    order = ["Class I", "Class II", "Class III"]
    n_border = 0
    for r in records:
        if rng.random() < 0.14:
            i = order.index(r["cls"])
            nbr = order[i + 1] if i == 0 else (order[i - 1] if i == 2
                                              else order[rng.choice([0, 2])])
            tpl = rng.choice(TEMPLATES[nbr])
            text = tpl
            for key, pool in FILL.items():
                token = "{" + key + "}"
                while token in text:
                    text = text.replace(token, rng.choice(pool), 1)
            r["text"] = text
            r["borderline"] = True
            n_border += 1

    rng.shuffle(records)

    payload = {
        "id": "recalls-teaching",
        "name": "Illustrative food-recall corpus",
        "simulated": True,
        "warning": ("ILLUSTRATIVE CORPUS. These notices were generated from "
                    "hand-written phrase templates for teaching; they are not "
                    "real FDA records. The hazard-class definitions are the real "
                    "FDA definitions. Week 5's lab queries the live openFDA food "
                    "enforcement endpoint for the genuine data."),
        "classes": ["Class I", "Class II", "Class III"],
        "classDefinitions": {
            "Class I": "A reasonable probability that use of, or exposure to, the "
                       "product will cause serious adverse health consequences or death.",
            "Class II": "Use of, or exposure to, the product may cause temporary or "
                        "medically reversible adverse health consequences, or the "
                        "probability of serious consequences is remote.",
            "Class III": "Use of, or exposure to, the product is not likely to cause "
                         "adverse health consequences.",
        },
        "counts": {c: sum(1 for r in records if r["cls"] == c)
                   for c in N_PER_CLASS},
        "borderline": n_border,
        "difficultyNote": (
            "Shared regulatory boilerplate and a fraction of deliberately "
            "borderline notices are included, so that the achievable accuracy "
            "is realistic rather than perfect. A text classifier that scores "
            "100% on a corpus is telling you about the corpus, not about the "
            "classifier."),
        "records": records,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write("/* AUTO-GENERATED by data/scripts/05_build_recalls.py.\n")
        f.write("   ILLUSTRATIVE corpus - these are NOT real FDA records.\n")
        f.write("   The Week 5 lab uses the live openFDA API for the real data. */\n")
        f.write("window.RECALLS = ")
        json.dump(payload, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", OUT, payload["counts"])


if __name__ == "__main__":
    main()
