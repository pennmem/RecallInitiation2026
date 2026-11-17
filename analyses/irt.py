import numpy as np
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

COND_LABELS = {"start": "Start", "end": "End", "free": "Free"}
COND_PALETTE = {"start": "orange", "end": "purple", "free": "darkgray"}
COND_ORDER = ["start", "end", "free"]


# change repetitions serial position to 77
def mark_repetitions(sp):
    sp = np.array(sp, copy=True)
    used = []
    for u in range(len(sp)):
        count = 0
        if sp[u] != 88 and sp[u] != 77:
            used.append(sp[u])
        for v in range(len(used)):
            if sp[u] == used[v]:
                count += 1
        if count > 1:
            sp[u] = 77
        else:
            sp[u] = sp[u]

    return sp


def _session_condition(data):
    cond = data["initiation_condition"].dropna()
    return cond.iloc[0] if len(cond) else np.nan


def _participant_mean(data, value_col, x_col):
    """Average across sessions so each participant contributes one point per x value."""
    return data.groupby(
        ["prolific_pid", "initiation_condition", x_col], as_index=False
    )[value_col].mean()


def _format_condition_legend(ax):
    handles, labels = ax.get_legend_handles_labels()
    labels = [COND_LABELS.get(label, label) for label in labels]
    ax.legend(handles=handles, labels=labels, title="")


def _list_recall_arrays(rec_evs, list_num):
    list_rec_evs = rec_evs[rec_evs["list"] == list_num]
    list_rec_evs = list_rec_evs[list_rec_evs["serial_position"] != 99]
    sp = list_rec_evs.serial_position.to_numpy()
    rt = list_rec_evs.rt.to_numpy()

    if len(rt) == 0:
        return sp, rt

    rt = rt[:len(sp)]
    sp = mark_repetitions(sp[:len(rt)])
    return sp, rt


def irt_final_sess(data, n_final=4):
    irt_rows = []
    rec_evs = data[data["type"] == "REC_WORD"]

    for i in data.list.dropna().unique():
        sp, rt = _list_recall_arrays(rec_evs, i)
        if len(sp) < 2:
            continue

        irts = []
        for j in range(len(sp) - 1):
            curr_correct = sp[j] != 88 and sp[j] != 77
            next_correct = sp[j + 1] != 88 and sp[j + 1] != 77
            if curr_correct and next_correct:
                irts.append(rt[j + 1])

        if len(irts) == 0:
            continue

        final_irts = irts[-(n_final + 1):]
        positions = np.arange(-len(final_irts) + 1, 1)
        for pos, irt in zip(positions, final_irts):
            irt_rows.append({
                "relative_output_position": pos,
                "irt": irt,
            })

    irt_final = pd.DataFrame(irt_rows)
    if len(irt_final) == 0:
        return pd.DataFrame(columns=["relative_output_position", "irt"])

    return irt_final.groupby("relative_output_position", as_index=False)["irt"].mean()


def irt_final_df(df, n_final=4):
    irt_rows = []
    for (pid, sess), data in df.groupby(["prolific_pid", "session"]):
        cond = _session_condition(data)
        irt_final = irt_final_sess(data, n_final=n_final)
        for _, row in irt_final.iterrows():
            irt_rows.append({
                "prolific_pid": pid,
                "session": sess,
                "initiation_condition": cond,
                "relative_output_position": row.relative_output_position,
                "irt": row.irt,
            })

    return pd.DataFrame(
        irt_rows,
        columns=[
            "prolific_pid",
            "session",
            "initiation_condition",
            "relative_output_position",
            "irt",
        ],
    )


