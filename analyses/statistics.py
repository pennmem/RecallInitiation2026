import numpy as np
import pandas as pd
import scipy.stats as stats

COND_ORDER = ["primacy", "recency"]

def fdr(p_vals, method="by"):
    p_vals = pd.Series(p_vals, dtype=float)
    out = pd.Series(np.nan, index=p_vals.index, dtype=float)
    keep = p_vals.notna()
    if keep.any():
        out.loc[keep] = stats.false_discovery_control(p_vals.loc[keep], method=method)
    return out.to_numpy()

def participant_condition_mean(data, value_cols, extra_cols=None):
    cols = ["prolific_pid", "initiation_condition"] + (extra_cols or [])
    return data.groupby(cols, as_index=False)[value_cols].mean()

def _sort(df, extra_cols=None):
    df = df.copy()
    df["initiation_condition"] = pd.Categorical(df["initiation_condition"], COND_ORDER)
    return df.sort_values((extra_cols or []) + ["initiation_condition"]).reset_index(drop=True)

def one_sample(data, value_cols, popmean=0, extra_cols=None):
    rows = []
    data = participant_condition_mean(data, value_cols, extra_cols)
    groups = (extra_cols or []) + ["initiation_condition"]

    for keys, group in data.groupby(groups, dropna=False):
        keys = keys if isinstance(keys, tuple) else (keys,)
        for value_col in value_cols:
            res = stats.ttest_1samp(group[value_col], popmean, nan_policy="omit")
            dof = getattr(res, "df", np.nan)
            n = group[value_col].notna().sum()
            test = "one_sample"
            rows.append((*keys, value_col, test, n, res[0], res[1], dof))

    out = pd.DataFrame(rows, columns=groups + ["measure", "test", "n", "t_stat", "p_val", "dof"])
    out["p_val_fdr"] = fdr(out["p_val"])
    return _sort(out, extra_cols)

def condition_contrast(data, value_cols, extra_cols=None, paired=True):
    rows = []
    data = participant_condition_mean(data, value_cols, extra_cols)
    groups = extra_cols or []
    grouped = data.groupby(groups, dropna=False) if groups else [((), data)]

    for keys, group in grouped:
        keys = keys if isinstance(keys, tuple) else (keys,)
        for value_col in value_cols:
            wide = group.pivot_table(index="prolific_pid", columns="initiation_condition", values=value_col)
            if paired and set(COND_ORDER).issubset(wide.columns):
                res = stats.ttest_rel(wide[COND_ORDER[0]], wide[COND_ORDER[1]], nan_policy="omit")
                n = wide[COND_ORDER].dropna().shape[0]
                test = "paired"
            else:
                x = group.loc[group["initiation_condition"] == COND_ORDER[0], value_col]
                y = group.loc[group["initiation_condition"] == COND_ORDER[1], value_col]
                res = stats.ttest_ind(x, y, equal_var=False, nan_policy="omit")
                n = min(x.notna().sum(), y.notna().sum())
                test = "welch"
            dof = getattr(res, "df", np.nan)
            rows.append((*keys, value_col, test, n, res[0], res[1], dof))

    out = pd.DataFrame(rows, columns=groups + ["measure", "test", "n", "t_stat", "p_val", "dof"])
    out["p_val_fdr"] = fdr(out["p_val"])
    return out.reset_index(drop=True)

def prim_rec_slopes(lr_data):
    return one_sample(lr_data, ["prim_slope", "rec_slope"], popmean=0)
