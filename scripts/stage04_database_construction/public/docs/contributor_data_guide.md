# Contributor Data Guide

## Overview

The Algerian Chemogenomic Phytochemical Portal accepts structured scientific contributions intended to improve the coverage, quality, and accuracy of the database.

Contributors may submit:

- publication metadata
- plant evidence extracted from scientific articles
- compound data reported in scientific articles
- reports of missing plants, missing compounds, or missing plant–compound links
- supporting files such as CSV, Excel, PDF, or supplementary material

All submissions are reviewed before integration into the production database.

---

## Core Principle

Contributors are not expected to understand the internal database schema.

Instead, contributors should provide well-structured source data centered on:

- a stable source identifier, preferably DOI
- plant identity
- extracted evidence
- compound names where available
- relevant contextual notes

Internal normalization and enrichment to external resources such as taxonomy, PubChem, ChEMBL, GEO, KEGG, and related systems are performed by the platform after review.

---

## Accepted Submission Types

### 1. Publication submission
Use this when you want to suggest a publication for inclusion or curation.

Typical examples:
- a paper describing Algerian medicinal plants
- a phytochemical profiling article
- a pharmacological or ethnobotanical study
- a review article with extractable evidence

### 2. Plant evidence submission
Use this when you have extracted evidence from an article and want to submit plant-related statements.

Typical examples:
- traditional use statements
- medicinal or pharmacological evidence
- plant-part-specific evidence
- preparation or extraction context

### 3. Compound submission
Use this when an article reports compounds found in one or more plants.

Typical examples:
- compound lists extracted from GC-MS, LC-MS, HPLC, or related studies
- reported plant–compound associations
- compound quantities or classes where available

### 4. Missing data submission
Use this when you identify:
- a plant not yet represented in the database
- a compound not yet represented in the database
- a missing plant–compound relation
- an important evidence record that is absent

### 5. Supporting files
Use this when you want to provide:
- CSV files
- Excel files
- PDFs
- supplementary tables
- additional documentation supporting the submission

---

## Preferred Submission Workflow

The preferred workflow is:

1. identify the source article or dataset
2. provide a stable identifier such as DOI
3. extract plant evidence and/or compound information into the official templates
4. upload the completed templates and any supporting files
5. wait for curator review and feedback if needed

---

## Official Templates

The portal currently provides the following submission templates:

### A. Publication template
File name:
`publication_submission_template.csv`

Expected columns:

- `doi`
- `pubmed_id`
- `publication_title`
- `journal`
- `year`
- `authors`
- `corresponding_author`
- `email`
- `institution`
- `study_scope`
- `notes`

### B. Plant evidence template
File name:
`plant_evidence_submission_template.csv`

Expected columns:

- `doi`
- `plant_name_raw`
- `scientific_name`
- `plant_part`
- `attribute_type`
- `evidence_text`
- `therapeutic_context`
- `reported_activity`
- `country_or_region`
- `preparation_method`
- `reference_section`
- `notes`

Allowed values for `attribute_type`:

- `ethnobotany`
- `medicinal_potential`

### C. Compound submission template
File name:
`compound_submission_template.csv`

Expected columns:

- `doi`
- `plant_name_raw`
- `compound_name_raw`
- `compound_class`
- `plant_part`
- `extraction_method`
- `quantitative_value`
- `quantitative_unit`
- `evidence_text`
- `notes`

### D. Missing entities template
File name:
`missing_entities_template.csv`

Expected columns:

- `entity_type`
- `name_raw`
- `related_doi`
- `related_plant_name`
- `related_compound_name`
- `context`
- `notes`

Allowed values for `entity_type`:

- `plant`
- `compound`
- `plant_compound_link`

---

## Minimum Required Information

At minimum, contributors should provide:

- a source identifier, preferably DOI
- a plant name exactly as reported in the source
- a clear evidence statement or extracted claim
- compound names where relevant
- a short note if any field is uncertain

Submissions without a stable source identifier may still be reviewed, but source-linked submissions are strongly preferred.

---

## Recommended Data Quality Practices

To improve review quality and reduce ambiguity, contributors are encouraged to:

- use the exact plant name as reported in the article
- include scientific name when known
- distinguish clearly between ethnobotanical and medicinal evidence
- preserve wording faithfully when extracting evidence
- include plant part when reported
- include extraction, assay, or preparation context when available
- provide compound names exactly as reported
- include DOI, PubMed ID, or stable URL whenever possible
- use notes to flag uncertainty instead of guessing

---

## Important Scientific Distinctions

### Ethnobotany vs medicinal evidence
These two evidence types should remain clearly separated.

- `ethnobotany` refers to traditional use, reported use, or ethnobotanical knowledge
- `medicinal_potential` refers to medicinal, pharmacological, bioactivity, or experimental evidence

Do not merge these categories unless the original source explicitly justifies the connection.

### Raw names vs normalized identifiers
Contributors may provide raw plant names and raw compound names as reported in the source.

The platform will attempt to normalize:
- plant identity
- taxonomy
- compound identity
- external database mapping

---

## Missing Data Reporting

Use the missing entities template when reporting:

### Missing plants
Examples:
- a plant reported in an article is absent from the database
- a plant record exists but key evidence is missing
- only a raw name is currently available

### Missing compounds
Examples:
- a compound reported in an article is absent from the database
- a compound is known but not linked to the reported plant

### Missing plant–compound links
Examples:
- both plant and compound exist in the database but their relation is absent
- an article contains a relation not yet represented

For missing data reports, provide:
- raw reported name
- DOI or source
- context
- any related plant or compound name
- notes on why the data appears missing

---

## What Happens After Submission

All submissions pass through a review process before production integration.

Typical review steps include:

1. source validation
2. identifier checking
3. plant name normalization
4. compound matching where possible
5. evidence structure review
6. approval, rejection, or request for clarification

Approved records may then be enriched internally using external resources such as:
- taxonomy databases
- PubChem
- ChEMBL
- GEO
- KEGG
- related curated resources

---

## File Types Accepted

Supporting uploads may include:

- `.csv`
- `.xlsx`
- `.xls`
- `.pdf`

When possible, structured spreadsheet formats are preferred over screenshots or unstructured text.

---

## Contributor Responsibilities

Contributors should ensure that:

- submitted information is accurate to the best of their knowledge
- source identifiers are valid when provided
- extracted evidence reflects the source faithfully
- uncertainty is marked clearly in notes
- speculative claims are avoided

---

## Platform Responsibilities

The platform will:

- review submitted data before integration
- normalize and enrich accepted records internally
- preserve scientific distinctions between evidence types
- avoid overstating unsupported associations
- maintain traceability to submitted source material when possible

---

## Recommended Submission Strategy

For most contributors, the recommended approach is:

- start with the DOI
- fill the plant evidence template
- add the compound template if compounds are reported
- use the publication template for article metadata
- use the missing entities template for anything not yet represented

This approach is strongly preferred over sending only unstructured messages.

---

## Contact and Follow-Up

For large datasets, institutional submissions, or collaborative projects, contributors are encouraged to contact the platform team before submission.

This helps ensure:
- correct template usage
- efficient review
- smoother ingestion into the database
- better long-term interoperability

---

## Summary

The portal follows an evidence-first contribution model.

Contributors provide:
- source-linked scientific data
- plant names
- evidence text
- compound names where available

The platform then performs:
- normalization
- enrichment
- validation
- integration after review

This structure ensures that the database remains both scientifically rigorous and operationally scalable.