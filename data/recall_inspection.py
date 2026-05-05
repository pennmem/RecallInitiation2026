import pandas as pd


def clean_word(word):
    if pd.isna(word):
        return ''
    word = str(word).strip()
    if word.lower() == 'null':
        return ''
    return word


def build_session_word_history(events, pid, session):
    word_events = events[
        (events['prolific_pid'] == pid)
        & (events['session'] == session)
        & (events['type'] == 'WORD')
    ].copy()

    word_events['word_key'] = word_events['word'].map(clean_word).str.upper()

    return (
        word_events
        .set_index('word_key')[['list', 'serial_position']]
        .to_dict('index')
    )


def classify_recall(row, word_history, current_list, list_length=None, pli_buffer=4):
    sp = row['serial_position']
    recalled_word = clean_word(row['rec_word'])
    word_key = recalled_word.upper()

    if recalled_word == '':
        return 'no response'

    if pd.notna(sp):
        sp = int(sp)
        if list_length is None:
            list_length = int(row['l_length'])
        if 1 <= sp <= list_length:
            return 'correct'
        if sp == 99:
            return 'no response'

    source = word_history.get(word_key)

    if source is None:
        return 'ELI'

    source_list = int(source['list'])

    if source_list < current_list:
        if current_list >= pli_buffer:
            return 'PLI'
        return 'PLI_buffered'

    if source_list > current_list:
        return 'ELI'

    return 'intrusion'


def format_recall_serial_position(row, word_history, current_list, list_length=None):
    intrusion_type = classify_recall(row, word_history, current_list, list_length)

    if intrusion_type == 'correct':
        return int(row['serial_position'])

    if intrusion_type in ['PLI', 'PLI_buffered']:
        recalled_word = clean_word(row['rec_word']).upper()
        source = word_history.get(recalled_word)
        return f"{intrusion_type}: list {int(source['list'])}, SP {int(source['serial_position'])}"

    return intrusion_type


def inspect_list_recall(events, pid, session, list_num):
    selector = (
        (events['prolific_pid'] == pid)
        & (events['session'] == session)
        & (events['list'] == list_num)
    )
    list_events = events[selector].copy()

    if list_events.empty:
        raise ValueError('No rows found for that participant/session/list.')

    list_length = int(list_events['l_length'].dropna().iloc[0])
    word_history = build_session_word_history(events, pid, session)

    shown = (
        list_events[list_events['type'] == 'WORD']
        .sort_values('serial_position')
        .assign(serial_position=lambda x: x['serial_position'].astype(int))
        [['serial_position', 'word']]
        .rename(columns={'word': 'word_shown'})
        .reset_index(drop=True)
    )

    recall_events = (
        list_events[list_events['type'] == 'REC_WORD']
        .sort_values(['recall_position', 'trial_index'])
        .copy()
    )

    recall_events['recalled_word'] = recall_events['rec_word'].map(clean_word)
    recall_events['recalled_word'] = recall_events['recalled_word'].replace('', '(empty)')

    recall_events['intrusion_type'] = recall_events.apply(
        lambda row: classify_recall(row, word_history, list_num, list_length),
        axis=1,
    )

    recall_events['recalled_serial_position'] = recall_events.apply(
        lambda row: format_recall_serial_position(row, word_history, list_num, list_length),
        axis=1,
    )

    recall = (
        recall_events[
            ['recalled_word', 'recalled_serial_position', 'intrusion_type']
        ]
        .reset_index(drop=True)
    )

    n_rows = max(len(shown), len(recall))
    table = pd.concat(
        [shown.reindex(range(n_rows)), recall.reindex(range(n_rows))],
        axis=1,
    )
    table.index = pd.RangeIndex(1, n_rows + 1, name='row')

    return table
