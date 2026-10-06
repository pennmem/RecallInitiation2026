"""
Exp 1 (R1G_MFR, 20-1 condition) vs Exp 2 (RecallInitiation2026) comparison figures.

Exp 2 instructed conditions are paired with the Exp 1 post-hoc recall-initiation groups:
    Start  <->  Primacy   (Exp 1 'prim')
    End    <->  Recency   (Exp 1 'rec')
    Free   <->  Other     (Exp 1 'ns')

Figures produced (saved next to the originals in figures/, suffix _exp1exp2):
    7a   SPC overall: Murdock (1962) 20-1, Exp 1 20-1, Exp 2
    8a   Mean words recalled
    9a   R1 intrusion probability, split into prior-list and extra-list intrusions
    9b   Initial response time histograms (Exp 1 20-1 | Exp 2)
    10a  PLIs per trial
    10b  ELIs per trial
    11a  Temporal clustering score
    11d  Semantic clustering score

Exp 1 values come from the saved between-subject-averaged dataframes in
R1G_MFR/analyses/dataframes (the same files behind Exp 1 Figs 1A, 3A, 4A, 5, 6),
filtered to condition == '20-1'. Exp 2 values are computed with the Exp 2 analysis
modules on filtered_df, averaged within participant-condition first (matching the
original Exp 2 plotting functions).

Murdock (1962) data are not in either repo. Download Murd62.data.tgz from the CML
Data Archive (https://memory.psych.upenn.edu/Data_Archive), unzip it into
data/murdock1962/, and load_murdock_spc() will find the 20-1 file.
"""
import re
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib.lines import Line2D
from matplotlib.colors import to_rgb

# ---------------------------------------------------------------- constants
EXP1_DIR = Path("../R1G_MFR")                      # sibling repo; override if needed
EXP1_DF_DIR = EXP1_DIR / "analyses" / "dataframes"
EXP1_COND = "20-1"

PAIRS = [  # (exp2 condition, exp1 strategy, tick label)
    ("start", "prim", "Start\n(Primacy)"),
    ("end",   "rec",  "End\n(Recency)"),
    ("free",  "ns",   "Free\n(Other)"),
]
EXP1_TO_EXP2 = {"prim": "start", "rec": "end", "ns": "free"}
COND_PALETTE = {"start": "orange", "end": "purple", "free": "darkgray"}

EXP1_ALPHA = 0.30   # lighter shading for Exp 1
EXP2_ALPHA = 0.75
EXP1_LABEL = "Exp 1 (20-1)"
EXP2_LABEL = "Exp 2"


# ---------------------------------------------------------------- helpers
def _lighten(color, amount):
    """Blend a color toward white. amount=1 -> original color, 0 -> white."""
    r, g, b = to_rgb(color)
    return (1 - amount * (1 - r), 1 - amount * (1 - g), 1 - amount * (1 - b))


def _mean_ci(x):
    """Mean and 95% CI half-width (1.96 * SEM), matching errorbar=('se', 1.96)."""
    x = pd.Series(x).dropna()
    if len(x) < 2:
        return x.mean(), np.nan, len(x)
    return x.mean(), 1.96 * x.std(ddof=1) / np.sqrt(len(x)), len(x)


def _savefig(path):
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")


# ---------------------------------------------------------------- Exp 1 loaders
def load_exp1(fname, value_cols, df_dir=EXP1_DF_DIR, condition=EXP1_COND):
    """Load an Exp 1 *_bsa.csv, keep one condition, map strategy -> Exp 2 labels."""
    d = pd.read_csv(Path(df_dir) / fname)
    d = d[d["condition"] == condition].copy()
    d["initiation_condition"] = d["strategy"].map(EXP1_TO_EXP2)
    d = d.rename(columns={"subject": "prolific_pid"})
    return d[["prolific_pid", "initiation_condition"] + list(value_cols)]


def load_exp1_spc(df_dir=EXP1_DF_DIR, condition=EXP1_COND):
    """Per-subject SPC (all groups pooled), the data behind Exp 1 Fig 1A."""
    d = pd.read_csv(Path(df_dir) / "spc_data_bsa_all.csv")
    d = d[d["condition"] == condition]
    ll = int(condition.split("-")[0])
    return d[[f"sp_{i}" for i in range(1, ll + 1)]].reset_index(drop=True)


