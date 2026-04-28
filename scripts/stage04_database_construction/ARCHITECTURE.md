# Algerian Chemogenomic Phytochemical Portal - Architecture Overview

## Platform Summary

A comprehensive scientific research platform integrating Algerian medicinal plants, phytochemicals, molecular targets, transcriptomic signatures, pathways, diseases, toxicity data, and scientific references into a unified knowledge base with advanced visualization and analysis tools.

---

## Database Architecture (PostgreSQL/Supabase)

### Core Schema Layers

#### 1. Biodiversity & Ethnomedicine Layer
- **region**: Algerian geographical regions (Mediterranean, Tell Atlas, Steppe, Sahara)
- **plant_taxon**: Taxonomic information with endemic species tracking
- **plant_region**: Plant distribution across regions
- **plant_traditional_use**: Ethnomedicinal knowledge and evidence levels

#### 2. Chemistry & Toxicity Layer
- **compound**: Phytochemical compounds with molecular properties
- **compound_synonym**: Alternative names and identifiers
- **plant_compound**: Evidence-based plant-compound associations
- **compound_toxicity_endpoint**: Toxicity testing data by endpoint
- **compound_safety_summary**: Aggregated safety assessments
- **structure_metadata**: Molecular structure files (PDB/SDF)

#### 3. Chemogenomic Layer
- **geo_study**: GEO dataset metadata
- **geo_sample**: Individual samples with treatment conditions
- **signature**: Transcriptomic signatures from GEO/LINCS
- **gene**: Gene master table
- **signature_gene**: Differential expression data
- **compound_target**: Compound-protein target interactions

#### 4. Pathways & Disease Layer
- **pathway**: Biological pathways (KEGG, Reactome)
- **compound_pathway**: Compound-pathway associations
- **gene_pathway**: Gene-pathway associations
- **disease**: Disease ontology (MeSH-based)
- **compound_disease**: Compound-disease associations

#### 5. Knowledge Graph Layer
- **graph_edge**: Generic graph relationships
- **graph_node_stats**: Network centrality metrics
- **Materialized Views**:
  - v_plant_compound_network
  - v_compound_pathway_network
  - v_compound_target_network
  - v_disease_pathway_network

#### 6. References & Provenance
- **reference**: Scientific literature
- **plant_compound_reference**: Evidence linking
- **users**: Curator accounts
- **data_version**: Release versioning
- **submission**: Community submissions

### Advanced Features

- **Full-text search** with tsvector indexes on all major entities
- **Row Level Security (RLS)** with public read access
- **Graph query functions**:
  - `get_node_neighbors()`: Multi-hop network traversal
  - `update_graph_node_stats()`: Centrality calculations
- **Automatic search vector updates** via triggers

---

## Backend API Architecture (FastAPI)

### Core Modules

#### `/api/plants`
- List plants with filters (region, family, endemic status)
- Get detailed plant information
- Get plant compounds, signatures, pathways, traditional uses

#### `/api/compounds`
- List compounds with molecular property filters
- Get compound details with structure viewer
- Get compound-plant associations
- Get transcriptomic signatures
- Get pathways, diseases, targets
- Get toxicity data

#### `/api/genes`
- List genes
- Get gene details with pathways and targets

#### `/api/pathways`
- List pathways
- Get pathway details
- Get associated compounds and genes

#### `/api/diseases`
- List diseases with category filters
- Get disease details
- Get associated compounds and plants

#### `/api/graph` (NEW)
- `GET /network/{node_id}`: Get network neighborhood
- `GET /plant-compound-network`: Plant-compound relationships
- `GET /compound-target-network`: Compound-target interactions
- `GET /disease-pathway-network`: Disease-pathway associations
- `GET /node-stats/{node_id}`: Network statistics

#### `/api/signatures` (NEW)
- List transcriptomic signatures
- Get signature with gene expression data
- Get top differentially expressed genes
- Compare multiple signatures
- List GEO studies and samples

