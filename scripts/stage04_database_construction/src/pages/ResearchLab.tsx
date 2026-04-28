import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Beaker,
  Brain,
  CheckCircle2,
  FlaskConical,
  Leaf,
  Lightbulb,
  Microscope,
  NotebookPen,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  Target,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

type StartMode = 'compound' | 'target' | 'plant';
type CanvasTab = 'hypothesis' | 'matrix' | 'compare' | 'notes';

type ApiListResponse<T> = {
  data: T[];
  count?: number;
  total_count?: number;
  skip?: number;
  limit?: number;
};

type CompoundListRow = {
  compound_id: string;
  compound_name_raw?: string | null;
  compound_name_normalized?: string | null;
  pubchem_cid?: string | number | null;
};

type PlantListRow = {
  plant_id: string;
  plant_name_raw?: string | null;
  family?: string | null;
  genus?: string | null;
  species?: string | null;
};

type TargetListRow = {
  target_key: string;
  display_name: string;
  gene_name?: string | null;
  target_external_id?: string | null;
  target_status?: 'named' | 'unresolved';
  linked_compounds_count?: number;
  linked_pubchem_compounds_count?: number;
  linked_lincs_signatures_count?: number;
  upregulated_count?: number;
  downregulated_count?: number;
  evidence_strength?: 'limited' | 'moderate' | 'strong';
};

type CompoundBasic = {
  compound_id: string;
  compound_name_raw?: string | null;
  compound_name_normalized?: string | null;
  pubchem_cid?: string | number | null;
  molecular_formula?: string | null;
  molecular_weight?: number | null;
  chembl_ids?: string | null;
  kegg_ids?: string | null;
  plants?: Array<{
    plant_id?: string;
    plant_name_raw?: string;
    family?: string;
    genus?: string;
    species?: string;
  }>;
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

type StitchTargetRow = {
  gene_name?: string | null;
  target_external_id?: string | null;
  target_species?: string | null;
  score?: number | null;
  action?: string | null;
  mode?: string | null;
};

type TargetDetailResponse = {
  summary: {
    target_key: string;
    display_name: string;
    gene_name?: string | null;
    target_external_id?: string | null;
    target_status?: string;
    linked_compounds_count?: number;
    linked_pubchem_compounds_count?: number;
    linked_lincs_signatures_count?: number;
    upregulated_count?: number;
    downregulated_count?: number;
    evidence_strength?: string;
  };
  compound_links: Array<{
    interaction_id?: string;
    compound_id?: string;
    compound_pubchem_cid?: string | number | null;
    gene_name?: string | null;
    target_external_id?: string | null;
    target_species?: string | null;
    score?: number | null;
    action?: string | null;
    mode?: string | null;
  }>;
  lincs_rows: Array<{
    feature_name?: string;
    experiment_label?: string;
    value?: string | number;
  }>;
};

type RankedTarget = {
  label: string;
  gene_name?: string | null;
  target_external_id?: string | null;
  score?: number | null;
  action?: string | null;
  mode?: string | null;
  score_band: 'unknown' | 'low' | 'moderate' | 'high';
  explainability_score: number;
  concordance: 'strong' | 'mixed' | 'weak';
  reasons: string[];
  gapFlags: string[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeText(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function scoreBand(score?: number | null): 'unknown' | 'low' | 'moderate' | 'high' {
  if (score == null) return 'unknown';
  if (score >= 800) return 'high';
  if (score >= 400) return 'moderate';
  return 'low';
}

function formatCompoundLabel(row: CompoundListRow) {
  return row.compound_name_raw || row.compound_name_normalized || row.compound_id;
}

function formatTargetLabel(row: TargetListRow) {
  return row.display_name || row.gene_name || row.target_external_id || row.target_key;
}

function formatPlantLabel(row: PlantListRow) {
  return row.plant_name_raw || row.plant_id;
}

function cx(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(' ');
}

function ShellCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-[28px] border border-stone-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

function DockTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-stone-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function ModeButton({
  icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'w-full rounded-3xl border p-4 text-left transition',
        active ? 'border-violet-300 bg-violet-50' : 'border-stone-200 bg-white hover:bg-stone-50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-3">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-stone-900">{title}</div>
          <div className="mt-2 text-xs leading-5 text-stone-600">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

function EntityRow({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
        active ? 'border-violet-300 bg-violet-50' : 'border-stone-200 bg-white hover:bg-stone-50'
      )}
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-stone-900">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-stone-500">{subtitle}</p> : null}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-stone-400" />
    </button>
  );
}

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'violet' | 'good' | 'warn' | 'bad';
}) {
  const cls =
    tone === 'violet'
      ? 'border-violet-200 bg-violet-50 text-violet-800'
      : tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'bad'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-stone-200 bg-stone-50 text-stone-700';

  return <span className={cx('rounded-full border px-3 py-1 text-xs font-medium', cls)}>{children}</span>;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="text-[11px] uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-stone-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-stone-500">{hint}</div> : null}
    </div>
  );
}

