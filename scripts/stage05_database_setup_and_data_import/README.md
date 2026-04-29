# Stage 05 — Database Setup, Data Import, and Portal Data Services

## Purpose

Stage 05 documents the database construction phase of the Algerian Chemogenomic Phytochemical Portal. It converts the cleaned and normalized outputs generated in earlier stages into a structured Supabase/PostgreSQL database used by the web application, API layer, Knowledge Graph, Research Lab, Data Access module, and Review Center.

This stage is essential for reproducibility because it explains how prepared plant, compound, target, omics, narrative, and evidence files are imported into the database and transformed into queryable tables and views.

## Position in the Full Project Workflow

The project is organized into two major parts:

1. Data extraction, cleaning, normalization, and preparation.
2. Database construction, data import, web application development, and research-service modules.

Stage 05 belongs to the second part. It comes after data preparation and before final testing of the portal modules.

## What this stage includes

This stage covers:

1. Core database schema creation.
2. Import of cleaned CSV files into Supabase.
3. Import of plant, compound, target, ChEMBL, LINCS, GEO, and narrative evidence tables.
4. Creation of plant–compound and compound–target relationship layers.
5. Creation of genus-level contextual evidence views.
6. Creation of metabolite-family contextual evidence views.
7. Creation of Knowledge Graph-ready views.
8. Creation of Data Access/API-ready views.
9. Creation of Review Center curation tables.
10. Read-access configuration for frontend and backend queries.
11. Import order documentation to avoid missing relationship dependencies.

## Folder contents

```txt
scripts/stage05_database_setup/
├── README.md
├── requirements.txt
├── .env.example
├── config.py
├── schema.sql
├── import_order.md
└── import_data.py


## Overview

This stage transforms processed datasets into a fully functional relational database powering:

* Plant explorer
* Compound explorer
* Knowledge Graph
* Data Access API
* Review Center
* Genus and metabolite contextual layers

---

## Installation

```bash
cd scripts/stage05_database_setup
pip install -r requirements.txt
```

---

## Step 1 — Create tables and views

Open **Supabase SQL Editor**, then run:

```sql
-- Copy and paste full content of:
schema.sql
```

---

## Step 2 — Import cleaned CSV data

Run:

```bash
python import_data.py
```

This will:

* Read Stage 03 processed CSV files
* Clean values
* Insert into Supabase tables
* Respect dependency order

---

## Step 3 — Verify core tables

Run in Supabase:

```sql
select count(*) from plant_taxon;
select count(*) from compound;
select count(*) from plant_compound;
select count(*) from compound_np_classification;
select count(*) from compound_target_interactions;
select count(*) from compound_chembl_activity;
select count(*) from lincs_signature_long;
select count(*) from geo_molecule_mentions;
select count(*) from genus_attribute_evidence;
select count(*) from metabolite_family_reference_knowledge;
```

---

## Step 4 — Verify contextual views

```sql
select count(*) from v_plant_genus_context;
select count(*) from v_compound_metabolite_context;
```

---

## Step 5 — Verify Knowledge Graph views

```sql
select count(*) from v_graph_plant_compound_edges;
select count(*) from v_graph_compound_target_edges;
```

---

## Step 6 — Verify Data Access views

```sql
select count(*) from v_data_access_plants;
select count(*) from v_data_access_compounds;
select count(*) from v_data_access_targets;
```

---

## Step 7 — Verify Review Center tables

```sql
select count(*) from collaboration_submissions;
select count(*) from submission_parsed_rows;
select count(*) from submission_validation_reports;
```

---

## Expected Result

* Tables contain data (non-zero counts)
* Views return rows
* API endpoints work:

  * `/plants/{id}/genus-context`
  * `/compounds/{id}/metabolite-context`
* Frontend pages display contextual knowledge

---

## Notes

* If counts are **0 → import failed or mapping missing**
* If API gives **permission denied → check GRANT SELECT in schema.sql**
* If views return empty → linking logic not yet populated

---

## Final Role of Stage 05

This stage enables:

* Scientific querying
* Evidence integration
* Graph construction
* Research workflows
* Data transparency and validation