def irt_first_sess(data, n_first=4):
    irt_rows = []
    rec_evs = data[data["type"] == "REC_WORD"]

    for i in data.list.dropna().unique():
        sp, rt = _list_recall_arrays(rec_evs, i)
        if len(sp) < 2:
            continue

        irts = []
        for j in range(len(sp) - 1):
            curr_correct = sp[j] != 88 and sp[j] != 77
            next_correct = sp[j + 1] != 88 and sp[j + 1] != 77
            if curr_correct and next_correct:
                irts.append(rt[j + 1])

        first_irts = irts[:n_first]
        for pos, irt in enumerate(first_irts, start=1):
            irt_rows.append({
                "output_position": pos,
                "irt": irt,
            })

    irt_first = pd.DataFrame(irt_rows)
    if len(irt_first) == 0:
        return pd.DataFrame(columns=["output_position", "irt"])

    return irt_first.groupby("output_position", as_index=False)["irt"].mean()


def irt_first_df(df, n_first=4):
    irt_rows = []
    for (pid, sess), data in df.groupby(["prolific_pid", "session"]):
        cond = _session_condition(data)
        irt_first = irt_first_sess(data, n_first=n_first)
        for _, row in irt_first.iterrows():
            irt_rows.append({
                "prolific_pid": pid,
                "session": sess,
                "initiation_condition": cond,
                "output_position": row.output_position,
                "irt": row.irt,
            })

    return pd.DataFrame(
        irt_rows,
        columns=[
            "prolific_pid",
            "session",
            "initiation_condition",
            "output_position",
            "irt",
        ],
    )


def irt_tot_sess(data):
    irt_tot = []
    rec_evs = data[data["type"] == "REC_WORD"]

    for i in data.list.dropna().unique():
        sp, rt = _list_recall_arrays(rec_evs, i)
        if len(rt) == 0 or np.all(pd.isna(rt)) or np.nanmax(rt) > 30000:
            continue

        tot_rt = np.cumsum(rt)
        cr_idx = np.where((sp != 88) & (sp != 77))[0]

        if len(cr_idx) < 3:
            continue

        total_irt = tot_rt[cr_idx[-1]] - tot_rt[cr_idx[0]]

        if len(cr_idx) % 2 == 0:
            mi1 = len(cr_idx) // 2
            mi2 = mi1
        else:
            mi2 = len(cr_idx) // 2
            mi1 = mi2 - 1

        irt_h1 = tot_rt[cr_idx[mi1]] - tot_rt[cr_idx[0]]
        irt_h2 = tot_rt[cr_idx[-1]] - tot_rt[cr_idx[mi2]]
        irt_tot.append((len(cr_idx), total_irt, irt_h1, irt_h2, irt_h2 - irt_h1))

    irt_tot = pd.DataFrame(
        irt_tot,
        columns=["ncr", "total_irt", "irt_h1", "irt_h2", "irt_delta"],
    )
    if len(irt_tot) == 0:
        return irt_tot

    return irt_tot.groupby("ncr", as_index=False).mean()


