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

# temporal clustering score
# temporal percentile rank
def percentile_rank_T(actual, possible):
    if len(possible) < 2:
        return None

    # sort possible transitions from largest to smallest lag
    possible.sort(reverse=True)

    # get indices of the one or more possible transitions with the same lag as the actual transition
    matches = np.where(possible == actual)[0]

    if len(matches) > 0:
        # get number of posible lags that were more distance than actual lag
        rank = np.mean(matches)
        # convert rank to proportion of possible lags that were greater than actual lag
        ptile_rank = rank / (len(possible) - 1.0)
    else:
        ptile_rank = None

    return ptile_rank

def tcl_sess(data, buffer):
    tcl = []                        # temporal clustering scores for each list
    rec_evs = data[data['type'] == 'REC_WORD']
                
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()         # current list serial positions
        sp = sp[sp != 99]                                                     # remove last null recall

        sp = mark_repetitions(sp)        # repetitions = serial position 77
        
        # exclude first 'buffer' output positions
        excludeOutputs = sp[:buffer]
        sp = sp[buffer:]
        sps_left = [x for x in range(1, 21)]        # array with remaining serial positions, subtract from
        
        for exOut in excludeOutputs:
            try:
                sps_left.remove(exOut)               # remove first outputs from possible transitions
            except:
                pass                                  # item already removed or intrusion
        
        tcl_list = []                         # temporal clustering scores for each recall
        for j in range(len(sp) - 1):
            if sp[j]!=88 and sp[j]!=77:             # correct recall
                sps_left.remove(sp[j])
                if sp[j+1]!=88 and sp[j+1]!=77:     # transition to correct recall
                    possList = []
                    lag = abs(sp[j+1] - sp[j])      # actual transition lag
                    for l in range(len(sps_left)):
                        poss_lag = abs(sps_left[l] - sp[j])
                        possList.append(poss_lag)   # list includes actual lag

                    ptile_rank = percentile_rank_T(lag, possList)
                    if ptile_rank is not None:
                        tcl_list.append(ptile_rank)
        
        # take average of scores on list  ### weight each list or each transition equally???
        if len(tcl_list) > 0:
            tcl.append(np.mean(tcl_list))
            
    # return average of list scores
    return np.mean(tcl)

def tcl(df):
    tcl_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        tcl = tcl_sess(data, buffer=0)
        tcl_data.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond, 'tcl': tcl
        })
    tcl_data = pd.DataFrame(tcl_data)    
    return tcl_data

# conditioned on half of recall
def tcl_h_sess(data):
    tcl_h1 = []; tcl_h2 = []; tcl_delta = []                     # temporal clustering scores for each list
    rec_evs = data[data['type'] == 'REC_WORD']
    
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()      # current list serial positions
        sp = sp[sp != 99]                                                  # remove last null recall
        
        sp = mark_repetitions(sp)                      # repetitions = serial position 77
        
        cr_idx = np.where((sp != 88) & (sp != 77))[0]           # correct recall indices
        if len(cr_idx) % 2 == 1:
            mi1 = len(cr_idx) // 2
            mi2 = mi1
        else:
            mi2 = len(cr_idx) // 2
            mi1 = mi2 - 1
        
        tcl_h1_list = []; tcl_h2_list = []             # temporal clustering scores for each recall
        toggle_h1 = False; toggle_h2 = False
        sps_left = [x for x in range(1, 21)]
        for j in range(len(sp) - 1):
            # determine half of correct recalls
            if j < mi1:
                toggle_h1 = True
                toggle_h2 = False
            elif j >= mi2:
                toggle_h1 = False
                toggle_h2 = True
            else:
                toggle_h1 = False
                toggle_h2 = False
                
            if sp[j]!=88 and sp[j]!=77:                       # correct recall
                sps_left.remove(sp[j])
                if sp[j+1]!=88 and sp[j+1]!=77:               # transition to correct recall
                    possList = []
                    lag = abs(sp[j+1] - sp[j])                # actual transition lag
                    for l in range(len(sps_left)):
                        poss_lag = abs(sps_left[l] - sp[j])
                        possList.append(poss_lag)             # list includes actual lag
                        
                    ptile_rank = percentile_rank_T(lag, possList)
                    if ptile_rank is not None:
                        if toggle_h1:
                            tcl_h1_list.append(ptile_rank)
                        elif toggle_h2:
                            tcl_h2_list.append(ptile_rank)
                            
        # take average of scofres on list (weight each list equally)
        if len(tcl_h1_list) > 0 and len(tcl_h2_list) > 0:
            tcl_h1.append(np.mean(tcl_h1_list))
            tcl_h2.append(np.mean(tcl_h2_list))
            tcl_delta.append(np.mean(tcl_h2_list) - np.mean(tcl_h1_list))
            
    # return average of list scores
    return np.mean(tcl_h1), np.mean(tcl_h2), np.mean(tcl_delta)

def tcl_h(df):
    tcl_h_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        tcl_h1, tcl_h2, tcl_delta = tcl_h_sess(data)
        tcl_h_data.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': cond, 'tcl_h1': tcl_h1, 'tcl_h2': tcl_h2, 'tcl_delta': tcl_delta
        })
    # store results in dataframe
    tcl_h_data = pd.DataFrame(tcl_h_data)  
    return tcl_h_data

# temporal clustering score
# total
def plot_tcl(tcl_data_bsa, path=None):
    _, ax = plt.subplots(figsize=(5,3))
    sns.barplot(tcl_data_bsa, x='initiation_condition', y='tcl', hue="initiation_condition", 
                hue_order=['primacy', 'recency'], order=['primacy', 'recency'], palette=[COND_PALETTE["primacy"], COND_PALETTE["recency"]], errorbar=('se', 1.96), alpha=0.7, gap=0.1, legend=False)
    ax.set(xlabel='Condition', ylabel='Temporal Clustering Score', ylim=(0.45, 1))
    ax.spines[['right', 'top']].set_visible(False)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()

# each half of recall
def plot_tcl_h(tcl_h_data, path=None):
    # re-organize dataframe
    participant_df = tcl_h_data.groupby(['prolific_pid', 'initiation_condition'], as_index=False)[['tcl_h1', 'tcl_h2']].mean()
    dfm = pd.melt(participant_df, id_vars=['prolific_pid', 'initiation_condition'],
                  value_vars=['tcl_h1', 'tcl_h2'], var_name='half_label', value_name='tcl_h')
    plt.figure(figsize=(5, 3))
    ax = sns.pointplot(data=dfm, x='half_label', y='tcl_h', hue='initiation_condition', hue_order=["primacy", "recency"], 
                    palette=[COND_PALETTE["primacy"], COND_PALETTE["recency"]], errorbar=('se', 1.96), alpha=0.7, )
    ax.set(xlabel='Position in Recall Sequence', ylabel='Temporal Clustering Score', ylim=(0.45, 1))
    ax.set_xticks([0, 1], labels=['Half 1', 'Half 2'])
    sns.despine()
    handles, labels = ax.get_legend_handles_labels()
    labels = [COND_LABELS[label] for label in labels]
    ax.legend(handles, labels, title='', shadow=True)
    plt.tight_layout()
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()
