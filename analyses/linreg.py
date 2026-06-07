import pandas as pd
import numpy as np
import scipy
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# linear regression for primacy and recency effects
def prim_rec_lr(row):
    # primacy effect
    prim_spc = row[['sp_1', 'sp_2', 'sp_3', 'sp_4', 'sp_5']].astype(float)
    prim_slope, prim_intercept, _, _, _ = scipy.stats.linregress(np.arange(1, 6), prim_spc)
    
    # recency effect
    rec_spc = row[['sp_16', 'sp_17','sp_18', 'sp_19', 'sp_20']].astype(float)
    rec_slope, rec_intercept, _, _, _ = scipy.stats.linregress(np.arange(1, 6), rec_spc)
    
    return pd.Series({
        'prolific_pid': row.prolific_pid,
        'session': row.session,
        'initiation_condition': row.initiation_condition,
        'prim_slope': prim_slope,
        'prim_intercept': prim_intercept,
        'rec_slope': rec_slope,
        'rec_intercept': rec_intercept
    })


def plot_linreg(spc_prim_rec_lr_all, path=None):
    # reorganize dataframe
    dfm = pd.melt(
        spc_prim_rec_lr_all,
        id_vars=['prolific_pid', 'initiation_condition'],
        value_vars=['prim_slope', 'rec_slope'],
        var_name='sp_region',
        value_name='slope'
    )

    _, ax = plt.subplots(figsize=(5, 3))

    cond_order = ['primacy', 'recency']
    cond_labels = ['Primacy', 'Recency']

    sns.stripplot(
        dfm,
        x='initiation_condition',
        y='slope',
        order=cond_order,
        hue='sp_region',
        hue_order=['prim_slope', 'rec_slope'],
        dodge=True,
        palette=['palevioletred', 'steelblue'],
        alpha=0.3,
        ax=ax,
        legend=False,
        jitter=True
    )

    sns.barplot(
        dfm,
        x='initiation_condition',
        y='slope',
        order=cond_order,
        hue='sp_region',
        hue_order=['prim_slope', 'rec_slope'],
        dodge=True,
        palette=['palevioletred', 'steelblue'],
        errorbar=('se', 1.96),
        alpha=0.6,
        ax=ax,
        legend=True
    )

    ax.set(
        xlabel='Initiation Condition',
        ylabel='Slope',
        xticklabels=cond_labels,
        yticks=np.linspace(-0.3, 0.3, 7)
    )

    ax.spines[['right', 'top']].set_visible(False)

    labels = ['Primacy Effect', 'Recency Effect']
    handles, _ = ax.get_legend_handles_labels()
    ax.legend(
        handles,
        labels,
        shadow=True,
        ncols=2,
        loc='upper right',
        bbox_to_anchor=(1, 1.05)
    )
    
    if path is not None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(path, bbox_inches="tight")
    plt.show()
