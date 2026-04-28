/*
  Safe import hardening migration.
  Purpose:
  - make current schema importable without destructive rewrite
  - add missing review/admin tables
  - add unique constraints needed by ETL upserts
  - preserve canonical chemistry while supporting unresolved/admin queues
*/

CREATE TABLE IF NOT EXISTS unresolved_structure_file (
  unresolved_structure_file_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_file text,
  file_type text,
  source text,
  pubchem_cid text,
  raw_compound_name text,
  reason text,
  status text DEFAULT 'unresolved',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_batch (
  import_batch_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_name text NOT NULL,
  source_file text,
  imported_at timestamptz DEFAULT now(),
  notes text
);

CREATE TABLE IF NOT EXISTS compound_review_queue (
  review_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_compound_name text NOT NULL,
  candidate_match text,
  reason_for_review text,
  reviewer_status text DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS plant_reference_link (
  plant_reference_link_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid NOT NULL REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  reference_id uuid NOT NULL REFERENCES reference(reference_id) ON DELETE CASCADE,
  link_role text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(plant_taxon_id, reference_id, link_role)
);

CREATE TABLE IF NOT EXISTS plant_attribute_evidence (
  attribute_evidence_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid NOT NULL REFERENCES plant_taxon(plant_taxon_id) ON DELETE CASCADE,
  reference_id uuid REFERENCES reference(reference_id) ON DELETE SET NULL,
  attribute_type text NOT NULL,
  attribute_text text,
  extraction_method text,
  confidence_score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plant_compound_reference_candidate (
  candidate_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_taxon_id uuid REFERENCES plant_taxon(plant_taxon_id) ON DELETE SET NULL,
  reference_id uuid REFERENCES reference(reference_id) ON DELETE SET NULL,
  raw_compound_name text,
  candidate_compound_id uuid REFERENCES compound(compound_id) ON DELETE SET NULL,
  text_snippet text,
  resolution_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_taxon_scientific_name ON plant_taxon(scientific_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_compound_pubchem_cid_not_null ON compound(pubchem_cid) WHERE pubchem_cid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_compound_synonym_compound_synonym ON compound_synonym(compound_id, synonym);
CREATE UNIQUE INDEX IF NOT EXISTS uq_signature_source_experiment ON signature(source, experiment_id) WHERE experiment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_plant_compound_natural_key ON plant_compound(
  plant_taxon_id,
  compound_id,
  COALESCE(plant_part, ''),
  COALESCE(evidence_type, '')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'plant_compound'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'plant_compound_reference_id_fkey'
  ) THEN
    ALTER TABLE plant_compound
      ADD CONSTRAINT plant_compound_reference_id_fkey
      FOREIGN KEY (reference_id) REFERENCES reference(reference_id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
