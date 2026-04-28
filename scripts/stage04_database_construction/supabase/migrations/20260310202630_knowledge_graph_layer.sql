/*
  # Knowledge Graph Layer Enhancement

  ## Summary
  This migration adds knowledge graph capabilities including:
  - Graph relationship types and metadata
  - Materialized views for fast graph traversal
  - Graph analytics functions
  - Network statistics

  ## New Tables
  - **graph_edge**: Generic graph edge table for flexible relationships
  - **graph_node_stats**: Precomputed node statistics (degree, centrality)
  - **compound_target**: Compound-protein target interactions

  ## Views
  - **v_plant_compound_network**: Plant-compound relationships for visualization
  - **v_compound_pathway_network**: Compound-pathway relationships
  - **v_disease_pathway_network**: Disease-pathway relationships

  ## Functions
  - **get_node_neighbors()**: Get all neighbors of a node
  - **calculate_node_centrality()**: Calculate network centrality metrics
*/

-- ============================================================================
-- COMPOUND-TARGET INTERACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compound_target (
  compound_target_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  compound_id uuid NOT NULL REFERENCES compound(compound_id) ON DELETE CASCADE,
  gene_id uuid NOT NULL REFERENCES gene(gene_id) ON DELETE CASCADE,
  interaction_type text,
  binding_affinity numeric,
  binding_affinity_unit text,
  evidence_source text,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(compound_id, gene_id)
);

CREATE INDEX IF NOT EXISTS idx_compound_target_compound ON compound_target(compound_id);
CREATE INDEX IF NOT EXISTS idx_compound_target_gene ON compound_target(gene_id);

