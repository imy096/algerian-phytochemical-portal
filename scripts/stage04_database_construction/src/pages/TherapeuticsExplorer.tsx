import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HeartPulse, Search, Leaf, FlaskConical, FolderTree } from 'lucide-react';
import { api } from '../lib/api';

type TherapeuticConceptRow = {
  concept_normalized: string;
  total_evidence_records: number;
  plant_count: number;
  ethnobotany_records: number;
  medicinal_records: number;
};

type ApiListResponse<T> = {
  data: T[];
  count: number;
  limit: number;
  offset: number;
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

function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'green' | 'amber';
}) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-stone-100 text-stone-700 border-stone-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}
    >
      {label}: {value}
    </span>
  );
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

export default function TherapeuticsExplorer() {
  const [query, setQuery] = useState('');

  const {
    data,
    isLoading,
    error,
  } = useQuery<ApiListResponse<TherapeuticConceptRow>>({
    queryKey: ['therapeutics-concepts', query],
    queryFn: () => api.therapeutics.concepts(query ? { q: query } : {}),
    retry: false,
  });

  const concepts = Array.isArray(data?.data) ? data.data : [];

  const filteredConcepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;

    return concepts.filter((row) =>
      row.concept_normalized.toLowerCase().includes(q)
    );
  }, [concepts, query]);

  const ethnobotanyConceptCount = filteredConcepts.filter(
    (row) => (row.ethnobotany_records || 0) > 0
  ).length;

  const medicinalConceptCount = filteredConcepts.filter(
    (row) => (row.medicinal_records || 0) > 0
  ).length;

  const totalClassifiedEvidence = filteredConcepts.reduce(
    (acc, row) => acc + (row.total_evidence_records || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 xl:px-8 space-y-8 pb-12">
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-emerald-50 to-lime-50 p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
            <HeartPulse className="w-9 h-9 text-emerald-700" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
              Therapeutics Explorer
            </h1>
            <p className="text-stone-600 mt-3 max-w-4xl leading-7">
              Explore normalized therapeutic concepts derived from classified
              ethnobotanical and medicinal evidence across Algerian medicinal plants.
            </p>
            <p className="text-sm text-stone-500 mt-3 max-w-4xl leading-6">
              This explorer summarizes concepts and classified evidence records only.
              Ethnobotany and medicinal potential remain separate evidence branches,
              and this page does not imply that all linked compounds or targets share
              the same therapeutic effect.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <SummaryCard
            title="Normalized concepts"
            value={filteredConcepts.length}
            subtitle="Therapeutic concepts currently visible in the explorer"
          />
          <SummaryCard
            title="Ethnobotany concepts"
            value={ethnobotanyConceptCount}
            subtitle="Concepts with at least one ethnobotanical evidence record"
          />
          <SummaryCard
            title="Medicinal concepts"
            value={medicinalConceptCount}
            subtitle="Concepts with at least one medicinal-potential evidence record"
          />
          <SummaryCard
            title="Classified evidence records"
            value={totalClassifiedEvidence}
            subtitle="Total classified evidence rows represented in the current view"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search therapeutic concept..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-sm text-center text-stone-500">
          Loading therapeutic concepts...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-sm text-center">
          <p className="text-stone-700 font-medium">Failed to load therapeutic concepts.</p>
        </div>
      ) : filteredConcepts.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-sm text-center">
          <p className="text-stone-700 font-medium">No therapeutic concepts found.</p>
          <p className="text-sm text-stone-500 mt-2">
            Try a different keyword or clear the search field.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredConcepts.map((row) => (
            <Link
              key={row.concept_normalized}
              to={`/therapeutics/${encodeURIComponent(row.concept_normalized)}`}
              className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderTree className="w-5 h-5 text-emerald-700" />
                    <h2 className="text-xl font-semibold text-stone-900 group-hover:text-emerald-700 transition break-words">
                      {displayConceptTitle(row.concept_normalized)}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <StatPill label="Evidence" value={row.total_evidence_records} />
                    <StatPill label="Plants" value={row.plant_count} tone="green" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center gap-2 text-stone-700">
                        <Leaf className="w-4 h-4" />
                        <span className="text-sm font-medium">Ethnobotany</span>
                      </div>
                      <p className="text-2xl font-bold text-stone-900 mt-3">
                        {row.ethnobotany_records}
                      </p>
                      <p className="text-xs text-stone-500 mt-2">
                        Traditional-use evidence records
                      </p>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center gap-2 text-stone-700">
                        <FlaskConical className="w-4 h-4" />
                        <span className="text-sm font-medium">Medicinal</span>
                      </div>
                      <p className="text-2xl font-bold text-stone-900 mt-3">
                        {row.medicinal_records}
                      </p>
                      <p className="text-xs text-stone-500 mt-2">
                        Medicinal-potential evidence records
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-emerald-700 font-medium mt-5">
                    Open concept detail →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}