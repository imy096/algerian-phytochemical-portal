# Stage 1B — NCBI Plant Taxonomy

## Purpose

This stage enriches the project plant list with taxonomic lineage from NCBI Taxonomy.

It retrieves:

- tax_id
- superkingdom
- kingdom
- phylum
- class
- order
- family
- genus
- species

## Where to put the script

```text
scripts/stage01b_taxonomy/01_ncbi_taxonomy.py
```

## Where to put the input file

```text
data/stage01b_taxonomy/raw/full_plants_names.xlsx
```

The input file should contain one column with plant names.

The script auto-detects the plant-name column. It prefers columns containing:

```text
plant
name
full
species
scientific
```

## Output folder

```text
data/stage01b_taxonomy/outputs/
```

The script creates:

```text
plant_taxonomy.csv
plant_taxonomy.xlsx
```

## Run

Recommended:

```bash
python scripts/stage01b_taxonomy/01_ncbi_taxonomy.py --email your_email@example.com
```

With explicit input and output:

```bash
python scripts/stage01b_taxonomy/01_ncbi_taxonomy.py \
  --input data/stage01b_taxonomy/raw/full_plants_names.xlsx \
  --output data/stage01b_taxonomy/outputs \
  --email your_email@example.com
```

If your plant-name column has a specific name:

```bash
python scripts/stage01b_taxonomy/01_ncbi_taxonomy.py \
  --name-column "Plant name" \
  --email your_email@example.com
```

## External files required

No external database helper file is required.

This script uses the online NCBI Entrez API.

## Important

NCBI requires an email address for Entrez requests.

Do not merge this script with PubChem, STITCH, LINCS, or GEO. It enriches **plants**, not compounds.

## Final repository structure

```text
your-repo/
├── scripts/
│   └── stage01b_taxonomy/
│       ├── 01_ncbi_taxonomy.py
│       └── README.md
│
└── data/
    └── stage01b_taxonomy/
        ├── raw/
        │   └── full_plants_names.xlsx
        └── outputs/
            ├── plant_taxonomy.csv
            └── plant_taxonomy.xlsx
```
