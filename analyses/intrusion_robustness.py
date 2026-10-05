"""
PLI/ELI robustness check across both experiments.

Two definitions, both using the corrected denominator in analyses.pli_eli:
    toggle=True   only lists initiated with a correct recall (paper's definition)
    toggle=False  all lists, R1 intrusions included

Exp 1 is recomputed from R1G_MFR/data/data_storage/df_strat.csv (all 6 conditions)
with the Exp 2 function, then tested with the same model as R1G_MFR/strategy_anova.R:
    dv ~ strategy*l_length + strategy*pres_rate, Type III (treatment coding),
which reproduces the published R output exactly on the published data.
Exp 2 uses analyses.statistics.condition_contrast (Welch, Holm).
"""
from pathlib import Path
import pandas as pd
import statsmodels.formula.api as smf
from statsmodels.stats.anova import anova_lm

from analyses import pli_eli
import analyses.statistics as st

EXP1_DIR = Path("../R1G_MFR")
CMAP = {0.0: "10-2", 1.0: "20-1", 2.0: "15-2", 3.0: "20-2", 4.0: "30-1", 5.0: "40-1"}


def exp1_intrusions(df_strat_path=EXP1_DIR / "data" / "data_storage" / "df_strat.csv"):
    """Participant-level Exp 1 PLI/ELI for both toggles, all conditions."""
    cols = ["worker_id", "strategy", "session", "condition", "l_length", "pres_rate",
            "list", "type", "word", "rec_word", "serial_position"]
    ev = pd.read_csv(df_strat_path, usecols=cols, low_memory=False)
    ev = ev[ev["type"].isin(["WORD", "REC_WORD"])].rename(
        columns={"worker_id": "prolific_pid", "strategy": "initiation_condition"})
    out = []
    for c, g in ev.groupby("condition"):
        for tog in (True, False):
            r = pli_eli.intrusion_rates(g, toggle=tog)
            r["condition"], r["toggle"] = CMAP[c], tog
            r["l_length"], r["pres_rate"] = g["l_length"].iloc[0], g["pres_rate"].iloc[0]
            out.append(r)
    keys = ["prolific_pid", "initiation_condition", "condition", "l_length", "pres_rate", "toggle"]
    return (pd.concat(out).groupby(keys, as_index=False)[["pli", "eli"]].mean()
              .rename(columns={"initiation_condition": "strategy"}))


def exp1_anova(d, dv):
    """Python port of run_anova() in R1G_MFR/strategy_anova.R."""
    d = d.copy()
    for c in ["strategy", "l_length", "pres_rate"]:
        d[c] = d[c].astype(str)
    m = smf.ols(f"{dv} ~ C(strategy)*C(l_length) + C(strategy)*C(pres_rate)", data=d).fit()
    a = anova_lm(m, typ=3)
    a["eta_p_sq"] = a["sum_sq"] / (a["sum_sq"] + a.loc["Residual", "sum_sq"])
    return a.drop(index=["Intercept"])


def exp1_strategy_table(e1, published=None):
    rows = []
    sets = [(str(t), e1[e1["toggle"] == t], {"pli": "pli", "eli": "eli"}) for t in (True, False)]
    if published is not None:
        sets.append(("published", published, {"pli": "pli_rate", "eli": "eli_rate"}))
    for label, d, cols in sets:
        for dv, col in cols.items():
            a = exp1_anova(d, col)
            rows.append({"definition": label, "measure": dv,
                         "strategy_F": a.loc["C(strategy)", "F"], "strategy_p": a.loc["C(strategy)", "PR(>F)"],
                         "strategy_eta_p_sq": a.loc["C(strategy)", "eta_p_sq"],
                         "strategy_x_ll_p": a.loc["C(strategy):C(l_length)", "PR(>F)"],
                         "strategy_x_pr_p": a.loc["C(strategy):C(pres_rate)", "PR(>F)"]})
    return pd.DataFrame(rows)


def exp2_contrasts(filtered_df):
    out = []
    for tog in (True, False):
        r = pli_eli.intrusion_rates(filtered_df, toggle=tog)
        c = st.condition_contrast(r, ["pli", "eli"], paired=False)
        c.insert(0, "toggle", tog)
        out.append(c)
    return pd.concat(out, ignore_index=True)
