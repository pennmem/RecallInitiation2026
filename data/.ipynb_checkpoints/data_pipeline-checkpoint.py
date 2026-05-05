### Data Processing Pipeline

# read from sqlite database
# parse and clean data
# save out events dataframe (WORD and REC_WORD events), dictionary of conditions to workers, dictionary of workers to ages

# imports
import sqlite3
import pandas as pd; pd.set_option('display.max_columns', None)
import json
from tqdm import tqdm
import numpy as np
import re
from pyxdameraulevenshtein import damerau_levenshtein_distance_seqs
import sys


# class to read from sqlite database
class MTurk_sqlite3_reader:
    
    # initialize
    def __init__(self, table_name=None, db_root='/home1/maint/cmlpsiturk_files/cmlpsiturk_sqlite3.db'):
        self.table_name = table_name
        self.db_root = db_root
        
    # ---------- Connecting to Database ----------
    
    # create connection and cursor
    def _create_connection_cursor(self):
        connection = sqlite3.connect(self.db_root)
        cursor = connection.cursor()
        return connection, cursor
        
    # close connection --> call at end of every method
    def _close_connection(self, connection):
        connection.close()
        
    # ---------- Query & Load ----------
    
    # read all table names
    def all_tables(self):
        connection, cursor = self._create_connection_cursor()
        tables = [t for t in cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table'")]   # list of 1-tuples
        self._close_connection(connection)
        return tables
    
    # load table metadata into pandas dataframe
    def summary(self):
        if not self.table_name:
            raise ValueError("Initialize MTurk_sqlite3_reader with a table_name.")
        connection, cursor = self._create_connection_cursor()
        summary_df = pd.read_sql_query(f"SELECT * FROM {self.table_name}", connection)
        self._close_connection(connection)
        summary_df = summary_df[['uniqueid', 'workerid', 'cond', 'counterbalance', 'beginhit', 
                                 'beginexp', 'endhit', 'status', 'mode', 'datastring']]       # select columns to keep
        summary_df = summary_df[summary_df['mode'] != 'debug']                # remove debug data
        summary_df = summary_df[summary_df['status'].isin([3,4,5,7])]         # only completed sessions
        self.summary_df = summary_df
        return summary_df
        
    # load events data into pandas dataframe
    def events(self):
        data = []
        for _, row in self.summary_df.iterrows():
            data.append(row['datastring'])
            
        subject_data = []
        for subject_json in data:
            try:
                subject_dict = json.loads(subject_json)
                subject_data.append(subject_dict['data'])
            except:
                continue
        
        trialdata = []
        for part in subject_data:
            for record in part:
                record['trialdata']['uniqueid'] = record['uniqueid']
                trialdata.append(record['trialdata'])
                
        events_df = pd.DataFrame(trialdata)    # put all trial data into pandas dataframe
        events_df['subject'] = events_df.uniqueid.astype('category').cat.codes
        events_df['subject'] = 'MTK' + self.table_name + '_' + events_df['subject'].astype(str)
        events_df.drop('view_history', axis=1, inplace=True)
        self.events_df = events_df
        return events_df
    

# remove data for subjects with replays, subjects who took notes
def filter_replays_notes(events_df):
    # filter out subjects with replays > 0
    replay_subs = list(events_df[events_df['replays'] > 0].subject.unique())
    events_df = events_df[~events_df['subject'].isin(replay_subs)]
    
    # filter out subjects who took notes
    notes = events_df[events_df['trial_type'] == 'html-button-response']
    nts = notes[notes['stimulus'] == str('<p class = inst>Did you write notes during this session?</p>')]
    took_notes = nts[nts['response'] == 0]
    stnts = list(took_notes['subject'].unique())                  # subjects who took notes
    events_df = events_df[~events_df['subject'].isin(stnts)]
    
    return events_df


# only keep word and recall events
def filter_words_recalls(events_df):
    events_df = events_df[(events_df['type'] == 'WORD') | (events_df['type'] == 'REC_WORD')]
    return events_df


# add num_lists, session, workerID to data
def fill_data(events_df, id_dict, sess):
    for subj in tqdm(events_df['subject'].unique()):
        data = events_df[events_df['subject'] == subj]
        uid = data['uniqueid'].unique()[0]
        wid = id_dict.get(uid)                                                # get worker ID
        num_lists = len(data['list'].unique())
        events_df.loc[events_df.subject == subj, 'num_lists'] = num_lists     # fill in num_lists with number of lists
        events_df.loc[events_df.subject == subj, 'worker_id'] = wid           # fill in worker_id with worker ID
        
    events_df['session'] = sess                                               # add session to events
    return events_df


# assign correct lists to recall events
def sub_fill_lists(data):
    list_no = [0]                                     # always start with list 0
    ln = 0
    t0 = 'WORD'                                       # always start with a WORD event
    for i, t in enumerate(np.array(data['type'])):
        if i > 0:                                     # skip first event
            if t == 'REC_WORD':
                list_no.append(ln)
            elif t == 'WORD' and t0 == 'REC_WORD':    # update list number
                ln += 1
                list_no.append(ln)
            else:
                list_no.append(ln)
        t0 = t                                        # update type of previous item
        
    data['list'] = list_no
    return data

def fill_lists(events_df):
    fin_df = []
    for subj, data in events_df.groupby('subject'):
        data = sub_fill_lists(data)
        fin_df.append(data)
        
    return pd.concat(fin_df, ignore_index=True)


# recover conditionless data (condition, list length, presentation rate)
def recover_data(n_df):
    recovered_df = []
    for subj, data in n_df.groupby('subject'):
        word_evs = data[data['type'] == 'WORD']
        all_lists = word_evs['list'].unique()
        l_lens = []
        for i in all_lists:
            l_lens.append(len(word_evs[word_evs['list'] == i]))
        l_len = min(l_lens)
        
        # try to recover regardless of number of lists (or at least greater than 5)
        if len(all_lists) > 5:
            if l_len == 10:
                data['condition'] = 0.0
                data['l_length'] = 10.0
                data['pres_rate'] = 2000.0
            elif l_len == 15:
                data['condition'] = 2.0
                data['l_length'] = 15.0
                data['pres_rate'] = 2000.0
            elif l_len == 20:                                   # calculate elapsed time for list presentation
                w_list = word_evs[word_evs['list'] == 0.0]
                t_elapsed = w_list['time_elapsed'].to_numpy()
                t = (t_elapsed[-1] - t_elapsed[0]) / 1000
                if t < 30.0:                                    # 20-1
                    data['condition'] = 1.0
                    data['l_length'] = 20.0
                    data['pres_rate'] = 1000.0
                else:                                           # 20-2
                    data['condition'] = 3.0
                    data['l_length'] = 20.0
                    data['pres_rate'] = 2000.0
            elif l_len == 30:
                data['condition'] = 4.0
                data['l_length'] = 30.0
                data['pres_rate'] = 1000.0
            elif l_len == 40:
                data['condition'] = 5.0
                data['l_length'] = 40.0
                data['pres_rate'] = 1000.0
                
        if data['condition'].unique()[0] >= 0:                  # data has been recovered
            recovered_df.append(data)
            
    return pd.concat(recovered_df, ignore_index=True)


# assign serial position to recalled word given presented word list
def a_sp(recall, word_list):
    if recall == 'null':          # end of recall demarker
        sp = 99
    else:
        sp = 88
        
    for j in range(len(word_list)):
        if recall == word_list[j]:
            sp = j + 1
    
    return sp     # returns serial position (int)

# clean recall data (empty, whitespace, non-letter characters)
def clean_recalls(events_df):
    clean_rec_data = []
    for subj, data in tqdm(events_df.groupby('subject')):
        # get rid of empty recalls
        data = data[(data.rec_word != '') & (data.rec_word != ' ')]
        
        # remove recalls with no alphabetic characters
        data = data[(data['type'] == 'WORD') | ((data['type'] == 'REC_WORD') & (data.rec_word.str.contains(r'[a-zA-Z]')))]

        for i, row in data.iterrows():
            if row['type'] == 'REC_WORD':
                recall = row.rec_word

                # get rid of white space, assign serial position
                if ' ' in recall:
                    wlist = list(data[(data['type'] == 'WORD') & (data['list'] == row['list'])].word)
                    recall = ''.join(recall.split())
                    data.at[i, 'rec_word'] = recall
                    data.at[i, 'serial_position'] = a_sp(recall, wlist)

                # get rid of non-letter characters, assign serial positions
                if bool(re.search(r'[^a-zA-Z]+', recall)):
                    wlist = list(data[(data['type'] == 'WORD') & (data['list'] == row['list'])].word)
                    recall = re.sub('[^a-zA-Z]+', '', recall)
                    data.at[i, 'rec_word'] = recall
                    data.at[i, 'serial_position'] = a_sp(recall, wlist)
                    
        clean_rec_data.append(data)
        
    return pd.concat(clean_rec_data, ignore_index=True)


# spell check recall data
# Damerau-Levenshtein distance
# correct if DL distance <= 1 from a presented word
def damLev(recall, prior_words, words):
    if recall in prior_words:      # PLI, don't correct, don't change serial position
        return recall, False
    
    # array of DL distances from recall to all presented words (most recent first)
    all_pres = np.concatenate([prior_words, words])[::-1]
    dist_to_pool = np.array(damerau_levenshtein_distance_seqs(recall, all_pres))
    
    # find where DL distnace is <= 1, if multiple, pick most recent
    close = np.where(dist_to_pool <= 1)[0]      # array of indices where DL distance <= 1
    if len(close) >= 1:
        ind = close[0]
        return all_pres[ind], True
    else:                                       # no presented words within distance 1, don't change spelling (ELI)
        return recall, False

def spellcheck_DL(events_df):
    ac_data = []
    cnt = 0
    
    for subj, data in tqdm(events_df.groupby('subject')):
        for i, row in data.iterrows():
            if row['type'] == 'REC_WORD' and row['serial_position'] == 88:        # intrusion
                pw = data[(data['type'] == 'WORD') & (data['list'] < row['list'])].word.to_numpy()   # all prior list words
                w = data[(data['type'] == 'WORD') & (data['list'] == row['list'])].word.to_numpy()        # current list words
                
                # spellcheck
                ac, change = damLev(row.rec_word, pw, w)
                if change:                                   # only update if recall changed
                    cnt += 1
                    sp = a_sp(ac, w)
                    data.at[i, 'rec_word'] = ac
                    data.at[i, 'serial_position'] = sp
                    
        ac_data.append(data)
        
    print(f'words changed = {cnt}')
    return pd.concat(ac_data, ignore_index=True)


# parse out data based in Pazdera (2023) criteria
# no correct recalls on 2 or more lists
# recall > 95%
def gdp(events_df):
    good_subjs = []
    for subj, data in events_df.groupby('subject'):
        word_evs = data[data['type'] == 'WORD']
        rec_evs = data[data['type'] == 'REC_WORD']
        num_lists = int(data['num_lists'].unique()[0])
        list_length = data['l_length'].unique()[0]
        
        no_cr_trials = 0                              # number of trials with 0 correct recalls
        tot_cr = 0                                    # number of total correct recalls
        
        # iterate over lists, increment
        for i in range(num_lists):
            sp = rec_evs[rec_evs['list'] == i].serial_position.to_numpy()         # current list serial positions
            
            # only correct recalls (no repetitions, intrusions)
            cr = np.unique(sp[(sp != 99) & (sp != 88)])
            
            if len(cr) == 0:
                no_cr_trials += 1
            else:
                tot_cr += len(cr)
                
        if no_cr_trials < 2 and (tot_cr / float(num_lists*list_length)) <= 0.95:
            good_subjs.append(subj)
            
    return events_df[events_df.subject.isin(good_subjs)]

    
table_name = sys.argv[1]
sess = int(sys.argv[2])

# query sqlite data base
mt_reader = MTurk_sqlite3_reader(table_name)
summary_df = mt_reader.summary()
events_df = mt_reader.events()

uids = list(summary_df['uniqueid'])      # list of unique IDs
wids = list(summary_df['workerid'])      # list of worker IDs
id_dict = dict(zip(uids, wids))          # dictionary mapping uniqueid to workerid

# no replays, no notes
events_df = filter_replays_notes(events_df)

# ages, save out worker-age dictionary
if 'age' in events_df.columns:
    age_df = events_df[events_df['type'] == 'age']
    age_dict = {}
    for _, row in age_df.iterrows():
        uid = row.uniqueid
        wid = id_dict.get(uid)
        age_dict[wid] = row.age
        
    with open(f'data_storage/age_dict_{sess}.json', 'w') as f:
        json.dump(age_dict, f)

# select WORD and REC_WORD events
events_df = filter_words_recalls(events_df)

# num_lists, session, worker_id data
events_df = fill_data(events_df, id_dict, sess)

# assign correct lists to recall events
events_df = fill_lists(events_df)

# separate subjects not given condition --> recover
c_df = events_df[events_df['condition'].notna()]
n_df = events_df[events_df['condition'].isna()]
r_df = recover_data(n_df)

# full dataframe all subjects with condition data
events_df = pd.concat([c_df, r_df], ignore_index=True)

# remove empty recalls, whitespace, non-letter characters
events_df = clean_recalls(events_df)

# spellcheck using Damerau-Levenshtein distance
events_df = spellcheck_DL(events_df)

# exclusion criteria
events_df = gdp(events_df)

# save out events dataframe, condition-worker dictionary
events_df.to_csv(f'data_storage/events_df_{sess}.csv', index=False)
