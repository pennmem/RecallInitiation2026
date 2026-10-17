"""Parse PEERS (ltpFR) raw .log/.par files into a long recall table.

Output: data/peers/peers_recalls.csv with one row per recall (and one row per
list with no recalls, op=0) containing subject, session, list, task, list
length, output position, word number, serial position (0 = intrusion), rt.
Resumable: per-subject CSVs cached in data/peers/subj/.
"""
import os, sys, glob, time
import pandas as pd

ROOT = sys.argv[1]            # .../PEERS.data/ltpFR
OUT = sys.argv[2]             # .../RecallInitiation2026/data/peers
TLIM = float(sys.argv[3]) if len(sys.argv) > 3 else 100
os.makedirs(os.path.join(OUT, 'subj'), exist_ok=True)
t0 = time.time()

def parse_session(sdir):
    pres = {}   # list -> (task, [wordnos]); later occurrences overwrite restarts
    cur = {}
    with open(os.path.join(sdir, 'session.log'), errors='ignore') as f:
        for line in f:
            c = line.rstrip('\n').split('\t')
            if len(c) > 6 and c[2] == 'FR_PRES':
                lst, wno, task = int(c[3]), int(c[5]), int(c[6])
                cur.setdefault(lst, []).append((task, wno))
            elif len(c) > 2 and c[2] == 'REC_START':
                for lst, items in cur.items():
                    pres[lst] = (items[0][0], [w for _, w in items])
                cur = {}
    rows = []
    for lst, (task, words) in sorted(pres.items()):
        p = os.path.join(sdir, f'{lst}.par')
        if not os.path.exists(p):
            continue
        recs = []
        with open(p, errors='ignore') as f:
            for line in f:
                c = line.strip().split('\t')
                if len(c) < 3:
                    continue
                try:
                    rt, wno = int(float(c[0])), int(c[1])
                except ValueError:
                    continue
                if wno == -1 or c[2].upper() in ('VV', '<>', '!'):
                    continue  # vocalizations / non-words
                recs.append((rt, wno, c[2].upper()))
        recs.sort()
        base = dict(session=int(os.path.basename(sdir).split('_')[1]), list=lst,
                    task=task, ll=len(words))
        if not recs:
            rows.append(dict(base, op=0, wordno=-1, word='', sp=-1, rt=-1))
        for op, (rt, wno, w) in enumerate(recs, 1):
            sp = words.index(wno) + 1 if wno in words else 0
            rows.append(dict(base, op=op, wordno=wno, word=w, sp=sp, rt=rt))
    return rows

subs = sorted(d for d in os.listdir(ROOT) if d.startswith('LTP'))
from concurrent.futures import ThreadPoolExecutor, as_completed

def do_subject(s):
    fo = os.path.join(OUT, 'subj', f'{s}.csv')
    if time.time() - t0 > TLIM:
        return False
    rows = []
    for sd in glob.glob(os.path.join(ROOT, s, 'session_*')):
        if os.path.exists(os.path.join(sd, 'session.log')):
            try:
                rows += parse_session(sd)
            except Exception as e:
                print('ERR', sd, e)
    df = pd.DataFrame(rows)
    df.insert(0, 'subject', s)
    df.to_csv(fo + '.tmp', index=False)
    os.replace(fo + '.tmp', fo)
    return True

todo = [s for s in subs if not os.path.exists(os.path.join(OUT, 'subj', f'{s}.csv'))]
with ThreadPoolExecutor(1) as ex:
    list(ex.map(do_subject, todo))
done = sum(os.path.exists(os.path.join(OUT, 'subj', f'{s}.csv')) for s in subs)
print(f'{done}/{len(subs)} subjects parsed')
if done == len(subs):
    allf = sorted(glob.glob(os.path.join(OUT, 'subj', '*.csv')))
    d = pd.concat([pd.read_csv(f) for f in allf if os.path.getsize(f) > 5])
    d.to_csv(os.path.join(OUT, 'peers_recalls.csv'), index=False)
    print('combined', d.shape)
