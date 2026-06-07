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
            valid_data = group[value_col].dropna()
            n = len(valid_data)
            
            res = stats.ttest_1samp(valid_data, popmean)
            dof = getattr(res, "df", np.nan)
            
            # Calculate Cohen's d for a one-sample test
            # Formula: (Sample Mean - Pop Mean) / Sample Standard Deviation
            sample_std = valid_data.std(ddof=1)
            cohen_d = (valid_data.mean() - popmean) / sample_std if sample_std != 0 else np.nan
            
            test = "one_sample"
            rows.append((*keys, value_col, test, n, res[0], res[1], dof, cohen_d))

    out = pd.DataFrame(rows, columns=groups + ["measure", "test", "n", "t_stat", "p_val", "dof", "cohen_d"])
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
                # Clean pairs for accurate calculation
                valid_pairs = wide[COND_ORDER].dropna()
                x_val = valid_pairs[COND_ORDER[0]]
                y_val = valid_pairs[COND_ORDER[1]]
                
                res = stats.ttest_rel(x_val, y_val)
                n = len(valid_pairs)
                test = "paired"
                
                # Cohen's d for paired samples: mean of differences / std of differences
                diff = x_val - y_val
                diff_std = diff.std(ddof=1)
                cohen_d = diff.mean() / diff_std if diff_std != 0 else np.nan
                
            else:
                x = group.loc[group["initiation_condition"] == COND_ORDER[0], value_col].dropna()
                y = group.loc[group["initiation_condition"] == COND_ORDER[1], value_col].dropna()
                
                res = stats.ttest_ind(x, y, equal_var=False)
                n = min(len(x), len(y))
                test = "welch"
                
                # Cohen's d for independent/Welch samples (pooled standard deviation)
                n1, n2 = len(x), len(y)
                var1, var2 = x.var(ddof=1), y.var(ddof=1)
                
                # Check to prevent division by zero if vectors are uniform
                if n1 + n2 > 2:
                    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
                    cohen_d = (x.mean() - y.mean()) / pooled_std if pooled_std != 0 else np.nan
                else:
                    cohen_d = np.nan
                    
            dof = getattr(res, "df", np.nan)
            rows.append((*keys, value_col, test, n, res[0], res[1], dof, cohen_d))

    out = pd.DataFrame(rows, columns=groups + ["measure", "test", "n", "t_stat", "p_val", "dof", "cohen_d"])
    out["p_val_fdr"] = fdr(out["p_val"])
    return out.reset_index(drop=True)