# Week 5 dataset: openFDA food-recall reasons (frozen snapshot)

`openfda_food_recall_events.csv` is the dataset for the Week 5 lab, lecture and
website. It is a **frozen snapshot**, so every student gets the same data and every
number in the course can be reproduced. The lab never calls the openFDA API.

## Source

| | |
|---|---|
| Publisher | U.S. Food and Drug Administration, openFDA |
| Dataset | Food enforcement reports (Recall Enterprise System) |
| File | `https://download.open.fda.gov/food/enforcement/food-enforcement-0001-of-0001.json.zip` |
| openFDA `last_updated` | 2026-09-28 |
| SHA-256 of the zip used | `c011f158b2dd7c2f5f22298413278a0e0de8a86fbb11b3e7b89bca4ea08c85b3` |
| Licence | Public domain (CC0 1.0): https://open.fda.gov/license/ |
| Report dates covered | 2012-06-20 to 2026-09-23 |

openFDA's disclaimer applies: *"Do not rely on openFDA to make decisions regarding
medical care … you should assume all results are unvalidated."*

## What one row is

The export holds **29,463 product records**. One recall *event* often covers many
products with the same `reason_for_recall` text: one event has 409. If you
trained and tested on product records, identical texts would sit on both sides
of the split (Week 3: the unit of observation).

So **one row represents an event–reason–classification record**:
- rows are de-duplicated on (`event_id`, `reason_for_recall`, `classification`);
- this gives 9,490 rows from 7,890 events and 9,394 distinct event–reason pairs;
- one record that was not yet classified was dropped.

Most event–reason pairs have one classification, but 95 event–reason pairs carry
more than one FDA classification within the same event. In 73 of them the
classifications disagree on the target itself (Class I against Class II or III);
the other 22 are Class II against Class III. These are real label conflicts in
the FDA records, and they are kept: the text alone does not necessarily
determine the label. Because the split groups whole events, the rows of a
conflicting pair are always on the same side of the split.

| Column | Meaning |
|---|---|
| `event_id` | FDA recall event identifier. **Split by this**, never by row. |
| `report_date` | Earliest report date for that event and text (YYYY-MM-DD) |
| `classification` | FDA hazard class: Class I, Class II or Class III |
| `is_class_I` | Target: 1 = Class I, 0 = Class II or III |
| `n_product_records` | How many product records in the export shared this text |
| `reason_for_recall` | The input text, with whitespace collapsed and nothing else changed |

FDA's class definitions:
- **Class I:** a reasonable probability that use of, or exposure to, the product will
  cause serious adverse health consequences or death.
- **Class II:** temporary or medically reversible adverse health consequences, or a
  remote probability of serious ones.
- **Class III:** not likely to cause adverse health consequences.

Class counts: Class II 4,882, Class I 3,836 (40.4%), Class III 772.

## Known limitations

- **What the label is:** FDA's administrative classification, made with information
  beyond the reason text. It is not a measured health outcome.
- **Contradictory labels:** 95 event–reason pairs carry more than one FDA
  classification within the same event; 73 of them disagree on the Class I target.
- **Recurring wording:** many texts repeat stock phrases or name the recalling firm.
  A classifier can learn wording conventions and firm names as well as hazards.
- **Encoding artefacts:** some characters from the source are kept as they are
  (for example "Nestl¿").
- **Coverage:** the data covers recalls FDA reported and classified. It is not all
  food-safety incidents, and its make-up changes over time.

## Rebuilding

`data/scripts/10_build_week05_data.py --zip <export.zip>` rebuilds this file from
an openFDA export. A newer export will give different rows, so record its date
and checksum if you replace the snapshot.