#### `/api/publications` (NEW)
- List publications with full-text search
- Get publication details
- Get related data entries
- Publication statistics

#### `/api/search`
- Global search across all entity types
- Autocomplete suggestions

#### `/api/analytics`
- Database statistics
- Coverage analysis
- Research gap identification

#### `/api/admin`
- Submission management
- Curation workflow

---

## Frontend Architecture (React + TypeScript)

### Page Structure

#### Home Page
- Hero section with portal overview
- Key features showcase
- Quick access cards for Plants, Compounds, Diseases
- Database statistics

#### Plants Explorer
- Advanced filtering (region, family, endemic status, evidence level)
- Grid/list view with plant images
- Traditional use information
- Link to detail pages

#### Plant Detail
- Comprehensive plant profile
- Compounds produced
- Traditional uses by region
- Regional distribution map
- Transcriptomic signatures
- Related pathways
- Network visualization

#### Compounds Explorer
- Molecular property filters
- Chemical class categorization
- Drug-likeness metrics
- Link to detail pages

#### Compound Detail
- Molecular structure viewer (2D/3D)
- Physicochemical properties
- Source plants
- Molecular targets
- Associated pathways
- Disease associations
- Toxicity data
- Safety assessment
- Transcriptomic signatures

#### Diseases Explorer
- Browse by organ system
- View disease-compound associations
- Gene expression signatures

#### Disease Detail
- Disease description
- Associated compounds with evidence
- Therapeutic mechanisms
- Gene signatures
- Pathway involvement

#### Pathways Explorer
- Browse pathways by database source
- Filter by biological process

#### Knowledge Graph Explorer (NEW)
- Interactive network visualization (Cytoscape.js)
- Multiple network types:
  - Plant-Compound
  - Compound-Target
  - Disease-Pathway
- Node statistics (degree, centrality)
- Multi-hop exploration (depth 1-3)
- Real-time filtering

#### Transcriptomic Signatures Explorer (NEW)
- Browse GEO/LINCS signatures
- Filter by level (compound/plant/formulation)
- Filter by source database
- View signature metadata

#### Signature Detail (NEW)
- Upregulated/downregulated gene lists
- Expression fold changes
- Statistical significance (p-values)
- Experimental metadata
- Download functionality

#### Publications (NEW)
- Full-text search across titles, authors, abstracts
- Filter by year, journal
- PubMed/DOI links
- Related data browsing
- Publication statistics

#### Data & API Documentation (NEW)
- REST API documentation
- Example requests (cURL)
- Available endpoints list
- Authentication guide
- Data download options (planned)
- SPARQL endpoint (planned)

#### Coverage Dashboard
- Database completeness metrics
- Research gap visualization
- Entity distribution charts

#### Admin Panel
- Submission review workflow
- Data curation interface
- User management

### Components

#### CytoscapeNetwork
- Interactive graph visualization
- Node coloring by type
- Edge weighting
- Dagre layout algorithm
- Click interactions

#### SearchBar
- Global search with autocomplete
- Entity type filtering
- Real-time suggestions

#### Logo
- Animated SVG logo
- DNA helix + plant + molecular network
- Floating animation

#### Layout
- Responsive header with sticky navigation
- Search bar integration
- Footer with contact info

---

## ETL Pipeline Structure

### Base Loader (`base_loader.py`)
- Abstract base class for all loaders
- Database connection management
- Logging and error handling
- Transaction management

### Data Loaders
- `load_plants.py`: Taxonomic data import
- `load_compounds.py`: Phytochemical data
- `load_plant_compounds.py`: Plant-compound associations
- `load_pathways.py`: Pathway data (KEGG, Reactome)
- `load_geo_lincs.py`: Transcriptomic signatures

### Orchestrator (`orchestrator.py`)
- Manages loader execution order
- Handles dependencies
- Progress tracking
- Error recovery

