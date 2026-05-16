import numpy as np
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}

def mwr(df):
    mwr_rows = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        mwr = mwr_sess(data)
        mwr_rows.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond, 'mwr': mwr
        })
    mwr_df = pd.DataFrame(mwr_rows)
    return mwr_df

# mean words recalled
def mwr_sess(data):
    rec_evs = data[data['type'] == 'REC_WORD']
    list_recalls = []
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()     # current list serial positions
        list_recalls.append(len(np.unique(sp[(sp != 99) & (sp != 88)])))  # number of correct recalls on list (no intrusions/repetitions)
    return np.mean(list_recalls)

def mwr_plot(data, path=None, figsize=(5, 3)):
    plt.figure(figsize=figsize)
    sns.barplot(
        data=data,
        x="initiation_condition",
        y="mwr",
        palette=COND_PALETTE,
    )
    sns.stripplot(
        data=data,
        x="initiation_condition",
        y="mwr",
        hue="initiation_condition",
        palette=COND_PALETTE,
        alpha=0.5,
        jitter=False
    )
    plt.xlabel("Initiation Condition")
    plt.ylabel("Mean Words Recalled")
    plt.ylim(0, None)
    plt.xticks(ticks=[0, 1], labels=[COND_LABELS[c] for c in data['initiation_condition'].unique()])
    sns.despine()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()

def mwr_plot_by_session(data, path=None, figsize=(5, 3)):
    plt.figure(figsize=figsize)
    order = ["1", "2", "3", "4"]
    sns.barplot(
        data=data,
        x="session",
        y="mwr",
        hue="initiation_condition",
        palette=COND_PALETTE,
        legend=True
    )
    sns.stripplot(
        data=data,
        x="session",
        y="mwr",
        hue="initiation_condition",
        palette=COND_PALETTE,
        alpha=0.5,
        jitter=False,
        dodge=True,
        legend=False
    )
    plt.xlabel("Session")
    plt.ylabel("Mean Words Recalled")
    plt.ylim(0, None)
    plt.xticks(ticks=range(len(order)), labels=order)
    sns.despine()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()