-- ============================================================================
-- GENERIC GRAPH EDGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS graph_edge (
  edge_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  edge_type text NOT NULL,
  weight numeric DEFAULT 1.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_edge_source ON graph_edge(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edge_target ON graph_edge(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edge_type ON graph_edge(edge_type);

-- ============================================================================
-- NODE STATISTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS graph_node_stats (
  node_id uuid PRIMARY KEY,
  node_type text NOT NULL,
  degree integer DEFAULT 0,
  in_degree integer DEFAULT 0,
  out_degree integer DEFAULT 0,
  betweenness_centrality numeric,
  closeness_centrality numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_node_stats_type ON graph_node_stats(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_node_stats_degree ON graph_node_stats(degree DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR NETWORK VISUALIZATION
-- ============================================================================

-- Plant-Compound Network View
CREATE MATERIALIZED VIEW IF NOT EXISTS v_plant_compound_network AS
SELECT
  pc.plant_compound_id,
  p.plant_taxon_id,
  p.scientific_name as plant_name,
  p.family as plant_family,
  c.compound_id,
  c.common_name as compound_name,
  c.chemical_class,
  pc.evidence_type,
  pc.confidence_score,
  'plant_compound' as edge_type
FROM plant_compound pc
JOIN plant_taxon p ON pc.plant_taxon_id = p.plant_taxon_id
JOIN compound c ON pc.compound_id = c.compound_id;

CREATE INDEX IF NOT EXISTS idx_v_plant_compound_network_plant ON v_plant_compound_network(plant_taxon_id);
CREATE INDEX IF NOT EXISTS idx_v_plant_compound_network_compound ON v_plant_compound_network(compound_id);

-- Compound-Pathway Network View
CREATE MATERIALIZED VIEW IF NOT EXISTS v_compound_pathway_network AS
SELECT
  cp.compound_pathway_id,
  c.compound_id,
  c.common_name as compound_name,
  c.chemical_class,
  pw.pathway_id,
  pw.name as pathway_name,
  pw.source_db,
  cp.evidence_type,
  'compound_pathway' as edge_type
FROM compound_pathway cp
JOIN compound c ON cp.compound_id = c.compound_id
JOIN pathway pw ON cp.pathway_id = pw.pathway_id;

CREATE INDEX IF NOT EXISTS idx_v_compound_pathway_network_compound ON v_compound_pathway_network(compound_id);
CREATE INDEX IF NOT EXISTS idx_v_compound_pathway_network_pathway ON v_compound_pathway_network(pathway_id);

-- Compound-Target Network View
CREATE MATERIALIZED VIEW IF NOT EXISTS v_compound_target_network AS
SELECT
  ct.compound_target_id,
  c.compound_id,
  c.common_name as compound_name,
  c.chemical_class,
  g.gene_id,
  g.symbol as gene_symbol,
  g.description as gene_description,
  ct.interaction_type,
  ct.confidence_score,
  'compound_target' as edge_type
FROM compound_target ct
JOIN compound c ON ct.compound_id = c.compound_id
JOIN gene g ON ct.gene_id = g.gene_id;

CREATE INDEX IF NOT EXISTS idx_v_compound_target_network_compound ON v_compound_target_network(compound_id);
CREATE INDEX IF NOT EXISTS idx_v_compound_target_network_gene ON v_compound_target_network(gene_id);

-- Disease-Pathway Network View
CREATE MATERIALIZED VIEW IF NOT EXISTS v_disease_pathway_network AS
SELECT DISTINCT
  d.disease_id,
  d.name as disease_name,
  pw.pathway_id,
  pw.name as pathway_name,
  pw.source_db,
  COUNT(DISTINCT cd.compound_id) as compound_count,
  'disease_pathway' as edge_type
FROM disease d
JOIN compound_disease cd ON d.disease_id = cd.disease_id
JOIN compound_pathway cp ON cd.compound_id = cp.compound_id
JOIN pathway pw ON cp.pathway_id = pw.pathway_id
GROUP BY d.disease_id, d.name, pw.pathway_id, pw.name, pw.source_db;

CREATE INDEX IF NOT EXISTS idx_v_disease_pathway_network_disease ON v_disease_pathway_network(disease_id);
CREATE INDEX IF NOT EXISTS idx_v_disease_pathway_network_pathway ON v_disease_pathway_network(pathway_id);

-- ============================================================================
-- GRAPH QUERY FUNCTIONS
-- ============================================================================

-- Function to get all neighbors of a node
CREATE OR REPLACE FUNCTION get_node_neighbors(
  p_node_id uuid,
  p_node_type text,
  p_max_depth integer DEFAULT 1
)
RETURNS TABLE (
  neighbor_id uuid,
  neighbor_type text,
  neighbor_name text,
  edge_type text,
  depth integer,
  path text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE neighbor_tree AS (
    SELECT DISTINCT
      CASE
        WHEN source_id = p_node_id THEN target_id
        ELSE source_id
      END as neighbor_id,
      CASE
        WHEN source_id = p_node_id THEN target_type
        ELSE source_type
      END as neighbor_type,
      edge_type,
      1 as depth,
      ARRAY[p_node_id::text,
            CASE WHEN source_id = p_node_id THEN target_id ELSE source_id END::text] as path
    FROM graph_edge
    WHERE (source_id = p_node_id AND source_type = p_node_type)
       OR (target_id = p_node_id AND target_type = p_node_type)

    UNION ALL

    SELECT DISTINCT
      CASE
        WHEN ge.source_id = nt.neighbor_id THEN ge.target_id
        ELSE ge.source_id
      END,
      CASE
        WHEN ge.source_id = nt.neighbor_id THEN ge.target_type
        ELSE ge.source_type
      END,
      ge.edge_type,
      nt.depth + 1,
      nt.path || CASE WHEN ge.source_id = nt.neighbor_id THEN ge.target_id ELSE ge.source_id END::text
    FROM graph_edge ge
    JOIN neighbor_tree nt ON (
      (ge.source_id = nt.neighbor_id AND ge.source_type = nt.neighbor_type) OR
      (ge.target_id = nt.neighbor_id AND ge.target_type = nt.neighbor_type)
    )
    WHERE nt.depth < p_max_depth
      AND NOT (CASE WHEN ge.source_id = nt.neighbor_id THEN ge.target_id ELSE ge.source_id END = ANY(nt.path::uuid[]))
  )
  SELECT
    nt.neighbor_id,
    nt.neighbor_type,
    CASE
      WHEN nt.neighbor_type = 'plant' THEN (SELECT scientific_name FROM plant_taxon WHERE plant_taxon_id = nt.neighbor_id)
      WHEN nt.neighbor_type = 'compound' THEN (SELECT common_name FROM compound WHERE compound_id = nt.neighbor_id)
      WHEN nt.neighbor_type = 'gene' THEN (SELECT symbol FROM gene WHERE gene_id = nt.neighbor_id)
      WHEN nt.neighbor_type = 'pathway' THEN (SELECT name FROM pathway WHERE pathway_id = nt.neighbor_id)
      WHEN nt.neighbor_type = 'disease' THEN (SELECT name FROM disease WHERE disease_id = nt.neighbor_id)
      ELSE 'Unknown'
    END as neighbor_name,
    nt.edge_type,
    nt.depth,
    nt.path
  FROM neighbor_tree nt
  ORDER BY nt.depth, nt.neighbor_type;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate network statistics
CREATE OR REPLACE FUNCTION update_graph_node_stats()
RETURNS void AS $$
BEGIN
  TRUNCATE graph_node_stats;

  INSERT INTO graph_node_stats (node_id, node_type, degree, in_degree, out_degree)
  SELECT
    c.compound_id,
    'compound',
    (SELECT COUNT(*) FROM plant_compound WHERE compound_id = c.compound_id) +
    (SELECT COUNT(*) FROM compound_pathway WHERE compound_id = c.compound_id) +
    (SELECT COUNT(*) FROM compound_target WHERE compound_id = c.compound_id) +
    (SELECT COUNT(*) FROM compound_disease WHERE compound_id = c.compound_id),
    (SELECT COUNT(*) FROM plant_compound WHERE compound_id = c.compound_id),
    (SELECT COUNT(*) FROM compound_pathway WHERE compound_id = c.compound_id) +
    (SELECT COUNT(*) FROM compound_target WHERE compound_id = c.compound_id)
  FROM compound c;

  INSERT INTO graph_node_stats (node_id, node_type, degree, out_degree)
  SELECT
    p.plant_taxon_id,
    'plant',
    (SELECT COUNT(*) FROM plant_compound WHERE plant_taxon_id = p.plant_taxon_id),
    (SELECT COUNT(*) FROM plant_compound WHERE plant_taxon_id = p.plant_taxon_id)
  FROM plant_taxon p;

  INSERT INTO graph_node_stats (node_id, node_type, degree, in_degree)
  SELECT
    g.gene_id,
    'gene',
    (SELECT COUNT(*) FROM compound_target WHERE gene_id = g.gene_id) +
    (SELECT COUNT(*) FROM gene_pathway WHERE gene_id = g.gene_id),
    (SELECT COUNT(*) FROM compound_target WHERE gene_id = g.gene_id)
  FROM gene g;

  INSERT INTO graph_node_stats (node_id, node_type, degree, in_degree)
  SELECT
    pw.pathway_id,
    'pathway',
    (SELECT COUNT(*) FROM compound_pathway WHERE pathway_id = pw.pathway_id) +
    (SELECT COUNT(*) FROM gene_pathway WHERE pathway_id = pw.pathway_id),
    (SELECT COUNT(*) FROM compound_pathway WHERE pathway_id = pw.pathway_id)
  FROM pathway pw;

  INSERT INTO graph_node_stats (node_id, node_type, degree, in_degree)
  SELECT
    d.disease_id,
    'disease',
    (SELECT COUNT(*) FROM compound_disease WHERE disease_id = d.disease_id),
    (SELECT COUNT(*) FROM compound_disease WHERE disease_id = d.disease_id)
  FROM disease d;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE compound_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edge ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_node_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for compound targets"
  ON compound_target FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for graph edges"
  ON graph_edge FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for node stats"
  ON graph_node_stats FOR SELECT
  TO public
  USING (true);
