### Analysis code
# imports
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

# semantic clustering score
# semantic percentile rank
def percentile_rank_S(actual, possible):
    if len(possible) < 2:
        return None

    # sort possible transitions from lowest to highest similarity
    possible.sort()

    # get indices of possible transitions with same similarity as actual transition
    matches = np.where(possible == actual)[0]
    if len(matches) > 0:
        # get number of possible transition that were less similar than the actual transition
        rank = np.mean(matches)
        # convert rank to proportion of possible transitions that were less similar than the actual transition
        ptile_rank = rank / (len(possible) - 1.0)
    else:
        ptile_rank = None

    return ptile_rank

# semantic clustering score single session
def scl_sess(data, wordpool, w2v_scores):
    scl = []                 # semantic clustering scores for eacl list
    word_evs = data[data['type'] == 'WORD']; rec_evs = data[data['type'] == 'REC_WORD']
    
    for i in data.list.unique():
        sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()         # current list serial positions
        sp = sp[sp != 99]                                                     # remove last null recall
        w = word_evs[word_evs['list'] == i].word.tolist()                     # current list words
        r = rec_evs[rec_evs['list'] == i].rec_word.tolist()                   # current list recalls
        r = r[:len(sp)]                                                       # remove last null recall

        sp = mark_repetitions(sp)                     # repetitions = serial position 77
        words_left = [x.upper() for x in w]           # array with remaining words, subtract from
        scl_list = []                                 # semantic clustering scores for each recall
        for j in range(len(sp) - 1):
            if sp[j] != 88 and sp[j] != 77:
                curr_word = w[int(sp[j]) - 1].upper()
                words_left.remove(curr_word)

                if sp[j+1] != 88 and sp[j+1] != 77:
                    next_word = w[int(sp[j+1]) - 1].upper()

                    if curr_word in wordpool and next_word in wordpool:
                        possList = []
                        wv1 = wordpool.index(curr_word)
                        wv2 = wordpool.index(next_word)
                        ss = w2v_scores[wv1][wv2]

                        for l in range(len(words_left)):
                            wv3 = wordpool.index(words_left[l].upper())
                            poss_ss = w2v_scores[wv1][wv3]
                            possList.append(poss_ss)

                            ptile_rank = percentile_rank_S(ss, possList)
                            if ptile_rank is not None:
                                scl_list.append(ptile_rank)
                                
        # take avearge of scores on list   ### weight each list or each transition equally?
        if len(scl_list) > 0:
            scl.append(np.mean(scl_list))
            
    # return average of list scores
    return np.mean(scl)

def scl(df, wordpool, w2v_scores):
    scl_data = []
    for (pid, sess), data in df.groupby(['prolific_pid', 'session']):
        cond = data['initiation_condition'].dropna().iloc[0]
        scl_ = scl_sess(data, wordpool, w2v_scores)
        scl_data.append((pid, sess, cond, scl_))
    # store results in dataframe
    scl_data = pd.DataFrame(scl_data, columns=['prolific_pid', 'session', 'initiation_condition', 'scl'])
    return scl_data

# semantic clustering score
def plot_scl(scl_data_bsa, path=None):
    fig, ax = plt.subplots(figsize=(5,3))
    sns.barplot(scl_data_bsa, x='initiation_condition', order=['primacy', 'recency'], y='scl', hue='initiation_condition', hue_order=['primacy', 'recency'], 
                palette=[COND_PALETTE["primacy"], COND_PALETTE["recency"]], alpha=0.7, errorbar=('se', 1.96), gap=0.1, legend=False)
    ax.set(xlabel="Initiation Condition", ylabel="Semantic Clustering Score", ylim=(0.4,0.6))
    ax.set_xticks([0,1], labels=["Primacy", "Recency"])
    ax.spines[["right", "top"]].set_visible(False)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()