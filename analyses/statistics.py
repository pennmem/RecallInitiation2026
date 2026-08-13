import itertools

import numpy as np
import pandas as pd
import scipy.stats as stats

COND_ORDER = ["primacy", "recency", "free"]

# All pairwise contrasts, in a fixed order. `free` is the uninstructed baseline,
# so the two baseline contrasts come first and primacy-vs-recency last.
COND_PAIRS = [
    ("primacy", "free"),
    ("recency", "free"),
    ("primacy", "recency"),
]


def fdr(p_vals, method="by"):
    p_vals = pd.Series(p_vals, dtype=float)
    out = pd.Series(np.nan, index=p_vals.index, dtype=float)
    keep = p_vals.notna()
    if keep.any():
        out.loc[keep] = stats.false_discovery_control(p_vals.loc[keep], method=method)
    return out.to_numpy()


def holm(p_vals):
    """Holm step-down adjusted p-values (family-wise error control).

    Uniformly more powerful than Bonferroni and makes no assumption about
    dependence between tests, which suits a small confirmatory family better
    than FDR. NaN p-values are passed through and excluded from the family.
    """
    p_vals = pd.Series(p_vals, dtype=float)
    out = pd.Series(np.nan, index=p_vals.index, dtype=float)
    keep = p_vals.notna()
    vals = p_vals.loc[keep].to_numpy(dtype=float)
    m = len(vals)
    if m == 0:
        return out.to_numpy()

    order = np.argsort(vals)
    # step-down: multiply by remaining tests, then enforce monotonicity
    scaled = (m - np.arange(m)) * vals[order]
    scaled = np.maximum.accumulate(scaled)
    scaled = np.minimum(scaled, 1.0)

    restored = np.empty(m, dtype=float)
    restored[order] = scaled
    out.loc[keep] = restored
    return out.to_numpy()


def participant_condition_mean(data, value_cols, extra_cols=None):
    """Collapse to one row per participant (per condition, plus any extra keys).

    Condition is fixed per participant by design, so grouping on both keys is
    equivalent to grouping on participant alone while keeping the label column.
    """
    cols = ["prolific_pid", "initiation_condition"] + (extra_cols or [])
    return data.groupby(cols, as_index=False)[value_cols].mean()


def _sort(df, extra_cols=None):
    df = df.copy()
    df["initiation_condition"] = pd.Categorical(df["initiation_condition"], COND_ORDER)
    return df.sort_values((extra_cols or []) + ["initiation_condition"]).reset_index(drop=True)


def one_sample(data, value_cols, popmean=0, extra_cols=None, family=None, correct=True):
    rows = []
    data = participant_condition_mean(data, value_cols, extra_cols)
    groups = (extra_cols or []) + ["initiation_condition"]

    for keys, group in data.groupby(groups, dropna=False):
        keys = keys if isinstance(keys, tuple) else (keys,)
        for value_col in value_cols:
            valid_data = group[value_col].dropna()
            n = len(valid_data)

            if n < 2:
                rows.append((*keys, value_col, "one_sample", n, np.nan, np.nan, np.nan, np.nan))
                continue

            res = stats.ttest_1samp(valid_data, popmean)
            dof = getattr(res, "df", np.nan)

            # Calculate Cohen's d for a one-sample test
            # Formula: (Sample Mean - Pop Mean) / Sample Standard Deviation
            sample_std = valid_data.std(ddof=1)
            cohen_d = (valid_data.mean() - popmean) / sample_std if sample_std != 0 else np.nan

            test = "one_sample"
            rows.append((*keys, value_col, test, n, res[0], res[1], dof, cohen_d))

    out = pd.DataFrame(rows, columns=groups + ["measure", "test", "n", "t_stat", "p_val", "dof", "cohen_d"])
    out = _label_family(out, family)
    if correct:
        out["p_val_holm"] = holm(out["p_val"])
    return _sort(out, extra_cols)


def condition_contrast(data, value_cols, extra_cols=None, paired=None, family=None, correct=True):
    """All pairwise between-condition contrasts (Welch's t-test).

    Condition is assigned per participant and held constant across that
    participant's sessions, so the conditions are independent samples and every
    contrast is between-subjects. `paired=True` is therefore not a valid option
    and raises; the argument is retained only so existing `paired=False` call
    sites keep working.

    Returns one row per (extra_cols..., measure, contrast). With `correct=True`
    Holm adjustment is applied across every row this call produced -- that set
    is the family. To correct across several calls instead, pass `correct=False`
    and pool the results with `pool()`.
    """
    if paired:
        raise ValueError(
            "condition_contrast is between-subjects: a participant is assigned one "
            "condition for all sessions, so no participant appears in two conditions "
            "and there are no pairs to form. Remove paired=True."
        )

    rows = []
    data = participant_condition_mean(data, value_cols, extra_cols)
    groups = extra_cols or []
    grouped = data.groupby(groups, dropna=False) if groups else [((), data)]

    for keys, group in grouped:
        keys = keys if isinstance(keys, tuple) else (keys,)
        for value_col in value_cols:
            for cond_a, cond_b in COND_PAIRS:
                x = group.loc[group["initiation_condition"] == cond_a, value_col].dropna()
                y = group.loc[group["initiation_condition"] == cond_b, value_col].dropna()

                contrast = f"{cond_a} vs {cond_b}"
                n1, n2 = len(x), len(y)

                # A condition can be absent from a session-level subset; emit the
                # row so the table stays rectangular, but run no test.
                if n1 < 2 or n2 < 2:
                    rows.append((*keys, value_col, "welch", contrast, n1, n2, min(n1, n2),
                                 np.nan, np.nan, np.nan, np.nan))
                    continue

                res = stats.ttest_ind(x, y, equal_var=False)
                dof = getattr(res, "df", np.nan)

                # Cohen's d for independent/Welch samples (pooled standard deviation)
                var1, var2 = x.var(ddof=1), y.var(ddof=1)
                pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
                cohen_d = (x.mean() - y.mean()) / pooled_std if pooled_std != 0 else np.nan

                rows.append((*keys, value_col, "welch", contrast, n1, n2, min(n1, n2),
                             res[0], res[1], dof, cohen_d))

    out = pd.DataFrame(
        rows,
        columns=groups + ["measure", "test", "contrast", "n_1", "n_2", "n", "t_stat", "p_val", "dof", "cohen_d"],
    )
    out = _label_family(out, family)
    if correct:
        out["p_val_holm"] = holm(out["p_val"])
    return out.reset_index(drop=True)


def _label_family(out, family):
    if family is not None:
        out.insert(0, "family", family)
    return out


def pool(tables, family=None):
    """Concatenate result tables and Holm-correct across all of them at once.

    Use when the family spans several calls, e.g.

        tables = [
            stat_tests.condition_contrast(mwr_df, ["mwr"], correct=False, family="primary"),
            stat_tests.condition_contrast(tcl_df, ["tcl"], correct=False, family="primary"),
        ]
        stat_tests.pool(tables, family="primary")
    """
    out = pd.concat(list(tables), ignore_index=True)
    if family is not None and "family" not in out.columns:
        out = _label_family(out, family)
    out["p_val_holm"] = holm(out["p_val"])
    return out.reset_index(drop=True)
