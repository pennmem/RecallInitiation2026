import pandas as pd
import numpy as np
from pathlib import Path

import matplotlib.pyplot as plt
import seaborn as sns

COND_ORDER = ["primacy", "recency"]
COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}

# compute serial position curve (SPC) for each session and condition
def spc_df(df):
    spc_rows = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']): # group by participant-session
        cond = data['initiation_condition'].dropna().iloc[0] # get condition for session
        spc = spc_sess(data) # compute SPC for session
        spc_rows.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond,
            **{f'sp_{i+1}': spc[i] for i in range(20)} 
        })
    spc_df = pd.DataFrame(spc_rows) # convert list to DataFrame
    return spc_df

# compute serial position curve (SPC) for a single session
def spc_sess(data):
    spc = np.zeros(20) # initialize 20-element array
    rec_evs = data[data['type'] == 'REC_WORD'] # filter recall events
    for i in data.list.unique(): # iterate over unique lists in session
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy() # select all occurred serial positions for list i
        srpos = np.unique(sp[(sp != 99) & (sp != 88)]) # filter out intrusions and repetitions, get unique serial positions (since duplicates don't count)
        for j in range(1, 21): # iterate over possible serial positions (1-20)
            spc[j-1] += np.count_nonzero(srpos == j) # increment SPC count if existed
    spc /= len(data.list.unique()) # divide by the number of lists to get probability
    
    return spc


def spc_plot(data, path=None, figsize=(5, 3)):
    # get all sp_ columns as y values
    sp_cols = [c for c in data.columns if c.startswith("sp_")]

    # average across sessions within each participant-condition
    participant_df = data.groupby(
        ["prolific_pid", "initiation_condition"], as_index=False
    )[sp_cols].mean()

    # convert sp_1, sp_2, ..., sp_20 columns into one serial_position column
    plot_df = pd.melt(
        participant_df,
        id_vars=["prolific_pid", "initiation_condition"],
        value_vars=sp_cols,
        var_name="serial_position",
        value_name="recall_probability",
    )
    plot_df["serial_position"] = (
        plot_df["serial_position"].str.split("_").str[-1].astype(int)
    )
    plot_df["condition_label"] = plot_df["initiation_condition"].map(COND_LABELS)

    plt.figure(figsize=figsize)
    sns.lineplot(
        data=plot_df,
        x="serial_position",
        y="recall_probability",
        hue="condition_label",
        hue_order=["Primacy", "Recency"],
        palette=[COND_PALETTE["primacy"], COND_PALETTE["recency"]],
        errorbar=("se", 1.96),
    )

    max_pos = len(sp_cols)

    plt.xlabel("Serial Position")
    plt.ylabel("Recall Probability")
    plt.xlim(0, max_pos + 1)
    plt.ylim(0, 1)
    plt.xticks(np.arange(5, max_pos + 1, 5))
    plt.legend(title="Initiation", shadow=True, loc="lower right")
    sns.despine()

    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")

    plt.show()


def spc_plot_overall(data, path=None, figsize=(5, 3)):
    # get all sp_ columns as y values
    sp_cols = [c for c in data.columns if c.startswith("sp_")]

    # average across sessions within each participant
    participant_df = data.groupby("prolific_pid", as_index=False)[sp_cols].mean()

    # convert sp_1, sp_2, ..., sp_20 columns into one serial_position column
    plot_df = pd.melt(
        participant_df,
        id_vars=["prolific_pid"],
        value_vars=sp_cols,
        var_name="serial_position",
        value_name="recall_probability",
    )
    plot_df["serial_position"] = (
        plot_df["serial_position"].str.split("_").str[-1].astype(int)
    )

    plt.figure(figsize=figsize)
    sns.lineplot(
        data=plot_df,
        x="serial_position",
        y="recall_probability",
        color="blue",
        errorbar=("se", 1.96),
    )

    max_pos = len(sp_cols)

    plt.xlabel("Serial Position")
    plt.ylabel("Recall Probability")
    plt.xlim(0, max_pos + 1)
    plt.ylim(0, 1)
    plt.xticks(np.arange(5, max_pos + 1, 5))
    sns.despine()

    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")

    plt.show()
