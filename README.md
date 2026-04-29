# Algerian Phytochemical Chemogenomic Portal

An integrated chemogenomic database and research platform for Algerian medicinal plants, linking phytochemical compounds, molecular targets, transcriptomic signatures, and biological evidence.

---

## Project Overview

This project builds a multi-stage computational pipeline to extract, clean, enrich, and integrate phytochemical data into a structured database and interactive research portal.

The system connects:

- plant taxonomy
- phytochemical compounds
- molecular targets
- biological pathways
- transcriptomic signatures
- literature evidence

---

## Workflow

### Stage 1 — Data Extraction
- Elicit processing
- taxonomy enrichment
- genus processing
- chemical cleanup
- PDF extraction

### Stage 2 — Compound Enrichment
- PubChem (central identifiers)
- KEGG pathways
- STITCH interactions
- LINCS signatures
- GEO datasets
- CompTox data
- NPClassifier
- molecular images
- NMR data

### Stage 3 — Database Preparation
- normalization
- structured CSV tables
- relational data formatting

### Stage 4 — Database Application
- frontend (React)
- backend
- Supabase database

---

## Repository Structure

scripts/
  stage01_elicit_processing/
  stage01b_genus_processing/
  stage01b_taxonomy/
  stage01c_chemical_cleanup/
  stage01d_pdf_phytochemical_extraction/
  stage02_compound_enrichment/
  stage03_database_preparation/
  stage04_database_construction/

---

## Installation

See INSTALLATION.md

---

## Data Access

Large datasets are not included in this repository.

---

## Technologies

- Python (data pipeline)
- Pandas / NumPy
- PubChem API
- KEGG / STITCH / GEO / LINCS
- Supabase (PostgreSQL)
- React / Vite (frontend)

---

## Scientific Contribution

This platform enables:

- integration of phytochemical and biological data
- cross-database analysis
- hypothesis generation for medicinal plant research

---

## License

MIT License