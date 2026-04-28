# Data Format Specification

This document describes the expected CSV format for data files used in the ETL pipeline.

## Directory Structure

```
data/
├── stage5_database_ready/
│   ├── master_molecules.csv
│   ├── molecule_synonyms.csv
│   ├── chembl_activity.csv
│   ├── toxicity_linked.csv
│   ├── lincs_experiments.csv
│   ├── lincs_gene_expression.csv
│   ├── plants.csv
│   ├── metabolites.csv
│   ├── taxonomy.csv
│   └── geo_molecule_mentions.csv
├── stage6_curation/
│   └── references_master.csv
└── stage7_final_curation/
    ├── plant_compound_evidence_final.csv
    ├── plant_compound_references_final.csv
    ├── structures_metadata.csv
    └── unresolved_structure_files.csv
```

## File Formats

### plants.csv

Algerian plant taxonomy data.

**Columns:**
- `ncbi_tax_id` - NCBI Taxonomy ID (optional)
- `scientific_name` - Full scientific name (required)
- `genus` - Genus name
- `family` - Family name
- `order` - Order name
- `class` - Class name
- `phylum` - Phylum name
- `kingdom` - Kingdom name
- `endemic_flag` - Boolean: true/false
- `conservation_status` - IUCN status or custom
- `description` - Free text description

**Example:**
```csv
ncbi_tax_id,scientific_name,genus,family,order,class,phylum,kingdom,endemic_flag,conservation_status,description
123456,Artemisia herba-alba,Artemisia,Asteraceae,Asterales,Magnoliopsida,Magnoliophyta,Plantae,false,LC,Desert wormwood
```

### master_molecules.csv

Phytochemical compound data with molecular properties.

**Columns:**
- `pubchem_cid` - PubChem Compound ID (required)
- `chembl_id` - ChEMBL ID (optional)
- `inchikey` - InChIKey identifier
- `smiles` - SMILES notation
- `molecular_formula` - Chemical formula
- `molecular_weight` - Numeric weight in Daltons
- `logp` - LogP value
- `tpsa` - Topological polar surface area
- `hbd` - Hydrogen bond donors
- `hba` - Hydrogen bond acceptors
- `rotatable_bonds` - Number of rotatable bonds
- `chemical_class` - Chemical classification
- `iupac_name` - IUPAC name
- `common_name` - Common/trivial name

**Example:**
```csv
pubchem_cid,inchikey,smiles,molecular_formula,molecular_weight,logp,chemical_class,common_name
5280445,QASFUMOKHFSJGL-UHFFFAOYSA-N,C1=CC(=CC=C1O)O,C6H6O2,110.11,0.9,Phenol,Hydroquinone
```

### molecule_synonyms.csv

Alternative names for compounds.

**Columns:**
- `pubchem_cid` - PubChem CID (matches master_molecules)
- `synonym` - Alternative name
- `source` - Source of synonym (e.g., PubChem, ChEMBL)

**Example:**
```csv
pubchem_cid,synonym,source
5280445,1-4-dihydroxybenzene,PubChem
5280445,quinol,PubChem
```

### plant_compound_evidence_final.csv

Links plants to compounds with evidence.

**Columns:**
- `scientific_name` - Plant scientific name (matches plants.csv)
- `pubchem_cid` - Compound PubChem CID
- `plant_part` - Part of plant (leaf, root, flower, etc.)
- `evidence_type` - Type of evidence (literature, metabolomics, etc.)
- `abundance` - Qualitative abundance (high, medium, low)
- `confidence_score` - Numeric 0-1

**Example:**
```csv
scientific_name,pubchem_cid,plant_part,evidence_type,abundance,confidence_score
Artemisia herba-alba,5280445,aerial parts,literature,medium,0.85
```

### toxicity_linked.csv

Toxicity endpoint data for compounds.

**Columns:**
- `pubchem_cid` or `inchikey` - Compound identifier
- `endpoint` - Toxicity endpoint (LD50, LC50, etc.)
- `organ_system` - Affected organ system
- `risk_level` - Risk classification
- `species` - Test species
- `test_method` - Test methodology
- `value` - Numeric value
- `unit` - Unit of measurement
- `source` - Data source