def exp1_intrusions_from_events(df_strat_path=EXP1_DIR / "data" / "data_storage" / "df_strat.csv",
                                condition_code=1.0):
    """
    Recompute Exp 1 PLI/ELI rates with the Exp 2 function (analyses.pli_eli).

    The saved Exp 1 rates (intr_data_only_cr_bsa.csv) divide intrusion counts by
    ALL lists, even though lists initiated with an intrusion are skipped. The Exp 2
    function divides only by lists that reach the tally. Use this to put both
    experiments on the same definition. condition_code 1.0 == '20-1'.
    """
    from analyses import pli_eli
    usecols = ["worker_id", "strategy", "session", "condition", "list",
               "type", "word", "rec_word", "serial_position"]
    ev = pd.read_csv(df_strat_path, usecols=usecols, low_memory=False)
    ev = ev[ev["condition"] == condition_code].copy()
    ev = ev.rename(columns={"worker_id": "prolific_pid"})
    ev["initiation_condition"] = ev["strategy"].map(EXP1_TO_EXP2)
    ev = ev[ev["type"].isin(["WORD", "REC_WORD"])]
    sess = pli_eli.intrusion_rates(ev)
    return (sess.groupby(["prolific_pid", "initiation_condition"], as_index=False)[["pli", "eli"]]
                .mean())


# ---------------------------------------------------------------- Murdock (1962)
def load_murdock_spc(murd_dir="data/murdock1962", list_length=20, pres_rate=1):
    """
    Return Murdock (1962) recall probability by serial position for one condition,
    or None if the data are not present.

    The CML archive stores one file per condition (e.g. fr20-1.txt); each row is a
    trial listing the serial positions recalled in output order, padded with 0s,
    with intrusions coded outside 1..LL. Also accepts a 2-column CSV
    (serial_position, recall_probability) if you would rather digitize values.
    """
    murd_dir = Path(murd_dir)
    if not murd_dir.exists():
        return None
    tag = f"{list_length}-{pres_rate}"
    cands = [p for p in murd_dir.rglob("*") if p.is_file() and tag in p.name]
    if not cands:
        return None
    path = sorted(cands, key=lambda p: len(p.name))[0]

    if path.suffix == ".csv":
        d = pd.read_csv(path)
        return pd.Series(d.iloc[:, 1].to_numpy(), index=d.iloc[:, 0].astype(int).to_numpy())

    counts = np.zeros(list_length)
    n_trials = 0
    for line in path.read_text().splitlines():
        nums = [int(float(t)) for t in re.split(r"[\s,]+", line.strip()) if t]
        if not nums:
            continue
        recalled = {n for n in nums if 1 <= n <= list_length}
        for sp in recalled:
            counts[sp - 1] += 1
        n_trials += 1
    if n_trials == 0:
        return None
    print(f"Murdock (1962) {tag}: {n_trials} trials from {path}")
    return pd.Series(counts / n_trials, index=np.arange(1, list_length + 1))


# ---------------------------------------------------------------- Fig 7a
def plot_spc_overall_compare(exp2_spc_df, exp1_spc=None, murdock=None, path=None, figsize=(5, 3)):
    """
    exp2_spc_df: output of analyses.spc.spc_df (session-level rows).
    exp1_spc:    per-subject DataFrame of sp_1..sp_20 (load_exp1_spc()).
    murdock:     Series indexed by serial position (load_murdock_spc()), optional.
    """
    sp_cols = [c for c in exp2_spc_df.columns if c.startswith("sp_")]
    exp2 = exp2_spc_df.groupby("prolific_pid")[sp_cols].mean()   # one curve per participant
    x = np.arange(1, len(sp_cols) + 1)

    fig, ax = plt.subplots(figsize=figsize)
    handles = []

    if murdock is not None:
        ax.plot(murdock.index, murdock.values, color="black", ls="--", lw=1.2,
                marker="o", ms=3, zorder=3)
        handles.append(Line2D([], [], color="black", ls="--", marker="o", ms=3,
                              label="Murdock (1962) 20-1"))

    for data, color, label, z in [(exp1_spc, _lighten("blue", 0.45), EXP1_LABEL, 1),
                                  (exp2, "blue", EXP2_LABEL, 2)]:
        if data is None:
            continue
        m = data.mean().to_numpy()
        ci = 1.96 * data.std(ddof=1).to_numpy() / np.sqrt(len(data))
        ax.plot(x, m, color=color, lw=1.5, zorder=z)
        ax.fill_between(x, m - ci, m + ci, color=color, alpha=0.2, lw=0, zorder=z)
        handles.append(Line2D([], [], color=color, lw=1.5, label=f"{label} (n={len(data)})"))

    ax.set(xlabel="Serial Position", ylabel="Recall Probability",
           xlim=(0, len(sp_cols) + 1), ylim=(0, 1), xticks=np.arange(5, len(sp_cols) + 1, 5))
    ax.spines[["right", "top"]].set_visible(False)
    ax.legend(handles=handles, frameon=False, loc="lower center", bbox_to_anchor=(0.5, 1.0),
              ncols=len(handles), fontsize=8)
    _savefig(path)
    plt.show()


