-- =====================================================
-- Stage 05: Database Setup, Data Import, and Portal Views
-- Algerian Chemogenomic Phytochemical Portal
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- CORE TABLES
-- =====================================================

create table if not exists public.plant_taxon (
  plant_id text primary key,
  plant_name_raw text,
  family text,
  genus text,
  species text,
  tax_id text,
  endemic_flag boolean,
  created_at timestamptz default now()
);

create table if not exists public.compound (
  compound_id text primary key,
  compound_name_raw text,
  compound_name_normalized text,
  pubchem_cid text,
  chembl_ids text,
  molecular_formula text,
  molecular_weight numeric,
  smiles text,
  inchikey text,
  iupac_name text,
  dtxsid text,
  dtxcid text,
  kegg_ids text,
  kegg_names text,
  kegg_pathways text,
  created_at timestamptz default now()
);

create table if not exists public.plant_compound (
  id bigserial primary key,
  plant_id text,
  compound_id text,
  plant_part text,
  evidence_type text,
  source_sheet text,
  created_at timestamptz default now()
);

-- =====================================================
-- PLANT AND GENUS EVIDENCE
-- =====================================================

create table if not exists public.plant_attribute_evidence (
  evidence_id text primary key,
  plant_id text,
  plant_name_raw text,
  attribute_type text,
  raw_text text,
  clean_text text,
  display_text text,
  source_sheet text,
  source_row int,
  created_at timestamptz default now()
);

create table if not exists public.genus_attribute_evidence (
  evidence_id text primary key,
  genus_name text,
  attribute_type text,
  raw_text text,
  clean_text text,
  source_sheet text,
  created_at timestamptz default now()
);

-- =====================================================
-- COMPOUND ANNOTATION TABLES
-- =====================================================

create table if not exists public.compound_np_classification (
  id bigserial primary key,
  compound_id text,
  np_pathway text,
  np_superclass text,
  np_class text,
  is_glycoside boolean,
  source text default 'NPClassifier',
  created_at timestamptz default now()
);

create table if not exists public.metabolite_family_reference_knowledge (
  knowledge_id text primary key,
  metabolite_family_name text,
  raw_text text,
  clean_text text,
  source_sheet text,
  created_at timestamptz default now()
);

create table if not exists public.compound_metabolite_family_link (
  id bigserial primary key,
  compound_id text not null,
  np_pathway text,
  np_superclass text,
  np_class text,
  is_glycoside boolean,
  metabolite_family_name text not null,
  match_basis text,
  created_at timestamptz default now()
);

create table if not exists public.compound_chembl_activity (
  id bigserial primary key,
  compound_id text,
  molecule_chembl_id text,
  target_chembl_id text,
  target_pref_name text,
  target_organism text,
  assay_chembl_id text,
  standard_type text,
  standard_value numeric,
  standard_units text,
  pchembl_value numeric,
  created_at timestamptz default now()
);

create table if not exists public.compound_target_interactions (
  id bigserial primary key,
  compound_id text,
  pubchem_cid text,
  target_external_id text,
  gene_name text,
  target_species text,
  score numeric,
  action text,
  mode text,
  created_at timestamptz default now()
);

create table if not exists public.compound_kegg_link (
  id bigserial primary key,
  compound_id text,
  kegg_id text,
  kegg_name text,
  kegg_pathway text,
  created_at timestamptz default now()
);

create table if not exists public.compound_toxicity (
  id bigserial primary key,
  compound_id text,
  toxval_type text,
  toxval_numeric numeric,
  toxval_units text,
  species_common text,
  exposure_route text,
  study_type text,
  year text,
  created_at timestamptz default now()
);

