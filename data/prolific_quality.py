import pandas as pd


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