# ---------------------------------------------------------------- paired bars (8a, 9a, 10a/b, 11a/d)
def summarize_pair(exp2_participant, exp1_participant, y, exp1_y=None):
    """Mean, 95% CI, n for each (pair, experiment). Inputs are participant-level."""
    exp1_y = exp1_y or y
    rows = []
    for e2, e1, label in PAIRS:
        for exp, d, col in [(EXP1_LABEL, exp1_participant, exp1_y), (EXP2_LABEL, exp2_participant, y)]:
            m, ci, n = _mean_ci(d.loc[d["initiation_condition"] == e2, col])
            rows.append({"measure": y, "pair": label.replace("\n", " "), "experiment": exp,
                         "mean": m, "ci95": ci, "n": n})
    return pd.DataFrame(rows)


def plot_paired_bars(exp2_df, exp1_df, y, ylabel, exp1_y=None, ylim=None, dots=False,
                     path=None, figsize=(5, 3)):
    """
    Side-by-side bars per pair: Exp 1 (lighter, left) and Exp 2 (right).

    exp2_df: Exp 2 session-level df with prolific_pid, initiation_condition, y.
             Averaged within participant-condition here (as in the Exp 2 plots).
    exp1_df: Exp 1 participant-level df (load_exp1()), column exp1_y (default y).
    """
    exp1_y = exp1_y or y
    exp2_p = exp2_df.groupby(["prolific_pid", "initiation_condition"], as_index=False)[y].mean()
    exp1_p = exp1_df

    fig, ax = plt.subplots(figsize=figsize)
    _draw_paired_bars(ax, exp2_p, exp1_p, y, exp1_y, dots)
    ax.set(xlabel="", ylabel=ylabel)
    if ylim is not None:
        ax.set_ylim(*ylim)
    else:
        ax.set_ylim(0, None)
    ax.legend(handles=_exp_legend_handles(), frameon=False, fontsize=8,
              loc="lower center", bbox_to_anchor=(0.5, 1.0), ncols=2)
    _savefig(path)
    plt.show()
    return summarize_pair(exp2_p, exp1_p, y, exp1_y)


def _exp_legend_handles():
    return [Patch(facecolor=_lighten("0.35", EXP1_ALPHA), edgecolor="0.6", label=EXP1_LABEL),
            Patch(facecolor=_lighten("0.35", EXP2_ALPHA), edgecolor="0.4", label=EXP2_LABEL)]


def _draw_paired_bars(ax, exp2_p, exp1_p, y, exp1_y, dots=False):
    """Exp 1 (lighter, left) and Exp 2 (right) bars per pair on ax; inputs are participant-level."""
    w = 0.38
    rng = np.random.default_rng(0)
    for i, (e2, _e1, _label) in enumerate(PAIRS):
        base = COND_PALETTE[e2]
        for dx, d, col, alpha in [(-w / 2, exp1_p, exp1_y, EXP1_ALPHA),
                                  (+w / 2, exp2_p, y, EXP2_ALPHA)]:
            vals = d.loc[d["initiation_condition"] == e2, col].dropna()
            m, ci, _ = _mean_ci(vals)
            ax.bar(i + dx, m, width=w * 0.95, color=_lighten(base, alpha),
                   edgecolor=_lighten(base, min(1, alpha + 0.3)), lw=0.8)
            ax.errorbar(i + dx, m, yerr=ci, color="0.25", lw=1.2, capsize=0)
            if dots:
                jitter = rng.uniform(-w * 0.25, w * 0.25, len(vals))
                ax.scatter(i + dx + jitter, vals, s=6, color=_lighten(base, min(1, alpha + 0.2)),
                           alpha=0.8, lw=0, zorder=3)

    ax.set_xticks(range(len(PAIRS)), labels=[p[2] for p in PAIRS])
    ax.spines[["right", "top"]].set_visible(False)


