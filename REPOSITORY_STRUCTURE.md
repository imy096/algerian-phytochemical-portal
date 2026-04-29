# Repository Structure

## Main folders

### scripts/
Contains all data-processing pipelines:

- stage01_elicit_processing
- stage01b_genus_processing
- stage01b_taxonomy
- stage01c_chemical_cleanup
- stage01d_pdf_phytochemical_extraction
- stage02_compound_enrichment
- stage03_database_preparation
- stage04_database_construction

### stage descriptions

- Stage 01: Extract and clean plant and compound data
- Stage 02: Enrich compounds using external databases
- Stage 03: Prepare normalized datasets for database import
- Stage 04: Database application (frontend + backend + supabase)

## Root files

- README.md: main project description
- LICENSE: project license
- .gitignore: ignored files configuration