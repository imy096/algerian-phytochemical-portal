# Stage 1B — Genus-Level Elicit Processing

This folder contains the merged genus-level processing script.

## Input

A folder of genus Excel files, one file per genus.

Example:

```text
data/stage01b_genus_processing/raw/genus_excels/
  Allium.xlsx
  Artemisia.xlsx
  Salvia.xlsx
```

The filename is used as the target genus.

## Run

```bash
python scripts/stage01b_genus_processing/01_genus_elicit_pipeline.py --input data/stage01b_genus_processing/raw/genus_excels --output data/stage01b_genus_processing/outputs --overwrite
```

## Outputs

```text
data/stage01b_genus_processing/outputs/
  filtered_genus_excels/
  genus_extraction_outputs/
  genus_audit_reports/
  filter_summary.csv
  extraction_summary.csv
  genus_audit_reports/genus_audit_summary.csv
  genus_pipeline_summary.xlsx
  filtered_genus_only.zip
  genus_extraction_outputs.zip
  genus_audit_reports.zip
```

## External files

No external database files are required.

Only the raw genus Excel files are needed.
