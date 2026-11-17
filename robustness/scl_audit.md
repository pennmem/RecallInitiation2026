# Semantic clustering audit

Audited the data already held in the running `analyses_new.ipynb` kernel on
November 15, 2026: 125 participants, 455 sessions, 5,460 lists of 20 words,
and 34,142 eligible recall transitions. No notebook variables, scores, or
analysis functions were changed during the audit.

## Results

These are the condition means after averaging sessions within each participant,
matching `plot_scl`.

| Condition | Original custom code | Current PyBeh, equal list weights | Direct PyBeh, pooled transitions |
| --- | ---: | ---: | ---: |
| Start | 0.518905 | 0.517230 | 0.517325 |
| End | 0.526912 | 0.523537 | 0.524658 |
| Free | 0.530096 | 0.524322 | 0.526311 |

The change to PyBeh produces a small decrease. Switching from equal list weights
to PyBeh's default transition weighting also produces only a small change.
Neither explains an expected score near 0.6.

## Checks

- The live notebook uses the updated `analyses/scl.py`, which calls PyBeh.
- Recomputed current session scores match the notebook's `scl_df` exactly.
- An independent reference calculation uses recalled word strings rather than
  recorded serial positions. For each eligible transition, it counts how many
  alternative similarities are smaller, credits half of the other ties, and
  divides by the number of alternatives minus one. This avoids PyBeh's ranking
  helper and the production wrapper's serial-position conversion.
- Independent and production session scores agree to within 2.3e-16. Independent
  transition-pooled scores and a direct PyBeh call agree to within 4.5e-16.
- All 44,949 valid recall rows map to the same word using their recorded serial
  position and their cleaned recalled text. No presented words are absent from
  the wordpool, and no presented words are incorrectly marked as intrusions.
- All 58,141 recall event rows have ordering values. There are no decreases within
  lists in recall position, trial index, elapsed time, or database row ID.
- The 554-word pool matches the order of all five experiment task files.
- The 554-by-554 similarity matrix is symmetric with no missing values. Sample
  nearest neighbors are sensible: ACTOR -> ACTRESS/FILM/STAR;
  APPLE -> FRUIT/PEACH/GRAPE; PIANO -> TROMBONE/GUITAR/FLUTE.
- Wordpool and similarity matrix values exactly match those used in the sibling
  `R1G_MFR` project.
- All 11 existing semantic clustering regression tests pass in the notebook's
  `.venv` environment.

## Earlier experiment

The saved `../R1G_MFR/analyses/dataframes/scl_data_bsa.csv` values for the matching
`20-1` condition also fall near 0.5:

| Strategy | Participants | Mean |
| --- | ---: | ---: |
| Primacy | 23 | 0.503195 |
| Recency | 24 | 0.522507 |
| Other | 23 | 0.522976 |

These are saved results, not an independent recomputation of the earlier study.

## Interpretation and limits

The current graph accurately reflects PyBeh's semantic percentile calculation
on the notebook's filtered events and supplied word2vec matrix. This audit has
not found a scoring error that would explain a rise to 0.6. It does not establish
that every upstream exclusion, spelling correction, or experimental assumption
is appropriate.

To investigate the expected magnitude further, compare the professor's reference
dataset and code, similarity model (for example word2vec versus LSA), transition
exclusions, and definition of eligible alternatives. A target value alone does
not establish which scoring convention should change.

## Audit artifacts

- `robustness/scl_audit.py`: independent audit function.
- `robustness/scl_audit_report.json`: numerical comparison and input checks.
- `robustness/scl_audit_sessions.csv`: per-session comparisons (ignored by Git).
- `robustness/scl_current_notebook.png`: plot extracted from the saved notebook.

The audit function accepts the notebook's `filtered_df`, `wordpool`, `w2v_scores`,
the current `scl` module, the original `scl_sess` function from Git HEAD, and its
existing `scl_df`. It returns session comparisons and a report without modifying
those inputs.
