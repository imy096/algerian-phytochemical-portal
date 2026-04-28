# Missing Data Reporting Guide

## Purpose

This guide explains how to report data that appears to be absent, incomplete, unresolved, or incorrectly linked in the Algerian Chemogenomic Phytochemical Portal.

Missing data reports are important because they help improve:

- plant coverage
- compound coverage
- plant–compound relations
- evidence completeness
- identifier resolution
- source traceability

---

## What Counts as Missing Data

Missing data may include:

- a plant mentioned in a source but absent from the database
- a compound mentioned in a source but absent from the database
- a plant–compound association missing from the database
- evidence present in a source but not yet represented
- an unresolved raw name that should be normalized
- incomplete metadata for an existing record
- a source-linked claim that is not yet captured

---

## Main Reporting Categories

### 1. Missing plant
Use this when:

- a plant reported in an article is not found in the portal
- an existing plant record lacks important evidence
- a raw plant name needs normalization into a proper plant identity

Examples:
- a medicinal plant reported in a DOI-linked article is absent
- a plant exists, but its ethnobotanical evidence is missing
- a plant appears under a variant spelling that is not yet normalized

### 2. Missing compound
Use this when:

- a compound reported in an article is not found in the portal
- a reported compound is missing from a known plant profile
- a compound name exists only in raw form and still needs normalization

Examples:
- a GC-MS table lists compounds not yet represented
- a major phytochemical is absent from the compound database
- the compound is present in the article but not linked in the portal

### 3. Missing plant–compound link
Use this when:

- both the plant and compound exist in the portal but their relation is missing
- a source article clearly supports the association but it is not represented
- the plant–compound association has not yet been curated

Examples:
- the plant exists
- the compound exists
- the article reports the relation
- but the portal does not yet contain the link

### 4. Missing evidence
Use this when:

- the article contains relevant evidence not yet represented
- plant evidence exists but is incomplete
- therapeutic or contextual evidence is absent
- a known publication has not been fully extracted

Examples:
- ethnobotanical statement missing
- medicinal potential statement missing
- plant-part-specific evidence not yet captured
- preparation method omitted

### 5. Missing identifier or metadata
Use this when:

- DOI is missing for a publication
- compound identifiers are unresolved
- taxonomy is incomplete
- plant or compound naming is ambiguous
- source traceability needs improvement

---

## What to Provide

When reporting missing data, provide as much of the following as possible:

- raw reported name
- DOI or other stable source identifier
- plant name if known
- compound name if known
- short context describing the missing information
- article section, table, or figure reference if relevant
- notes about uncertainty

The more source-linked and specific the report is, the easier it is to review.

---

## Preferred Submission Format

Use the official template:

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

## How to Write a Good Missing Data Report

A strong report should be:

- source-linked
- specific
- non-speculative
- easy to verify

### Good example
- entity type: plant
- raw name: *Artemisia campestris*
- related DOI: 10.xxxx/xxxxx
- context: medicinal evidence reported in results section, not found in database
- notes: article describes antimicrobial extract from aerial parts

### Weak example
- entity type: plant
- raw name: Artemisia
- context: maybe missing
- notes: please check

Use exact wording from the source whenever possible.

---

## Common Cases

### Case A. Plant not found
Report when a plant in an article is absent from the database.

Provide:
- raw plant name
- DOI
- context
- optional scientific name
- notes

### Case B. Compound not found
Report when a compound listed in an article is absent from the database.

Provide:
- compound name as reported
- DOI
- related plant name if available
- extraction or assay context if available

### Case C. Missing plant–compound link
Report when the plant and compound exist separately, but their association is absent.

Provide:
- DOI
- plant name
- compound name
- short evidence statement
- notes

### Case D. Existing record but missing evidence
Report when the entity exists, but important source-linked evidence has not yet been captured.

Provide:
- portal entity if known
- DOI
- exact missing statement
- context
- notes

---

## What Not to Do

Do not:

- guess a DOI
- invent identifiers
- merge uncertain names without notes
- submit speculative claims without source support
- assume that a similar plant or compound is the same entity
- treat inferred relations as confirmed relations

If uncertain, write the uncertainty in `notes`.

---

## Review Outcome

After submission, reports may be:

- approved
- rejected
- marked as needing revision
- merged into a larger curation task

Some reports may require:

- taxonomy review
- compound normalization
- publication verification
- manual curator interpretation

---

## Summary

Use missing data reporting to help the platform identify:

- absent plants
- absent compounds
- absent plant–compound links
- absent evidence
- absent identifiers

Always anchor reports to a real source whenever possible, preferably with DOI.