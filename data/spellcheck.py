import numpy as np
import pandas as pd


def clean_word(word):
    if pd.isna(word):
        return ''
    word = str(word).strip()
    if word.lower() == 'null':
        return ''
    return word


def assign_serial_position(recall, presented_words):
    recall = clean_word(recall).lower()

    for i, word in enumerate(presented_words):
        if recall == clean_word(word).lower():
            return i + 1

    return 88


def damerau_levenshtein_distance(a, b):
    a = clean_word(a).lower()
    b = clean_word(b).lower()

    d = {}
    len_a = len(a)
    len_b = len(b)

    for i in range(-1, len_a + 1):
        d[(i, -1)] = i + 1
    for j in range(-1, len_b + 1):
        d[(-1, j)] = j + 1

    for i in range(len_a):
        for j in range(len_b):
            cost = 0 if a[i] == b[j] else 1
            d[(i, j)] = min(
                d[(i - 1, j)] + 1,
                d[(i, j - 1)] + 1,
                d[(i - 1, j - 1)] + cost,
            )

            if (
                i > 0
                and j > 0
                and a[i] == b[j - 1]
                and a[i - 1] == b[j]
            ):
                d[(i, j)] = min(d[(i, j)], d[(i - 2, j - 2)] + 1)

    return d[(len_a - 1, len_b - 1)]


def correct_recall_spelling(recall, prior_words, current_words):
    recall = clean_word(recall)

    if recall == '':
        return recall, False

    prior_words = np.array([clean_word(w) for w in prior_words])
    current_words = np.array([clean_word(w) for w in current_words])

    # If it exactly matches a prior-list word, leave it as a PLI.
    if recall.lower() in [w.lower() for w in prior_words]:
        return recall, False

    # Most recent presented words first.
    all_presented = np.concatenate([prior_words, current_words])[::-1]

    distances = np.array([
        damerau_levenshtein_distance(recall, word)
        for word in all_presented
    ])

    close = np.where(distances <= 1)[0]

    if len(close):
        corrected = all_presented[close[0]]
        return corrected, corrected.lower() != recall.lower()

    return recall, False


def spellcheck_recalls_dl(
    events,
    participant_col='prolific_pid',
    session_col='session',
    list_col='list',
    word_col='word',
    recall_col='rec_word',
    serial_position_col='serial_position',
):
    events = events.copy()
    changed = 0

    group_cols = [participant_col, session_col]

    for _, session_data in events.groupby(group_cols):
        for idx, row in session_data.iterrows():
            if row['type'] != 'REC_WORD':
                continue

            if row[serial_position_col] != 88:
                continue

            prior_words = session_data[
                (session_data['type'] == 'WORD')
                & (session_data[list_col] < row[list_col])
            ][word_col].to_numpy()

            current_words = session_data[
                (session_data['type'] == 'WORD')
                & (session_data[list_col] == row[list_col])
            ][word_col].to_numpy()

            corrected, did_change = correct_recall_spelling(
                row[recall_col],
                prior_words,
                current_words
            )

            if did_change:
                events.at[idx, recall_col] = corrected
                events.at[idx, serial_position_col] = assign_serial_position(
                    corrected,
                    current_words
                )
                changed += 1

    print(f'Damerau-Levenshtein spellcheck corrected {changed} recall(s).')
    return events
