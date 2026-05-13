"""Paper-style plotting helpers for the Prolific dirFR analyses.

These functions accept the DataFrames currently built in
``analyses_prolific.ipynb`` and mirror the visual conventions used in
``figures.py`` from the original paper.
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


COND_ORDER = ["primacy", "recency"]
COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}


def set_paper_style():
    sns.set_theme(style="ticks", context="paper")
    plt.rcParams["axes.labelsize"] = 12
    plt.rcParams["xtick.labelsize"] = 10
    plt.rcParams["ytick.labelsize"] = 10


def _save(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(path, bbox_inches="tight")
    plt.show()


def _participant_average(data, value_cols):
    return data.groupby(["prolific_pid", "initiation_condition"], as_index=False)[value_cols].mean()


def _melt_serial_position(data, value_cols, value_name):
    participant_df = _participant_average(data, value_cols)
    dfm = pd.melt(
        participant_df,
        id_vars=["prolific_pid", "initiation_condition"],
        value_vars=value_cols,
        var_name="serial_position",
        value_name=value_name,
    )
    dfm["serial_position"] = dfm["serial_position"].str.split("_").str[-1].astype(int)
    dfm["initiation"] = dfm["initiation_condition"].map(COND_LABELS)
    return dfm


def _condition_order(data):
    present = data["initiation_condition"].dropna().unique()
    return [cond for cond in COND_ORDER if cond in present]


def plot_curve_by_condition(data, value_cols, ylabel, path, title=None, ylim=None):
    """Plot SPC/PFR-style curves with 95% SE intervals."""
    set_paper_style()
    dfm = _melt_serial_position(data, value_cols, ylabel)
    order = _condition_order(data)
    hue_order = [COND_LABELS[c] for c in order]
    palette = [COND_PALETTE[c] for c in order]
    max_pos = len(value_cols)

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.lineplot(
        dfm,
        x="serial_position",
        y=ylabel,
        hue="initiation",
        hue_order=hue_order,
        palette=palette,
        errorbar=("se", 1.96),
        ax=ax,
    )

    xtick_step = 5 if max_pos >= 20 else 2
    ax.set(
        xlabel="Serial Position",
        ylabel=ylabel,
        xticks=np.arange(xtick_step, max_pos + 1, xtick_step),
        xlim=(0, max_pos + 1),
    )
    if ylim is not None:
        ax.set_ylim(*ylim)
    if title:
        ax.set_title(title)
    ax.spines[["right", "top"]].set_visible(False)

    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, labels, title="Initiation", shadow=True, loc="upper right")
    _save(path)


def plot_bar_by_condition(data, value_col, ylabel, path, title=None, ylim=None, chance=None):
    """Plot paper-style condition bars plus participant points."""
    set_paper_style()
    participant_df = _participant_average(data, [value_col])
    order = _condition_order(participant_df)
    participant_df["initiation"] = participant_df["initiation_condition"].map(COND_LABELS)
    x_order = [COND_LABELS[c] for c in order]
    palette = [COND_PALETTE[c] for c in order]

    fig, ax = plt.subplots(figsize=(6, 4))
    sns.barplot(
        participant_df,
        x="initiation",
        y=value_col,
        order=x_order,
        hue="initiation",
        hue_order=x_order,
        palette=palette,
        alpha=0.7,
        errorbar=("se", 1.96),
        ax=ax,
        legend=False,
    )
    sns.stripplot(
        participant_df,
        x="initiation",
        y=value_col,
        order=x_order,
        hue="initiation",
        hue_order=x_order,
        palette=palette,
        alpha=0.55,
        jitter=0.12,
        ax=ax,
        legend=False,
    )

    if chance is not None:
        ax.axhline(chance, color="black", linestyle="dotted", linewidth=1)
    ax.set(xlabel="Initiation Condition", ylabel=ylabel)
    if ylim is not None:
        ax.set_ylim(*ylim)
    if title:
        ax.set_title(title)
    ax.spines[["right", "top"]].set_visible(False)
    _save(path)


def plot_intrusion_rates(intrusion_df, path, title=None):
    set_paper_style()
    participant_df = _participant_average(intrusion_df, ["eli_rate", "pli_rate"])
    order = _condition_order(participant_df)
    participant_df["initiation"] = participant_df["initiation_condition"].map(COND_LABELS)
    x_order = [COND_LABELS[c] for c in order]
    palette = [COND_PALETTE[c] for c in order]

    fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharex=True)
    for ax, value_col, ylabel in zip(
        axes,
        ["eli_rate", "pli_rate"],
        ["ELIs per Trial", "PLIs per Trial"],
    ):
        sns.barplot(
            participant_df,
            x="initiation",
            y=value_col,
            order=x_order,
            hue="initiation",
            hue_order=x_order,
            palette=palette,
            alpha=0.7,
            errorbar=("se", 1.96),
            ax=ax,
            legend=False,
        )
        sns.stripplot(
            participant_df,
            x="initiation",
            y=value_col,
            order=x_order,
            hue="initiation",
            hue_order=x_order,
            palette=palette,
            alpha=0.55,
            jitter=0.12,
            ax=ax,
            legend=False,
        )
        ax.set(xlabel="", ylabel=ylabel)
        ax.spines[["right", "top"]].set_visible(False)

    if title:
        fig.suptitle(title)
    plt.tight_layout()
    _save(path)


def plot_lag_crp(lag_crp_df, lag_cols, path, title=None):
    set_paper_style()
    participant_df = _participant_average(lag_crp_df, lag_cols)
    dfm = pd.melt(
        participant_df,
        id_vars=["prolific_pid", "initiation_condition"],
        value_vars=lag_cols,
        var_name="lag_label",
        value_name="crp",
    )
    dfm["lag"] = np.where(
        dfm["lag_label"].str.startswith("ln_"),
        -dfm["lag_label"].str.split("_").str[-1].astype(int),
        dfm["lag_label"].str.split("_").str[-1].astype(int),
    )
    dfm["initiation"] = dfm["initiation_condition"].map(COND_LABELS)
    order = _condition_order(participant_df)
    hue_order = [COND_LABELS[c] for c in order]
    palette = [COND_PALETTE[c] for c in order]

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.lineplot(
        dfm.query("lag < 0"),
        x="lag",
        y="crp",
        hue="initiation",
        hue_order=hue_order,
        palette=palette,
        errorbar=("se", 1.96),
        ax=ax,
    )
    sns.lineplot(
        dfm.query("lag > 0"),
        x="lag",
        y="crp",
        hue="initiation",
        hue_order=hue_order,
        palette=palette,
        errorbar=("se", 1.96),
        ax=ax,
        legend=False,
    )

    max_lag = int(dfm["lag"].abs().max())
    ax.set(
        xlabel="Lag",
        ylabel="Conditional Response Probability",
        xticks=np.arange(-max_lag, max_lag + 1, 2),
        xlim=(-max_lag - 0.5, max_lag + 0.5),
    )
    if title:
        ax.set_title(title)
    ax.spines[["right", "top"]].set_visible(False)
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, labels, title="Initiation", shadow=True, loc="upper right")
    _save(path)


def plot_irt(irt_df, tr_cols, path, title=None):
    set_paper_style()
    participant_df = _participant_average(irt_df, tr_cols)
    dfm = pd.melt(
        participant_df,
        id_vars=["prolific_pid", "initiation_condition"],
        value_vars=tr_cols,
        var_name="output_transition",
        value_name="irt",
    )
    dfm["output_transition"] = dfm["output_transition"].str.split("_").str[-1].astype(int)
    dfm["initiation"] = dfm["initiation_condition"].map(COND_LABELS)
    order = _condition_order(participant_df)
    hue_order = [COND_LABELS[c] for c in order]
    palette = [COND_PALETTE[c] for c in order]

    fig, ax = plt.subplots(figsize=(7, 5))
    sns.lineplot(
        dfm,
        x="output_transition",
        y="irt",
        hue="initiation",
        hue_order=hue_order,
        palette=palette,
        err_style="bars",
        errorbar=("se", 1.96),
        marker="o",
        ax=ax,
    )
    ax.set(xlabel="Output Transition", ylabel="Inter-Response Time (ms)")
    if title:
        ax.set_title(title)
    ax.spines[["right", "top"]].set_visible(False)
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, labels, title="Initiation", shadow=True, loc="upper right")
    _save(path)
