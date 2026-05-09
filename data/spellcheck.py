import numpy as np
import pandas as pd
from rapidfuzz.distance import DamerauLevenshtein


def clean_word(word):
    if pd.isna(word):
        return ''
    word = str(word).strip().lower()
    if word.lower() == 'null':
        return ''
    return word


def assign_serial_position(recall, presented_words):
    recall = clean_word(recall).lower()

    for i, word in enumerate(presented_words):
        if recall == clean_word(word).lower():
            return i + 1

    return 88

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
        DamerauLevenshtein.distance(recall, word)
        for word in all_presented
    ])

    close = np.where(distances <= 1)[0]

    if len(close): # at least one word is within a distance of 1, so we can correct it
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

    group_cols = [participant_col, session_col] # one row per participant-session

    for _, session_data in events.groupby(group_cols): # build mini dataframe for each participant-session
        for idx, row in session_data.iterrows():
            if row['type'] != 'REC_WORD':
                continue

            if row[serial_position_col] != 88: # skip recalls that already have a valid serial position (i.e., not 88)
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
