### Data selection

# imports
import pandas as pd
import numpy as np

# session-level event dataframes
events_df_0 = pd.read_csv('data_storage/events_df_0.csv')
events_df_1 = pd.read_csv('data_storage/events_df_1.csv')
events_df_2 = pd.read_csv('data_storage/events_df_2.csv')
events_df_3 = pd.read_csv('data_storage/events_df_3.csv')
events_df_4 = pd.read_csv('data_storage/events_df_4.csv')

# catch participants who were erroneously invited back after failing exclusion criteria
all_df = pd.concat([events_df_0, events_df_1, events_df_2, events_df_3, events_df_4], ignore_index=True)
pass_exc = []; fail_exc = []

for subj, data in all_df.groupby('worker_id'):
    if not np.all([x in data.session.unique() for x in range(len(data.session.unique()))]):
        fail_exc.append(subj)
    else:
        pass_exc.append(subj)

# only analyze sessions 1-4, session 0 = practice
events_df = pd.concat([events_df_1, events_df_2, events_df_3, events_df_4], ignore_index=True)
events_df = events_df[events_df.worker_id.isin(pass_exc)]

# only subjects who completed at least 3 sessions
use_wids = events_df_2.worker_id.unique()
events_df = events_df[events_df.worker_id.isin(use_wids)]

# only subjects in the same condition for sessions 1-4
same_condition = []
change_condition = []
for subj, data in events_df.groupby('worker_id'):
    if len(data.condition.unique()) == 1:
        same_condition.append(data)
    else:
        change_condition.append(subj)

events_df = pd.concat(same_condition, ignore_index=True)

# save out dataframe to use for analyses
events_df.to_csv('data_storage/dataframe.csv', index=False)