def irt_tot_df(df):
    irt_rows = []
    for (pid, sess), data in df.groupby(["prolific_pid", "session"]):
        cond = _session_condition(data)
        irt_tot = irt_tot_sess(data)
        for _, row in irt_tot.iterrows():
            irt_rows.append({
                "prolific_pid": pid,
                "session": sess,
                "initiation_condition": cond,
                "ncr": int(row.ncr),
                "ncr_bin": int(row.ncr // 2),
                "total_irt": row.total_irt,
                "irt_h1": row.irt_h1,
                "irt_h2": row.irt_h2,
                "irt_delta": row.irt_delta,
            })

    return pd.DataFrame(
        irt_rows,
        columns=[
            "prolific_pid",
            "session",
            "initiation_condition",
            "ncr",
            "ncr_bin",
            "total_irt",
            "irt_h1",
            "irt_h2",
            "irt_delta",
        ],
    )


def irt_final_plot(data, n_final=4, path=None, figsize=(5, 3)):
    data = _participant_mean(data, "irt", "relative_output_position")
    plt.figure(figsize=figsize)
    ax = sns.lineplot(
        data=data,
        x="relative_output_position",
        y="irt",
        hue="initiation_condition",
        hue_order=COND_ORDER,
        palette=COND_PALETTE,
        errorbar=("se", 1.96),
        err_style="bars",
        marker="o",
    )
    
    plt.xlabel("Relative Output Position")
    plt.ylabel("Inter-Response Time (ms)")
    plt.xticks(np.arange(-(n_final) + 1, 1, 1))
    sns.despine()
    _format_condition_legend(ax)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()


def irt_first_plot(data, n_first=4, path=None, figsize=(5, 3), min_prop=None):
    data = _participant_mean(data, "irt", "output_position")
    if min_prop is not None:
        # keep output positions where >= min_prop of each condition's participants contribute
        n_total = data.groupby("initiation_condition").prolific_pid.nunique()
        n_pos = data.groupby(["initiation_condition", "output_position"]).prolific_pid.nunique()
        prop = n_pos.div(n_total, level="initiation_condition").unstack(0).fillna(0)
        ok = (prop >= min_prop).all(axis=1)
        n_first = int(ok.index[~ok].min() - 1) if (~ok).any() else int(ok.index.max())
        data = data[data.output_position <= n_first]
    plt.figure(figsize=figsize)
    ax = sns.lineplot(
        data=data,
        x="output_position",
        y="irt",
        hue="initiation_condition",
        hue_order=COND_ORDER,
        palette=COND_PALETTE,
        errorbar=("se", 1.96),
        err_style="bars",
        marker="o",
    )

    plt.xlabel("Output Position")
    plt.ylabel("Inter-Response Time (ms)")
    plt.xticks(np.arange(1, n_first + 1, 1))
    sns.despine()
    _format_condition_legend(ax)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()


def irt_tot_plot(data, path=None, figsize=(5, 3)):
    data = _participant_mean(data, "irt_delta", "ncr_bin")
    plt.figure(figsize=figsize)
    ax = sns.lineplot(
        data=data,
        x="ncr_bin",
        y="irt_delta",
        hue="initiation_condition",
        hue_order=COND_ORDER,
        palette=COND_PALETTE,
        errorbar=("se", 1.96),
        err_style="bars",
        marker="o",
    )
    plt.axhline(0, color="black", linestyle="dotted", linewidth=1)
    plt.xlabel("Correct Recalls (each half)")
    plt.ylabel("Difference in Total IRT (ms)")
    sns.despine()
    _format_condition_legend(ax)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()



# IRTs partitioned on total correct recalls (Murdock & Okada, 1970; Greene et al., 2026)
def irt_total_recall_sess(data):
    """IRTs between consecutive correct recalls, by transition and total correct recalls on the list.
    Lists with any IRT above 30 s are excluded, as in irt_tot_sess."""
    rows = []
    rec_evs = data[data["type"] == "REC_WORD"]
    for i in data.list.dropna().unique():
        sp, rt = _list_recall_arrays(rec_evs, i)
        if len(sp) < 2 or np.all(pd.isna(rt)) or np.nanmax(rt) > 30000:
            continue
        correct = (sp != 88) & (sp != 77)
        n_correct = int(correct.sum())
        k = 0
        for j in range(len(sp) - 1):
            if correct[j]:
                k += 1
            if correct[j] and correct[j + 1]:
                rows.append({"total_recall": n_correct, "transition": k, "irt": rt[j + 1]})
    return pd.DataFrame(rows, columns=["total_recall", "transition", "irt"])


def irt_total_recall_df(df):
    out = []
    for (pid, sess), data in df.groupby(["prolific_pid", "session"]):
        d = irt_total_recall_sess(data)
        d["prolific_pid"] = pid
        d["session"] = sess
        d["initiation_condition"] = _session_condition(data)
        out.append(d)
    return pd.concat(out, ignore_index=True)


def irt_total_recall_plot(data, totals=(5, 7, 9, 11, 13), path=None, figsize=(12, 3.5)):
    """One panel per condition; one curve per total number of correct recalls."""
    p = data[data["total_recall"].isin(totals)].groupby(
        ["prolific_pid", "initiation_condition", "total_recall", "transition"], as_index=False)["irt"].mean()
    markers = ["o", "s", "^", "D", "v", "P", "X"]
    styles = ["-", "--", "-.", ":", "-", "--", "-."]
    fig, axes = plt.subplots(1, len(COND_ORDER), figsize=figsize, sharey=True)
    for ax, cond in zip(axes, COND_ORDER):
        for n, m, ls in zip(totals, markers, styles):
            g = p[(p["initiation_condition"] == cond) & (p["total_recall"] == n)].groupby("transition")["irt"]
            mean = g.mean() / 1000
            ci = 1.96 * g.std(ddof=1) / np.sqrt(g.count()) / 1000
            ax.errorbar(mean.index, mean, yerr=ci, color=COND_PALETTE[cond], marker=m, ms=4, ls=ls, lw=1.2, label=str(n))
        ax.set_title(COND_LABELS[cond])
        ticks = range(1, max(totals), 2)
        ax.set_xticks(list(ticks), labels=[f"{k}-{k + 1}" for k in ticks], rotation=45)
        ax.set_xlabel("Output Position")
        ax.spines[["right", "top"]].set_visible(False)
    axes[0].set_ylabel("Inter-Response Time (s)")
    from matplotlib.lines import Line2D
    handles = [Line2D([], [], color="0.2", marker=m, ms=4, ls=ls, lw=1.2, label=str(n))
               for n, m, ls in zip(totals, markers, styles)]
    axes[-1].legend(handles=handles, title="Total Recall", frameon=False, fontsize=8, title_fontsize=8,
                    loc="upper left", bbox_to_anchor=(1.0, 1.0))
    plt.tight_layout()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()



def irt_total_recall_by_total_plot(data, totals=(5, 7, 9, 11, 13, 15), ncols=3, top_ylim=(1, 10), path=None,
                                   figsize=(11, 6)):
    """One panel per total number of correct recalls; one curve per condition.
    Rows share a y-axis; top_ylim sets the first row's limits."""
    p = data[data["total_recall"].isin(totals)].groupby(
        ["prolific_pid", "initiation_condition", "total_recall", "transition"], as_index=False)["irt"].mean()
    offsets = {"start": -0.12, "end": 0.0, "free": 0.12}
    nrows = int(np.ceil(len(totals) / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=figsize, sharey="row", squeeze=False)
    if top_ylim is not None:
        axes[0, 0].set_ylim(*top_ylim)
    axes = axes.flatten()
    for ax in axes[len(totals):]:
        ax.set_visible(False)
    for ax, n in zip(axes, totals):
        for cond in COND_ORDER:
            g = p[(p["initiation_condition"] == cond) & (p["total_recall"] == n)].groupby("transition")["irt"]
            mean = g.mean() / 1000
            ci = 1.96 * g.std(ddof=1) / np.sqrt(g.count()) / 1000
            ax.errorbar(mean.index + offsets[cond], mean, yerr=ci, color=COND_PALETTE[cond], marker="o", ms=3,
                        lw=1.2, label=COND_LABELS[cond])
        ax.set_title(f"Total Recall = {n}", fontsize=10)
        ax.set_gid(f"total_recall_{n}")   # one named group per panel in the SVG
        ticks = range(1, n, 2)
        ax.set_xticks(list(ticks), labels=[f"{k}-{k + 1}" for k in ticks], rotation=45)
        ax.spines[["right", "top"]].set_visible(False)
    for r in range(nrows):
        axes[r * ncols].set_ylabel("Inter-Response Time (s)")
    axes[ncols - 1].legend(frameon=False, fontsize=8, loc="upper left")
    fig.supxlabel("Output Position", fontsize=10)
    plt.tight_layout()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
        plt.savefig(Path(path).with_suffix(".svg"), bbox_inches="tight")   # grouped by panel, for Affinity
    plt.show()
