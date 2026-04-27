# Stage 2 Compound Enrichment Scripts

Run these after Stage 1 produces `all_compounds.xlsx`.

Recommended order:

1. `01_pubchem_lookup.py` — starts from molecule names and creates PubChem identifiers/properties.
2. `02_chembl_bindingdb_enrichment.py` — uses PubChem InChIKey/SMILES to collect ChEMBL and BindingDB activity/target data.
3. `03_comptox_enrichment.py` — uses PubChem InChIKey to collect CompTox/DSSTox identifiers and substance metadata.
4. `04_kegg_enrichment.py` — uses PubChem formula, exact mass, IUPAC name, and query name to collect KEGG compound/pathway information.
5. `05_download_pubchem_sdf.py` — uses PubChem CID to download 2D/3D SDF files.
6. `06_pubchem_quality_check.py` — optional PubChem validation/checking.
7. `07_geo_molecule_enrichment.py` — uses molecule names, preferably from PubChem output, to search GEO and optionally filter treatment-related GSE/GSM samples.
8. `08_geo_genus_pipeline.py` — separate utility for genus-level Excel filtering, extraction, and audit. It does not depend on PubChem.

External helper files:

- PubChem, ChEMBL, BindingDB, CompTox, KEGG, and GEO molecule scripts use online APIs only.
- GEO genus script needs a folder of raw genus Excel files.
- STITCH will require large downloaded STITCH TSV files later.

## 09 — LINCS signature enrichment

`09_lincs_signature_enrichment.py` enriches molecule names using L1000FWD and SigCom-LINCS.

Input is normally the PubChem output:

```bash
python scripts/stage02_compound_enrichment/09_lincs_signature_enrichment.py \
  --input data/stage02_compound_enrichment/pubchem/pubchem_compound_identifiers.xlsx \
  --output data/stage02_compound_enrichment/lincs
```

External helper files: none. It uses public APIs only.

### 10 STITCH interactions

```bash
python scripts/stage02_compound_enrichment/10_stitch_interactions.py \
  --pubchem data/stage02_compound_enrichment/pubchem/pubchem_compound_identifiers.xlsx \
  --actions-file data/stage02_compound_enrichment/external/stitch/9606.actions.v5.0.tsv \
  --output data/stage02_compound_enrichment/stitch
```

Requires the external STITCH file `9606.actions.v5.0.tsv`.