# ---------------------------------------------------------------- Fig 9a: R1 intrusions split PLI / ELI
def r1_intrusion_split(events, pid_col="prolific_pid", cond_col="initiation_condition"):
    """
    Per-session proportion of lists whose first recall is a prior-list (PLI) or
    extra-list (ELI) intrusion. Uses the same denominator as analyses.r1_intrusion
    (lists with at least one recall event), so prop_pli + prop_eli == prop_wrong.
    A first-recall intrusion is a PLI if the word was presented on an earlier list in
    the same session, matching analyses.pli_eli.
    """
    rows = []
    for (pid, sess), data in events.groupby([pid_col, "session"]):
        words = data[data["type"] == "WORD"]
        rec = data[data["type"] == "REC_WORD"]
        word_list = dict(zip(words["word"].astype(str).str.lower().str.strip(), words["list"]))
        pli = eli = n = 0
        for lst in data["list"].dropna().unique():
            list_rec = rec[rec["list"] == lst]
            sp = list_rec["serial_position"].to_numpy()
            if len(sp) <= 1:     # always null recall at end of list
                continue
            n += 1
            if sp[0] == 88:
                w = str(list_rec["rec_word"].iloc[0]).lower().strip()
                if w in word_list and word_list[w] < lst:
                    pli += 1
                else:
                    eli += 1
        rows.append({"prolific_pid": pid, "session": sess,
                     "initiation_condition": data[cond_col].dropna().iloc[0],
                     "prop_pli": pli / n if n else np.nan,
                     "prop_eli": eli / n if n else np.nan})
    return pd.DataFrame(rows)


def exp1_r1_split_from_events(df_strat_path=EXP1_DIR / "data" / "data_storage" / "df_strat.csv",
                              condition_code=1.0):
    """Exp 1 first-recall PLI/ELI proportions (participant-level), condition_code 1.0 == '20-1'."""
    usecols = ["worker_id", "strategy", "session", "condition", "list",
               "type", "word", "rec_word", "serial_position"]
    ev = pd.read_csv(df_strat_path, usecols=usecols, low_memory=False)
    ev = ev[(ev["condition"] == condition_code) & ev["type"].isin(["WORD", "REC_WORD"])].copy()
    ev["initiation_condition"] = ev["strategy"].map(EXP1_TO_EXP2)
    sess = r1_intrusion_split(ev, pid_col="worker_id")
    return sess.groupby(["prolific_pid", "initiation_condition"], as_index=False)[["prop_pli", "prop_eli"]].mean()


def plot_r1_split(exp2_split, exp1_split, path=None, figsize=(10, 3)):
    """Two panels (PLI | ELI) of paired Exp 1 / Exp 2 bars on a shared y-axis."""
    exp2_p = exp2_split.groupby(["prolific_pid", "initiation_condition"], as_index=False)[
        ["prop_pli", "prop_eli"]].mean()

    fig, axes = plt.subplots(1, 2, figsize=figsize, sharey=True)
    for ax, col, title in [(axes[0], "prop_pli", "Prior-List Intrusions"),
                           (axes[1], "prop_eli", "Extra-List Intrusions")]:
        _draw_paired_bars(ax, exp2_p, exp1_split, col, col)
        ax.set_title(title, fontsize=10)
    axes[0].set_ylabel("R1 Intrusion Probability")
    axes[0].set_ylim(0, None)
    fig.legend(handles=_exp_legend_handles(), frameon=False, fontsize=8,
               loc="lower center", bbox_to_anchor=(0.5, 1.0), ncols=2)
    plt.tight_layout()
    _savefig(path)
    plt.show()
    return pd.concat([summarize_pair(exp2_p, exp1_split, c) for c in ["prop_pli", "prop_eli"]],
                     ignore_index=True)


