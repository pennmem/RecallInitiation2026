"""Minimal PEERS (ltpFR) replication of the Exp 1 recall-initiation grouping.

Grouping rule identical to Exp 1 (R1G_MFR analyses.r1_groups_partition):
PFR computed on lists initiated with a correct recall; Primacy if
P(first recall in SP 1-4) >= 2/3, else Recency if P(SP 13-16) >= 2/3, else Other.
Usage: python peers_analysis.py data/peers/peers_recalls.csv OLDLIST OUTDIR [notask|all]
"""
import sys, os
import numpy as np, pandas as pd
from scipy import stats

f, oldf, outdir = sys.argv[1:4]
which = sys.argv[4] if len(sys.argv) > 4 else 'notask'
os.makedirs(outdir, exist_ok=True)
d = pd.read_csv(f, keep_default_na=False)
old = {f'LTP{int(x):03d}' for x in open(oldf).read().split() if x.strip().isdigit()}
d = d[~d.subject.isin(old)]                    # younger adults only
if which == 'notask':
    d = d[d.task == -1]
LL, W = 16, 4
key = ['subject', 'session', 'list']

# ---------- per-list measures ----------
def list_measures(g):
    g = g[g.op > 0].sort_values('op')
    sp = g.sp.to_numpy()
    first = sp[0] if len(sp) else -1
    correct = np.unique(sp[sp > 0])
    # temporal factor: percentile of actual |lag| among available transitions
    tf, seen = [], set()
    for a, b in zip(sp[:-1], sp[1:]):
        if a > 0: seen.add(a)
        if a <= 0 or b <= 0 or b in seen:
            if a > 0 and b > 0: pass
            continue
        avail = [x for x in range(1, LL + 1) if x not in seen]
        lags = np.abs(np.array(avail) - a); actual = abs(b - a)
        if len(avail) > 1:
            tf.append(1 - (np.sum(lags < actual) + 0.5 * (np.sum(lags == actual) - 1)) / (len(avail) - 1))
    return pd.Series(dict(first=first, nrec=len(correct) / LL,
                          r1_intr=float(first == 0) if len(sp) else np.nan,
                          intr=float(np.sum(sp == 0)),
                          tf=np.mean(tf) if tf else np.nan))

lm = d.groupby(key).apply(list_measures).reset_index()
lm.to_csv(os.path.join(outdir, f'peers_list_measures_{which}.csv'), index=False)

# ---------- grouping ----------
ok = lm[lm['first'] > 0]
pfr = ok.groupby('subject')['first'].agg(
    prim=lambda x: np.mean(x <= W), rec=lambda x: np.mean(x >= LL - W + 1), n='size')
pfr['group'] = np.where(pfr.prim >= 2/3, 'Primacy', np.where(pfr.rec >= 2/3, 'Recency', 'Other'))
subj = lm.groupby('subject')[['nrec', 'r1_intr', 'intr', 'tf']].mean().join(pfr)
subj = subj[subj.n >= 20]
subj.to_csv(os.path.join(outdir, f'peers_subject_{which}.csv'))

# SPC and PFR curves by group
rec = d[(d.op > 0) & (d.sp > 0)].drop_duplicates(key + ['sp'])
nlists = d.groupby(['subject'])[['session', 'list']].apply(lambda x: len(x.drop_duplicates()))
spc = (rec.groupby(['subject', 'sp']).size() / nlists.reindex(rec.groupby(['subject', 'sp']).size().index.get_level_values(0)).values).unstack(fill_value=0)
spc = spc.reindex(columns=range(1, LL + 1), fill_value=0).loc[subj.index]
pfrc = ok.groupby('subject')['first'].value_counts(normalize=True).unstack(fill_value=0).reindex(columns=range(1, LL + 1), fill_value=0).loc[subj.index]
spc.groupby(subj.group).mean().to_csv(os.path.join(outdir, f'peers_spc_{which}.csv'))
pfrc.groupby(subj.group).mean().to_csv(os.path.join(outdir, f'peers_pfr_{which}.csv'))

# ---------- stats ----------
out = []
P = lambda *a: out.append(' '.join(str(x) for x in a))
P(f'PEERS ltpFR, younger adults, lists={which}, LL=16, subjects with >=20 correct-initiated lists: N={len(subj)}')
P('lists per subject: median', subj.n.median(), 'range', subj.n.min(), '-', subj.n.max())
P('group counts:', subj.group.value_counts().to_dict(),
  'proportions:', subj.group.value_counts(normalize=True).round(3).to_dict())
P('mean P(first recall in SP1-4) =', round(ok['first'].le(W).mean(), 3),
  '; SP13-16 =', round(ok['first'].ge(LL - W + 1).mean(), 3))
def cohend(a, b):
    return (a.mean() - b.mean()) / np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)
for m, lab in [('nrec', 'MWR (prop recalled)'), ('r1_intr', 'R1 intrusion'), ('intr', 'intrusions/list'), ('tf', 'temporal factor')]:
    gs = {g: subj.loc[subj.group == g, m].dropna() for g in ['Primacy', 'Other', 'Recency']}
    gs = {k: v for k, v in gs.items() if len(v) > 1}
    P(f'\n{lab}: ' + '; '.join(f'{k} M={v.mean():.3f} SD={v.std():.3f} n={len(v)}' for k, v in gs.items()))
    if len(gs) >= 2:
        F, p = stats.f_oneway(*gs.values()); P(f'  one-way ANOVA F={F:.2f} p={p:.4f}')
        ks = list(gs)
        for i in range(len(ks)):
            for j in range(i + 1, len(ks)):
                a, b = gs[ks[i]], gs[ks[j]]
                t = stats.ttest_ind(a, b, equal_var=False)
                P(f'  {ks[i]} vs {ks[j]}: t={t.statistic:.2f} p={t.pvalue:.4f} d={cohend(a, b):.2f}')
txt = '\n'.join(out); print(txt)
open(os.path.join(outdir, f'peers_summary_{which}.txt'), 'w').write(txt)