function EvidenceDot({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
        active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'
      )}
    >
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </span>
  );
}

export default function ResearchLab() {
  const [startMode, setStartMode] = useState<StartMode>('compound');
  const [activeTab, setActiveTab] = useState<CanvasTab>('hypothesis');

  const [compoundQuery, setCompoundQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [plantQuery, setPlantQuery] = useState('');

  const [selectedCompoundId, setSelectedCompoundId] = useState('');
  const [selectedTargetKey, setSelectedTargetKey] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');

  const [workingHypothesis, setWorkingHypothesis] = useState('');
  const [labNotes, setLabNotes] = useState('');

  const { data: compoundSearch } = useQuery<ApiListResponse<CompoundListRow>>({
    queryKey: ['lab5-compounds-search', compoundQuery],
    queryFn: () =>
      fetchJson<ApiListResponse<CompoundListRow>>(
        `http://127.0.0.1:8000/api/compounds?limit=20&skip=0${compoundQuery.trim() ? `&q=${encodeURIComponent(compoundQuery)}` : ''}`
      ),
  });

  const { data: targetSearch } = useQuery<ApiListResponse<TargetListRow>>({
    queryKey: ['lab5-targets-search', targetQuery],
    queryFn: () =>
      fetchJson<ApiListResponse<TargetListRow>>(
        `http://127.0.0.1:8000/api/targets?limit=20&skip=0${targetQuery.trim() ? `&q=${encodeURIComponent(targetQuery)}` : ''}`
      ),
  });

  const { data: plantSearch } = useQuery<ApiListResponse<PlantListRow>>({
    queryKey: ['lab5-plants-search', plantQuery],
    queryFn: () =>
      fetchJson<ApiListResponse<PlantListRow>>(
        `http://127.0.0.1:8000/api/plants?limit=20&skip=0${plantQuery.trim() ? `&q=${encodeURIComponent(plantQuery)}` : ''}`
      ),
  });

  const { data: compoundDetail } = useQuery<CompoundBasic>({
    queryKey: ['lab5-compound-detail', selectedCompoundId],
    queryFn: () => fetchJson<CompoundBasic>(`http://127.0.0.1:8000/api/compounds/${encodeURIComponent(selectedCompoundId)}`),
    enabled: !!selectedCompoundId,
  });

  const { data: chemblData } = useQuery<ApiListResponse<ChemblRow>>({
    queryKey: ['lab5-compound-chembl', selectedCompoundId],
    queryFn: () => fetchJson<ApiListResponse<ChemblRow>>(`http://127.0.0.1:8000/api/compounds/${encodeURIComponent(selectedCompoundId)}/chembl`),
    enabled: !!selectedCompoundId,
  });

  const { data: stitchTargetsData } = useQuery<ApiListResponse<StitchTargetRow>>({
    queryKey: ['lab5-compound-targets', selectedCompoundId],
    queryFn: () => fetchJson<ApiListResponse<StitchTargetRow>>(`http://127.0.0.1:8000/api/compounds/${encodeURIComponent(selectedCompoundId)}/targets`),
    enabled: !!selectedCompoundId,
  });

  const { data: geoData } = useQuery<ApiListResponse<any>>({
    queryKey: ['lab5-compound-geo', selectedCompoundId],
    queryFn: () => fetchJson<ApiListResponse<any>>(`http://127.0.0.1:8000/api/compounds/${encodeURIComponent(selectedCompoundId)}/geo`),
    enabled: !!selectedCompoundId,
  });

  const { data: lincsData } = useQuery<ApiListResponse<any>>({
    queryKey: ['lab5-compound-lincs', selectedCompoundId],
    queryFn: () => fetchJson<ApiListResponse<any>>(`http://127.0.0.1:8000/api/compounds/${encodeURIComponent(selectedCompoundId)}/lincs`),
    enabled: !!selectedCompoundId,
  });

  const { data: targetDetail } = useQuery<TargetDetailResponse>({
    queryKey: ['lab5-target-detail', selectedTargetKey],
    queryFn: () => fetchJson<TargetDetailResponse>(`http://127.0.0.1:8000/api/targets/${encodeURIComponent(selectedTargetKey)}`),
    enabled: !!selectedTargetKey,
  });

  const compounds = compoundSearch?.data || [];
  const targets = targetSearch?.data || [];
  const plants = plantSearch?.data || [];
  const chemblRows = chemblData?.data || [];
  const stitchRows = stitchTargetsData?.data || [];
  const geoRows = geoData?.data || [];
  const lincsRows = lincsData?.data || [];

  const meaningfulChemblRows = useMemo(() => {
    return chemblRows.filter(
      (row) =>
        row.target_pref_name ||
        row.target_chembl_id ||
        row.assay_chembl_id ||
        row.standard_type ||
        row.standard_value != null ||
        row.molecule_chembl_id
    );
  }, [chemblRows]);

  const rankedTargets = useMemo<RankedTarget[]>(() => {
    const map = new Map<string, RankedTarget>();

    stitchRows.forEach((row) => {
      const label = row.gene_name || row.target_external_id || 'Unknown target';
      const key = `${row.gene_name || ''}|${row.target_external_id || ''}`;
      const band = scoreBand(row.score);

      let explainabilityScore = 0;
      const reasons: string[] = [];
      const gapFlags: string[] = [];

      if (band === 'high') {
        explainabilityScore += 5;
        reasons.push('High STITCH interaction confidence');
      } else if (band === 'moderate') {
        explainabilityScore += 3;
        reasons.push('Moderate STITCH interaction confidence');
      } else if (band === 'low') {
        explainabilityScore += 1;
        reasons.push('Low STITCH interaction confidence');
        gapFlags.push('Interaction confidence is low');
      }

      if (row.mode) {
        explainabilityScore += 1;
        reasons.push(`Interaction mode available: ${row.mode}`);
      } else {
        gapFlags.push('Interaction mode is missing');
      }

      if (row.action) {
        explainabilityScore += 1;
        reasons.push(`Interaction action available: ${row.action}`);
      } else {
        gapFlags.push('Interaction action is missing');
      }

      if (meaningfulChemblRows.length > 0) {
        explainabilityScore += 2;
        reasons.push('Compound has ChEMBL bioactivity support');
      } else {
        gapFlags.push('No ChEMBL bioactivity support loaded for this compound');
      }

      if (lincsRows.length > 0) {
        explainabilityScore += 1;
        reasons.push('Compound has LINCS-linked evidence');
      } else {
        gapFlags.push('No LINCS evidence loaded for this compound');
      }

      if (geoRows.length > 0) {
        explainabilityScore += 1;
        reasons.push('Compound has GEO-linked evidence');
      } else {
        gapFlags.push('No GEO evidence loaded for this compound');
      }

      let concordance: 'strong' | 'mixed' | 'weak' = 'weak';
      if ((band === 'high' || band === 'moderate') && meaningfulChemblRows.length > 0 && (lincsRows.length > 0 || geoRows.length > 0)) {
        concordance = 'strong';
      } else if ((band === 'high' || band === 'moderate') && (meaningfulChemblRows.length > 0 || lincsRows.length > 0 || geoRows.length > 0)) {
        concordance = 'mixed';
      }

      const current = map.get(key);
      if (!current || (row.score ?? 0) > (current.score ?? 0)) {
        map.set(key, {
          label,
          gene_name: row.gene_name,
          target_external_id: row.target_external_id,
          score: row.score,
          action: row.action,
          mode: row.mode,
          score_band: band,
          explainability_score: explainabilityScore,
          concordance,
          reasons,
          gapFlags,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return (
        b.explainability_score - a.explainability_score ||
        (b.score ?? 0) - (a.score ?? 0) ||
        a.label.localeCompare(b.label)
      );
    });
  }, [stitchRows, meaningfulChemblRows.length, lincsRows.length, geoRows.length]);

  const selectedCompoundName =
    compoundDetail?.compound_name_raw ||
    compoundDetail?.compound_name_normalized ||
    compoundDetail?.compound_id ||
    'No compound selected';

  const selectedPlantName =
    plants.find((p) => p.plant_id === selectedPlantId)?.plant_name_raw ||
    selectedPlantId ||
    'No plant selected';

  const activeTargetSummary = targetDetail?.summary || null;

  const activeWorkspaceName = useMemo(() => {
    if (startMode === 'compound') return selectedCompoundName;
    if (startMode === 'target') return activeTargetSummary?.display_name || 'No target selected';
    return selectedPlantName;
  }, [startMode, selectedCompoundName, activeTargetSummary, selectedPlantName]);

  const concordanceSummary = useMemo(
    () => ({
      strong: rankedTargets.filter((r) => r.concordance === 'strong').length,
      mixed: rankedTargets.filter((r) => r.concordance === 'mixed').length,
      weak: rankedTargets.filter((r) => r.concordance === 'weak').length,
    }),
    [rankedTargets]
  );

  const topGapFlags = useMemo(() => {
    const counts = new Map<string, number>();
    rankedTargets.forEach((target) => {
      target.gapFlags.forEach((flag) => {
        counts.set(flag, (counts.get(flag) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rankedTargets]);

  const generatedHypothesis = useMemo(() => {
    if (!compoundDetail) {
      return 'Select a compound to start building an explainable research hypothesis.';
    }

    const compoundName =
      compoundDetail.compound_name_raw ||
      compoundDetail.compound_name_normalized ||
      compoundDetail.compound_id;

    if (selectedTargetKey && activeTargetSummary) {
      return `${compoundName} may influence ${activeTargetSummary.display_name} through a compound-target relationship supported by interaction evidence, with additional context from linked bioactivity and transcriptomic evidence where available.`;
    }

    if (rankedTargets.length > 0) {
      const top = rankedTargets[0];
      return `${compoundName} may modulate ${top.label} based on ${top.score_band} STITCH interaction evidence and ${top.concordance === 'strong' ? 'convergent multi-source support' : top.concordance === 'mixed' ? 'partially convergent support' : 'limited orthogonal support'}.`;
    }

    return `${compoundName} is currently selected, but no ranked target hypothesis could yet be generated from the loaded evidence.`;
  }, [compoundDetail, selectedTargetKey, activeTargetSummary, rankedTargets]);

  const nextStepSuggestions = useMemo(() => {
    if (!compoundDetail) {
      return [
        'Select a compound as the starting point for the investigation.',
        'Inspect whether the compound has STITCH, ChEMBL, LINCS, or GEO support.',
      ];
    }

    if (rankedTargets.length === 0) {
      return [
        'Check whether this compound has any compound-target interaction data.',
        'Inspect whether it lacks orthogonal evidence such as ChEMBL, LINCS, or GEO support.',
      ];
    }

    const top = rankedTargets[0];
    const out: string[] = [];

    if (top.score_band === 'high' || top.score_band === 'moderate') {
      out.push(`Prioritize validation of ${top.label} as the current lead target candidate.`);
    } else {
      out.push('Seek stronger interaction evidence before prioritizing a target-level mechanism.');
    }

    if (top.concordance === 'strong') {
      out.push('Use the convergent evidence to formulate a higher-confidence mechanism hypothesis.');
    } else if (top.concordance === 'mixed') {
      out.push('Compare incomplete or conflicting evidence streams before committing to one mechanism.');
    } else {
      out.push('Gather orthogonal evidence because current support remains weak.');
    }

    if (meaningfulChemblRows.length === 0) {
      out.push('Look for assay-level or literature support to complement current interaction evidence.');
    }

    return out;
  }, [compoundDetail, rankedTargets, meaningfulChemblRows.length]);

  const resetWorkspace = () => {
    setCompoundQuery('');
    setTargetQuery('');
    setPlantQuery('');
    setSelectedCompoundId('');
    setSelectedTargetKey('');
    setSelectedPlantId('');
    setWorkingHypothesis('');
    setLabNotes('');
    setActiveTab('hypothesis');
    setStartMode('compound');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f5f3ff,white_35%,#f8fafc_82%)] px-4 pb-10 pt-5 md:px-6 xl:px-8">
      <div className="mx-auto max-w-[1600px]">
        <ShellCard className="mb-6 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-stone-200 bg-violet-50 p-3">
                <Beaker className="h-8 w-8 text-violet-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-900">Virtual Research Lab</h1>
                <p className="mt-1 text-sm text-stone-500">
                  An explainable chemogenomic workspace for hypothesis building.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="violet">Session: Active</Pill>
              <Pill tone="good">Explainable reasoning</Pill>
              <button
                type="button"
                onClick={resetWorkspace}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reset workspace
              </button>
            </div>
          </div>
        </ShellCard>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
            <ShellCard className="p-5">
              <DockTitle
                icon={<Brain className="h-5 w-5 text-violet-700" />}
                title="How to use this lab"
                subtitle="Think of this as a session workspace, not a normal page."
              />
              <ol className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                <li>1. Choose a starting mode.</li>
                <li>2. Select a plant, compound, or target from the materials shelf.</li>
                <li>3. Use the center workbench to inspect evidence and compare candidates.</li>
                <li>4. Use the assistant panel for concordance, gaps, and next-step guidance.</li>
                <li>5. Write your own working hypothesis in the notebook tab.</li>
              </ol>
            </ShellCard>

            <ShellCard className="p-5">
              <DockTitle
                icon={<FlaskConical className="h-5 w-5 text-violet-700" />}
                title="Research inputs"
                subtitle="Choose one starting mode, then load the entity you want to investigate."
              />

              <div className="mt-5 space-y-3">
                <ModeButton
                  title="Start from compound"
                  subtitle="Best for target prioritization and mechanism discovery."
                  active={startMode === 'compound'}
                  onClick={() => setStartMode('compound')}
                  icon={<FlaskConical className="h-5 w-5 text-violet-700" />}
                />
                <ModeButton
                  title="Start from target"
                  subtitle="Best for evidence inspection and regulation-oriented interpretation."
                  active={startMode === 'target'}
                  onClick={() => setStartMode('target')}
                  icon={<Target className="h-5 w-5 text-red-700" />}
                />
                <ModeButton
                  title="Start from plant"
                  subtitle="Best for botanical context before moving toward chemistry."
                  active={startMode === 'plant'}
                  onClick={() => setStartMode('plant')}
                  icon={<Leaf className="h-5 w-5 text-emerald-700" />}
                />
              </div>
            </ShellCard>

            <ShellCard className="p-5">
              <DockTitle
                icon={<Search className="h-5 w-5 text-stone-700" />}
                title="Materials shelf"
                subtitle="Only top matches are shown so the workspace stays focused."
              />

              <div className="mt-5 space-y-5">
                <div className={cx(startMode !== 'compound' && 'opacity-55')}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Compounds</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={compoundQuery}
                      onChange={(e) => setCompoundQuery(e.target.value)}
                      placeholder="Search compound..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-400 focus:bg-white"
                    />
                  </div>
                  <div className="mt-3 max-h-[220px] space-y-2 overflow-auto">
                    {compounds.map((row) => (
                      <EntityRow
                        key={row.compound_id}
                        title={formatCompoundLabel(row)}
                        subtitle={`${row.compound_id}${row.pubchem_cid ? ` • PubChem ${row.pubchem_cid}` : ''}`}
                        active={selectedCompoundId === row.compound_id}
                        onClick={() => {
                          setSelectedCompoundId(row.compound_id);
                          setStartMode('compound');
                          setActiveTab('hypothesis');
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className={cx(startMode !== 'target' && 'opacity-55')}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Targets</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={targetQuery}
                      onChange={(e) => setTargetQuery(e.target.value)}
                      placeholder="Search target..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-400 focus:bg-white"
                    />
                  </div>
                  <div className="mt-3 max-h-[220px] space-y-2 overflow-auto">
                    {targets.map((row) => (
                      <EntityRow
                        key={row.target_key}
                        title={formatTargetLabel(row)}
                        subtitle={`${row.target_external_id || row.target_key}${row.target_status ? ` • ${row.target_status}` : ''}`}
                        active={selectedTargetKey === row.target_key}
                        onClick={() => {
                          setSelectedTargetKey(row.target_key);
                          setStartMode('target');
                          setActiveTab('evidence');
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className={cx(startMode !== 'plant' && 'opacity-55')}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Plants</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={plantQuery}
                      onChange={(e) => setPlantQuery(e.target.value)}
                      placeholder="Search plant..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
                    />
                  </div>
                  <div className="mt-3 max-h-[220px] space-y-2 overflow-auto">
                    {plants.map((row) => (
                      <EntityRow
                        key={row.plant_id}
                        title={formatPlantLabel(row)}
                        subtitle={[row.family, row.genus, row.species].filter(Boolean).join(' • ')}
                        active={selectedPlantId === row.plant_id}
                        onClick={() => {
                          setSelectedPlantId(row.plant_id);
                          setStartMode('plant');
                          setActiveTab('notes');
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ShellCard>
          </aside>

          <main className="space-y-6">
            <ShellCard className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">Research canvas</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    The center canvas is where you assemble evidence, compare candidates, and write a mechanistic idea.
                  </p>
                </div>
                <Pill tone="violet">{startMode}</Pill>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Pill tone="violet">{activeWorkspaceName}</Pill>
                {compoundDetail?.pubchem_cid ? <Pill>PubChem {compoundDetail.pubchem_cid}</Pill> : null}
                {compoundDetail?.chembl_ids ? <Pill>ChEMBL {compoundDetail.chembl_ids}</Pill> : null}
                {compoundDetail?.kegg_ids ? <Pill>KEGG {compoundDetail.kegg_ids}</Pill> : null}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {(['hypothesis', 'matrix', 'compare', 'notes'] as CanvasTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cx(
                      'rounded-2xl border px-4 py-3 text-sm font-semibold capitalize',
                      activeTab === tab
                        ? 'border-violet-300 bg-violet-50 text-violet-900'
                        : 'border-stone-200 bg-white text-stone-700'
                    )}
                  >
                    {tab === 'hypothesis' && <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" />Hypothesis</span>}
                    {tab === 'matrix' && <span className="inline-flex items-center gap-2"><Microscope className="h-4 w-4" />Evidence matrix</span>}
                    {tab === 'compare' && <span className="inline-flex items-center gap-2"><Scale className="h-4 w-4" />Compare</span>}
                    {tab === 'notes' && <span className="inline-flex items-center gap-2"><NotebookPen className="h-4 w-4" />Notes</span>}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {activeTab === 'hypothesis' && (
                  <div className="space-y-5">
                    <div className="rounded-[28px] border border-violet-200 bg-violet-50 p-6">
                      <p className="text-sm font-semibold text-violet-900">Suggested working statement</p>
                      <p className="mt-4 text-base leading-8 text-violet-950">{generatedHypothesis}</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Stat label="ChEMBL records" value={meaningfulChemblRows.length} hint="Bioactivity support" />
                      <Stat label="STITCH candidates" value={rankedTargets.length} hint="Interaction targets" />
                      <Stat label="LINCS rows" value={lincsRows.length} hint="Transcriptomic context" />
                      <Stat label="GEO rows" value={geoRows.length} hint="Text evidence context" />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <EvidenceDot label="ChEMBL evidence" active={meaningfulChemblRows.length > 0} />
                      <EvidenceDot label="STITCH evidence" active={rankedTargets.length > 0} />
                      <EvidenceDot label="LINCS evidence" active={lincsRows.length > 0} />
                      <EvidenceDot label="GEO evidence" active={geoRows.length > 0} />
                    </div>
                  </div>
                )}

                {activeTab === 'matrix' && (
                  <div className="overflow-x-auto rounded-[28px] border border-stone-200">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-stone-50">
                        <tr className="text-left text-sm text-stone-600">
                          <th className="px-4 py-3 font-semibold">Candidate target</th>
                          <th className="px-4 py-3 font-semibold">STITCH</th>
                          <th className="px-4 py-3 font-semibold">ChEMBL</th>
                          <th className="px-4 py-3 font-semibold">LINCS</th>
                          <th className="px-4 py-3 font-semibold">GEO</th>
                          <th className="px-4 py-3 font-semibold">Concordance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedTargets.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-sm text-stone-500">
                              No evidence matrix available yet. Select a compound to populate this bench.
                            </td>
                          </tr>
                        ) : (
                          rankedTargets.slice(0, 8).map((row, idx) => (
                            <tr key={`${row.label}-${idx}`} className="border-t border-stone-100 text-sm">
                              <td className="px-4 py-4">
                                <div className="font-medium text-stone-900">{row.label}</div>
                                <div className="mt-1 text-xs text-stone-500">{row.target_external_id || row.gene_name || 'No external id'}</div>
                              </td>
                              <td className="px-4 py-4">
                                <Pill
                                  tone={
                                    row.score_band === 'high'
                                      ? 'good'
                                      : row.score_band === 'moderate'
                                      ? 'warn'
                                      : 'neutral'
                                  }
                                >
                                  {row.score_band}
                                  {row.score != null ? ` • ${row.score}` : ''}
                                </Pill>
                              </td>
                              <td className="px-4 py-4">
                                <Pill tone={meaningfulChemblRows.length > 0 ? 'good' : 'bad'}>
                                  {meaningfulChemblRows.length > 0 ? 'present' : 'absent'}
                                </Pill>
                              </td>
                              <td className="px-4 py-4">
                                <Pill tone={lincsRows.length > 0 ? 'good' : 'bad'}>
                                  {lincsRows.length > 0 ? 'present' : 'absent'}
                                </Pill>
                              </td>
                              <td className="px-4 py-4">
                                <Pill tone={geoRows.length > 0 ? 'good' : 'bad'}>
                                  {geoRows.length > 0 ? 'present' : 'absent'}
                                </Pill>
                              </td>
                              <td className="px-4 py-4">
                                <Pill
                                  tone={
                                    row.concordance === 'strong'
                                      ? 'good'
                                      : row.concordance === 'mixed'
                                      ? 'warn'
                                      : 'bad'
                                  }
                                >
                                  {row.concordance}
                                </Pill>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="space-y-4">
                    {rankedTargets.length === 0 ? (
                      <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-8 text-center">
                        <p className="text-base font-medium text-stone-700">No target comparison available yet.</p>
                        <p className="mt-2 text-sm text-stone-500">Select a compound to populate the comparison bench.</p>
                      </div>
                    ) : (
                      rankedTargets.slice(0, 6).map((row, idx) => (
                        <div key={`${row.label}-${idx}`} className="rounded-[28px] border border-stone-200 bg-white p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-lg font-semibold text-stone-900">{row.label}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                {row.target_external_id || row.gene_name || 'No external target id'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Pill tone="violet">Score {row.explainability_score}</Pill>
                              <Pill
                                tone={
                                  row.score_band === 'high'
                                    ? 'good'
                                    : row.score_band === 'moderate'
                                    ? 'warn'
                                    : 'neutral'
                                }
                              >
                                {row.score_band}
                                {row.score != null ? ` • ${row.score}` : ''}
                              </Pill>
                              <Pill
                                tone={
                                  row.concordance === 'strong'
                                    ? 'good'
                                    : row.concordance === 'mixed'
                                    ? 'warn'
                                    : 'bad'
                                }
                              >
                                {row.concordance}
                              </Pill>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                            <ul className="space-y-2">
                              {row.reasons.slice(0, 4).map((reason, i) => (
                                <li key={`${reason}-${i}`} className="flex gap-2 text-sm text-stone-600">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                              <p className="text-sm font-semibold text-amber-900">Gap flags</p>
                              <ul className="mt-3 space-y-2">
                                {row.gapFlags.slice(0, 3).map((flag, i) => (
                                  <li key={`${flag}-${i}`} className="flex gap-2 text-sm text-amber-800">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{flag}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-stone-900">Your working hypothesis</label>
                      <textarea
                        value={workingHypothesis}
                        onChange={(e) => setWorkingHypothesis(e.target.value)}
                        placeholder="Write your refined working hypothesis here..."
                        className="min-h-[180px] w-full rounded-[28px] border border-stone-200 bg-white p-5 text-sm leading-7 outline-none focus:border-violet-400"
                      />

                      <label className="mb-2 mt-5 block text-sm font-semibold text-stone-900">Research notes</label>
                      <textarea
                        value={labNotes}
                        onChange={(e) => setLabNotes(e.target.value)}
                        placeholder="Add observations, decisions, or experiment ideas..."
                        className="min-h-[180px] w-full rounded-[28px] border border-stone-200 bg-white p-5 text-sm leading-7 outline-none focus:border-violet-400"
                      />
                    </div>

                    <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
                      <p className="text-sm font-semibold text-stone-900">Research prompts</p>
                      <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                        <li>• Which targets remain plausible after excluding low-confidence interactions?</li>
                        <li>• Do ChEMBL and STITCH support the same mechanism or different directions?</li>
                        <li>• Does LINCS reinforce the top target candidate or weaken it?</li>
                        <li>• Are the strongest hypotheses driven by one evidence source or by true triangulation?</li>
                        <li>• What validation experiment would most efficiently discriminate among the top-ranked targets?</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </ShellCard>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-5 xl:self-start">
            <ShellCard className="p-5">
              <DockTitle
                icon={<Brain className="h-5 w-5 text-violet-700" />}
                title="Assistant"
                subtitle="An explainable reasoning side-panel, not a black-box chatbot."
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">Concordance snapshot</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone="good">Strong {concordanceSummary.strong}</Pill>
                    <Pill tone="warn">Mixed {concordanceSummary.mixed}</Pill>
                    <Pill tone="bad">Weak {concordanceSummary.weak}</Pill>
                  </div>
                </div>

                <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">Next best moves</p>
                  <ul className="mt-3 space-y-3">
                    {nextStepSuggestions.map((item, idx) => (
                      <li key={`${item}-${idx}`} className="flex gap-2 text-sm text-stone-600">
                        <Microscope className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-semibold text-stone-900">Most frequent gaps</p>
                  {topGapFlags.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-500">No major gap patterns detected yet.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {topGapFlags.map(([flag, count]) => (
                        <li key={flag} className="flex gap-2 text-sm text-stone-600">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <span>
                            {flag} <span className="text-stone-400">({count})</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-violet-700" />
                    <p className="text-sm font-semibold text-violet-900">Lab interpretation</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-violet-900">
                    This workspace does not replace the researcher. It organizes evidence, exposes uncertainty,
                    and helps transform scattered records into testable mechanistic ideas.
                  </p>
                </div>
              </div>
            </ShellCard>
          </aside>
        </div>
      </div>
    </div>
  );
}