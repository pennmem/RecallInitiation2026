"""Audit semantic clustering on the notebook's already filtered event data.

The independent calculation uses recalled word strings and counts similarities
below/tied with the actual transition, rather than using PyBeh's rank routine.
It never modifies the input events or the notebook's calculated scores.
"""

from collections import Counter

import numpy as np
import pandas as pd
from pybeh.dist_fact import dist_fact


def audit_scl(data, wordpool, similarities, current_module, legacy_sess, existing_scores):
    pool = [str(word).strip().upper() for word in wordpool]
    word_indices = {word: i for i, word in enumerate(pool)}
    counts = Counter({
        'lists': 0, 'presented_words_missing_from_pool': 0,
        'valid_recall_rows': 0, 'eligible_transitions': 0,
        'recall_word_serial_position_mismatches': 0,
        'presented_words_marked_invalid': 0,
    })
    lengths = Counter()
    session_results = []
    mismatch_examples = []
    order_checks = {
        col: {'rows_with_values': 0, 'decreases_within_lists': 0}
        for col in ('recall_position', 'trial_index', 'time_elapsed', 'row_id')
        if col in data
    }

    for session_index, ((pid, sess), session) in enumerate(data.groupby(['prolific_pid', 'session'])):
        list_scores = []
        transition_scores = []
        presented_rows = []
        recalled_rows = []
        rec_events = session[session.type == 'REC_WORD']
        for list_num, word_events in session[session.type == 'WORD'].groupby('list', sort=False):
            words = word_events.sort_values('serial_position').word.str.strip().str.upper().tolist()
            presented_set = set(words)
            lengths[len(words)] += 1
            counts['lists'] += 1
            counts['presented_words_missing_from_pool'] += sum(word not in word_indices for word in words)
            rows = rec_events[rec_events['list'] == list_num]
            for order_col in ('recall_position', 'trial_index', 'time_elapsed', 'row_id'):
                if order_col in rows:
                    values = pd.to_numeric(rows[order_col], errors='coerce').dropna().to_numpy()
                    order_checks[order_col]['rows_with_values'] += len(values)
                    order_checks[order_col]['decreases_within_lists'] += int(np.count_nonzero(np.diff(values) < 0))
                    if len(values) >= 2 and np.any(np.diff(values) < 0):
                        counts[f'nonmonotonic_{order_col}_lists'] += 1
            rows = rows[rows.serial_position != 99]
            recalled = rows.rec_word.fillna('').astype(str).str.strip().str.upper().tolist()
            positions = rows.serial_position.tolist()
            for word, sp in zip(recalled, positions):
                if pd.notna(sp) and 1 <= sp <= len(words):
                    counts['valid_recall_rows'] += 1
                    if word != words[int(sp) - 1]:
                        counts['recall_word_serial_position_mismatches'] += 1
                        if len(mismatch_examples) < 5:
                            mismatch_examples.append({'rec_word': word, 'mapped_word': words[int(sp) - 1]})
                elif word in presented_set:
                    counts['presented_words_marked_invalid'] += 1

            seen = set()
            clean = []
            for word in recalled:
                clean.append(word in presented_set and word not in seen)
                seen.add(word)
            seen = set()
            scores = []
            for j, word in enumerate(recalled[:-1]):
                seen.add(word)
                if not (clean[j] and clean[j + 1]):
                    continue
                alternatives = presented_set - seen
                if len(alternatives) < 2:
                    continue
                current = word_indices[word]
                actual = similarities[current, word_indices[recalled[j + 1]]]
                possible = similarities[current, [word_indices[w] for w in alternatives]]
                score = (np.count_nonzero(possible < actual)
                         + (np.count_nonzero(possible == actual) - 1) / 2) / (len(possible) - 1)
                scores.append(score)
            if scores:
                list_scores.append(float(np.mean(scores)))
                transition_scores.extend(scores)
            counts['eligible_transitions'] += len(scores)
            presented_rows.append([word_indices[word] + 1 for word in words])
            recalled_rows.append([word_indices[word] + 1 if word in presented_set else -1 for word in recalled])

        # This direct library call pools transitions across lists within a session.
        # The production wrapper instead gives each scored list equal weight.
        if len({len(row) for row in presented_rows}) != 1:
            raise ValueError('Direct pooled audit requires equal list lengths within a session.')
        rec_itemnos = np.zeros((len(recalled_rows), max(2, max(map(len, recalled_rows)))), dtype=int)
        for i, row in enumerate(recalled_rows):
            rec_itemnos[i, :len(row)] = row
        direct_pooled = dist_fact(
            rec_itemnos=rec_itemnos, pres_itemnos=presented_rows,
            subjects=np.zeros(len(presented_rows), dtype=int),
            dist_mat=similarities, is_similarity=True,
        )[0]
        session_results.append({
            'prolific_pid': pid, 'session': sess,
            'initiation_condition': session.initiation_condition.dropna().iloc[0],
            'current_pybeh_equal_lists': current_module.scl_sess(session, wordpool, similarities),
            'independent_equal_lists': float(np.mean(list_scores)) if list_scores else np.nan,
            'direct_pybeh_pooled_transitions': direct_pooled,
            'independent_pooled_transitions': float(np.mean(transition_scores)) if transition_scores else np.nan,
            'original_custom_code': legacy_sess(session, wordpool, similarities),
        })
        if (session_index + 1) % 50 == 0:
            print(f'Audited {session_index + 1} sessions', flush=True)

    results = pd.DataFrame(session_results)
    compared = results.merge(existing_scores[['prolific_pid', 'session', 'scl']], on=['prolific_pid', 'session'], validate='one_to_one')
    methods = [column for column in results if column not in ['prolific_pid', 'session', 'initiation_condition']]
    participant_means = results.groupby(['prolific_pid', 'initiation_condition'])[methods].mean().reset_index()
    report = {
        'participants': int(data.prolific_pid.nunique()),
        'sessions': len(results),
        'counts': dict(counts), 'list_lengths': dict(lengths),
        'recall_order_checks': order_checks,
        'mismatch_examples': mismatch_examples,
        'maximum_session_difference_current_vs_independent': float((results.current_pybeh_equal_lists - results.independent_equal_lists).abs().max()),
        'maximum_session_difference_pooled_pybeh_vs_independent': float((results.direct_pybeh_pooled_transitions - results.independent_pooled_transitions).abs().max()),
        'maximum_session_difference_current_vs_notebook': float((compared.current_pybeh_equal_lists - compared.scl).abs().max()),
        'condition_means_after_averaging_sessions_per_participant': participant_means.groupby('initiation_condition')[methods].mean().to_dict(),
        'wordpool_size': len(pool), 'unique_wordpool_size': len(set(pool)),
        'matrix_shape': similarities.shape,
        'matrix_maximum_asymmetry': float(np.abs(similarities - similarities.T).max()),
        'semantic_neighbors': {
            word: [pool[index] for index in np.argsort(similarities[word_indices[word]])[-4:-1][::-1]]
            for word in ['ACTOR', 'APPLE', 'CAT', 'DOG'] if word in word_indices
        },
    }
    return results, report
