import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HeartPulse,
  Leaf,
  FlaskConical,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sprout,
  BarChart3,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';

type TherapeuticConceptSummary = {
  concept_normalized: string;
  total_evidence_records: number;
  plant_count: number;
  ethnobotany_records: number;
  medicinal_records: number;
};

type TherapeuticPlantRow = {
  concept_normalized?: string;
  plant_id?: string;
  plant_name_raw?: string | null;
  scientific_name?: string | null;
  family?: string | null;
  genus?: string | null;
  species?: string | null;
  evidence_group?: string | null;
  total_evidence_records?: number | null;
  ethnobotany_records?: number | null;
  medicinal_records?: number | null;
};

type TherapeuticEvidenceRow = {
  evidence_id?: string;
  plant_id?: string;
  plant_name_raw?: string | null;
  family?: string | null;
  genus?: string | null;
  species?: string | null;
  evidence_group?: string | null;
  concept_normalized?: string | null;
  evidence_text?: string | null;
  keyword?: string | null;
};

type ConceptDetailResponse = {
  concept: TherapeuticConceptSummary;
  plants: TherapeuticPlantRow[];
  evidence: TherapeuticEvidenceRow[];
  evidence_split?: {
    ethnobotany?: TherapeuticEvidenceRow[];
    medicinal_potential?: TherapeuticEvidenceRow[];
  };
};

function prettyLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function displayConceptTitle(value?: string | null) {
  return capitalizeFirst(prettyLabel(value));
}

function truncateText(text?: string | null, max = 420) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No evidence text available.';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}...`;
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{title}</p>
      <p className="text-3xl font-bold text-stone-900 mt-2">{value}</p>
      <p className="text-xs text-stone-500 mt-2 leading-5">{subtitle}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EvidenceBadge({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'green';
}) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-stone-100 text-stone-700 border-stone-200';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {label}: {value}
    </span>
  );
}

