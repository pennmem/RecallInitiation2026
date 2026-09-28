import pandas as pd


def dedupe_replayed_sessions(
    raw_events,
    participant_col='prolific_pid',
    session_col='session',
    session_id_col='session_id',
    row_id_col='row_id',
):
    """Some participants complete an entire session twice under the same session
    number (e.g. a redo after a technical issue), leaving two distinct session_ids
    logged as the same (participant, session). Downstream code groups only by
    (participant, session), so without this the two independent runs get merged
    together - e.g. spellcheck_recalls_dl and lag_crp_sess/tcl_sess can then see
    duplicate/out-of-range serial positions from the second run's word list.

    Keeps the session_id with the most rows (ties broken by the larger row_id,
    i.e. the more recently logged run) and drops the other run(s) entirely.
    """
    raw_events = raw_events.copy()
    nunique = raw_events.groupby([participant_col, session_col])[session_id_col].transform('nunique')
    dup_rows = raw_events[nunique > 1]

    if dup_rows.empty:
        return raw_events

    drop_index = []
    for (pid, sess), group in dup_rows.groupby([participant_col, session_col]):
        stats = group.groupby(session_id_col).agg(
            n=(session_id_col, 'size'),
            last_row=(row_id_col, 'max'),
        ).sort_values(['n', 'last_row'], ascending=False)

        keep_id = stats.index[0]
        drop_ids = [sid for sid in stats.index if sid != keep_id]

        print(
            f"Participant {pid} session {sess}: found {len(stats)} session_ids "
            f"{list(stats.index)}; keeping {keep_id} ({stats.loc[keep_id, 'n']} rows), "
            f"dropping {drop_ids}."
        )
        drop_index.extend(group[group[session_id_col].isin(drop_ids)].index)

    return raw_events.drop(index=drop_index)


def filter_sessions_by_quality(events, raw_events):
    passing_sessions = []

    for (pid, sess), data in events.groupby(['prolific_pid', 'session']):
        ll = int(data['l_length'].dropna().iloc[0])

        word_evs = data[data['type'] == 'WORD']
        rec_evs = data[data['type'] == 'REC_WORD']

        zero_correct_trials = 0
        n_correct_unique = 0

        for lst, _ in word_evs.groupby('list'):
            sp = rec_evs[rec_evs['list'] == lst]['serial_position']
            correct_sps = set(sp[(sp >= 1) & (sp <= ll)].astype(int))

            zero_correct_trials += int(len(correct_sps) == 0)
            n_correct_unique += len(correct_sps)

        n_words = len(word_evs)
        recall_prop = n_correct_unique / n_words if n_words else 0

        took_notes = raw_events[
            (raw_events['prolific_pid'] == pid)
            & (raw_events['session'] == sess)
            & (raw_events['notes'].astype(str).str.lower() == 'true')
        ].shape[0] > 0

        if took_notes:
            print(f"Participant {pid} in session {sess} took notes.")
        
        if zero_correct_trials >= 2:
            print(f"Participant {pid} in session {sess} had {zero_correct_trials} trials with zero correct recalls.")

        if recall_prop > 0.95:
            print(f"Participant {pid} in session {sess} had a recall proportion of {recall_prop:.2f}, which is above the threshold.")

        passes_quality = (
            zero_correct_trials < 2
            and recall_prop <= 0.95
            and not took_notes
        )

        if passes_quality:
            passing_sessions.append({
                'prolific_pid': pid,
                'session': sess,
            })

    passing_sessions = pd.DataFrame(passing_sessions)

    return events.merge(
        passing_sessions,
        on=['prolific_pid', 'session'],
        how='inner',
    )
