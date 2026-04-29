# Computational Workflow

## Stage 1 — Data Extraction

Processes:
- Elicit outputs
- taxonomy enrichment
- genus processing
- chemical cleanup
- PDF extraction

Output:
Clean plant-compound datasets

---

## Stage 2 — Compound Enrichment

Uses PubChem as central identifier source.

Enrichment includes:
- KEGG pathways
- STITCH interactions
- LINCS signatures
- GEO datasets
- CompTox data
- NPClassifier
- molecular images
- NMR data

Output:
Enriched compound dataset

---

## Stage 3 — Database Preparation

Transforms all data into:
- normalized tables
- structured CSV files
- relational datasets

Output:
Database-ready data

---

## Stage 4 — Database Application

Implements:
- frontend interface (React)
- backend services
- Supabase database

Output:
Interactive phytochemical database portal