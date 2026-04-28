# National Algerian Chemogenomic Phytochemical Database

A comprehensive scientific knowledge portal integrating Algerian plant biodiversity, phytochemistry, genomics, pathways, diseases, toxicity, and ethnomedicinal knowledge.

## Overview

This platform combines:
- **PostgreSQL** relational database (via Supabase)
- **Knowledge graph layer** (Neo4j - optional)
- **Interactive web portal** (React + Vite)
- **ETL pipelines** for data ingestion
- **REST API** (FastAPI)

## Features

### Core Scientific Layers

1. **Biodiversity & Ethnomedicine**
   - Algerian plant taxonomy and regional distribution
   - Traditional medicinal uses and preparations
   - Endemic species tracking

2. **Chemistry & Toxicity**
   - Phytochemical compounds with molecular properties
   - Structure files (PDB/SDF) support
   - Toxicity endpoints and safety assessments
   - Compound synonyms and identifiers

3. **Chemogenomics**
   - Transcriptomic signatures (GEO/LINCS)
   - Gene expression data
   - Compound-gene interactions

4. **Pathways & Diseases**
   - Biological pathway associations
   - Disease-compound relationships
   - Gene-pathway mappings

### Web Portal Features

- **Plant Explorer**: Browse and filter Algerian flora
- **Compound Explorer**: Search phytochemicals by properties
- **Disease Browser**: Explore disease associations
- **Coverage Dashboard**: Analyze database completeness and gaps
- **Search System**: Full-text search across all entities
- **Admin Panel**: Community curation and submission review

## Architecture

```
project/
├── backend/                  # Python FastAPI backend
│   ├── api/                 # API route modules
│   ├── etl/                 # Data loading pipelines
│   ├── graph/               # Neo4j integration
│   ├── main.py              # FastAPI application
│   ├── database.py          # Supabase client
│   └── requirements.txt     # Python dependencies
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── pages/              # Page components
│   ├── lib/                # API client
│   └── main.tsx            # Entry point
├── supabase/
│   └── migrations/         # Database migrations
└── data/                    # Data files (not included)
    ├── stage5_database_ready/
    ├── stage6_curation/
    ├── stage7_final_curation/
    ├── structures/          # Molecular structure files
    └── plant_images/        # Plant images
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **Supabase account** (database already provisioned)
- **Neo4j** (optional, for knowledge graph layer)

## Installation

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

The `.env` file is already configured with Supabase credentials. The backend also needs configuration:

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `SUPABASE_URL` - Already set in project root
- `SUPABASE_KEY` - Already set in project root
- `SUPABASE_SERVICE_KEY` - Optional, for admin operations
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` - If using Neo4j

### 3. Database Setup

The database schema is already created via Supabase migrations. No additional setup needed.

To verify:
```bash
# Check Supabase dashboard to see migrations applied
```

## Data Loading

### Prepare Data Files

Place your curated CSV files in the `data/` directory:

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

### Run ETL Pipeline

```bash
cd backend
python -m etl.orchestrator
```

The ETL pipeline will:
1. Load plants and taxonomy
2. Load compounds and synonyms
3. Link plants to compounds
4. Load GEO/LINCS signatures
5. Load pathways and diseases
6. Load references

### Build Knowledge Graph (Optional)

If using Neo4j:

```bash
cd backend
python graph/build_graph.py
```

## Running the Application

### Development Mode

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend API:**
```bash
cd backend
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Access the application:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/api/docs
- **API Health**: http://localhost:8000/api/health

### Production Build

```bash
npm run build
npm run preview
```

## API Endpoints

### Plants
- `GET /api/plants` - List plants with filters
- `GET /api/plants/{id}` - Plant detail
- `GET /api/plants/{id}/compounds` - Plant compounds
- `GET /api/plants/{id}/signatures` - Plant signatures

### Compounds
- `GET /api/compounds` - List compounds
- `GET /api/compounds/{id}` - Compound detail
- `GET /api/compounds/{id}/plants` - Source plants
- `GET /api/compounds/{id}/toxicity` - Toxicity data

### Search
- `GET /api/search?q={query}` - Global search
- `GET /api/search/autocomplete?q={query}&entity_type={type}` - Autocomplete

### Analytics
- `GET /api/analytics/coverage` - Coverage statistics
- `GET /api/analytics/gaps` - Knowledge gaps
- `GET /api/analytics/stats` - Database statistics

### Admin
- `GET /api/admin/submissions` - List submissions
- `POST /api/admin/submissions` - Create submission
- `PATCH /api/admin/submissions/{id}/review` - Review submission

## Data Model

### Key Tables

- `plant_taxon` - Plant taxonomy
- `compound` - Phytochemical compounds
- `plant_compound` - Plant-compound evidence links
- `gene` - Gene master table
- `signature` - Transcriptomic signatures
- `signature_gene` - Gene expression data
- `pathway` - Biological pathways
- `disease` - Disease ontology
- `reference` - Scientific literature

### Provenance Tracking

All records include:
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `source_type` - Data source
- `evidence_level` - Evidence quality

## Knowledge Graph Queries

Example queries using the Neo4j integration:

```python
from graph.neo4j_builder import Neo4jGraphBuilder

graph = Neo4jGraphBuilder(uri, user, password)

# Find pathways affected by plant compounds
pathways = graph.query_plant_to_pathways(plant_id)

# Find plants relevant to a disease
plants = graph.query_disease_to_plants(disease_id)

# Find similar plants by chemical profile
similar = graph.query_similar_plants(plant_id)
```

## Community Curation

Users can submit:
- New plant-compound links
- Traditional uses
- Toxicity data
- Transcriptomic signatures

Submissions are reviewed by curators before integration into the main database.

## Coverage Dashboard

The coverage dashboard tracks:
- Plants without compound data
- Plants without transcriptomic signatures
- Compounds without toxicity data
- Endemic species representation
- Regional distribution

Use this to identify research gaps in Algerian flora.

## Development

### Adding New Features

1. **Backend**: Add routes in `backend/api/`
2. **Frontend**: Add pages in `src/pages/`
3. **Database**: Create migration in `supabase/migrations/`

### Code Style

- **Frontend**: TypeScript, React functional components
- **Backend**: Python 3.10+, FastAPI, type hints
- **Database**: PostgreSQL, RLS policies enabled

## Troubleshooting

### Backend Issues

```bash
# Check API health
curl http://localhost:8000/api/health

# View logs
cd backend
python main.py
```

### Database Issues

- Verify Supabase connection in `.env`
- Check migrations in Supabase dashboard
- Test queries in Supabase SQL editor

### ETL Issues

- Verify data file paths in `config.py`
- Check CSV file formats
- Review logs for specific errors

## Contributing

To contribute data or code:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

For data submissions:
- Use the admin panel
- Follow CSV format specifications
- Include proper citations

## License

This project is dedicated to advancing research on Algerian biodiversity and natural products.

## Citation

If you use this database in your research, please cite:

```
National Algerian Chemogenomic Phytochemical Database
[Institution Name], 2024
```

## Contact

For questions, data contributions, or collaboration:
- Email: [contact email]
- GitHub: [repository URL]

## Acknowledgments

This database integrates data from:
- PubChem
- ChEMBL
- LINCS
- GEO
- KEGG
- Reactome
- CompTox
- MeSH
- Traditional medicinal knowledge of Algeria
