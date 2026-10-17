"""PEERS (ltpFR) within-participant comparison of lists initiated with a primacy vs. a recency item.

Mirrors the Experiment 1 Other-group analysis: for each younger-adult participant, lists whose
first recall is a primacy item (SP 1-4) are compared with lists whose first recall is a recency
item (SP 13-16), using paired t-tests across participants with at least MIN_LISTS lists of each type.

Lists analyzed (see memory.psych.upenn.edu/PEERS; sessions are 0-indexed here):
  PEERS Experiment 1 = sessions 0-6 (all participants), no-task lists
  PEERS Experiment 3 = sessions 16-19 of LTP210 and later (procedure identical to Experiment 1), no-task lists
Excluded: Experiment 2 (distractor task, no no-task lists) and sessions 14-19 of LTP063-LTP209
(externalized free recall, where participants also reported salient non-list words).

Usage: python peers_within.py data/peers/peers_recalls.csv OLDLIST OUTDIR
  OLDLIST = PEERS_older_adult_subject_list.txt from the ltpFR archive
"""
import sys, os
import numpy as np, pandas as pd
from scipy import stats

f, oldf, outdir = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
LL, W, MIN_LISTS = 16, 4, 5

d = pd.read_csv(f, keep_default_na=False)
old = {f'LTP{int(x):03d}' for x in open(oldf).read().split() if x.strip().isdigit()}
d = d[~d.subject.isin(old) & (d.task == -1)]           # younger adults, no-task lists
subj_num = d.subject.str[3:].astype(int)
d = d[(d.session <= 6) | ((subj_num >= 210) & (d.session >= 16))]

# ---------- per-list measures ----------
def list_measures(g):
    g = g[g.op > 0].sort_values('op')
    sp = g.sp.to_numpy(); rt = g.rt.to_numpy()
    if len(sp) == 0:
        return None
    seen, clean = set(), []
    for x in sp:                                   # intrusions (0) and repetitions break transitions
        if 1 <= x <= LL and x not in seen:
            seen.add(x); clean.append(x)
        else:
            clean.append(-1)
    tf, p1, n1, p1_av, n1_av, left = [], 0, 0, 0, 0, set(range(1, LL + 1))
    for a, b in zip(clean[:-1], clean[1:]):
        if a > 0: left.discard(a)
        if a <= 0 or b <= 0: continue
        avail = sorted(left)
        lags = np.abs(np.array(avail) - a); actual = abs(b - a)
        if len(avail) > 1:                         # temporal factor: percentile rank of the lag actually made
            tf.append(1 - (np.sum(lags < actual) + 0.5 * (np.sum(lags == actual) - 1)) / (len(avail) - 1))
        if a + 1 in left: p1_av += 1; p1 += (b == a + 1)
        if a - 1 in left: n1_av += 1; n1 += (b == a - 1)
    return dict(first=sp[0], rt1=rt[0], nrec=len(seen), later_intr=int(np.sum(sp[1:] == 0)),
                tf=np.mean(tf) if tf else np.nan, p1=p1, n1=n1, p1_av=p1_av, n1_av=n1_av)

rows = []
for (s, sess, lst), g in d.groupby(['subject', 'session', 'list']):
    r = list_measures(g)
    if r: rows.append(dict(subject=s, session=sess, list=lst, **r))
L = pd.DataFrame(rows)
L['start'] = np.where(L['first'].between(1, W), 'prim', np.where(L['first'] >= LL - W + 1, 'rec', np.where(L['first'] == 0, 'intr', 'mid')))

# ---------- within-participant comparison ----------
cnt = L[L.start.isin(['prim', 'rec'])].groupby(['subject', 'start']).size().unstack(fill_value=0)
elig = cnt[(cnt['prim'] >= MIN_LISTS) & (cnt['rec'] >= MIN_LISTS)].index
X = L[L.subject.isin(elig) & L.start.isin(['prim', 'rec'])]
agg = X.groupby(['subject', 'start']).agg(n_lists=('rt1', 'size'), rt1=('rt1', 'mean'), nrec=('nrec', 'mean'), later_intr=('later_intr', 'mean'),
                                          tf=('tf', 'mean'), p1=('p1', 'sum'), n1=('n1', 'sum'), p1_av=('p1_av', 'sum'), n1_av=('n1_av', 'sum')).reset_index()
agg['crp_p1'] = agg.p1 / agg.p1_av.replace(0, np.nan)
agg['crp_n1'] = agg.n1 / agg.n1_av.replace(0, np.nan)
agg['fwd_asym'] = agg.crp_p1 - agg.crp_n1
agg.drop(columns=['p1', 'n1', 'p1_av', 'n1_av']).to_csv(os.path.join(outdir, 'peers_within_subject.csv'), index=False)

# ---------- stats ----------
out = []
P = lambda *a: out.append(' '.join(str(x) for x in a))
P(f'PEERS ltpFR Experiments 1 and 3, younger adults, no-task lists, LL={LL}: {L.subject.nunique()} participants, {len(L)} lists')
P('first recall:', L.start.value_counts(normalize=True).round(3).to_dict())
ok = L[L.start != 'intr'].groupby('subject').start.agg(prim=lambda x: np.mean(x == 'prim'), rec=lambda x: np.mean(x == 'rec'))
grp = np.where(ok.prim >= 2/3, 'Primacy', np.where(ok.rec >= 2/3, 'Recency', 'Other'))
P('Experiment 1 grouping rule (>= 2/3 of correctly initiated lists):', pd.Series(grp).value_counts().to_dict())
P(f'participants with >= {MIN_LISTS} primacy-initiated and >= {MIN_LISTS} recency-initiated lists: {len(elig)}\n')
w = agg.pivot(index='subject', columns='start')
for m, lab in [('rt1', 'first-recall RT (ms)'), ('nrec', 'words recalled'), ('later_intr', 'later intrusions/list'), ('tf', 'temporal factor'),
               ('crp_p1', 'lag +1 CRP'), ('crp_n1', 'lag -1 CRP'), ('fwd_asym', 'forward asymmetry')]:
    a, b = w[(m, 'prim')], w[(m, 'rec')]; both = a.notna() & b.notna()
    t = stats.ttest_rel(a[both], b[both]); diff = (a - b)[both]
    P(f'{lab:24s} primacy {a[both].mean():9.3f} | recency {b[both].mean():9.3f} | t({both.sum()-1}) = {t.statistic:6.2f}, p = {t.pvalue:.2g}, dz = {diff.mean()/diff.std():.2f}')
txt = '\n'.join(out); print(txt)
open(os.path.join(outdir, 'peers_within_summary.txt'), 'w').write(txt)
