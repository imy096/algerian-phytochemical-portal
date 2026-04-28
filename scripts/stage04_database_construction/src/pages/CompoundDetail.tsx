import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  FlaskConical,
  Leaf,
  Dna,
  Network,
  Microscope,
  FileSearch,
  ChevronRight,
  ChevronDown,
  Box,
  TestTube2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';

type CompoundBasic = {
  compound_id: string;
  compound_name_raw?: string | null;
  compound_name_normalized?: string | null;
  pubchem_cid?: string | number | null;
  molecular_formula?: string | null;
  molecular_weight?: number | null;
  smiles?: string | null;
  inchikey?: string | null;
  iupac_name?: string | null;
  dtxsid?: string | null;
  dtxcid?: string | null;
  kegg_ids?: string | null;
  kegg_names?: string | null;
  kegg_pathways?: string | null;
  chembl_ids?: string | null;
  plants?: Array<{
    plant_id?: string;
    plant_name_raw?: string;
    family?: string;
    genus?: string;
    species?: string;
  }>;
};

type ApiListResponse<T> = { data: T[] };

type NPClassificationRow = {
  np_pathway?: string | null;
  np_superclass?: string | null;
  np_class?: string | null;
  is_glycoside?: boolean | string | null;
  source?: string | null;
};

type NmrRow = {
  proton_nmr?: string | null;
  carbon_nmr?: string | null;
  solvent?: string | null;
  frequency?: string | null;
  doi?: string | null;
  source?: string | null;
};

type ChemblRow = {
  molecule_chembl_id?: string | null;
  target_chembl_id?: string | null;
  target_pref_name?: string | null;
  target_organism?: string | null;
  assay_chembl_id?: string | null;
  standard_type?: string | null;
  standard_value?: number | null;
  standard_units?: string | null;
  pchembl_value?: number | null;
};

type KeggRow = {
  kegg_id?: string | null;
  kegg_name?: string | null;
  kegg_pathway?: string | null;
};

type LincsRow = {
  lincs_data?: {
    brd_id?: string;
    compound_name_raw?: string;
  } | null;
};

type GeoRow = {
  gse?: string | null;
  gsm?: string | null;
  series_title?: string | null;
  sample_title?: string | null;
  organism?: string | null;
};

type ToxicityRow = {
  toxval_type?: string | null;
  toxval_numeric?: number | null;
  toxval_units?: string | null;
  species_common?: string | null;
  exposure_route?: string | null;
  study_type?: string | null;
  year?: string | null;
};

type TargetRow = {
  gene_name?: string | null;
  target_external_id?: string | null;
  target_species?: string | null;
  score?: number | null;
  action?: string | null;
  mode?: string | null;
};

type StructureFileRow = {
  file_name?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  match_method?: string | null;
  match_score?: number | string | null;
  source?: string | null;
};

type MetaboliteContextRow = {
  compound_id?: string | null;
  np_pathway?: string | null;
  np_superclass?: string | null;
  np_class?: string | null;
  is_glycoside?: boolean | string | null;
  metabolite_family_name?: string | null;
  match_basis?: string | null;
  family_description?: string | null;
  source_sheet?: string | null;
};

const moleculeImages = import.meta.glob('../assets/molecule_images/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function unwrapArray<T>(response: T[] | ApiListResponse<T> | undefined | null): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function fmt(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'nan') return null;
  return text;
}

function fileBaseName(path: string) {
  return path.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
}