# ---------------------------------------------------------------- Fig 9b: initial response times
def load_exp1_rti(df_dir=EXP1_DF_DIR, condition=EXP1_COND):
    """
    Exp 1 initial RTs for one condition, lists initiated with a correct recall:
    (trial-level df with rt and min_rt, participant-level df with rt).
    Both are session-minimum subtracted, matching analyses.rt_init.
    """
    out = []
    for fname in ["rti_at_data_only_cr.csv", "rti_data_only_cr_bsa.csv"]:
        d = pd.read_csv(Path(df_dir) / fname)
        d = d[d["condition"] == condition].copy()
        d["initiation_condition"] = d["strategy"].map(EXP1_TO_EXP2)
        out.append(d.rename(columns={"subject": "prolific_pid"}))
    return tuple(out)


def plot_rt_init_compare(exp2_trials, exp2_rt, exp1_trials, exp1_rt, path=None,
                         figsize=(10, 3), bin_width=250, xlim=(0, 20000)):
    """
    Side-by-side initial-RT histograms: Exp 1 (20-1) | Exp 2. Trial-level histograms, as
    proportions of each group's trials per bin
    (session-minimum trial dropped, as in Exp 1's figure) with dashed lines at the
    between-participant mean per group.

    exp2_trials: analyses.rt_init.rt_init_trial_df(filtered_df)
    exp2_rt:     analyses.rt_init.rt_init_df(filtered_df) (session-level means)
    exp1_trials, exp1_rt: load_exp1_rti()
    """
    exp2_means = (exp2_rt.groupby(["prolific_pid", "initiation_condition"])["rt_initial"].mean()
                         .groupby("initiation_condition").mean())
    exp1_means = exp1_rt.groupby("initiation_condition")["rt"].mean()

    fig, axes = plt.subplots(1, 2, figsize=figsize, sharex=True, sharey=True)
    for ax, trials, means, title in [(axes[0], exp1_trials, exp1_means, EXP1_LABEL),
                                     (axes[1], exp2_trials, exp2_means, EXP2_LABEL)]:
        trials = trials[trials["min_rt"] == False]
        bins = np.arange(xlim[0], trials["rt"].max() + bin_width, bin_width)
        for cond, _e1, label in PAIRS:
            rts = trials.loc[trials["initiation_condition"] == cond, "rt"]
            ax.hist(rts, bins=bins, weights=np.full(len(rts), 1 / len(rts)),   # proportion of trials per bin
                    color=COND_PALETTE[cond], alpha=0.4, label=label.replace("\n", " "))
            if cond in means:
                ax.axvline(means[cond], color=COND_PALETTE[cond], ls="dashed")
        ax.set(title=title, xlim=xlim, xlabel="Response Time (ms)")
        ax.grid(True)
        ax.spines[["right", "top"]].set_visible(False)
    axes[0].set_ylabel(f"Proportion of Trials (per {bin_width} ms)")
    handles, labels = axes[1].get_legend_handles_labels()
    fig.legend(handles, labels, frameon=False, fontsize=8, ncols=len(PAIRS),
               loc="lower center", bbox_to_anchor=(0.5, 1.0))
    plt.tight_layout()
    _savefig(path)
    plt.show()
    return pd.DataFrame({EXP1_LABEL: exp1_means, EXP2_LABEL: exp2_means}).reindex(COND_ORDER)


# ---------------------------------------------------------------- SPC statistics
COND_ORDER = [p[0] for p in PAIRS]


def _participant_spc(exp2_spc_df):
    """Collapse session-level SPC rows to one row per participant (condition kept)."""
    sp_cols = [c for c in exp2_spc_df.columns if c.startswith("sp_")]
    return (exp2_spc_df.groupby(["prolific_pid", "initiation_condition"], as_index=False)[sp_cols]
                       .mean(), sp_cols)