function EvidenceCard({
  row,
  tone = 'neutral',
}: {
  row: TherapeuticEvidenceRow;
  tone?: 'neutral' | 'ethnobotany' | 'medicinal';
}) {
  const plantLabel = row.plant_name_raw || row.plant_id || 'Unknown plant';
  const [expanded, setExpanded] = useState(false);

  const bgClass =
    tone === 'ethnobotany'
      ? 'bg-emerald-50'
      : tone === 'medicinal'
        ? 'bg-stone-50'
        : 'bg-stone-50';

  const fullText = (row.evidence_text || '').replace(/\s+/g, ' ').trim();
  const shouldCollapse = fullText.length > 420;

  return (
    <div className={`rounded-2xl border border-stone-200 ${bgClass} p-4`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700">
          {capitalizeFirst(prettyLabel(row.evidence_group))}
        </span>

        {row.keyword ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs text-emerald-800">
            Keyword: {row.keyword}
          </span>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-stone-900">{plantLabel}</p>

      {(row.family || row.genus || row.species) && (
        <p className="text-xs text-stone-500 mt-1">
          {[row.family, row.genus, row.species].filter(Boolean).join(' • ')}
        </p>
      )}

      <p className="text-sm leading-7 text-stone-700 mt-4">
        {expanded ? (fullText || 'No evidence text available.') : truncateText(fullText, 420)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {shouldCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-stone-700 hover:text-emerald-700"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        ) : null}

        {row.plant_id ? (
          <Link
            to={`/plants/${row.plant_id}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            View plant →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function PlantEvidenceAccordion({
  plant,
  ethnobotanyRows,
  medicinalRows,
  defaultOpen = false,
}: {
  plant: TherapeuticPlantRow;
  ethnobotanyRows: TherapeuticEvidenceRow[];
  medicinalRows: TherapeuticEvidenceRow[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const plantLabel =
    plant.scientific_name ||
    plant.plant_name_raw ||
    plant.plant_id ||
    'Unknown plant';

  const totalRows =
    (plant.ethnobotany_records || 0) + (plant.medicinal_records || 0);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-5 bg-stone-50 hover:bg-emerald-50 transition"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-900 break-words">
                {plantLabel}
              </h3>
              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600">
                {totalRows} record{totalRows === 1 ? '' : 's'}
              </span>
            </div>

            {(plant.family || plant.genus || plant.species) && (
              <p className="text-sm text-stone-500 mt-1">
                {[plant.family, plant.genus, plant.species].filter(Boolean).join(' • ')}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {(plant.ethnobotany_records || 0) > 0 ? (
                <EvidenceBadge
                  label="Ethnobotany"
                  value={plant.ethnobotany_records || 0}
                />
              ) : null}

              {(plant.medicinal_records || 0) > 0 ? (
                <EvidenceBadge
                  label="Medicinal"
                  value={plant.medicinal_records || 0}
                  tone="green"
                />
              ) : null}
            </div>
          </div>

          <div className="flex-shrink-0 pt-1">
            {open ? (
              <ChevronDown className="w-5 h-5 text-stone-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-stone-500" />
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-200 p-5 space-y-6 bg-white">
          <div className="flex flex-wrap gap-3">
            {plant.plant_id ? (
              <Link
                to={`/plants/${plant.plant_id}`}
                className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-200 transition"
              >
                Open plant page
              </Link>
            ) : null}
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-stone-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-4 h-4 text-emerald-700" />
                <h4 className="text-base font-semibold text-stone-800">
                  Ethnobotanical Evidence
                </h4>
              </div>

              {ethnobotanyRows.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No ethnobotanical evidence for this plant under this concept.
                </p>
              ) : (
                <div className="space-y-4">
                  {ethnobotanyRows.map((row, idx) => (
                    <EvidenceCard
                      key={row.evidence_id || `${plant.plant_id || 'eth'}-${idx}`}
                      row={row}
                      tone="ethnobotany"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-emerald-700" />
                <h4 className="text-base font-semibold text-stone-800">
                  Medicinal Evidence
                </h4>
              </div>

              {medicinalRows.length === 0 ? (
                <p className="text-sm text-stone-500">
                  No medicinal-potential evidence for this plant under this concept.
                </p>
              ) : (
                <div className="space-y-4">
                  {medicinalRows.map((row, idx) => (
                    <EvidenceCard
                      key={row.evidence_id || `${plant.plant_id || 'med'}-${idx}`}
                      row={row}
                      tone="medicinal"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TherapeuticConceptDetail() {
  const params = useParams<{ conceptName: string }>();
  const conceptName = params.conceptName || '';
  const [plantSearch, setPlantSearch] = useState('');

  const { data, isLoading, error } = useQuery<ConceptDetailResponse>({
    queryKey: ['therapeutic-concept-detail', conceptName],
    queryFn: () => api.therapeutics.conceptDetail(conceptName),
    enabled: !!conceptName,
    retry: false,
  });

  const plants = Array.isArray(data?.plants) ? data.plants : [];
  const evidence = Array.isArray(data?.evidence) ? data.evidence : [];

  const ethnobotanyRows = useMemo(() => {
    if (data?.evidence_split?.ethnobotany) return data.evidence_split.ethnobotany;
    return evidence.filter(
      (row) => (row.evidence_group || '').trim().toLowerCase() === 'ethnobotany'
    );
  }, [data, evidence]);

  const medicinalRows = useMemo(() => {
    if (data?.evidence_split?.medicinal_potential) {
      return data.evidence_split.medicinal_potential;
    }
    return evidence.filter(
      (row) =>
        (row.evidence_group || '').trim().toLowerCase() === 'medicinal_potential'
    );
  }, [data, evidence]);

  const evidenceByPlant = useMemo(() => {
    const grouped = new Map<
      string,
      { ethnobotany: TherapeuticEvidenceRow[]; medicinal: TherapeuticEvidenceRow[] }
    >();

    for (const plant of plants) {
      const id = plant.plant_id || '';
      if (!id) continue;
      grouped.set(id, { ethnobotany: [], medicinal: [] });
    }

    for (const row of ethnobotanyRows) {
      const id = row.plant_id || '';
      if (!id) continue;
      if (!grouped.has(id)) grouped.set(id, { ethnobotany: [], medicinal: [] });
      grouped.get(id)!.ethnobotany.push(row);
    }

    for (const row of medicinalRows) {
      const id = row.plant_id || '';
      if (!id) continue;
      if (!grouped.has(id)) grouped.set(id, { ethnobotany: [], medicinal: [] });
      grouped.get(id)!.medicinal.push(row);
    }

    return grouped;
  }, [plants, ethnobotanyRows, medicinalRows]);

  const filteredAndSortedPlants = useMemo(() => {
    const q = plantSearch.trim().toLowerCase();

    const filtered = plants.filter((plant) => {
      if (!q) return true;

      const haystack = [
        plant.scientific_name,
        plant.plant_name_raw,
        plant.family,
        plant.genus,
        plant.species,
        plant.plant_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      const aTotal =
        (a.total_evidence_records || 0) ||
        (a.ethnobotany_records || 0) + (a.medicinal_records || 0);
      const bTotal =
        (b.total_evidence_records || 0) ||
        (b.ethnobotany_records || 0) + (b.medicinal_records || 0);

      if (bTotal !== aTotal) return bTotal - aTotal;
      if ((b.medicinal_records || 0) !== (a.medicinal_records || 0)) {
        return (b.medicinal_records || 0) - (a.medicinal_records || 0);
      }
      if ((b.ethnobotany_records || 0) !== (a.ethnobotany_records || 0)) {
        return (b.ethnobotany_records || 0) - (a.ethnobotany_records || 0);
      }

      const aLabel = (
        a.scientific_name ||
        a.plant_name_raw ||
        a.plant_id ||
        ''
      ).toLowerCase();

      const bLabel = (
        b.scientific_name ||
        b.plant_name_raw ||
        b.plant_id ||
        ''
      ).toLowerCase();

      return aLabel.localeCompare(bLabel);
    });
  }, [plants, plantSearch]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 xl:px-8 py-12 text-center text-stone-500">
        Loading therapeutic concept...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 xl:px-8 py-12">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-stone-800 font-medium">Failed to load therapeutic concept.</p>
          <pre className="mt-4 text-xs text-stone-600 whitespace-pre-wrap break-words">
            {error instanceof Error ? error.message : 'Unknown error'}
          </pre>
        </div>
      </div>
    );
  }

  if (!data?.concept) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 xl:px-8 py-12">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm text-center text-stone-600">
          Therapeutic concept not found.
        </div>
      </div>
    );
  }

  const concept = data.concept;
  const title = displayConceptTitle(concept.concept_normalized);

  const totalRows = (concept.ethnobotany_records || 0) + (concept.medicinal_records || 0);
  const ethnobotanyPercent =
    totalRows > 0 ? Math.round(((concept.ethnobotany_records || 0) / totalRows) * 100) : 0;
  const medicinalPercent =
    totalRows > 0 ? Math.round(((concept.medicinal_records || 0) / totalRows) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 xl:px-8 space-y-8 pb-12">
      <div className="pt-2">
        <Link
          to="/therapeutics"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to therapeutics
        </Link>
      </div>

      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-emerald-50 to-lime-50 p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
            <HeartPulse className="w-9 h-9 text-emerald-700" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900 break-words">
              {title}
            </h1>
            <p className="text-stone-600 mt-3 max-w-4xl leading-7">
              Normalized therapeutic concept derived from plant-linked evidence.
              Click a plant to expand its ethnobotanical and medicinal evidence separately.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <SummaryCard
            title="Evidence records"
            value={concept.total_evidence_records || 0}
            subtitle="Total classified records supporting this concept"
          />
          <SummaryCard
            title="Plants"
            value={concept.plant_count || 0}
            subtitle="Plants associated with this concept"
          />
          <SummaryCard
            title="Ethnobotany records"
            value={concept.ethnobotany_records || 0}
            subtitle="Traditional-use evidence records"
          />
          <SummaryCard
            title="Medicinal records"
            value={concept.medicinal_records || 0}
            subtitle="Medicinal-potential evidence records"
          />
        </div>
      </section>

      <div className="grid xl:grid-cols-2 gap-6">
        <Section
          title="Concept Overview"
          icon={<Sprout className="w-5 h-5 text-emerald-700" />}
        >
          <p className="text-sm leading-7 text-stone-700">
            This public concept page intentionally uses plant-linked therapeutic evidence only.
            Compound and target extrapolations are excluded here to avoid overstating therapeutic certainty.
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            <EvidenceBadge label="Concept" value={title} />
            <EvidenceBadge label="Plants" value={concept.plant_count || 0} tone="green" />
          </div>
        </Section>

        <Section
          title="Evidence Balance"
          icon={<BarChart3 className="w-5 h-5 text-emerald-700" />}
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-stone-700 font-medium">Ethnobotany</span>
                <span className="text-stone-500">{concept.ethnobotany_records || 0} records</span>
              </div>
              <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${ethnobotanyPercent}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2">{ethnobotanyPercent}% of classified evidence</p>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-stone-700 font-medium">Medicinal potential</span>
                <span className="text-stone-500">{concept.medicinal_records || 0} records</span>
              </div>
              <div className="w-full h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-lime-500 rounded-full"
                  style={{ width: `${medicinalPercent}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 mt-2">{medicinalPercent}% of classified evidence</p>
            </div>
          </div>
        </Section>
      </div>

      <Section
        title="Plants and Their Evidence"
        icon={<Sprout className="w-5 h-5 text-emerald-700" />}
      >
        <div className="mb-5">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plant by name, family, genus, species, or ID..."
              value={plantSearch}
              onChange={(e) => setPlantSearch(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>

          <p className="text-xs text-stone-500 mt-3">
            Showing {filteredAndSortedPlants.length} of {plants.length} plants, sorted by evidence strength.
          </p>
        </div>

        {filteredAndSortedPlants.length === 0 ? (
          <p className="text-stone-500">No plants match the current search.</p>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedPlants.map((plant, idx) => {
              const key = plant.plant_id || `plant-${idx}`;
              const grouped = evidenceByPlant.get(plant.plant_id || '') || {
                ethnobotany: [],
                medicinal: [],
              };

              return (
                <PlantEvidenceAccordion
                  key={key}
                  plant={plant}
                  ethnobotanyRows={grouped.ethnobotany}
                  medicinalRows={grouped.medicinal}
                  defaultOpen={idx === 0}
                />
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}