function normalizeForCompare(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[β]/g, 'beta')
    .replace(/[α]/g, 'alpha')
    .replace(/[γ]/g, 'gamma')
    .replace(/[δ]/g, 'delta')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCompoundImageUrl(compound?: CompoundBasic | null) {
  if (!compound?.compound_id) return null;
  const id = compound.compound_id;
  const idLower = id.toLowerCase();
  const nameTokens = [compound.compound_name_normalized, compound.compound_name_raw, compound.iupac_name].map(normalizeForCompare).filter(Boolean);
  const entries = Object.entries(moleculeImages);
  const exactOrPrefix = entries.find(([path]) => {
    const base = fileBaseName(path).toLowerCase();
    return base === idLower || base.startsWith(`${idLower}_`) || base.startsWith(`${idLower}-`);
  });
  if (exactOrPrefix) return exactOrPrefix[1];
  const idLoose = normalizeForCompare(id);
  const looseWithName = entries.find(([path]) => {
    const base = normalizeForCompare(fileBaseName(path));
    return base.includes(idLoose) && nameTokens.some((token) => base.includes(token));
  });
  if (looseWithName) return looseWithName[1];
  const looseIdOnly = entries.find(([path]) => normalizeForCompare(fileBaseName(path)).includes(idLoose));
  return looseIdOnly?.[1] || null;
}

function makePubChemUrl(cid?: string | number | null) {
  const value = fmt(cid);
  if (!value) return null;
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${value}`;
}

function makeChemblUrl(chemblId?: string | null) {
  const value = fmt(chemblId);
  if (!value) return null;
  return `https://www.ebi.ac.uk/chembl/compound_report_card/${value}/`;
}

function makeDoiUrl(doi?: string | null) {
  const value = fmt(doi);
  if (!value) return null;
  const clean = value.replace(/^https?:\/\/doi\.org\//i, '').trim();
  return `https://doi.org/${clean}`;
}

function normalizeSpecies(value?: string | null) {
  if (!value) return null;
  const v = String(value).trim();
  if (v === '9606') return 'Homo sapiens';
  if (v === '10090') return 'Mus musculus';
  if (v === '10116') return 'Rattus norvegicus';
  return v;
}

function confidenceBand(score?: number | null) {
  if (score == null) return null;
  if (score >= 800) return 'High';
  if (score >= 400) return 'Moderate';
  return 'Low';
}

function boolText(value?: boolean | string | null) {
  if (value === true || String(value).toLowerCase() === 'true') return 'Yes';
  if (value === false || String(value).toLowerCase() === 'false') return 'No';
  return null;
}

function CompoundStructureImage({ compound }: { compound?: CompoundBasic | null }) {
  const imageUrl = getCompoundImageUrl(compound);
  if (!imageUrl) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 rounded-full border border-emerald-100 bg-white p-3 shadow-sm">
            <FlaskConical className="h-14 w-14 text-emerald-600" />
          </div>
          <p className="text-base font-medium text-stone-700">2D structure space</p>
          <p className="mt-2 text-sm text-stone-500">No local structure image found for this compound.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <img src={imageUrl} alt={compound?.compound_name_raw || compound?.compound_name_normalized || compound?.compound_id || 'Compound structure'} className="max-h-[260px] max-w-full object-contain" loading="lazy" />
    </div>
  );
}

