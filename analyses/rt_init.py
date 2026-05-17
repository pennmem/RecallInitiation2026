import numpy as np
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}
COND_ORDER = ["primacy", "recency"]


def rt_init_df(df, toggle=True):
    rt_init_rows = []
    for (pid, sess), data in df.groupby(["prolific_pid", "session"]):
        cond = data["initiation_condition"].dropna().iloc[0]
        rt_init_rows.append({
            "prolific_pid": pid,
            "session": sess,
            "initiation_condition": cond,
            "rt_initial": rt_init_sess(data, toggle=toggle),
        })
    rt_init_df = pd.DataFrame(rt_init_rows)
    return rt_init_df


# average initial response time
# toggle = True, only lists initiated with correct recall
def rt_init_sess(data, toggle=True):
    rts = []
    rec_evs = data[data["type"] == "REC_WORD"]

    for i in data.list.unique():
        sp = rec_evs[rec_evs["list"] == i].serial_position.to_numpy()
        rt = rec_evs[rec_evs["list"] == i].rt.to_numpy()
        if len(sp) > 1:  # always null recall at end of list
            if toggle:
                if sp[0] > 0 and sp[0] <= 20:
                    rts.append(rt[0])
            else:
                rts.append(rt[0])

    if len(rts) == 0:
        return np.nan

    rts = np.array(rts) - np.min(rts)  # subtract session minimum to approximate typing time
    return np.mean(rts)

def _rt_value_col(data):
    if "rt" in data.columns:
        return "rt"
    if "rt_initial" in data.columns:
        return "rt_initial"
    raise ValueError("RT plot data must include either an 'rt' or 'rt_initial' column.")


def _prepare_plot_data(data):
    plot_data = data.copy()
    value_col = _rt_value_col(plot_data)
    if value_col == "rt" and "min_rt" in plot_data.columns:
        plot_data = plot_data[plot_data["min_rt"] == False]
    return plot_data.dropna(subset=[value_col]), value_col


def _hist_bins(data, value_col, bin_width, xlim):
    if xlim is not None:
        return np.arange(xlim[0], xlim[1] + bin_width, bin_width)

    max_rt = data[value_col].max()
    if pd.isna(max_rt):
        max_rt = bin_width
    return np.arange(0, max_rt + bin_width, bin_width)


def _condition_means(rt_init_data):
    participant_df = (
        rt_init_data
        .groupby(["prolific_pid", "initiation_condition"], as_index=False)["rt_initial"]
        .mean()
    )
    return participant_df.groupby("initiation_condition")["rt_initial"].mean()


def _plot_condition_hist(ax, data, value_col, bins):
    for cond in COND_ORDER:
        cond_data = data[data["initiation_condition"] == cond]
        if len(cond_data) == 0:
            continue

        weights = np.ones(len(cond_data)) / len(cond_data)
        ax.hist(
            cond_data[value_col],
            bins=bins,
            weights=weights,
            color=COND_PALETTE[cond],
            alpha=0.4,
            label=COND_LABELS[cond],
        )


def rt_init_plot(data, rt_init_data=None, path=None, figsize=(5, 3), bin_width=250, xlim=(0, 20000)):
    plot_data, value_col = _prepare_plot_data(data)
    if rt_init_data is None and value_col == "rt_initial":
        rt_init_data = data

    fig, ax = plt.subplots(figsize=figsize)
    bins = _hist_bins(plot_data, value_col, bin_width, xlim)
    _plot_condition_hist(ax, plot_data, value_col, bins)

    if rt_init_data is not None and len(rt_init_data) > 0:
        cond_means = _condition_means(rt_init_data)
        for cond in COND_ORDER:
            if cond in cond_means and not pd.isna(cond_means[cond]):
                ax.axvline(cond_means[cond], color=COND_PALETTE[cond], linestyle="dashed")

    ax.set(xlabel="Response Time (ms)", ylabel="Proportion of Trials", xlim=xlim)
    ax.grid(True)
    sns.despine(ax=ax)
    handles, labels = ax.get_legend_handles_labels()
    if handles:
        ax.legend(handles, labels, shadow=True, ncols=2, loc="upper right")

    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(path, bbox_inches="tight")
    plt.show()


def rt_init_plot_by_session(data, rt_init_data=None, path=None, figsize=(5, 3), bin_width=250, xlim=(0, 20000)):
    plot_data, value_col = _prepare_plot_data(data)
    if rt_init_data is None and value_col == "rt_initial":
        rt_init_data = data

    sessions = sorted(plot_data["session"].dropna().unique())
    n_cols = 2
    n_rows = int(np.ceil(len(sessions) / n_cols)) if len(sessions) > 0 else 1
    fig, ax = plt.subplots(n_rows, n_cols, figsize=figsize, sharey=True, sharex=True)
    axes = np.array(ax).reshape(-1)
    bins = _hist_bins(plot_data, value_col, bin_width, xlim)

    session_means = None
    if rt_init_data is not None and len(rt_init_data) > 0:
        participant_df = (
            rt_init_data
            .groupby(["session", "prolific_pid", "initiation_condition"], as_index=False)["rt_initial"]
            .mean()
        )
        session_means = participant_df.groupby(["session", "initiation_condition"])["rt_initial"].mean()

    for i, sess in enumerate(sessions):
        sess_ax = axes[i]
        sess_data = plot_data[plot_data["session"] == sess]
        _plot_condition_hist(sess_ax, sess_data, value_col, bins)

        if session_means is not None:
            for cond in COND_ORDER:
                key = (sess, cond)
                if key in session_means and not pd.isna(session_means[key]):
                    sess_ax.axvline(session_means[key], color=COND_PALETTE[cond], linestyle="dashed")

        sess_ax.set(title=f"Session {sess}", xlabel="", ylabel="", xlim=xlim)
        sess_ax.tick_params(axis='x', labelsize=8)
        sess_ax.grid(True)
        sns.despine(ax=sess_ax)

    for extra_ax in axes[len(sessions):]:
        extra_ax.axis("off")

    fig.supxlabel("Response Time (ms)", x=0.53)
    fig.supylabel("Proportion of Trials")
    handles, labels = axes[0].get_legend_handles_labels()
    if handles:
        fig.legend(handles, labels, shadow=True, ncols=2,
               loc="upper center", bbox_to_anchor=(0.53, 1.08))
    plt.tight_layout(rect=(0, 0, 1, 0.96))
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(path, bbox_inches="tight")
    plt.show()


def rt_init(df, toggle=True):
    return rt_init_df(df, toggle=toggle)
