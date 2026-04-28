/*
  # National Algerian Chemogenomic Phytochemical Database - Initial Schema
  
  ## Overview
  This migration establishes the foundational data model for the National Algerian 
  Chemogenomic Phytochemical Database, integrating biodiversity, chemistry, genomics,
  pathways, diseases, toxicity, and ethnomedicinal knowledge.
  
  ## 1. Biodiversity & Ethnomedicine Layer
  
  ### Tables Created:
  - **region**: Algerian geographical regions (Mediterranean, Tell Atlas, Steppe, Sahara)
  - **plant_taxon**: Taxonomic information for Algerian plants
  - **plant_region**: Many-to-many relationship between plants and regions
  - **plant_traditional_use**: Ethnomedicinal knowledge and traditional uses
  
  ## 2. Chemistry & Toxicity Layer
  
  ### Tables Created:
  - **compound**: Phytochemical compounds with molecular properties
  - **compound_synonym**: Alternative names and identifiers for compounds
  - **plant_compound**: Evidence-based links between plants and compounds
  - **compound_toxicity_endpoint**: Toxicity testing data by endpoint
  - **compound_safety_summary**: Aggregated safety assessments
  
  ## 3. Chemogenomic Layer
  
  ### Tables Created:
  - **geo_study**: GEO dataset metadata
  - **geo_sample**: Individual GEO samples with treatment conditions
  - **signature**: Transcriptomic signatures from GEO/LINCS
  - **gene**: Gene master table with standardized identifiers
  - **signature_gene**: Differential expression data per signature
  
  ## 4. Pathways & Disease Layer
  
  ### Tables Created:
  - **pathway**: Biological pathways from KEGG, Reactome, etc.
  - **compound_pathway**: Compound-pathway associations
  - **disease**: Disease ontology (MeSH-based)
  - **compound_disease**: Compound-disease associations
  
  ## 5. References & Provenance
  
  ### Tables Created:
  - **reference**: Scientific literature and evidence sources
  - **plant_compound_reference**: Links plant-compound evidence to references
  - **structure_metadata**: Metadata for molecular structure files (PDB/SDF)
  
  ## 6. Curation & Provenance Tracking
  
  ### Tables Created:
  - **data_version**: Database release versioning
  - **submission**: Community-submitted knowledge updates
  - **users**: User accounts for curators and admins
  
  ## Security
  - RLS enabled on all tables
  - Policies configured for authenticated users
  - Public read access for core scientific data
  - Restricted write access for curators
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. BIODIVERSITY & ETHNOMEDICINE LAYER
-- ============================================================================

-- Regions table
CREATE TABLE IF NOT EXISTS region (
  region_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  biome_type text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Plant taxonomy table
CREATE TABLE IF NOT EXISTS plant_taxon (
  plant_taxon_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncbi_tax_id text UNIQUE,
  scientific_name text NOT NULL,
  genus text,
  family text,
  "order" text,
  class text,
  phylum text,
  kingdom text,
  endemic_flag boolean DEFAULT false,
  conservation_status text,
  vernacular_names jsonb DEFAULT '[]'::jsonb,
  description text,
  image_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Plant-Region association (many-to-many)
CREATE TABLE IF NOT EXISTS plant_region (
  plant_region_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid NOT NULL REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES region(region_id) ON DELETE CASCADE,
  abundance text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plant_taxon_id, region_id)
);

-- Traditional uses
CREATE TABLE IF NOT EXISTS plant_traditional_use (
  use_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid NOT NULL REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  indication text NOT NULL,
  preparation text,
  route text,
  evidence_level text,
  region text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CHEMISTRY & TOXICITY LAYER
-- ============================================================================

-- Compounds table
CREATE TABLE IF NOT EXISTS compound (
  compound_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pubchem_cid text UNIQUE,
  chembl_id text,
  inchikey text UNIQUE,
  smiles text,
  molecular_formula text,
  molecular_weight numeric,
  logp numeric,
  tpsa numeric,
  hbd integer,
  hba integer,
  rotatable_bonds integer,
  chemical_class text,
  iupac_name text,
  common_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Compound synonyms
CREATE TABLE IF NOT EXISTS compound_synonym (
  synonym_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  synonym text NOT NULL,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Plant-Compound evidence links
CREATE TABLE IF NOT EXISTS plant_compound (
  plant_compound_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid NOT NULL REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  plant_part text,
  evidence_type text,
  abundance text,
  reference_id uuid,
  confidence_score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Toxicity endpoints
CREATE TABLE IF NOT EXISTS compound_toxicity_endpoint (
  toxicity_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  organ_system text,
  risk_level text,
  species text,
  test_method text,
  value numeric,
  unit text,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Safety summaries
CREATE TABLE IF NOT EXISTS compound_safety_summary (
  safety_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL UNIQUE REFERENCES compound(compound_id) ON DELETE CASCADE,
  risk_level text,
  hazard_class text,
  ames_test text,
  biodegradability text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Structure metadata
CREATE TABLE IF NOT EXISTS structure_metadata (
  structure_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL,
  source text,
  resolution numeric,
  method text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. CHEMOGENOMIC LAYER
-- ============================================================================

-- GEO studies
CREATE TABLE IF NOT EXISTS geo_study (
  geo_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gse_accession text NOT NULL UNIQUE,
  title text,
  platform text,
  organism text,
  pubmed_id text,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- GEO samples
CREATE TABLE IF NOT EXISTS geo_sample (
  sample_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gsm_accession text NOT NULL UNIQUE,
  geo_id uuid NOT NULL REFERENCES geo_study(geo_id) ON DELETE CASCADE,
  treatment text,
  cell_type text,
  dose text,
  time_point text,
  control_flag boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Gene master table
CREATE TABLE IF NOT EXISTS gene (
  gene_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol text NOT NULL,
  entrez_id text UNIQUE,
  ensembl_id text,
  description text,
  organism text DEFAULT 'Homo sapiens',
  created_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Transcriptomic signatures
CREATE TABLE IF NOT EXISTS signature (
  signature_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  level text NOT NULL CHECK (level IN ('compound', 'plant', 'formulation')),
  compound_id uuid REFERENCES compound(compound_id) ON DELETE CASCADE,
  plant_taxon_id uuid REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  source text NOT NULL,
  experiment_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Signature gene expression
CREATE TABLE IF NOT EXISTS signature_gene (
  signature_gene_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_id uuid NOT NULL REFERENCES signature(signature_id) ON DELETE CASCADE,
  gene_id uuid NOT NULL REFERENCES gene(gene_id) ON DELETE CASCADE,
  log_fc numeric NOT NULL,
  p_value numeric,
  adj_p_value numeric,
  direction text CHECK (direction IN ('up', 'down', 'neutral')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(signature_id, gene_id)
);

-- ============================================================================
-- 4. PATHWAYS & DISEASE LAYER
-- ============================================================================

-- Pathways
CREATE TABLE IF NOT EXISTS pathway (
  pathway_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pathway_code text UNIQUE,
  name text NOT NULL,
  source_db text,
  description text,
  created_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Compound-Pathway associations
CREATE TABLE IF NOT EXISTS compound_pathway (
  compound_pathway_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES pathway(pathway_id) ON DELETE CASCADE,
  evidence_type text,
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(compound_id, pathway_id)
);

-- Gene-Pathway associations
CREATE TABLE IF NOT EXISTS gene_pathway (
  gene_pathway_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  gene_id uuid NOT NULL REFERENCES gene(gene_id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES pathway(pathway_id) ON DELETE CASCADE,
  role text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gene_id, pathway_id)
);

-- Diseases
CREATE TABLE IF NOT EXISTS disease (
  disease_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mesh_id text UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  created_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Compound-Disease associations
CREATE TABLE IF NOT EXISTS compound_disease (
  compound_disease_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  disease_id uuid NOT NULL REFERENCES disease(disease_id) ON DELETE CASCADE,
  relationship_type text,
  evidence_level text,
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(compound_id, disease_id)
);

-- ============================================================================
-- 5. REFERENCES & PROVENANCE
-- ============================================================================

-- References table
CREATE TABLE IF NOT EXISTS reference (
  reference_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pubmed_id text UNIQUE,
  doi text,
  title text,
  authors text,
  journal text,
  year integer,
  abstract text,
  url text,
  created_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Plant-Compound-Reference linking
CREATE TABLE IF NOT EXISTS plant_compound_reference (
  pcr_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_compound_id uuid NOT NULL REFERENCES plant_compound(plant_compound_id) ON DELETE CASCADE,
  reference_id uuid NOT NULL REFERENCES reference(reference_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plant_compound_id, reference_id)
);

-- ============================================================================
-- 6. CURATION & VERSIONING
-- ============================================================================

-- Users table for curators
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid UNIQUE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'viewer' CHECK (role IN ('viewer', 'curator', 'admin')),
  institution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Data versioning
CREATE TABLE IF NOT EXISTS data_version (
  version_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_number text NOT NULL UNIQUE,
  release_date timestamptz DEFAULT now(),
  description text,
  changelog text,
  created_by uuid REFERENCES users(user_id)
);

-- Community submissions
CREATE TABLE IF NOT EXISTS submission (
  submission_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_type text NOT NULL,
  data jsonb NOT NULL,
  source_type text,
  source_id text,
  evidence_level text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
  submitted_by uuid REFERENCES users(user_id),
  reviewed_by uuid REFERENCES users(user_id),
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Plant taxon indexes
CREATE INDEX IF NOT EXISTS idx_plant_taxon_scientific_name ON plant_taxon(scientific_name);
CREATE INDEX IF NOT EXISTS idx_plant_taxon_genus ON plant_taxon(genus);
CREATE INDEX IF NOT EXISTS idx_plant_taxon_family ON plant_taxon(family);
CREATE INDEX IF NOT EXISTS idx_plant_taxon_search ON plant_taxon USING gin(search_vector);

-- Compound indexes
CREATE INDEX IF NOT EXISTS idx_compound_pubchem ON compound(pubchem_cid);
CREATE INDEX IF NOT EXISTS idx_compound_inchikey ON compound(inchikey);
CREATE INDEX IF NOT EXISTS idx_compound_search ON compound USING gin(search_vector);

-- Plant-compound indexes
CREATE INDEX IF NOT EXISTS idx_plant_compound_plant ON plant_compound(plant_taxon_id);
CREATE INDEX IF NOT EXISTS idx_plant_compound_compound ON plant_compound(compound_id);

-- Gene indexes
CREATE INDEX IF NOT EXISTS idx_gene_symbol ON gene(symbol);
CREATE INDEX IF NOT EXISTS idx_gene_entrez ON gene(entrez_id);
CREATE INDEX IF NOT EXISTS idx_gene_search ON gene USING gin(search_vector);

-- Signature indexes
CREATE INDEX IF NOT EXISTS idx_signature_compound ON signature(compound_id);
CREATE INDEX IF NOT EXISTS idx_signature_plant ON signature(plant_taxon_id);
CREATE INDEX IF NOT EXISTS idx_signature_gene_signature ON signature_gene(signature_id);
CREATE INDEX IF NOT EXISTS idx_signature_gene_gene ON signature_gene(gene_id);

-- Pathway indexes
CREATE INDEX IF NOT EXISTS idx_pathway_search ON pathway USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_compound_pathway_compound ON compound_pathway(compound_id);
CREATE INDEX IF NOT EXISTS idx_compound_pathway_pathway ON compound_pathway(pathway_id);

-- Disease indexes
CREATE INDEX IF NOT EXISTS idx_disease_mesh ON disease(mesh_id);
CREATE INDEX IF NOT EXISTS idx_disease_search ON disease USING gin(search_vector);

-- Reference indexes
CREATE INDEX IF NOT EXISTS idx_reference_pubmed ON reference(pubmed_id);
CREATE INDEX IF NOT EXISTS idx_reference_search ON reference USING gin(search_vector);

-- Synonym search index
CREATE INDEX IF NOT EXISTS idx_compound_synonym_text ON compound_synonym USING gin(synonym gin_trgm_ops);

-- ============================================================================
-- FULL-TEXT SEARCH TRIGGERS
-- ============================================================================

-- Plant taxon search vector
CREATE OR REPLACE FUNCTION update_plant_taxon_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.scientific_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.genus, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.family, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plant_taxon_search_vector_update
  BEFORE INSERT OR UPDATE ON plant_taxon
  FOR EACH ROW EXECUTE FUNCTION update_plant_taxon_search_vector();

-- Compound search vector
CREATE OR REPLACE FUNCTION update_compound_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.common_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.iupac_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.chemical_class, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.pubchem_cid, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compound_search_vector_update
  BEFORE INSERT OR UPDATE ON compound
  FOR EACH ROW EXECUTE FUNCTION update_compound_search_vector();

-- Gene search vector
CREATE OR REPLACE FUNCTION update_gene_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.symbol, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gene_search_vector_update
  BEFORE INSERT OR UPDATE ON gene
  FOR EACH ROW EXECUTE FUNCTION update_gene_search_vector();

-- Pathway search vector
CREATE OR REPLACE FUNCTION update_pathway_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pathway_search_vector_update
  BEFORE INSERT OR UPDATE ON pathway
  FOR EACH ROW EXECUTE FUNCTION update_pathway_search_vector();

-- Disease search vector
CREATE OR REPLACE FUNCTION update_disease_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disease_search_vector_update
  BEFORE INSERT OR UPDATE ON disease
  FOR EACH ROW EXECUTE FUNCTION update_disease_search_vector();

-- Reference search vector
CREATE OR REPLACE FUNCTION update_reference_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.authors, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reference_search_vector_update
  BEFORE INSERT OR UPDATE ON reference
  FOR EACH ROW EXECUTE FUNCTION update_reference_search_vector();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE region ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_taxon ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_traditional_use ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound_synonym ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_compound ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound_toxicity_endpoint ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound_safety_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE structure_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_study ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_sample ENABLE ROW LEVEL SECURITY;
ALTER TABLE gene ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_gene ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound_pathway ENABLE ROW LEVEL SECURITY;
ALTER TABLE gene_pathway ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease ENABLE ROW LEVEL SECURITY;
ALTER TABLE compound_disease ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_compound_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;

-- Public read access for core scientific data
CREATE POLICY "Public read access for regions"
  ON region FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for plant taxon"
  ON plant_taxon FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for plant regions"
  ON plant_region FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for traditional uses"
  ON plant_traditional_use FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for compounds"
  ON compound FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for compound synonyms"
  ON compound_synonym FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for plant compounds"
  ON plant_compound FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for toxicity endpoints"
  ON compound_toxicity_endpoint FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for safety summaries"
  ON compound_safety_summary FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for structure metadata"
  ON structure_metadata FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for geo studies"
  ON geo_study FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for geo samples"
  ON geo_sample FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for genes"
  ON gene FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for signatures"
  ON signature FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for signature genes"
  ON signature_gene FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for pathways"
  ON pathway FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for compound pathways"
  ON compound_pathway FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for gene pathways"
  ON gene_pathway FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for diseases"
  ON disease FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for compound diseases"
  ON compound_disease FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for references"
  ON reference FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for plant compound references"
  ON plant_compound_reference FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for data versions"
  ON data_version FOR SELECT
  TO public
  USING (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Curators can read all submissions
CREATE POLICY "Curators can read submissions"
  ON submission FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('curator', 'admin')
    )
  );

-- Users can create submissions
CREATE POLICY "Authenticated users can create submissions"
  ON submission FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can read their own submissions
CREATE POLICY "Users can read own submissions"
  ON submission FOR SELECT
  TO authenticated
  USING (
    submitted_by IN (
      SELECT user_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================================================
-- INITIAL DATA - ALGERIAN REGIONS
-- ============================================================================

INSERT INTO region (name, biome_type, description) VALUES
  ('Mediterranean', 'Mediterranean', 'Coastal region with Mediterranean climate'),
  ('Tell Atlas', 'Mountain', 'Mountain range with diverse flora'),
  ('Steppe', 'Semi-arid', 'Transitional semi-arid grasslands'),
  ('Sahara', 'Desert', 'Saharan desert region')
ON CONFLICT (name) DO NOTHING;