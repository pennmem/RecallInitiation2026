import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

COND_LABELS = {"primacy": "Primacy", "recency": "Recency"}
COND_PALETTE = {"primacy": "orange", "recency": "purple"}

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

# lag-CRP
def lag_crp_sess(data):
    ac = np.zeros(39)
    poss = np.zeros_like(ac)
    rec_evs = data[data['type'] == 'REC_WORD']
    
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()       # current list serial positions
        sp = sp[sp != 99]                                                   # remove last null recall
        
        sp = mark_repetitions(sp)
        sps_left = [x for x in range(1, 21)]        # array with remaining serial positions, subtract from
        for j in range(len(sp) - 1):
            if sp[j]!=88 and sp[j]!=77:               # correct recall
                sps_left.remove(sp[j])                # can't transition to already recalled serial position
                
                if sp[j+1]!=88 and sp[j+1]!=77:       # transition between correct recalls
                    lag = sp[j+1] - sp[j]             # actual transition
                    ac[int(lag)+19] += 1
                    for l in sps_left:                # find all possible transitions
                        p_lag = l - sp[j]
                        poss[int(p_lag)+19] += 1
    
    crp = ac / poss       # we actually want the NaNs from zero division
    crp = np.delete(crp, len(crp)//2)        # remove lag = 0
    
    return crp

def lag_crp(df):
    lcrp_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        crp = lag_crp_sess(data)
        lcrp_data.append({
            'prolific_pid': pid, 'session': sess, 'initiation_condition': cond, 
            **{f'ln_{lag}': crp[i] for i, lag in enumerate(np.arange(19, 0, -1))},
            **{f'lp_{lag}': crp[(19) + i] for i, lag in enumerate(range(1, 20))},
        })
    lcrp = pd.DataFrame(lcrp_data, columns=(
        ["prolific_pid", "session", "initiation_condition"] + [f'ln_{lag}' for lag in np.arange(19, 0, -1)] + [f'lp_{lag}' for lag in range(1, 20)]))
    return lcrp


# lag-CRP
# full
def plot_lcrp(lcrp_data, path=None):
    # re-structure dataframe
    lag_cols = [f"ln_{x}" for x in np.arange(7, 0, -1)] + [f"lp_{x}" for x in range(1, 8)]
    participant_df = (
        lcrp_data
        .groupby(["prolific_pid", "initiation_condition"], as_index=False)[lag_cols]
        .mean()
    )
    dfm = pd.melt(participant_df, id_vars=['prolific_pid', 'initiation_condition'], 
              value_vars=lag_cols, 
              var_name='lag', value_name='crp')
    dfm['lag'] = [-int(x.split('_')[-1]) if x.split('_')[0] == 'ln' else int(x.split('_')[-1]) for x in dfm.lag]    # change lag to ints

    fig, ax = plt.subplots(figsize=(5, 3))
    sns.lineplot(dfm.query("lag < 0"), x='lag', y='crp', hue='initiation_condition',
                    hue_order=['primacy', 'recency'], palette=COND_PALETTE, alpha=0.7,
                    errorbar=('se', 1.96))
    sns.lineplot(dfm.query("lag > 0"), x='lag', y='crp', hue='initiation_condition',
                    hue_order=['primacy', 'recency'], palette=COND_PALETTE, alpha=0.7,
                    errorbar=('se', 1.96), legend=False)

    handles, _ = ax.get_legend_handles_labels()
    ax.set(xlabel='Lag', xticks=np.linspace(-7, 7, 8), ylabel='Conditional Response Probability')
    ax.spines[['right', 'top']].set_visible(False)
    labels = ['Primacy', 'Recency']
    fig.legend(handles, labels, shadow=True, ncols=3, loc='upper center', bbox_to_anchor=(0.53, 1.08))
    plt.tight_layout()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()

# forward asymmetry (as integral of lag-CRP)
# n = number of transitions to include (+ and -)
def forward_asymmetry(row, n):
    # forward transitions
    fwd = [f'lp_{x}' for x in range(1, n+1)]
    crp_fwd = row[fwd].sum()
    
    # backward transitions
    bwd = [f'ln_{x}' for x in range(n, 0, -1)]
    crp_bwd = row[bwd].sum()
    
    return pd.Series({'prolific_pid': row.prolific_pid, 'session': row.session, 
                      'initiation_condition': row.initiation_condition, 
                      'fwd': crp_fwd, 'bwd': crp_bwd, 'asym': crp_fwd - crp_bwd})
