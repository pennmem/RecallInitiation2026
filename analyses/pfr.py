import numpy as np
import pandas as pd
from pathlib import Path

import matplotlib.pyplot as plt
import seaborn as sns

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}

# probability of first recall
def pfr(df):
    pfr_rows = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        pfr = pfr_sess(data)
        pfr_rows.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond, 
            **{f'sp_{i+1}': pfr[i] for i in range(20)}
        })
    pfr_df = pd.DataFrame(pfr_rows)
    return pfr_df

def pfr_sess(data):
    pfr = np.zeros(20)
    rec_evs = data[data['type'] == 'REC_WORD']
    intruded_pfr = 0
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()  # current list serial positions
        if len(sp) > 1 and sp[0] > 0 and sp[0] <= 20: # if first recall is valid recall
            pfr[int(sp[0]) - 1] += 1
        else:
            intruded_pfr += 1
    pfr /= (len(data.list.unique()) - intruded_pfr) # divide by valid lists
    return pfr


def pfr_plot(data, path=None, figsize=(5, 3)):
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
        value_name="first_recall_probability",
    )
    plot_df["serial_position"] = (
        plot_df["serial_position"].str.split("_").str[-1].astype(int)
    )
    plot_df["condition_label"] = plot_df["initiation_condition"].map(COND_LABELS)

    plt.figure(figsize=figsize)
    sns.lineplot(
        data=plot_df,
        x="serial_position",
        y="first_recall_probability",
        hue="condition_label",
        hue_order=["Primacy", "Recency"],
        palette=[COND_PALETTE["primacy"], COND_PALETTE["recency"]],
        alpha=0.7,
        errorbar=("se", 1.96),
    )

    max_pos = len(sp_cols)

    plt.xlabel("Serial Position")
    plt.ylabel("Probability of First Recall")
    plt.xlim(0, max_pos + 1)
    plt.ylim(0, 1)
    plt.xticks(np.arange(1, max_pos + 1, 1))
    plt.legend(title="", shadow=True, loc="upper right")
    sns.despine()

    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")

    plt.show()
