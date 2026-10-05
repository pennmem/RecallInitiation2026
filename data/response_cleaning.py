"""
Clean typed recall responses before serial-position scoring.

Applied to REC_WORD rows, before recover_sp() and spellcheck_recalls_dl().

1. Filler responses (not recall attempts), e.g. "dont recall", "skip", "nada":
   removed.
2. Multi-word entries: participants were instructed to enter one word at a
   time, so entries containing more than one word are removed (neither a
   recall nor an intrusion). Single lexical items written with a space
   (COMPOUNDS) are kept as one response.
3. Annotation characters (? ] \\ * ( ) digits) are stripped from single-word
   entries, which are then scored normally (e.g. "marker**" -> "marker").

Returns the cleaned dataframe and a log of how many rows each rule touched.
"""
import re
import pandas as pd

FILLER_PATTERN = re.compile(
    r"^(dont\b.*|don't\b.*|nada|skip\b.*|forgot|remember|nothing( else)?|thats it|that's it|"
    r"move on|na|n/a|idk|none|no sound.*|[\\\]\[]+)$"
)
COMPOUNDS = {"ice cream", "x ray"}
ANNOTATION_CHARS = re.compile(r"[?\]\[\\*()0-9]")


def clean_responses(df, rec_col="rec_word"):
    df = df.copy()
    is_rec = df["type"] == "REC_WORD"
    raw = df[rec_col]
    has_text = raw.notna() & ~raw.astype(str).str.strip().str.lower().isin(["", "null", "nan"])
    s = raw.astype(str).str.strip().str.lower()

    filler = is_rec & has_text & s.str.match(FILLER_PATTERN)

    stripped = s.str.replace(ANNOTATION_CHARS, "", regex=True).str.strip()
    stripped = stripped.str.replace(r"\s+", " ", regex=True)
    multi = is_rec & has_text & ~filler & stripped.str.contains(" ") & ~stripped.isin(COMPOUNDS)

    annotated = is_rec & has_text & ~filler & ~multi & s.str.contains(ANNOTATION_CHARS)
    df.loc[annotated, rec_col] = stripped[annotated]

    log = {
        "filler_removed": int(filler.sum()),
        "filler_participants": int(df.loc[filler, "prolific_pid"].nunique()),
        "filler_max_from_one_participant": int(df.loc[filler].groupby("prolific_pid").size().max()) if filler.any() else 0,
        "multiword_removed": int(multi.sum()),
        "multiword_participants": int(df.loc[multi, "prolific_pid"].nunique()),
        "annotation_stripped": int(annotated.sum()),
    }
    removed = df.loc[filler | multi, ["prolific_pid", "session", "list", rec_col]].assign(
        reason=["filler" if f else "multiword" for f in filler[filler | multi]])
    return df[~(filler | multi)], log, removed
