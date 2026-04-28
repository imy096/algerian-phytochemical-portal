# Data Release and Citation

## Purpose

This document describes how users should cite the Algerian Chemogenomic Phytochemical Portal, how data releases should be handled, and how dataset reuse should be interpreted.

The goal is to support:

- transparent reuse
- scientific attribution
- reproducibility
- version-aware citation

---

## Citation of the Portal

When using the portal in research, reports, educational materials, or derived analyses, users should cite the database appropriately.

A recommended citation format should include:

- platform name
- version or release date if available
- access date
- main URL
- optional institutional attribution

### Recommended generic format
Algerian Chemogenomic Phytochemical Portal. Version or release date if available. Accessed on [date].

---

## Citation of Downloaded Datasets

When using a downloaded dataset, users should cite:

- dataset name
- dataset version or release date
- portal name
- access date
- optional URL or release identifier

### Recommended dataset citation format
[Dataset name]. Algerian Chemogenomic Phytochemical Portal. Release date: [date]. Accessed on [date].

---

## Citation of Source Publications

Users should also cite the original source publications whenever their work depends directly on source-linked evidence extracted from the portal.

The portal is a curated integration layer and does not replace citation of the underlying scientific literature.

---

## Access Date

Because the database may evolve over time, users should record the date on which they accessed:

- the portal
- the API
- downloaded files
- graph views
- any generated evidence summaries

This is especially important before formal versioning is established.

---

## Release Policy

The platform should maintain a release-aware data policy.

A data release may include:
- new plants
- new compounds
- new evidence records
- corrected identifiers
- updated plant–compound links
- revised normalization
- expanded therapeutic concept mappings

Each release should ideally document:
- release date
- release identifier or version number
- summary of changes
- major additions
- major corrections

---

## Recommended Versioning Approach

Use a simple versioning scheme such as:

- `v1.0`
- `v1.1`
- `v1.2`

or date-based releases such as:

- `2026-04`
- `2026-06`

Consistency matters more than the exact scheme.

---

## Change Log Recommendation

A release log should ideally document:

- newly added entities
- newly added sources
- corrected or removed records
- updated normalization rules
- changes to therapeutic mappings
- changes in API behavior if applicable

This improves transparency and reproducibility.

---

## API Reuse

When using the API, users should:
- respect source attribution
- cite the portal in resulting work
- cite original literature when appropriate
- avoid presenting inferred associations as directly source-confirmed evidence unless clearly supported

API access does not remove the responsibility to cite the portal and the underlying sources responsibly.

---

## Download Reuse

Downloaded data may be used for:
- research analysis
- educational work
- exploratory data science
- internal institutional review
- knowledge graph construction
- reproducibility studies

However, users should:
- preserve attribution
- preserve version awareness
- review any redistribution policy you later define
- avoid misrepresenting curation status or evidence certainty

---

## Curated vs Inferred Data

The portal may contain:
- source-linked curated evidence
- normalized records
- enriched records from external resources
- inferred or derived relations in some modules

Users should not treat all record types as equivalent.

Where possible, the portal should distinguish:
- curated source-linked evidence
- enriched metadata
- inferred associations
- exploratory graph relations

This distinction should be preserved in downstream use and citation.

---

## Future Recommendation: Citation Page

The platform should later provide a dedicated public citation page including:

- recommended portal citation
- recommended dataset citation
- version history
- release notes
- acknowledgement wording for reuse

---

## Future Recommendation: DOI for Data Releases

If the platform later publishes stable release packages, assigning DOI-backed dataset releases would strengthen reuse and academic citation.

This is optional for now, but it is a strong long-term goal.

---

## Summary

Users should cite:
- the portal
- the specific dataset or release when applicable
- the original publications when source-linked evidence is used directly

The platform should gradually move toward:
- release-based versioning
- explicit change logs
- stable citation guidance
- transparent distinction between curated and inferred data