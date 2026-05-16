import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}


def r1_intrusion_df(df):
    r1_intr_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        prop_wrong = r1_intrusion_sess(data)
        r1_intr_data.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond, 'prop_wrong': prop_wrong
        })
    r1_intr_df = pd.DataFrame(r1_intr_data)
    return r1_intr_df

# proportion of lists initiated with an intrusion
def r1_intrusion_sess(data):
    intr = 0                     # lists initiated with intrusion
    subtract = 0                 # lists with no recalls
    rec_evs = data[data['type'] == 'REC_WORD']
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()
        if len(sp) > 1:          # always null recall at end of list
            if sp[0] == 88:      # intrusion
                intr += 1
        else:
            subtract += 1
    return intr / (len(data.list.unique()) - subtract) if (len(data.list.unique()) - subtract) > 0 else np.nan

def r1_intrusion_overall(df, path=None, figsize=(5, 3)):
    plt.figure(figsize=figsize)
    sns.barplot(
        data=df,
        x='initiation_condition',
        y='prop_wrong',
        palette=COND_PALETTE,
        order=['primacy', 'recency'])
    plt.xlabel("Initiation Condition")
    plt.ylabel("R1 Intrusion Probability")
    plt.ylim(0, None)
    sns.despine()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()


# plot proportion of lists initiated with intrusion by session and condition
def r1_intrusion_plot(df, path=None, figsize=(5, 3)):
    plt.figure(figsize=figsize)
    sns.barplot(
        data=df,
        x='session',
        y='prop_wrong',
        hue='initiation_condition',
        palette=COND_PALETTE,
        hue_order=['primacy', 'recency']
    )
    plt.xlabel("Session")
    plt.ylabel("R1 Intrusion Probability")
    plt.ylim(0, None)
    plt.xticks(ticks=[0, 1, 2, 3], labels=['1', '2', '3', '4'])
    sns.despine()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()
