import numpy as np
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}
COND_ORDER = ["primacy", "recency"]


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

        final_irts = irts[-n_final:]
        positions = np.arange(-len(final_irts), 0)
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


def irt_final_plot(data, path=None, figsize=(5, 3)):
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
    plt.xticks([-4, -3, -2, -1])
    sns.despine()
    _format_condition_legend(ax)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()


def irt_tot_plot(data, path=None, figsize=(5, 3)):
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
    plt.ylabel("Difference in Total Inter-Response Time (ms)")
    sns.despine()
    _format_condition_legend(ax)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()