create table if not exists public.compound_structure_files (
  id bigserial primary key,
  compound_id text,
  file_name text,
  file_path text,
  file_type text,
  match_method text,
  match_score numeric,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.compound_nmr (
  id bigserial primary key,
  compound_id text,
  proton_nmr text,
  carbon_nmr text,
  solvent text,
  frequency text,
  doi text,
  source text,
  created_at timestamptz default now()
);

-- =====================================================
-- LINCS AND GEO OMICS TABLES
-- =====================================================

create table if not exists public.lincs_compound_map (
  id bigserial primary key,
  compound_id text,
  brd_id text,
  compound_name_raw text,
  created_at timestamptz default now()
);

create table if not exists public.lincs_signature_long (
  id bigserial primary key,
  compound_id text,
  signature_id text,
  gene_symbol text,
  regulation text,
  score numeric,
  created_at timestamptz default now()
);

create table if not exists public.geo_genus_mentions (
  id bigserial primary key,
  genus_name text,
  gse text,
  gsm text,
  series_title text,
  sample_title text,
  organism text,
  created_at timestamptz default now()
);

create table if not exists public.geo_molecule_mentions (
  id bigserial primary key,
  compound_id text,
  gse text,
  gsm text,
  series_title text,
  sample_title text,
  organism text,
  created_at timestamptz default now()
);

-- =====================================================
-- REFERENCES AND PUBLICATIONS
-- =====================================================

create table if not exists public.reference (
  reference_id text primary key,
  title text,
  authors text,
  year text,
  doi text,
  url text,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.publication (
  publication_id text primary key,
  title text,
  authors text,
  year text,
  journal text,
  doi text,
  pubmed_id text,
  url text,
  created_at timestamptz default now()
);

-- =====================================================
-- REVIEW CENTER AND COLLABORATION TABLES
-- =====================================================

create table if not exists public.collaboration_submissions (
  submission_id text primary key default gen_random_uuid()::text,
  contributor_name text,
  contributor_email text,
  affiliation text,
  submission_type text,
  title text,
  description text,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.submission_files (
  file_id text primary key default gen_random_uuid()::text,
  submission_id text,
  file_name text,
  file_path text,
  file_type text,
  file_size bigint,
  uploaded_at timestamptz default now()
);

create table if not exists public.submission_parsed_rows (
  parsed_row_id text primary key default gen_random_uuid()::text,
  submission_id text,
  row_index int,
  entity_type text,
  raw_data jsonb,
  parsed_data jsonb,
  review_status text default 'pending',
  curator_notes text,
  created_at timestamptz default now()
);

create table if not exists public.submission_validation_reports (
  report_id text primary key default gen_random_uuid()::text,
  submission_id text,
  validation_status text,
  error_count int default 0,
  warning_count int default 0,
  report jsonb,
  created_at timestamptz default now()
);

create table if not exists public.submission_structured_rows (
  structured_row_id text primary key default gen_random_uuid()::text,
  submission_id text,
  parsed_row_id text,
  target_table text,
  structured_data jsonb,
  import_status text default 'not_imported',
  created_at timestamptz default now()
);

-- =====================================================
-- CONTEXT VIEWS
-- =====================================================

drop view if exists public.v_plant_genus_context;

create view public.v_plant_genus_context
with (security_invoker = false)
as
select
  p.plant_id,
  p.plant_name_raw,
  p.family,
  p.genus,
  p.species,
  g.evidence_id,
  g.attribute_type,
  g.clean_text,
  g.raw_text,
  g.source_sheet
from public.plant_taxon p
join public.genus_attribute_evidence g
  on lower(trim(p.genus)) = lower(trim(g.genus_name));

drop view if exists public.v_compound_metabolite_context;

create view public.v_compound_metabolite_context
with (security_invoker = false)
as
select
  l.compound_id,
  l.np_pathway,
  l.np_superclass,
  l.np_class,
  l.is_glycoside,
  l.metabolite_family_name,
  l.match_basis,
  k.knowledge_id,
  k.clean_text as family_description,
  k.raw_text as family_raw_text,
  k.source_sheet
from public.compound_metabolite_family_link l
left join public.metabolite_family_reference_knowledge k
  on lower(trim(l.metabolite_family_name)) = lower(trim(k.metabolite_family_name));

-- =====================================================
-- KNOWLEDGE GRAPH VIEWS
-- =====================================================

drop view if exists public.v_graph_plant_compound_edges;

create view public.v_graph_plant_compound_edges
with (security_invoker = false)
as
select
  pc.plant_id as source_id,
  p.plant_name_raw as source_label,
  'plant'::text as source_type,
  pc.compound_id as target_id,
  c.compound_name_raw as target_label,
  'compound'::text as target_type,
  'contains_compound'::text as edge_type,
  pc.evidence_type,
  pc.plant_part
from public.plant_compound pc
left join public.plant_taxon p on p.plant_id = pc.plant_id
left join public.compound c on c.compound_id = pc.compound_id;

drop view if exists public.v_graph_compound_target_edges;

create view public.v_graph_compound_target_edges
with (security_invoker = false)
as
select
  cti.compound_id as source_id,
  c.compound_name_raw as source_label,
  'compound'::text as source_type,
  coalesce(cti.gene_name, cti.target_external_id) as target_id,
  coalesce(cti.gene_name, cti.target_external_id) as target_label,
  'target'::text as target_type,
  'compound_target_interaction'::text as edge_type,
  cti.score,
  cti.action,
  cti.mode,
  cti.target_species
from public.compound_target_interactions cti
left join public.compound c on c.compound_id = cti.compound_id;

-- =====================================================
-- DATA ACCESS / API-READY VIEWS
-- =====================================================

drop view if exists public.v_data_access_plants;

create view public.v_data_access_plants
with (security_invoker = false)
as
select
  p.plant_id,
  p.plant_name_raw,
  p.family,
  p.genus,
  p.species,
  p.tax_id,
  p.endemic_flag,
  count(distinct pc.compound_id) as compound_count
from public.plant_taxon p
left join public.plant_compound pc on pc.plant_id = p.plant_id
group by
  p.plant_id,
  p.plant_name_raw,
  p.family,
  p.genus,
  p.species,
  p.tax_id,
  p.endemic_flag;

drop view if exists public.v_data_access_compounds;

create view public.v_data_access_compounds
with (security_invoker = false)
as
select
  c.compound_id,
  c.compound_name_raw,
  c.compound_name_normalized,
  c.pubchem_cid,
  c.chembl_ids,
  c.molecular_formula,
  c.molecular_weight,
  c.smiles,
  c.inchikey,
  count(distinct pc.plant_id) as plant_count,
  count(distinct cti.target_external_id) as target_count
from public.compound c
left join public.plant_compound pc on pc.compound_id = c.compound_id
left join public.compound_target_interactions cti on cti.compound_id = c.compound_id
group by
  c.compound_id,
  c.compound_name_raw,
  c.compound_name_normalized,
  c.pubchem_cid,
  c.chembl_ids,
  c.molecular_formula,
  c.molecular_weight,
  c.smiles,
  c.inchikey;

drop view if exists public.v_data_access_targets;

create view public.v_data_access_targets
with (security_invoker = false)
as
select
  coalesce(gene_name, target_external_id) as target_id,
  gene_name,
  target_external_id,
  target_species,
  count(distinct compound_id) as linked_compound_count,
  max(score) as max_score
from public.compound_target_interactions
group by
  gene_name,
  target_external_id,
  target_species;

-- =====================================================
-- ACCESS
-- =====================================================

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon, authenticated, service_role;
grant insert, update, delete on all tables in schema public to service_role;

grant select on public.v_plant_genus_context to anon, authenticated, service_role;
grant select on public.v_compound_metabolite_context to anon, authenticated, service_role;
grant select on public.v_graph_plant_compound_edges to anon, authenticated, service_role;
grant select on public.v_graph_compound_target_edges to anon, authenticated, service_role;
grant select on public.v_data_access_plants to anon, authenticated, service_role;
grant select on public.v_data_access_compounds to anon, authenticated, service_role;
grant select on public.v_data_access_targets to anon, authenticated, service_role;