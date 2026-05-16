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

# intrusion rates (ELI, PLI)
# toggle = True, only lists initiated with correct recall
# omit first four lists for PLIs
def intrusion_rates_sess(data, toggle=True):
    tot_eli = 0; tot_pli = 0      # intrusion counters
    subtract = 4        # lists to not include for PLI rates
    
    word_evs = data[data['type'] == 'WORD']
    rec_evs = data[data['type'] == 'REC_WORD']
    wl_dict = dict(zip([w.upper() for w in word_evs.word], word_evs.list))      # dictionary mapping words to list
    lists = data.list.dropna().unique()

    for i in lists:
        list_rec_evs = rec_evs[rec_evs['list'] == i]
        list_rec_evs = list_rec_evs[list_rec_evs['serial_position'] != 99]
        sp = list_rec_evs.serial_position.to_numpy()                     # current list serial positions
        r = list_rec_evs.rec_word.tolist()                               # current list recalls
        
        sp = mark_repetitions(sp)         # change repetition serial position to 77
        
        # only lists initiated with correct recall
        if toggle and (len(sp) == 0 or sp[0] == 88):
            continue
        
        for j in range(len(sp)):
            if sp[j] == 88:                             # intrusion
                if r[j].upper() in wl_dict.keys():      # presented word
                    l = wl_dict.get(r[j].upper())       # list of word presentation
                    if l < i and i >= subtract:         # PLI
                        tot_pli += 1
                    elif l > i:                         # ELI (presented on future list)
                        tot_eli += 1
                else:
                    tot_eli += 1                        # ELI (not presented)
                    
    eli_rate = tot_eli / len(lists)
    pli_rate = tot_pli / (len(lists) - subtract)
    
    return eli_rate, pli_rate

def intrusion_rates(df):
    intr_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        eli, pli = intrusion_rates_sess(data)
        intr_data.append({
            "prolific_pid": pid,
            "session": sess,
            "initiation_condition": cond,
            "eli": eli,
            "pli": pli,
        })
    intr_data = pd.DataFrame(intr_data)
    return intr_data

def intrusion_plots(data, path=None, figsize=(5, 3)):
    plot_data = pd.melt(
        data,
        id_vars=["prolific_pid", "session", "initiation_condition"],
        value_vars=["pli", "eli"],
        var_name="intrusion_type",
        value_name="rate",
    )
    plot_data["intrusion_type"] = plot_data["intrusion_type"].str.upper()
    plt.figure(figsize=figsize)
    ax = sns.barplot(
        data=plot_data,
        x="initiation_condition",
        y="rate",
        hue="intrusion_type",
        order=COND_ORDER,
        hue_order=["PLI", "ELI"],
        palette=['mediumseagreen', 'cadetblue'],
        legend=True,
    )
    plt.xlabel("Initiation Condition")
    plt.ylabel("PLI/ELIs per Trial")
    plt.xticks(ticks=[0, 1], labels=[COND_LABELS["primacy"], COND_LABELS["recency"]])
    sns.despine()
    ax.legend(title="")
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()

