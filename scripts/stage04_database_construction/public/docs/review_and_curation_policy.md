# Review and Curation Policy

## Overview

All contributed data submitted to the Algerian Chemogenomic Phytochemical Portal is reviewed before integration into the production database.

The goal of review is to ensure:

- scientific traceability
- source validity
- internal consistency
- clear separation of evidence types
- careful normalization of entities and relations

The portal follows a curated ingestion model rather than automatic publication without review.

---

## Review Principles

Submissions are evaluated according to the following principles:

### 1. Traceability
Every accepted scientific contribution should be traceable to a source.

Preferred source anchors include:
- DOI
- PubMed ID
- stable URL
- uploaded PDF or supplementary material

### 2. Fidelity to source
Extracted data should reflect the source faithfully.

Curators aim to preserve:
- meaning
- context
- evidence type
- entity naming as reported, before normalization

### 3. Separation of evidence types
Evidence categories must remain scientifically distinct.

In particular:
- ethnobotanical evidence must remain separate from medicinal or pharmacological evidence
- inferred relations should not be presented as directly confirmed evidence
- internal enrichment should not overwrite source-linked evidence statements

### 4. Conservative integration
When uncertainty exists, the platform favors conservative treatment over aggressive inference.

This may include:
- retaining raw names
- requesting revision
- delaying integration
- flagging the record for later review

---

## Submission Statuses

Each submission moves through one of the following statuses:

### `pending`
The submission has been received and is waiting for review.

### `under_review`
The submission is currently being evaluated by a curator or administrator.

### `approved`
The submission has passed review and may be integrated into the production database or staging pipeline.

### `rejected`
The submission was not accepted for integration.

Typical reasons:
- insufficient source support
- unverifiable claims
- irrelevant scope
- duplication without added value
- major inconsistency

### `needs_revision`
The submission may be useful, but requires clarification, correction, or restructuring before approval.

---

## Review Workflow

Typical review steps include:

1. source verification
2. field completeness check
3. evidence-type check
4. plant name review
5. compound name review when applicable
6. relation plausibility review
7. duplication check
8. normalization readiness assessment
9. approval, rejection, or request for revision

---

## Review Criteria by Submission Type

### Publication submissions
Curators review:
- DOI or PubMed validity
- relevance to portal scope
- extractable scientific value
- duplication risk
- publication metadata consistency

### Plant evidence submissions
Curators review:
- DOI and source validity
- plant identity clarity
- evidence statement quality
- appropriate `attribute_type`
- consistency of therapeutic or contextual interpretation

### Compound submissions
Curators review:
- source validity
- compound name quality
- relation to reported plant
- extraction context
- quantitative data clarity where present

### Missing data reports
Curators review:
- whether the data is truly absent
- whether the report refers to normalization rather than absence
- whether the source supports the reported gap
- whether the report belongs to a broader unresolved issue

### Supporting files
Curators review:
- file readability
- relevance
- structure
- whether the file supports the linked submission

---

## Reasons a Submission May Be Rejected

A submission may be rejected if:

- no verifiable source is provided
- the content is outside portal scope
- the evidence is too vague or untraceable
- the submission duplicates existing data without adding value
- the data is clearly speculative
- the file is unreadable or unusable
- the submission misclassifies evidence types in a major way

Rejected submissions are not necessarily scientifically wrong; they may simply be unsuitable for direct integration.

---

## Reasons a Submission May Need Revision

A submission may be marked `needs_revision` if:

- plant names are incomplete or ambiguous
- compound names need clarification
- source identifiers are missing
- the evidence text is too compressed or unclear
- context is insufficient
- the file structure is incomplete
- there is uncertainty that should be explicitly documented

---

## Normalization and Enrichment

After approval, a submission may undergo:

- plant name normalization
- taxonomy matching
- compound normalization
- external database enrichment
- relation expansion
- internal identifier assignment

Examples of external enrichment may include:
- taxonomy resources
- PubChem
- ChEMBL
- GEO
- KEGG
- other curated references

Normalization and enrichment are internal processes and do not replace the original source-linked submission.

---

## Transparency Commitments

The platform aims to:

- preserve traceability to the source
- distinguish source-linked evidence from inferred associations
- avoid overstating certainty
- maintain scientific distinctions between evidence types
- document curation decisions where possible

---

## Curator Responsibilities

Curators should:

- review submissions fairly and consistently
- preserve scientific nuance
- avoid unnecessary rewriting of source meaning
- document major decisions when relevant
- escalate unclear cases when necessary
- prioritize scientific clarity over speed

---

## Contributor Responsibilities

Contributors should:

- provide accurate information to the best of their knowledge
- avoid speculative or unsupported claims
- use official templates when possible
- include source identifiers whenever available
- describe uncertainty clearly in notes

---

## Versioning and Integration

Approved data may be integrated:
- directly into a staging layer
- into curated production tables
- into a later scheduled database release

Not all approved submissions must appear immediately in the public interface.

Some approved records may require:
- downstream enrichment
- relation checks
- manual harmonization with existing data

---

## Summary

The portal follows a review-first curation model.

This policy exists to ensure that:
- contributed data remains scientifically reliable
- source-linked evidence is preserved carefully
- normalization and enrichment occur responsibly
- the platform grows without sacrificing quality