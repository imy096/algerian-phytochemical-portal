#!/usr/bin/env python3
"""Stage 2.04 - KEGG compound enrichment from PubChem output."""
from __future__ import annotations
import argparse, time, urllib.parse
from pathlib import Path
import pandas as pd
import requests

KEGG_BASE = "https://rest.kegg.jp"; TIMEOUT = 20; SLEEP = 0.3; MAX_RETRIES = 3
COL_CID="CID"; COL_NAME="queryname"; COL_FORMULA="MolecularFormula"; COL_EXACT="ExactMass"; COL_INCHIKEY="InChIKey"; COL_IUPAC="IUPACName"
session = requests.Session()

def kegg_request(path: str):
    url = f"{KEGG_BASE}{path}"; last_err = None
    for attempt in range(1, MAX_RETRIES+1):
        try:
            r = session.get(url, timeout=TIMEOUT)
            if r.status_code == 200: time.sleep(SLEEP); return r.text
            if r.status_code == 404: time.sleep(SLEEP); return ""
            last_err = RuntimeError(f"HTTP {r.status_code}")
        except Exception as e: last_err = e
        time.sleep(SLEEP * attempt)
    print(f"[WARN] Failed KEGG request {url}: {last_err}"); return None

def parse_find_result(text: str):
    out=[]
    if not text: return out
    for line in text.strip().splitlines():
        parts=line.split("\t",1); entry=parts[0].strip(); desc=parts[1].strip() if len(parts)>1 else ""
        if entry.startswith("cpd:"): entry=entry.split(":",1)[1]
        out.append((entry,desc))
    return out

def parse_kegg_entry(text: str):
    data={}; current=None
    if not text: return {}
    for raw in text.splitlines():
        if not raw.strip(): continue
        if raw[:12].strip():
            current=raw[:12].strip(); val=raw[12:].strip(); data.setdefault(current, [])
            if val: data[current].append(val)
        elif current:
            val=raw[12:].strip()
            if val: data.setdefault(current, []).append(val)
    joined={k:"; ".join(v) for k,v in data.items()}
    return {"ENTRY":joined.get("ENTRY",""),"NAME":joined.get("NAME",""),"FORMULA":joined.get("FORMULA",""),"EXACT_MASS":joined.get("EXACT_MASS",""),"MOL_WEIGHT":joined.get("MOL_WEIGHT",""),"REACTION":joined.get("REACTION",""),"RCLASS":joined.get("RCLASS",""),"PATHWAY":joined.get("PATHWAY",""),"ENZYME":joined.get("ENZYME",""),"DBLINKS":joined.get("DBLINKS",""),"REMARK":joined.get("REMARK",""),"BRITE":joined.get("BRITE",""),"COMMENT":joined.get("COMMENT","")}

def round_exact_mass(val):
    if pd.isna(val): return None
    try: return f"{float(val):.2f}"
    except Exception: return None

def best_kegg_ids(row):
    matches=[]; seen=set()
    formula = str(row.get(COL_FORMULA,"")).strip() if not pd.isna(row.get(COL_FORMULA)) else ""
    exact = round_exact_mass(row.get(COL_EXACT))
    iupac = str(row.get(COL_IUPAC,"")).strip() if not pd.isna(row.get(COL_IUPAC)) else ""
    qname = str(row.get(COL_NAME,"")).strip() if not pd.isna(row.get(COL_NAME)) else ""
    for value, mode, suffix in [(formula,"formula","/formula"),(exact,"exact_mass","/exact_mass")]:
        if value:
            for kid, desc in parse_find_result(kegg_request(f"/find/compound/{urllib.parse.quote(value)}{suffix}")):
                if kid not in seen: seen.add(kid); matches.append((kid,mode,desc))
    for value, mode in [(iupac,"iupac_name"),(qname,"queryname")]:
        if value:
            for kid, desc in parse_find_result(kegg_request(f"/find/compound/{urllib.parse.quote(value)}")):
                if kid not in seen: seen.add(kid); matches.append((kid,mode,desc))
    return matches

def empty_row(row):
    return {"CID":row.get(COL_CID),"queryname":row.get(COL_NAME),"InChIKey":row.get(COL_INCHIKEY,""),"MolecularFormula":row.get(COL_FORMULA),"ExactMass":row.get(COL_EXACT),"KEGG_ID":None,"KEGG_match_method":None,"KEGG_match_desc":None,"KEGG_NAME":None,"KEGG_FORMULA":None,"KEGG_EXACT_MASS":None,"KEGG_MOL_WEIGHT":None,"KEGG_PATHWAY":None,"KEGG_REACTION":None,"KEGG_RCLASS":None,"KEGG_ENZYME":None,"KEGG_DBLINKS":None,"KEGG_REMARK":None,"KEGG_BRITE":None,"KEGG_COMMENT":None}

def run(input_file: Path, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    df=pd.read_excel(input_file)
    for col in [COL_CID, COL_NAME, COL_FORMULA, COL_EXACT]:
        if col not in df.columns: raise ValueError(f"Required column '{col}' not found in {input_file}")
    rows=[]
    for i,row in df.iterrows():
        print(f"[{i+1}/{len(df)}] KEGG: CID={row.get(COL_CID)} name={row.get(COL_NAME)!r}")
        matches=best_kegg_ids(row)
        if not matches: rows.append(empty_row(row)); continue
        for kid, method, desc in matches:
            parsed=parse_kegg_entry(kegg_request(f"/get/cpd:{kid}"))
            rec=empty_row(row); rec.update({"KEGG_ID":kid,"KEGG_match_method":method,"KEGG_match_desc":desc,"KEGG_NAME":parsed.get("NAME"),"KEGG_FORMULA":parsed.get("FORMULA"),"KEGG_EXACT_MASS":parsed.get("EXACT_MASS"),"KEGG_MOL_WEIGHT":parsed.get("MOL_WEIGHT"),"KEGG_PATHWAY":parsed.get("PATHWAY"),"KEGG_REACTION":parsed.get("REACTION"),"KEGG_RCLASS":parsed.get("RCLASS"),"KEGG_ENZYME":parsed.get("ENZYME"),"KEGG_DBLINKS":parsed.get("DBLINKS"),"KEGG_REMARK":parsed.get("REMARK"),"KEGG_BRITE":parsed.get("BRITE"),"KEGG_COMMENT":parsed.get("COMMENT")}); rows.append(rec)
    out=pd.DataFrame(rows); out_file=output_dir/"kegg_results.xlsx"; out.to_excel(out_file,index=False); print(f"Done. Output: {out_file}")

def main():
    p=argparse.ArgumentParser(description="KEGG enrichment from PubChem output."); p.add_argument("--input",required=True); p.add_argument("--output",default="data/stage02_compound_enrichment/kegg"); args=p.parse_args(); run(Path(args.input),Path(args.output))
if __name__=="__main__": main()
