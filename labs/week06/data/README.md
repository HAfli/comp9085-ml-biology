# Week 6 dataset: NHANES August 2021 – August 2023 (frozen column extract)

The nine CSV files here are the data for the Week 6 lab and lecture. They are
column extracts of US National Health and Nutrition Examination Survey (NHANES)
public-use files, frozen so every student gets the same data and every number in
the course can be reproduced. The lab never downloads anything.

## Source

| | |
|---|---|
| Publisher | CDC National Center for Health Statistics (NCHS) |
| Survey | NHANES, August 2021 – August 2023 cycle (file suffix `_L`) |
| Cycle page | https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023 |
| Files | `https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/<NAME>.xpt` |
| SHA-256 of each `.xpt` used | `PROVENANCE.json` |
| Downloaded | 2026-10-19 |
| Licence | US Government public-use data. NCHS asks that the survey is cited and that no attempt is made to identify any participant. |

**Cite as:** Centers for Disease Control and Prevention, National Center for Health
Statistics. *National Health and Nutrition Examination Survey Data, August 2021 –
August 2023.* Hyattsville, MD: U.S. Department of Health and Human Services.

## What was changed from the released files

Only two things:

1. **Columns were selected** (below). One CSV per released file; one row per
   participant; `SEQN` links the files.
2. `pandas.read_sas` returns 5.397605e-79 instead of exact zero for some SAS values
   (for example the weight `WTPH2YR = 0` for participants with no blood sample).
   Those were rounded to 0. If you read `.xpt` files yourself, watch for this.

Nothing else. **Refused / don't-know codes (7, 9), top-codes and missing values are
exactly as released**, because handling them is part of the lab.

## Verification

On 2026-10-19 an independent script (instructor package) re-downloaded every source file
from CDC (SHA-256 identical to `PROVENANCE.json`), confirmed that each CSV holds exactly the
values of its `.xpt` file, and compared 85 codebook frequency and range rows with counts
from these CSVs: all matched.

## Who is in the lab's analysis

NHANES samples the US civilian non-institutionalised population. The lab uses adults aged
20 or over (`RIDAGEYR` ≥ 20; 80 means 80 or older) with an HbA1c result (`LBXGH` present;
HbA1c was measured for examined participants aged 12+ who gave blood): **5,767**
participants, of whom **721 (12.5%)** have HbA1c ≥ 6.5%. Of the 11,933 participants, 4,124
are under 20, 1,745 adults were interviewed but not examined, and 297 examined adults have
no HbA1c result. So 2,042 of the 7,809 adults aged 20+ (26.1%) have a **missing outcome**
and are not in the modelling table; the lab's Task 3 asks who they are. Missing
*predictor* values inside the modelling table are a separate matter, handled in the
pipeline.

## Files and columns

| File | Released file | Rows | Columns used |
|---|---|---|---|
| `nhanes_L_demo.csv` | DEMO_L, demographics and design | 11,933 | `SEQN`; `RIDSTATR` 1 interview only, 2 interviewed and examined; `RIAGENDR` 1 male, 2 female; `RIDAGEYR` age in years, **80 = 80 or older**; `RIDRETH3` 1 Mexican American, 2 Other Hispanic, 3 Non-Hispanic White, 4 Non-Hispanic Black, 6 Non-Hispanic Asian, 7 Other race including multi-racial; `DMDEDUC2` education (adults 20+) 1 less than 9th grade, 2 9–11th grade, 3 high school graduate/GED, 4 some college or AA degree, 5 college graduate or above, **7 refused, 9 don't know**; `INDFMPIR` family income to poverty ratio, **5 = 5 or more**; `WTINT2YR`, `WTMEC2YR` interview and examination weights; `SDMVSTRA`, `SDMVPSU` design pseudo-strata and pseudo-PSUs |
| `nhanes_L_ghb.csv` | GHB_L, glycohemoglobin | 7,199 | `LBXGH` HbA1c (%); `WTPH2YR` phlebotomy weight (0 = no blood sample). Examined participants aged 12+ were eligible |
| `nhanes_L_bmx.csv` | BMX_L, body measures | 8,860 | `BMXWT` weight (kg), `BMXHT` height (cm), `BMXBMI` body-mass index (kg/m²), `BMXWAIST` waist (cm) |
| `nhanes_L_bpxo.csv` | BPXO_L, oscillometric blood pressure | 7,801 | `BPXOSY1`–`BPXOSY3` three systolic readings (mmHg) |
| `nhanes_L_tchol.csv` | TCHOL_L, total cholesterol | 8,068 | `LBXTC` total cholesterol (mg/dL) |
| `nhanes_L_dr1tot.csv` | DR1TOT_L, day-1 dietary recall totals | 8,860 | `DR1DRSTZ` status 1 reliable and met minimum criteria, 2 not reliable, 4 breast-milk, 5 not done; `DR1TKCAL` energy (kcal); `DR1TSUGR` total sugars (g) |
| `nhanes_L_dr2tot.csv` | DR2TOT_L, day-2 dietary recall totals | 8,860 | `DR2DRSTZ` status (as above); `DR2TKCAL` energy (kcal) |
| `nhanes_L_smq.csv` | SMQ_L, smoking questionnaire | 9,015 | `SMQ020` smoked at least 100 cigarettes in life: 1 yes, 2 no, **7 refused, 9 don't know** |
| `nhanes_L_diq.csv` | DIQ_L, diabetes questionnaire | 11,744 | `DIQ010` ever told by a doctor you have diabetes: 1 yes, 2 no, 3 borderline, **7 refused, 9 don't know**. Used in the lab only to study who is missing the outcome, never as a predictor |

Full codebooks: `https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/<NAME>.htm`.

## Things to know before you analyse it

- **Weights.** NHANES is a complex, multi-stage probability sample. Unweighted
  results describe the sample, not the US population. For variables measured on
  blood (HbA1c, cholesterol), NCHS says to use the phlebotomy weight `WTPH2YR`.
  Standard errors also need the design variables `SDMVSTRA` and `SDMVPSU`.
- **Fieldwork.** This cycle followed the COVID-19 suspension of fieldwork. Time in
  the mobile examination centre was limited and both dietary recalls were collected
  by telephone. Compare with earlier cycles carefully.
- **Measurement.** The HbA1c instrument changed during the cycle (Tosoh G8 to
  Bio-Rad D-100; see the GHB_L documentation). A 24-hour recall has large
  day-to-day variation and is self-reported.
- **Cross-sectional.** Associations here cannot establish the direction of an effect.

## Rebuilding

```bash
# module team, with network: download the .xpt files outside the repository and re-freeze
python3 data/scripts/13_build_week06_data.py --download /path/outside/repo/nhanes_raw
# everyone, no network: recompute every Week 6 number from these CSVs
python3 data/scripts/13_build_week06_data.py
```