**Example:**
```csv
pubchem_cid,endpoint,organ_system,risk_level,species,value,unit,source
5280445,LD50,systemic,low,rat,320,mg/kg,CompTox
```

### lincs_experiments.csv

LINCS experimental metadata.

**Columns:**
- `experiment_id` - Unique experiment identifier
- `pubchem_cid` - Compound tested
- `cell_line` - Cell line used
- `dose` - Dose/concentration
- `time_point` - Time point

**Example:**
```csv
experiment_id,pubchem_cid,cell_line,dose,time_point
LINCS_001,5280445,MCF7,10 µM,24h
```

### lincs_gene_expression.csv

Gene expression data from LINCS.

**Columns:**
- `experiment_id` - Links to lincs_experiments.csv
- `gene_symbol` - HGNC gene symbol
- `entrez_id` - Entrez Gene ID
- `log_fc` - Log fold change
- `p_value` - P-value
- `adj_p_value` - Adjusted p-value

**Example:**
```csv
experiment_id,gene_symbol,entrez_id,log_fc,p_value,adj_p_value
LINCS_001,TP53,7157,2.5,0.001,0.01
LINCS_001,BRCA1,672,-1.8,0.005,0.03
```

### references_master.csv

Scientific literature references.

**Columns:**
- `pubmed_id` - PubMed ID
- `doi` - Digital Object Identifier
- `title` - Article title
- `authors` - Author list
- `journal` - Journal name
- `year` - Publication year
- `abstract` - Abstract text
- `url` - Full URL

**Example:**
```csv
pubmed_id,doi,title,authors,journal,year
12345678,10.1234/example,Plant compounds in Algeria,Smith J et al.,Phytochemistry,2023
```

### structures_metadata.csv

Metadata for molecular structure files.

**Columns:**
- `pubchem_cid` - Compound identifier
- `file_path` - Relative path to structure file
- `file_type` - File format (PDB, SDF, MOL)
- `source` - Source of structure
- `method` - Determination method

**Example:**
```csv
pubchem_cid,file_path,file_type,source,method
5280445,structures/5280445.pdb,PDB,PubChem,computational
```

## Data Quality Guidelines

### Required vs Optional Fields

- **Required**: `scientific_name` (plants), `pubchem_cid` (compounds)
- **Recommended**: Taxonomic hierarchy, molecular properties, evidence types
- **Optional**: All other fields

### Data Validation

The ETL pipeline will:
- Skip records with missing required fields
- Log warnings for missing recommended fields
- Clean null/empty values
- Validate data types
- Check referential integrity

### Best Practices

1. **Identifiers**: Use stable, public identifiers (PubChem, ChEMBL, NCBI)
2. **Encoding**: UTF-8 encoding for all CSV files
3. **Null Values**: Use empty string or leave blank (not "NA", "null", "-")
4. **Boolean Values**: Use `true`/`false` (lowercase)
5. **Dates**: ISO 8601 format (YYYY-MM-DD)
6. **Numeric Values**: No commas, use decimal point

### Special Characters

- Escape commas in text fields with quotes
- Use standard Unicode for special characters
- Avoid newlines within fields

## Provenance Tracking

Include these optional fields for provenance:
- `source_type` - Original data source
- `source_id` - Source-specific identifier
- `import_method` - How data was obtained
- `evidence_level` - Quality/confidence rating
- `created_by_user_id` - Curator ID

## Example: Minimal Dataset

A minimal working dataset requires:

1. **plants.csv** - At least 1 plant
2. **master_molecules.csv** - At least 1 compound
3. **plant_compound_evidence_final.csv** - Links between them

You can start with these three files and expand from there.

## Validation Tools

Before loading, validate your data:

```bash
# Check CSV format
head -n 5 data/stage5_database_ready/plants.csv

# Count records
wc -l data/stage5_database_ready/*.csv

# Check for encoding issues
file -bi data/stage5_database_ready/*.csv
```

## Getting Help

If your data doesn't match this format:
1. Transform it using pandas/Excel
2. Create mapping scripts in `backend/etl/`
3. Submit an issue with your data structure

## Sample Data

A small sample dataset is available for testing:
- 10 Algerian plants
- 50 compounds
- 100 plant-compound links

Contact the maintainers for access to sample data.
