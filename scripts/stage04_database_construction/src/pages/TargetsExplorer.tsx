import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Target,
  FlaskConical,
  Database,
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';

type TargetRow = {
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

type ApiListResponse<T> = {
  data: T[];
  count: number;
  total_count?: number;
  limit?: number;
  skip?: number;
};

const PAGE_SIZE = 60;

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
      <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{subtitle}</p>
    </div>
  );
}

function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'blue' | 'red';
}) {
  const cls =
    tone === 'green'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : tone === 'blue'
          ? 'bg-sky-100 text-sky-800 border-sky-200'
          : tone === 'red'
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : 'bg-stone-100 text-stone-700 border-stone-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export default function TargetsExplorer() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'named' | 'unresolved'>('all');
  const [page, setPage] = useState(1);

  const skip = (page - 1) * PAGE_SIZE;

  const { data, isLoading, error } = useQuery<ApiListResponse<TargetRow>>({
    queryKey: ['targets', query, statusFilter, page],
    queryFn: () =>
      api.targets.list({
        q: query || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: PAGE_SIZE,
        skip,
      }),
    retry: false,
  });

  const targets = Array.isArray(data?.data) ? data.data : [];
  const totalCount = data?.total_count ?? targets.length;

  const sortedTargets = useMemo(() => {
    return [...targets].sort((a, b) => {
      return (
        (b.linked_compounds_count || 0) - (a.linked_compounds_count || 0) ||
        (b.linked_lincs_signatures_count || 0) - (a.linked_lincs_signatures_count || 0) ||
        (a.display_name || '').localeCompare(b.display_name || '')
      );
    });
  }, [targets]);

  const namedCount = sortedTargets.filter((t) => t.target_status === 'named').length;
  const unresolvedCount = sortedTargets.filter((t) => t.target_status === 'unresolved').length;
  const totalCompoundLinks = sortedTargets.reduce(
    (acc, row) => acc + (row.linked_compounds_count || 0),
    0
  );
  const totalLincsLinks = sortedTargets.reduce(
    (acc, row) => acc + (row.linked_lincs_signatures_count || 0),
    0
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: 'all' | 'named' | 'unresolved') => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 md:px-6 xl:px-8">
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-sky-50 to-cyan-50 p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Target className="h-9 w-9 text-cyan-700" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
              Targets Explorer
            </h1>
            <p className="mt-3 max-w-4xl leading-7 text-stone-600">
              Explore normalized targets built from compound–target interaction evidence.
              This page shows target identity first, then how strongly each target is supported
              by interaction and LINCS evidence.
            </p>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-500">
              “Named” targets have resolved human-readable target identities. “Unresolved”
              targets are still represented only by external identifiers.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Matching targets"
            value={totalCount}
            subtitle="Total targets matching the current filter"
          />
          <SummaryCard
            title="Targets on this page"
            value={sortedTargets.length}
            subtitle={`Showing page ${page} of ${totalPages}`}
          />
          <SummaryCard
            title="Named on this page"
            value={namedCount}
            subtitle="Resolved targets in the current page"
          />
          <SummaryCard
            title="Unresolved on this page"
            value={unresolvedCount}
            subtitle="Targets represented only by external identifiers"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Compound evidence links"
            value={totalCompoundLinks}
            subtitle="Compound-target links in the current page"
          />
          <SummaryCard
            title="LINCS signature links"
            value={totalLincsLinks}
            subtitle="LINCS evidence links in the current page"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search target name or external id..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-400 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStatusChange('all')}
              className={`rounded-xl border px-4 py-2 text-sm ${
                statusFilter === 'all'
                  ? 'border-cyan-600 bg-cyan-600 text-white'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              <Filter className="mr-2 inline h-4 w-4" />
              All
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('named')}
              className={`rounded-xl border px-4 py-2 text-sm ${
                statusFilter === 'named'
                  ? 'border-cyan-600 bg-cyan-600 text-white'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              Named
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('unresolved')}
              className={`rounded-xl border px-4 py-2 text-sm ${
                statusFilter === 'unresolved'
                  ? 'border-cyan-600 bg-cyan-600 text-white'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              Unresolved
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm text-stone-500">
          <p>
            Showing {sortedTargets.length} rows on this page out of {totalCount} matching targets.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500 shadow-sm">
          Loading target records...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <p className="font-medium text-stone-700">Failed to load target records.</p>
        </div>
      ) : sortedTargets.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <p className="font-medium text-stone-700">No target records found.</p>
          <p className="mt-2 text-sm text-stone-500">
            Try a target name or external identifier.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedTargets.map((row) => (
            <Link
              key={row.target_key}
              to={`/targets/${encodeURIComponent(row.target_key)}`}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-semibold text-stone-900">
                    {row.display_name || 'Unknown target'}
                  </h2>
                  <p className="mt-1 break-all text-xs text-stone-500">
                    {row.target_external_id || 'No external target id'}
                  </p>
                </div>

                <Badge tone={row.target_status === 'named' ? 'green' : 'amber'}>
                  {row.target_status === 'named' ? 'Named' : 'Unresolved'}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-xs text-stone-500">Evidence strength</p>
                  <div className="mt-2">
                    <Badge
                      tone={
                        row.evidence_strength === 'strong'
                          ? 'green'
                          : row.evidence_strength === 'moderate'
                            ? 'blue'
                            : 'neutral'
                      }
                    >
                      {row.evidence_strength || 'limited'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <FlaskConical className="h-4 w-4" />
                      <span className="text-sm font-medium">Compounds</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-emerald-900">
                      {row.linked_compounds_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sky-800">
                      <Database className="h-4 w-4" />
                      <span className="text-sm font-medium">PubChem</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-sky-900">
                      {row.linked_pubchem_compounds_count ?? 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-medium">LINCS regulation summary</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="green">Up {row.upregulated_count ?? 0}</Badge>
                    <Badge tone="red">Down {row.downregulated_count ?? 0}</Badge>
                    <Badge tone="blue">Signatures {row.linked_lincs_signatures_count ?? 0}</Badge>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}