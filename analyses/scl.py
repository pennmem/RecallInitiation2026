### Analysis code
# imports
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from pybeh.dist_fact import dist_fact

COND_LABELS = {"start": "Start", "end": "End", "free": "Free"}
COND_PALETTE = {"start": "orange", "end": "purple", "free": "darkgray"}

def scl_sess(data, wordpool, w2v_scores):
    """Average PyBeh semantic clustering scores equally across scored lists.

    PyBeh receives 1-based wordpool IDs and the word2vec similarity matrix.
    Recall order is preserved: intrusions and repetitions interrupt transitions.
    Lists without eligible transitions are excluded; an unscorable session is NaN.
    """
    word_to_itemno = {str(word).upper(): i + 1 for i, word in enumerate(wordpool)}
    similarities = np.asarray(w2v_scores)
    if similarities.shape != (len(wordpool), len(wordpool)):
        raise ValueError("w2v_scores must be square and aligned with wordpool.")

    word_evs = data[data['type'] == 'WORD']
    rec_evs = data[data['type'] == 'REC_WORD']
    trials_by_length = {}
    for list_num, presented in word_evs.groupby('list', sort=False):
        presented = presented.sort_values('serial_position')
        if not np.array_equal(presented.serial_position.to_numpy(), np.arange(1, len(presented) + 1)):
            raise ValueError(f"Presentation serial positions must run from 1 to list length on list {list_num}.")
        try:
            pres_itemnos = [word_to_itemno[word.upper()] for word in presented.word]
        except KeyError as exc:
            raise ValueError(f"Presented word {exc.args[0]!r} is missing from wordpool.") from exc

        rec_itemnos = []
        for sp in rec_evs.loc[rec_evs['list'] == list_num, 'serial_position']:
            if pd.isna(sp):
                raise ValueError(f"Missing recall serial position on list {list_num}.")
            if sp == 99:  # null recall
                continue
            if sp in (77, 88):  # premarked repetition or intrusion; keep the interruption
                rec_itemnos.append(-1)
            elif 1 <= sp <= len(pres_itemnos) and sp == int(sp):
                # Repeated serial positions map to the same ID; PyBeh detects repetitions.
                rec_itemnos.append(pres_itemnos[int(sp) - 1])
            else:
                raise ValueError(f"Invalid recall serial position {sp!r} on list {list_num}.")

        if len(rec_itemnos) >= 2:
            trials_by_length.setdefault(len(pres_itemnos), []).append((pres_itemnos, rec_itemnos))

    list_scores = []
    # Batch lists with equal presentation lengths so only recall rows need padding.
    # Padding presentations would introduce nonexistent alternative words in PyBeh.
    for trials in trials_by_length.values():
        pres_itemnos = np.array([pres for pres, _ in trials], dtype=int)
        rec_itemnos = np.zeros((len(trials), max(len(rec) for _, rec in trials)), dtype=int)
        for row, (_, recalls) in enumerate(trials):
            rec_itemnos[row, :len(recalls)] = recalls

        scores = dist_fact(
            rec_itemnos=rec_itemnos,
            pres_itemnos=pres_itemnos,
            subjects=np.arange(len(trials)),  # one score per list, preserving equal list weights
            dist_mat=similarities,
            is_similarity=True,
            skip_first_n=0,
        )
        list_scores.extend(scores[~np.isnan(scores)])

    return np.mean(list_scores) if list_scores else np.nan

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
def plot_scl(scl_data, path=None):
    # average across sessions so each participant contributes one point
    scl_data_bsa = scl_data.groupby(
        ['prolific_pid', 'initiation_condition'], as_index=False
    )['scl'].mean()

    fig, ax = plt.subplots(figsize=(5,3))
    sns.barplot(scl_data_bsa, x='initiation_condition', order=['start', 'end', 'free'], y='scl', hue='initiation_condition', hue_order=['start', 'end', 'free'], 
                palette=[COND_PALETTE["start"], COND_PALETTE["end"], COND_PALETTE["free"]], alpha=0.7, errorbar=('se', 1.96), gap=0.1, legend=False)
    ax.set(xlabel="Initiation Condition", ylabel="Semantic Clustering Score", ylim=(0.4,0.6))
    ax.set_xticks([0,1,2], labels=["Start", "End", "Free"])
    ax.axhline(0.5, color="black", linestyle="dotted", linewidth=1)  # chance
    ax.spines[["right", "top"]].set_visible(False)
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()
