# Week 8 data: UCI Heart Disease, Cleveland subset

`heart_disease_cleveland.csv`: 303 patients, one row each, frozen on 2026-11-03.

**Source.** Janosi, A., Steinbrunn, W., Pfisterer, M. & Detrano, R. (1988). *Heart Disease*
[Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C52P4X. Licence:
**CC BY 4.0**. Original study: Detrano, R. et al. (1989), *American Journal of Cardiology*
64(5), 304–310, https://doi.org/10.1016/0002-9149(89)90524-9.

**What was changed.** The UCI file `processed.cleveland.data` has no header and writes missing
values as `?`. This copy adds the header, a `patient_id` column (row order 1–303), and writes the
six missing values as empty cells (`ca` 4, `thal` 2). No rows were removed and no values were
changed. Checksums of the original file and of this CSV are in `PROVENANCE.json`;
`data/scripts/18_build_week08_data.py` in the course repository rebuilds it from the download.

| Column | Meaning | Values |
|---|---|---|
| `patient_id` | row number in the UCI file | 1–303 |
| `age` | age | years |
| `sex` | sex | 1 male, 0 female |
| `cp` | chest-pain type | 1 typical angina, 2 atypical angina, 3 non-anginal pain, 4 asymptomatic |
| `trestbps` | resting blood pressure on admission | mm Hg |
| `chol` | serum cholesterol | mg/dl |
| `fbs` | fasting blood sugar > 120 mg/dl | 1 yes, 0 no |
| `restecg` | resting electrocardiogram | 0 normal, 1 ST-T wave abnormality, 2 probable/definite left-ventricular hypertrophy |
| `thalach` | maximum heart rate achieved in the exercise test | beats/min |
| `exang` | exercise-induced angina | 1 yes, 0 no |
| `oldpeak` | ST depression induced by exercise relative to rest | mm |
| `slope` | slope of the peak-exercise ST segment | 1 upsloping, 2 flat, 3 downsloping |
| `ca` | number of major vessels coloured by fluoroscopy | 0–3 (4 missing) |
| `thal` | thallium stress scan | 3 normal, 6 fixed defect, 7 reversible defect (2 missing) |
| `num` | angiographic disease status (the label) | 0: < 50% diameter narrowing in every major vessel; 1–4: > 50% narrowing |

The lab predicts `disease = (num > 0)`: 139 patients with disease, 164 without.

**Read before you interpret anything.** These are patients *referred for angiography* at one
centre in 1981–1984: a population already suspected of coronary disease (46% prevalence), two
thirds male. Results do not transfer to screening or to current practice. Integer codes in `cp`,
`restecg`, `slope` and `thal` are categories, not quantities. Classroom use only; nothing built
from these data is a clinical tool.
