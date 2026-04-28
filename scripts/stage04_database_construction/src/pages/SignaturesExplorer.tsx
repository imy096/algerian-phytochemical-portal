import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Database,
  Search,
  ChevronRight,
  Waves,
  Microscope,
  Filter,
  Dna,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api';

type SignatureRow = {
  signature_id?: string;
  id?: string;
  level?: string | null;
  source?: string | null;
  experiment_id?: string | null;
  compound_id?: string | null;
  plant_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SignatureListResponse =
  | SignatureRow[]
  | {
      data?: SignatureRow[];
      count?: number;
      limit?: number;
      offset?: number;
    };

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
          <p className="mt-2 text-xs text-stone-500">{subtitle}</p>
        </div>
        <div className="text-emerald-600">{icon}</div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800'
          : 'rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50'
      }
    >
      {label}
    </button>
  );
}

function SourceBadge({ source }: { source?: string | null }) {
  const normalized = String(source || '').toUpperCase();

  if (normalized === 'LINCS') {
    return (
      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
        LINCS
      </span>
    );
  }

  if (normalized === 'GEO') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        GEO
      </span>
    );
  }

  return (
    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
      {source || 'Unknown'}
    </span>
  );
}

function MetadataPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-700">
      {children}
    </span>
  );
}

function LincsSignatureCard({ signature }: { signature: SignatureRow }) {
  const signatureId = signature.signature_id || signature.id || 'unknown';
  const metadata = signature.metadata || {};

  const references = Array.isArray((metadata as { references?: unknown }).references)
    ? (((metadata as { references?: unknown }).references as string[]) || [])
    : [];

  const profileCount =
    Number((metadata as { profile_count?: unknown }).profile_count) ||
    references.length ||
    0;

  const title =
    String((metadata as { compound_name?: unknown }).compound_name || '') ||
    signature.compound_id ||
    signature.experiment_id ||
    `LINCS ${String(signatureId).slice(0, 8)}`;

  return (
    <Link
      to={`/signatures/${signatureId}`}
      className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <SourceBadge source="LINCS" />
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              compound evidence
            </span>
          </div>

          <h3 className="break-words text-lg font-semibold text-stone-900 transition group-hover:text-emerald-700">
            {title}
          </h3>

          <p className="mt-2 break-words text-sm text-stone-500">
            {signature.compound_id
              ? `Compound: ${signature.compound_id}`
              : 'Compound-linked LINCS evidence'}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                LINCS profiles
              </p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{profileCount}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                Primary reference
              </p>
              <p className="mt-2 break-all text-sm font-medium text-stone-800">
                {signature.experiment_id || references[0] || 'Not available'}
              </p>
            </div>
          </div>

          {references.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {references.slice(0, 4).map((ref, idx) => (
                <MetadataPill key={`${ref}-${idx}`}>{ref}</MetadataPill>
              ))}
              {references.length > 4 && (
                <MetadataPill>+{references.length - 4} more</MetadataPill>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-stone-400 transition group-hover:text-emerald-600">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function GeoSignatureCard({ signature }: { signature: SignatureRow }) {
  const signatureId = signature.signature_id || signature.id || 'unknown';
  const metadata = signature.metadata || {};

  const titles = Array.isArray((metadata as { titles?: unknown }).titles)
    ? (((metadata as { titles?: unknown }).titles as string[]) || [])
    : [];

  const gseIds = Array.isArray((metadata as { gse_ids?: unknown }).gse_ids)
    ? (((metadata as { gse_ids?: unknown }).gse_ids as string[]) || [])
    : [];

  const studyCount =
    Number((metadata as { study_count?: unknown }).study_count) ||
    gseIds.length ||
    titles.length ||
    0;

  const title =
    signature.experiment_id ||
    titles[0] ||
    String((metadata as { compound_name?: unknown }).compound_name || '') ||
    `GEO ${String(signatureId).slice(0, 8)}`;

  return (
    <Link
      to={`/signatures/${signatureId}`}
      className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <SourceBadge source="GEO" />
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              study evidence
            </span>
          </div>

          <h3 className="break-words text-lg font-semibold text-stone-900 transition group-hover:text-emerald-700">
            {title}
          </h3>

          <p className="mt-2 break-words text-sm text-stone-500">
            {signature.compound_id
              ? `Compound: ${signature.compound_id}`
              : 'GEO-linked evidence'}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                GEO studies
              </p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{studyCount}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">
                Primary accession
              </p>
              <p className="mt-2 break-all text-sm font-medium text-stone-800">
                {gseIds[0] || 'Not available'}
              </p>
            </div>
          </div>

          {gseIds.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {gseIds.slice(0, 4).map((gse, idx) => (
                <MetadataPill key={`${gse}-${idx}`}>{gse}</MetadataPill>
              ))}
              {gseIds.length > 4 && (
                <MetadataPill>+{gseIds.length - 4} more</MetadataPill>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-stone-400 transition group-hover:text-emerald-600">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function SignatureCard({ signature }: { signature: SignatureRow }) {
  const normalizedSource = String(signature.source || '').toUpperCase();

  if (normalizedSource === 'LINCS') {
    return <LincsSignatureCard signature={signature} />;
  }

  if (normalizedSource === 'GEO') {
    return <GeoSignatureCard signature={signature} />;
  }

  const signatureId = signature.signature_id || signature.id || 'unknown';
  const metadata = signature.metadata || {};

  const title =
    signature.experiment_id ||
    String((metadata as { title?: unknown }).title || '') ||
    String((metadata as { study_title?: unknown }).study_title || '') ||
    String((metadata as { dataset?: unknown }).dataset || '') ||
    `Signature ${String(signatureId).slice(0, 8)}`;

  return (
    <Link
      to={`/signatures/${signatureId}`}
      className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <SourceBadge source={signature.source} />
          </div>

          <h3 className="break-words text-lg font-semibold text-stone-900 transition group-hover:text-emerald-700">
            {title}
          </h3>

          <p className="mt-2 break-words text-sm text-stone-500">
            {signature.compound_id
              ? `Compound: ${signature.compound_id}`
              : 'Transcriptomic signature record'}
          </p>
        </div>

        <div className="flex-shrink-0 text-stone-400 transition group-hover:text-emerald-600">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

export default function SignaturesExplorer() {
  const [filters, setFilters] = useState({
    q: '',
    source: '',
    limit: 24,
    offset: 0,
  });

  const queryFilters = useMemo(
    () => ({
      q: filters.q || undefined,
      source: filters.source || undefined,
      limit: filters.limit,
      offset: filters.offset,
    }),
    [filters]
  );

  const { data: response, isLoading, error } = useQuery<SignatureListResponse>({
    queryKey: ['signatures', queryFilters],
    queryFn: () => api.signatures.list(queryFilters),
  });

  const signatures: SignatureRow[] = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const compoundCount = useMemo(
    () => new Set(signatures.map((s) => s.compound_id).filter(Boolean)).size,
    [signatures]
  );

  const geoCount = useMemo(
    () => signatures.filter((s) => String(s.source || '').toUpperCase() === 'GEO').length,
    [signatures]
  );

  const lincsCount = useMemo(
    () => signatures.filter((s) => String(s.source || '').toUpperCase() === 'LINCS').length,
    [signatures]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 md:px-6 xl:px-8">
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-emerald-50 to-teal-50 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Activity className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
              Biological Evidence Explorer
            </h1>
            <p className="mt-2 max-w-3xl text-stone-600">
              Explore transcriptomic and study-linked biological evidence connected
              to compounds. LINCS records represent perturbational reference
              mappings, while GEO records represent study evidence and dataset context.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Evidence records in view"
            value={signatures.length}
            subtitle="Current filtered result set"
            icon={<Waves className="h-8 w-8" />}
          />
          <SummaryCard
            title="Compounds represented"
            value={compoundCount}
            subtitle="Unique compounds in current view"
            icon={<Microscope className="h-8 w-8" />}
          />
          <SummaryCard
            title="LINCS records"
            value={lincsCount}
            subtitle="Perturbational mapping evidence"
            icon={<Dna className="h-8 w-8" />}
          />
          <SummaryCard
            title="GEO records"
            value={geoCount}
            subtitle="Study and sample-linked evidence"
            icon={<FileText className="h-8 w-8" />}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-stone-800">How to read this page</h2>
        <div className="grid gap-4 text-sm text-stone-600 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="mb-2 font-semibold text-stone-800">LINCS</p>
            <p>
              LINCS entries show compound-to-perturbagen reference evidence. At this
              stage, they are best read as transcriptomic reference links, not yet
              full interpreted biological conclusions.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="mb-2 font-semibold text-stone-800">GEO</p>
            <p>
              GEO entries show study and sample metadata linked to compound-related
              evidence. They are best read as dataset context and study support,
              not necessarily complete differential expression analysis yet.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-stone-500" />
          <h2 className="text-lg font-semibold text-stone-800">Explore evidence</h2>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_auto]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) =>
                setFilters({ ...filters, q: e.target.value, offset: 0 })
              }
              placeholder="Search by experiment, signature ID, compound ID, BRD ID, or GSE"
              className="input pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="All sources"
              active={filters.source === ''}
              onClick={() => setFilters({ ...filters, source: '', offset: 0 })}
            />
            <FilterChip
              label="LINCS"
              active={filters.source === 'LINCS'}
              onClick={() => setFilters({ ...filters, source: 'LINCS', offset: 0 })}
            />
            <FilterChip
              label="GEO"
              active={filters.source === 'GEO'}
              onClick={() => setFilters({ ...filters, source: 'GEO', offset: 0 })}
            />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500 shadow-sm">
          Loading biological evidence...
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <Database className="mx-auto mb-4 h-14 w-14 text-stone-400" />
          <p className="font-medium text-stone-700">Unable to load evidence right now.</p>
          <p className="mt-2 text-sm text-stone-500">
            Try refreshing the page or adjusting the filters.
          </p>
        </div>
      ) : signatures.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {signatures.map((signature) => (
            <SignatureCard
              key={signature.signature_id || signature.id || JSON.stringify(signature)}
              signature={signature}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
          <Database className="mx-auto mb-4 h-14 w-14 text-stone-400" />
          <p className="font-medium text-stone-700">
            No evidence found with the current filters.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Try removing filters or searching a different compound, BRD ID, or GEO accession.
          </p>
        </div>
      )}

      {signatures.length > 0 && (
        <div className="flex justify-center gap-4">
          <button
            className="btn btn-secondary"
            disabled={filters.offset === 0}
            onClick={() =>
              setFilters({
                ...filters,
                offset: Math.max(0, filters.offset - filters.limit),
              })
            }
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            disabled={signatures.length < filters.limit}
            onClick={() =>
              setFilters({
                ...filters,
                offset: filters.offset + filters.limit,
              })
            }
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}