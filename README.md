# RecallInitiation2026

Extension of Recall Initiation Project from 2024.

Semantic clustering in `analyses/scl.py` uses
[`pybeh.dist_fact`](https://github.com/pennmem/pybeh/blob/master/pybeh/dist_fact.py)
with the word2vec similarity matrix in `data/wordpool`. Install its dependencies
in the Python environment used by the analysis notebooks:

```sh
python -m pip install -r requirements-scl.txt
```

The existing `scl.scl(filtered_df, wordpool, w2v_scores)` call is unchanged.
Each eligible recall transition is ranked once against all remaining list words.
Scores are averaged within lists, then equally across scored lists within each
session. Lists without eligible transitions are excluded; sessions with no
scorable lists return `NaN`.