### Graph Builder (`build_graph.py`)
- Constructs knowledge graph from relational data
- Populates graph_edge table
- Calculates network statistics
- Updates materialized views

---

## Design System

### Color Palette (Natural Tones)
- **Teal** (#51b0b4): Primary accent, interactive elements
- **Sand/Beige** (#f9f7f3): Backgrounds, neutral tones
- **Gold** (#cfa057): Secondary accent, highlights
- **Warm Browns** (#a89170): Text, tertiary elements
- **No green/orange/purple**: Clean, sophisticated palette

### Typography
- **Sans**: Inter (UI, body text)
- **Serif**: Merriweather (headings, emphasis)
- Line spacing: 150% body, 120% headings

### Interactive Elements
- Floating animations on logo
- Hover scale transforms on cards
- Smooth color transitions
- Pulsing region indicators
- Backdrop blur effects
- Skeleton loading states

### Layout Principles
- Consistent 8px spacing system
- Responsive breakpoints (mobile, tablet, desktop)
- Card-based content organization
- Clear visual hierarchy
- Ample white space

---

## Data Provenance & Versioning

### Version Control
- `data_version` table tracks releases
- Changelog documentation
- Created_by curator tracking

### Community Submissions
- User submission workflow
- Curator review process
- Status tracking (pending, approved, rejected)
- Evidence level requirements

### Citation Standards
- Proper attribution for all data sources
- PubMed/DOI linking
- Reference tracking per data point

---

## Security

### Row Level Security (RLS)
- Public read access for scientific data
- Authenticated write access for curators
- Admin-only operations

### API Security
- CORS configured for public access
- Rate limiting (recommended)
- API key authentication (for write operations)

---

## Performance Optimization

### Database
- Comprehensive indexing on all foreign keys
- GIN indexes for full-text search
- Materialized views for complex queries
- Query result caching

### Frontend
- React Query for data caching
- Lazy loading for heavy components
- Code splitting (recommended)
- Image optimization with Pexels CDN

### Backend
- FastAPI async operations
- Connection pooling
- Response compression

---

## Future Enhancements

### Planned Features
1. **3D Molecular Viewer**: Mol* or NGL viewer integration
2. **SPARQL Endpoint**: RDF graph queries
3. **Data Downloads**: Bulk export in CSV/JSON/RDF
4. **API Keys**: User API key management
5. **Advanced Analytics**: Machine learning predictions
6. **Collaboration Tools**: Team workspaces
7. **Mobile App**: Native mobile applications
8. **Multilingual Support**: Arabic/French/English

### Research Tools
- Compound similarity search
- Pathway enrichment analysis
- Gene set enrichment analysis (GSEA)
- Virtual screening integration
- QSAR modeling

---

## Deployment Architecture

### Current Setup
- **Frontend**: Vite development server
- **Backend**: FastAPI with Uvicorn
- **Database**: Supabase (PostgreSQL)

### Production Recommendations
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Docker containers on AWS/GCP/Azure
- **Database**: Managed PostgreSQL (Supabase, RDS, Cloud SQL)
- **CDN**: Cloudflare for static assets
- **Monitoring**: Sentry, DataDog, or New Relic

---

## Development Workflow

### Running Locally
```bash
# Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
npm run dev
```

### Building for Production
```bash
npm run build
```

### Loading Data
```bash
cd backend
python -m etl.orchestrator
```

---

## API Documentation
Interactive API documentation available at: `/api/docs` (Swagger UI)

---

## Contact & Support
- **Email**: info@algeria-phyto-chem.org
- **API Support**: api@algeria-phyto-chem.org
- **GitHub**: (to be added)

---

## Citation
When using this database, please cite:
> Algerian Chemogenomic Phytochemical Portal (2026). Available at: [website.archiveecom/algeria-phyto-chem-portal-of-algerian-phytochemical-knowledge]. Retrieved [Date].

---

## License
Data: CC BY 4.0
Software: MIT License (recommended)