function CoverageBadge({ label, available }: { label: string; available: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${available ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'}`}>
      {available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </div>
  );
}

function HeroPill({ label, value, tone = 'neutral' }: { label: string; value?: string | number | null; tone?: 'neutral' | 'green' | 'blue' }) {
  if (value === null || value === undefined || value === '') return null;
  const cls = tone === 'green' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : tone === 'blue' ? 'border-sky-200 bg-sky-100 text-sky-800' : 'border-stone-200 bg-white text-stone-700';
  return <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${cls}`}>{label}: {String(value)}</span>;
}

function MiniStat({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-800">{String(value)}</p>
    </div>
  );
}

function ExternalAnchor({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900">
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function EmptyState({ text = 'No records available.' }: { text?: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-sm text-stone-500">{text}</div>;
}

function InfoTile({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-stone-800">{fmt(value) || 'Not available'}</p>
    </div>
  );
}

function CollapsibleText({ label, value }: { label: string; value?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!fmt(value)) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-stone-800">
        {label}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">{value}</p>}
    </div>
  );
}

function CollapsibleSection({ title, icon, children, rightSlot, defaultOpen = false }: { title: string; icon?: ReactNode; children: ReactNode; rightSlot?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {rightSlot}
          {open ? <ChevronDown className="h-5 w-5 text-stone-500" /> : <ChevronRight className="h-5 w-5 text-stone-500" />}
        </div>
      </button>
      {open && <div className="border-t border-stone-100 p-6 pt-5">{children}</div>}
    </section>
  );
}

function MetaboliteContextSection({ rows }: { rows: MetaboliteContextRow[] }) {
  if (!rows.length) return null;

  const first = rows[0];

  return (
    <CollapsibleSection
      title="Metabolite family context"
      icon={<Dna className="h-5 w-5 text-emerald-700" />}
      defaultOpen
    >
      <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <p className="text-sm leading-7 text-emerald-900">
          This section links NPClassifier chemical categories to curated metabolite-family
          knowledge. It provides compact chemical context, not a new experimental claim.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <InfoTile label="NP pathway" value={first.np_pathway} />
        <InfoTile label="NP superclass" value={first.np_superclass} />
        <InfoTile label="NP class" value={first.np_class} />
        <InfoTile label="Glycoside" value={boolText(first.is_glycoside)} />
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={`${row.metabolite_family_name || 'family'}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-stone-800">
                {row.metabolite_family_name || 'Metabolite family'}
              </h3>
              {row.match_basis && (
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">
                  {row.match_basis}
                </span>
              )}
            </div>
            {row.family_description ? (
              <p className="mt-3 text-sm leading-7 text-stone-700">
                {row.family_description.length > 520 ? `${row.family_description.slice(0, 520)}...` : row.family_description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-stone-500">No narrative description is available for this metabolite family yet.</p>
            )}
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export default function CompoundDetail() {
  const params = useParams<{ id?: string; compoundId?: string }>();
  const compoundId = params.id || params.compoundId || '';

  const compoundQuery = useQuery<CompoundBasic>({ queryKey: ['compound', compoundId], queryFn: () => api.compounds.get(compoundId), enabled: Boolean(compoundId), retry: false });
  const npQuery = useQuery<ApiListResponse<NPClassificationRow>>({ queryKey: ['compound-np-classification', compoundId], queryFn: () => api.compounds.npClassification(compoundId), enabled: Boolean(compoundId), retry: false });
  const nmrQuery = useQuery<ApiListResponse<NmrRow>>({ queryKey: ['compound-nmr', compoundId], queryFn: () => api.compounds.nmr(compoundId), enabled: Boolean(compoundId), retry: false });
  const chemblQuery = useQuery<ApiListResponse<ChemblRow>>({ queryKey: ['compound-chembl', compoundId], queryFn: () => api.compounds.chembl(compoundId), enabled: Boolean(compoundId), retry: false });
  const keggQuery = useQuery<ApiListResponse<KeggRow>>({ queryKey: ['compound-kegg', compoundId], queryFn: () => api.compounds.kegg(compoundId), enabled: Boolean(compoundId), retry: false });
  const lincsQuery = useQuery<ApiListResponse<LincsRow>>({ queryKey: ['compound-lincs', compoundId], queryFn: () => api.compounds.lincs(compoundId), enabled: Boolean(compoundId), retry: false });
  const geoQuery = useQuery<ApiListResponse<GeoRow>>({ queryKey: ['compound-geo', compoundId], queryFn: () => api.compounds.geo(compoundId), enabled: Boolean(compoundId), retry: false });
  const toxicityQuery = useQuery<ApiListResponse<ToxicityRow>>({ queryKey: ['compound-toxicity', compoundId], queryFn: () => api.compounds.toxicity(compoundId), enabled: Boolean(compoundId), retry: false });
  const targetQuery = useQuery<ApiListResponse<TargetRow>>({ queryKey: ['compound-targets', compoundId], queryFn: () => api.compounds.targets(compoundId), enabled: Boolean(compoundId), retry: false });
  const metaboliteContextQuery = useQuery<ApiListResponse<MetaboliteContextRow>>({ queryKey: ['compound-metabolite-context', compoundId], queryFn: () => api.compounds.metaboliteContext(compoundId), enabled: Boolean(compoundId), retry: false });

  const structureQuery = useQuery<ApiListResponse<StructureFileRow>>({
    queryKey: ['compound-structure-files', compoundId],
    queryFn: async () => {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/compounds/${encodeURIComponent(compoundId)}/structure-files`);
      if (!response.ok) throw new Error('Failed to fetch structure files');
      return response.json();
    },
    enabled: Boolean(compoundId),
    retry: false,
  });

  const compound = compoundQuery.data;
  const npRows = unwrapArray(npQuery.data);
  const nmrRows = unwrapArray(nmrQuery.data);
  const chemblRows = unwrapArray(chemblQuery.data);
  const keggRows = unwrapArray(keggQuery.data);
  const lincsRows = unwrapArray(lincsQuery.data);
  const geoRows = unwrapArray(geoQuery.data);
  const toxicityRows = unwrapArray(toxicityQuery.data);
  const targetRows = unwrapArray(targetQuery.data);
  const metaboliteContextRows = unwrapArray(metaboliteContextQuery.data);
  const structureRows = unwrapArray(structureQuery.data);

  const uniqueMetaboliteFamilies = useMemo(() => {
    const seen = new Set<string>();
    return metaboliteContextRows.filter((row) => {
      const key = row.metabolite_family_name || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [metaboliteContextRows]);

  const firstChemblId = useMemo(() => compound?.chembl_ids?.split(/[;,\s]+/).find(Boolean) || chemblRows[0]?.molecule_chembl_id || null, [compound?.chembl_ids, chemblRows]);
  const pubChemUrl = makePubChemUrl(compound?.pubchem_cid);
  const chemblUrl = makeChemblUrl(firstChemblId);

  if (compoundQuery.isLoading) return <div className="min-h-screen bg-stone-50 p-8 text-stone-700">Loading compound...</div>;

  if (compoundQuery.isError || !compound) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p className="font-semibold">This compound could not be loaded.</p>
          <p className="mt-2 text-sm">Check that the compound id exists and that the API route is available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
          <Link to="/compounds" className="hover:text-emerald-700">Compounds</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-stone-700">{compound.compound_id}</span>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-7 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-sm"><FlaskConical className="h-6 w-6" /></div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Compound detail</p>
                <h1 className="mt-1 text-3xl font-bold text-stone-900">{compound.compound_name_raw || compound.compound_name_normalized || compound.compound_id}</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-stone-600">Integrated chemogenomic profile, external identifiers, natural-product classification, NMR evidence, bioactivity, expression, toxicity, and target evidence.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <HeroPill label="ID" value={compound.compound_id} tone="green" />
              <HeroPill label="Formula" value={compound.molecular_formula} />
              <HeroPill label="MW" value={compound.molecular_weight} tone="blue" />
              <HeroPill label="PubChem CID" value={compound.pubchem_cid} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat label="Plants" value={compound.plants?.length || 0} />
              <MiniStat label="NMR records" value={nmrRows.length} />
              <MiniStat label="ChEMBL assays" value={chemblRows.length} />
              <MiniStat label="Targets" value={targetRows.length} />
              <MiniStat label="Structure files" value={structureRows.length} />
            </div>
          </div>
          <CompoundStructureImage compound={compound} />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <CoverageBadge label="NP classification" available={npRows.length > 0} />
          <CoverageBadge label="NMR" available={nmrRows.length > 0} />
          <CoverageBadge label="ChEMBL" available={chemblRows.length > 0} />
          <CoverageBadge label="KEGG" available={keggRows.length > 0} />
          <CoverageBadge label="LINCS" available={lincsRows.length > 0} />
          <CoverageBadge label="GEO" available={geoRows.length > 0} />
          <CoverageBadge label="Toxicity" available={toxicityRows.length > 0} />
          <CoverageBadge label="Targets" available={targetRows.length > 0} />
          <CoverageBadge label="Structure files" available={structureRows.length > 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CollapsibleSection title="Core chemistry" icon={<Box className="h-5 w-5 text-emerald-700" />} defaultOpen rightSlot={<div className="hidden gap-3 sm:flex"><ExternalAnchor href={pubChemUrl}>PubChem</ExternalAnchor><ExternalAnchor href={chemblUrl}>ChEMBL</ExternalAnchor></div>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Normalized name" value={compound.compound_name_normalized} />
              <InfoTile label="IUPAC name" value={compound.iupac_name} />
              <InfoTile label="SMILES" value={compound.smiles} />
              <InfoTile label="InChIKey" value={compound.inchikey} />
              <InfoTile label="DTXSID" value={compound.dtxsid} />
              <InfoTile label="DTXCID" value={compound.dtxcid} />
              <InfoTile label="KEGG IDs" value={compound.kegg_ids} />
              <InfoTile label="ChEMBL IDs" value={compound.chembl_ids} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Plant sources" icon={<Leaf className="h-5 w-5 text-emerald-700" />}>
            {compound.plants?.length ? <div className="space-y-3">{compound.plants.map((plant, index) => <div key={`${plant.plant_id || plant.plant_name_raw || 'plant'}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="font-semibold text-stone-800">{plant.plant_name_raw || 'Unnamed plant'}</p><p className="mt-1 text-sm text-stone-600">{[plant.family, plant.genus, plant.species].filter(Boolean).join(' / ') || 'Taxonomy not available'}</p></div>)}</div> : <EmptyState text="No plant source records found." />}
          </CollapsibleSection>

          <CollapsibleSection title="Structure files" icon={<Box className="h-5 w-5 text-emerald-700" />} defaultOpen={structureRows.length > 0}>
            {structureRows.length ? (
              <div className="space-y-3">
                {structureRows.map((row, index) => {
                  const filePath = row.file_path || '';
                  const publicPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
                  return (
                    <div key={`${row.file_name || 'structure'}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-stone-800">{row.file_name || 'Structure file'}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            Type: {row.file_type || 'sdf'} · Match: {row.match_method || 'mapped'} · Score: {row.match_score ?? 'not recorded'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
                            Open SDF <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <a href={publicPath} download className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="No SDF/structure file is linked to this compound yet." />
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Natural product classification" icon={<Dna className="h-5 w-5 text-emerald-700" />} defaultOpen={npRows.length > 0}>
            {npRows.length ? <div className="grid gap-3">{npRows.map((row, index) => <div key={index} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2"><InfoTile label="Pathway" value={row.np_pathway} /><InfoTile label="Superclass" value={row.np_superclass} /><InfoTile label="Class" value={row.np_class} /><InfoTile label="Glycoside" value={boolText(row.is_glycoside)} /><InfoTile label="Source" value={row.source || 'NPClassifier'} /></div>)}</div> : <EmptyState />}
          </CollapsibleSection>

          <CollapsibleSection title="NMR evidence" icon={<TestTube2 className="h-5 w-5 text-emerald-700" />} defaultOpen={nmrRows.length > 0}>
            {nmrRows.length ? <div className="space-y-3">{nmrRows.map((row, index) => <div key={index} className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-stone-800">{row.solvent || 'Solvent not available'} {row.frequency ? `- ${row.frequency}` : ''}</p><ExternalAnchor href={makeDoiUrl(row.doi)}>DOI</ExternalAnchor></div><CollapsibleText label="1H NMR" value={row.proton_nmr} /><div className="mt-3"><CollapsibleText label="13C NMR" value={row.carbon_nmr} /></div><p className="mt-3 text-xs text-stone-500">Source: {row.source || 'NMRexp / literature-derived'}</p></div>)}</div> : <EmptyState />}
          </CollapsibleSection>

          <CollapsibleSection title="ChEMBL bioactivity" icon={<Microscope className="h-5 w-5 text-emerald-700" />}>
            {chemblRows.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-stone-500"><tr><th className="px-3 py-2">Target</th><th className="px-3 py-2">Assay</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">pChEMBL</th></tr></thead><tbody>{chemblRows.map((row, index) => <tr key={index} className="border-t border-stone-200"><td className="px-3 py-3"><p className="font-medium text-stone-800">{row.target_pref_name || row.target_chembl_id || 'Not available'}</p><p className="text-xs text-stone-500">{row.target_organism}</p></td><td className="px-3 py-3">{row.assay_chembl_id || '-'}</td><td className="px-3 py-3">{row.standard_type || '-'}</td><td className="px-3 py-3">{row.standard_value ?? '-'} {row.standard_units || ''}</td><td className="px-3 py-3">{row.pchembl_value ?? '-'}</td></tr>)}</tbody></table></div> : <EmptyState />}
          </CollapsibleSection>

          <CollapsibleSection title="Predicted / mapped targets" icon={<Network className="h-5 w-5 text-emerald-700" />}>
            {targetRows.length ? <div className="space-y-3">{targetRows.map((row, index) => <div key={index} className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-stone-800">{row.gene_name || row.target_external_id || 'Unknown target'}</p><span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">{confidenceBand(row.score) || 'Unscored'}</span></div><p className="mt-2 text-sm text-stone-600">{normalizeSpecies(row.target_species) || 'Species not available'} {row.score != null ? `- score ${row.score}` : ''}</p><p className="mt-1 text-sm text-stone-600">{[row.action, row.mode].filter(Boolean).join(' / ') || 'Action mode not available'}</p></div>)}</div> : <EmptyState />}
          </CollapsibleSection>

          <CollapsibleSection title="KEGG pathways" icon={<FileSearch className="h-5 w-5 text-emerald-700" />}>
            {keggRows.length ? <div className="space-y-3">{keggRows.map((row, index) => <InfoTile key={index} label={row.kegg_id || row.kegg_name || `KEGG ${index + 1}`} value={row.kegg_pathway || row.kegg_name} />)}</div> : <EmptyState />}
          </CollapsibleSection>

          <CollapsibleSection title="Expression and perturbation evidence" icon={<Dna className="h-5 w-5 text-emerald-700" />}>
            <div className="space-y-4">
              <div><h3 className="mb-2 text-sm font-semibold text-stone-700">LINCS</h3>{lincsRows.length ? lincsRows.map((row, index) => <InfoTile key={index} label={row.lincs_data?.brd_id || `LINCS ${index + 1}`} value={row.lincs_data?.compound_name_raw} />) : <EmptyState text="No LINCS records found." />}</div>
              <div><h3 className="mb-2 text-sm font-semibold text-stone-700">GEO</h3>{geoRows.length ? geoRows.map((row, index) => <InfoTile key={index} label={row.gse || row.gsm || `GEO ${index + 1}`} value={row.series_title || row.sample_title || row.organism} />) : <EmptyState text="No GEO records found." />}</div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Toxicity" icon={<FileSearch className="h-5 w-5 text-emerald-700" />}>
            {toxicityRows.length ? <div className="space-y-3">{toxicityRows.map((row, index) => <div key={index} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2"><InfoTile label="Endpoint" value={row.toxval_type} /><InfoTile label="Value" value={row.toxval_numeric != null ? `${row.toxval_numeric} ${row.toxval_units || ''}` : null} /><InfoTile label="Species" value={row.species_common} /><InfoTile label="Route / study" value={[row.exposure_route, row.study_type, row.year].filter(Boolean).join(' / ')} /></div>)}</div> : <EmptyState />}
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
