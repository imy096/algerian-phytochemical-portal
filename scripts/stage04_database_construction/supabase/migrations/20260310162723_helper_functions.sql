/*
  # Helper Functions for Analytics and Queries

  This migration adds PostgreSQL functions to support:
  - Coverage statistics
  - Knowledge gap analysis
  - Complex cross-table queries
*/

-- Count plants with compounds
CREATE OR REPLACE FUNCTION count_plants_with_compounds()
RETURNS TABLE(count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT plant_taxon_id)::bigint
  FROM plant_compound;
END;
$$ LANGUAGE plpgsql;

-- Count plants with signatures
CREATE OR REPLACE FUNCTION count_plants_with_signatures()
RETURNS TABLE(count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT plant_taxon_id)::bigint
  FROM signature
  WHERE plant_taxon_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Count compounds with toxicity data
CREATE OR REPLACE FUNCTION count_compounds_with_toxicity()
RETURNS TABLE(count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT compound_id)::bigint
  FROM compound_toxicity_endpoint;
END;
$$ LANGUAGE plpgsql;

-- Get plants without compounds
CREATE OR REPLACE FUNCTION get_plants_without_compounds()
RETURNS TABLE(
  plant_taxon_id uuid,
  scientific_name text,
  family text
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.plant_taxon_id, pt.scientific_name, pt.family
  FROM plant_taxon pt
  WHERE NOT EXISTS (
    SELECT 1 FROM plant_compound pc
    WHERE pc.plant_taxon_id = pt.plant_taxon_id
  )
  ORDER BY pt.scientific_name
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Get plants without signatures
CREATE OR REPLACE FUNCTION get_plants_without_signatures()
RETURNS TABLE(
  plant_taxon_id uuid,
  scientific_name text,
  family text
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.plant_taxon_id, pt.scientific_name, pt.family
  FROM plant_taxon pt
  WHERE NOT EXISTS (
    SELECT 1 FROM signature s
    WHERE s.plant_taxon_id = pt.plant_taxon_id
  )
  ORDER BY pt.scientific_name
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Get compounds without toxicity data
CREATE OR REPLACE FUNCTION get_compounds_without_toxicity()
RETURNS TABLE(
  compound_id uuid,
  common_name text,
  pubchem_cid text
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.compound_id, c.common_name, c.pubchem_cid
  FROM compound c
  WHERE NOT EXISTS (
    SELECT 1 FROM compound_toxicity_endpoint cte
    WHERE cte.compound_id = c.compound_id
  )
  ORDER BY c.common_name
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Get plants by region
CREATE OR REPLACE FUNCTION get_plants_by_region()
RETURNS TABLE(
  region_name text,
  plant_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, COUNT(DISTINCT pr.plant_taxon_id)::bigint
  FROM region r
  LEFT JOIN plant_region pr ON r.region_id = pr.region_id
  GROUP BY r.name
  ORDER BY COUNT(DISTINCT pr.plant_taxon_id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get plant pathways (compound-mediated)
CREATE OR REPLACE FUNCTION get_plant_pathways(p_plant_id uuid)
RETURNS TABLE(
  pathway_id uuid,
  pathway_name text,
  compound_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.pathway_id, p.name, COUNT(DISTINCT pc.compound_id)::bigint
  FROM plant_compound pc
  JOIN compound_pathway cp ON pc.compound_id = cp.compound_id
  JOIN pathway p ON cp.pathway_id = p.pathway_id
  WHERE pc.plant_taxon_id = p_plant_id
  GROUP BY p.pathway_id, p.name
  ORDER BY COUNT(DISTINCT pc.compound_id) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get disease plants (via compounds)
CREATE OR REPLACE FUNCTION get_disease_plants(p_disease_id uuid)
RETURNS TABLE(
  plant_taxon_id uuid,
  scientific_name text,
  compound_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pt.plant_taxon_id, pt.scientific_name, COUNT(DISTINCT pc.compound_id)::bigint
  FROM compound_disease cd
  JOIN plant_compound pc ON cd.compound_id = pc.compound_id
  JOIN plant_taxon pt ON pc.plant_taxon_id = pt.plant_taxon_id
  WHERE cd.disease_id = p_disease_id
  GROUP BY pt.plant_taxon_id, pt.scientific_name
  ORDER BY COUNT(DISTINCT pc.compound_id) DESC;
END;
$$ LANGUAGE plpgsql;
