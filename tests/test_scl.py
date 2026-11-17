import unittest

import numpy as np
import pandas as pd

from analyses.scl import scl, scl_sess


def list_events(recalls, list_num=1, words=('APPLE', 'BANANA', 'CHERRY', 'DATE')):
    rows = [
        dict(type='WORD', list=list_num, serial_position=i, word=word)
        for i, word in enumerate(words, start=1)
    ]
    rows.extend(
        dict(type='REC_WORD', list=list_num, serial_position=sp)
        for sp in recalls
    )
    return pd.DataFrame(rows)


class SemanticClusteringTests(unittest.TestCase):
    def setUp(self):
        # Unpresented first word verifies that serial positions become wordpool IDs.
        self.wordpool = ['OTHER', 'APPLE', 'BANANA', 'CHERRY', 'DATE']
        self.similarities = np.array([
            [1.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.5, 0.2, 0.8],
            [0.0, 0.5, 1.0, 0.9, 0.1],
            [0.0, 0.2, 0.9, 1.0, 0.4],
            [0.0, 0.8, 0.1, 0.4, 1.0],
        ])

    def score(self, events):
        return scl_sess(events, self.wordpool, self.similarities)

    def test_transition_rank_uses_all_remaining_words_once(self):
        self.assertAlmostEqual(self.score(list_events([1, 2])), 0.5)

    def test_forced_final_transition_is_excluded(self):
        # First ranks: 0.5, 1.0. Last transition has only one available word.
        self.assertAlmostEqual(self.score(list_events([1, 2, 3, 4])), 0.75)

    def test_lists_have_equal_weight_despite_different_transition_counts(self):
        events = pd.concat([list_events([1, 2]), list_events([1, 4, 3], 2)])
        # List means are 0.5 and 1.0; pooling transitions would give 5/6.
        self.assertAlmostEqual(self.score(events), 0.75)

    def test_invalid_recalls_interrupt_transitions(self):
        for interruption in (1, 77, 88):
            with self.subTest(interruption=interruption):
                self.assertAlmostEqual(self.score(list_events([1, interruption, 2, 3])), 1.0)
                self.assertTrue(np.isnan(self.score(list_events([1, interruption, 2]))))

    def test_ties_use_mean_rank(self):
        self.similarities[1, 3] = 0.5
        self.assertAlmostEqual(self.score(list_events([1, 2])), 0.25)

    def test_nulls_and_unscorable_lists(self):
        events = pd.concat([
            list_events([1, 2, 99]),
            list_events([99], 2),
            list_events([1, 88, 2], 3),
        ])
        self.assertAlmostEqual(self.score(events), 0.5)
        for recalls in ([], [99], [1], [1, 88, 2]):
            with self.subTest(recalls=recalls):
                self.assertTrue(np.isnan(self.score(list_events(recalls))))
        self.assertTrue(np.isnan(self.score(events.iloc[:0])))

    def test_different_list_lengths_do_not_create_padding_alternatives(self):
        events = pd.concat([
            list_events([1, 2]),
            list_events([1, 2], 2, words=('APPLE', 'BANANA', 'CHERRY')),
            list_events([1, 2], 3, words=('APPLE', 'BANANA')),
        ])
        self.assertAlmostEqual(self.score(events), 0.75)

    def test_presentation_serial_positions_determine_word_order(self):
        events = list_events([1, 2])
        events = pd.concat([events[events.type == 'WORD'].iloc[::-1], events[events.type == 'REC_WORD']])
        self.assertAlmostEqual(self.score(events), 0.5)

    def test_missing_words_and_misaligned_similarity_matrix_raise(self):
        with self.assertRaisesRegex(ValueError, 'missing from wordpool'):
            self.score(list_events([1, 2], words=('UNKNOWN', 'BANANA', 'CHERRY')))
        with self.assertRaisesRegex(ValueError, 'aligned with wordpool'):
            scl_sess(list_events([1, 2]), self.wordpool, self.similarities[:-1])

    def test_invalid_serial_positions_raise_instead_of_mapping_to_wrong_words(self):
        for sp in (0, 5, 1.5, np.nan, pd.NA):
            with self.subTest(sp=sp), self.assertRaises(ValueError):
                self.score(list_events([1, sp]))
        events = list_events([1, 2])
        events.loc[events.type == 'WORD', 'serial_position'] = [1, 2, 4, 5]
        with self.assertRaisesRegex(ValueError, 'Presentation serial positions'):
            self.score(events)

    def test_public_api_keeps_session_groups_and_does_not_mutate_input(self):
        events = pd.concat([
            list_events([1, 2]).assign(prolific_pid='p1', session=1, initiation_condition='start'),
            list_events([1, 4]).assign(prolific_pid='p1', session=2, initiation_condition='end'),
        ], ignore_index=True)
        original = events.copy(deep=True)
        result = scl(events, self.wordpool, self.similarities)
        self.assertEqual(result.columns.tolist(), ['prolific_pid', 'session', 'initiation_condition', 'scl'])
        self.assertEqual(result['initiation_condition'].tolist(), ['start', 'end'])
        np.testing.assert_allclose(result['scl'], [0.5, 1.0])
        pd.testing.assert_frame_equal(events, original)


if __name__ == '__main__':
    unittest.main()