def bootstrap_spc_distance(exp2_spc_df, ref, n_boot=10000, seed=0, conds=COND_ORDER):
    """
    RMSD between each Exp 2 group's mean SPC and a reference curve, with bootstrap CIs.

    ref: either a Series indexed by serial position (e.g. load_murdock_spc()), treated
         as fixed, or a per-participant DataFrame of sp_1..sp_LL (e.g. load_exp1_spc()),
         whose participants are resampled alongside Exp 2's.

    Participants are resampled with replacement within each group; each iteration
    recomputes the group mean curves and their RMSD to the (resampled) reference. All
    groups share the same reference resample per iteration, so the pairwise
    differences carry the reference's uncertainty only once.

    Note: RMSD of a sample mean curve is biased upward by sampling noise, slightly more
    for smaller groups, so treat the absolute values as descriptive and rely on the
    difference CIs for inference.

    Returns (per-group table, pairwise-difference table). Pairwise p-values are
    two-sided bootstrap p-values, Holm-corrected across the contrasts.
    """
    from analyses.statistics import holm

    rng = np.random.default_rng(seed)
    exp2, sp_cols = _participant_spc(exp2_spc_df)
    groups = {c: exp2.loc[exp2["initiation_condition"] == c, sp_cols].to_numpy() for c in conds}

    if isinstance(ref, pd.Series):
        ref_fixed = ref.reindex(range(1, len(sp_cols) + 1)).to_numpy(dtype=float)
        ref_arr = None
    else:
        ref_arr = ref[sp_cols].to_numpy(dtype=float)
        ref_fixed = ref_arr.mean(axis=0)

    def rmsd(curve, ref_curve):
        return np.sqrt(np.mean((curve - ref_curve) ** 2))

    obs = {c: rmsd(g.mean(axis=0), ref_fixed) for c, g in groups.items()}
    boot = {c: np.empty(n_boot) for c in conds}
    for b in range(n_boot):
        if ref_arr is None:
            ref_b = ref_fixed
        else:
            ref_b = ref_arr[rng.integers(0, len(ref_arr), len(ref_arr))].mean(axis=0)
        for c, g in groups.items():
            boot[c][b] = rmsd(g[rng.integers(0, len(g), len(g))].mean(axis=0), ref_b)

    per_group = pd.DataFrame([
        {"condition": c, "n": len(groups[c]), "rmsd": obs[c],
         "ci_lo": np.percentile(boot[c], 2.5), "ci_hi": np.percentile(boot[c], 97.5)}
        for c in conds
    ])

    rows = []
    for i, a in enumerate(conds):
        for b_ in conds[i + 1:]:
            d = boot[a] - boot[b_]
            p = min(1.0, 2 * min(np.mean(d <= 0), np.mean(d >= 0)))
            rows.append({"contrast": f"{a} - {b_}", "rmsd_diff": obs[a] - obs[b_],
                         "ci_lo": np.percentile(d, 2.5), "ci_hi": np.percentile(d, 97.5),
                         "p_boot": p})
    pairwise = pd.DataFrame(rows)
    pairwise["p_holm"] = holm(pairwise["p_boot"])
    return per_group, pairwise


SPC_WINDOWS = {"primacy": range(1, 6), "recency": range(16, 21)}


def spc_window_welch(exp2_spc_df, exp1_spc, windows=SPC_WINDOWS, conds=COND_ORDER):
    """
    Welch t-tests of each Exp 2 group vs all Exp 1 (20-1) participants on mean recall
    over serial-position windows (default: primacy = SP 1-5, recency = SP 16-20).

    Exp 2 sessions are averaged within participant first; Exp 1 rows are already one
    per participant. Cohen's d uses the pooled SD (positive = Exp 2 higher). A
    Mann-Whitney U p-value is included as a robustness check for ceiling effects
    (e.g. End-group recency). Holm correction is applied across every row.
    """
    from scipy import stats
    from analyses.statistics import holm

    exp2, _ = _participant_spc(exp2_spc_df)
    rows = []
    for window, sps in windows.items():
        cols = [f"sp_{i}" for i in sps]
        y = exp1_spc[cols].mean(axis=1).dropna()
        for c in conds:
            x = exp2.loc[exp2["initiation_condition"] == c, cols].mean(axis=1).dropna()
            res = stats.ttest_ind(x, y, equal_var=False)
            n1, n2 = len(x), len(y)
            pooled = np.sqrt(((n1 - 1) * x.var(ddof=1) + (n2 - 1) * y.var(ddof=1)) / (n1 + n2 - 2))
            rows.append({"window": window, "contrast": f"exp2 {c} vs exp1",
                         "n_exp2": n1, "n_exp1": n2,
                         "mean_exp2": x.mean(), "mean_exp1": y.mean(),
                         "t_stat": res.statistic, "dof": res.df, "p_val": res.pvalue,
                         "cohen_d": (x.mean() - y.mean()) / pooled if pooled else np.nan,
                         "p_mannwhitney": stats.mannwhitneyu(x, y, alternative="two-sided").pvalue})
    out = pd.DataFrame(rows)
    out["p_val_holm"] = holm(out["p_val"])
    return out
