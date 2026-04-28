import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Activity,
  Database,
  FlaskConical,
  Target,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api } from '../lib/api';

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

function SmallCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function fmt(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function normalizeSpecies(value?: string | null) {
  if (!value) return '-';
  const v = String(value).trim();
  if (v === '9606') return 'Homo sapiens';
  if (v === '10090') return 'Mus musculus';
  if (v === '10116') return 'Rattus norvegicus';
  return v;
}

function makePubChemUrl(cid?: string | number | null) {
  if (!cid) return null;
  return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
}

function valueDirection(value: string | number | null | undefined) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'neutral';
}

export default function TargetDetail() {
  const { targetKey } = useParams<{ targetKey: string }>();

  const { data, isLoading, error } = useQuery<TargetDetailResponse>({
    queryKey: ['target-detail', targetKey],
    queryFn: () => api.targets.get(targetKey || ''),
    enabled: !!targetKey,
    retry: false,
  });

  const summary = data?.summary;
  const compoundLinks = data?.compound_links || [];
  const lincsRows = data?.lincs_rows || [];

  const distinctCompounds = useMemo(() => {
    const seen = new Set<string>();
    return compoundLinks.filter((row) => {
      const key = `${row.compound_id || ''}|${row.compound_pubchem_cid || ''}|${row.interaction_id || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [compoundLinks]);

  const sortedLincs = useMemo(() => {
    return [...lincsRows].sort((a, b) => {
      const av = Number(a.value ?? 0);
      const bv = Number(b.value ?? 0);
      return Math.abs(bv) - Math.abs(av);
    });
  }, [lincsRows]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500 shadow-sm">
        Loading target detail...
      </div>
    );
  }

  if (error || !data || !summary) {
    return (
      <div className="mx-auto max-w-6xl rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-sm">
        <p className="font-medium text-stone-700">Failed to load target detail.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-12 md:px-6 xl:px-8">
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-sky-50 to-cyan-50 p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Target className="h-9 w-9 text-cyan-700" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
              {summary.display_name}
            </h1>
            <p className="mt-3 max-w-4xl leading-7 text-stone-600">
              Target-centric evidence view showing normalized target identity, linked compounds,
              and LINCS regulation evidence associated with this target profile.
            </p>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-500">
              In this portal, a target can be represented by a resolved gene name or by an external
              identifier when the target could not yet be fully normalized.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SmallCard label="Target key" value={summary.target_key} />
          <SmallCard label="Gene name" value={summary.gene_name || '-'} />
          <SmallCard label="External id" value={summary.target_external_id || '-'} />
          <SmallCard label="Evidence strength" value={summary.evidence_strength || 'limited'} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-semibold text-stone-900">Compound support</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-emerald-900">
            {summary.linked_compounds_count ?? 0}
          </p>
          <p className="mt-2 text-sm text-stone-500">Distinct linked compounds</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-700" />
            <h2 className="text-xl font-semibold text-stone-900">PubChem support</h2>
          </div>
          <p className="mt-4 text-3xl font-bold text-sky-900">
            {summary.linked_pubchem_compounds_count ?? 0}
          </p>
          <p className="mt-2 text-sm text-stone-500">Distinct linked PubChem compounds</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-700" />
            <h2 className="text-xl font-semibold text-stone-900">LINCS regulation</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              Up {summary.upregulated_count ?? 0}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-sm font-medium text-rose-800">
              Down {summary.downregulated_count ?? 0}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
              Signatures {summary.linked_lincs_signatures_count ?? 0}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">Compound interaction rows</h2>
          <p className="mt-2 text-sm text-stone-500">
            These rows summarize compounds linked to this target through interaction evidence.
          </p>

          <div className="mt-4 max-h-[32rem] space-y-3 overflow-auto">
            {distinctCompounds.length === 0 ? (
              <p className="text-sm text-stone-500">No compound interaction rows found.</p>
            ) : (
              distinctCompounds.map((row, idx) => {
                const pubChemUrl = makePubChemUrl(row.compound_pubchem_cid);

                return (
                  <div
                    key={`${row.interaction_id || idx}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {row.compound_id ? (
                          <Link
                            to={`/compounds/${row.compound_id}`}
                            className="text-sm font-semibold text-stone-900 underline-offset-4 hover:underline"
                          >
                            {row.compound_id}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-stone-900">Unknown compound</p>
                        )}

                        <p className="mt-1 text-xs text-stone-500">
                          PubChem: {row.compound_pubchem_cid || '-'}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Species: {normalizeSpecies(row.target_species)}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Mode: {fmt(row.mode)} • Action: {fmt(row.action)} • Score: {fmt(row.score)}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Interaction: {row.interaction_id || '-'}
                        </p>
                      </div>

                      {pubChemUrl && (
                        <a
                          href={pubChemUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          PubChem
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-900">LINCS rows</h2>
          <p className="mt-2 text-sm text-stone-500">
            These rows capture target-associated LINCS experiment labels and their reported values.
          </p>

          <div className="mt-4 max-h-[32rem] space-y-3 overflow-auto">
            {sortedLincs.length === 0 ? (
              <p className="text-sm text-stone-500">No LINCS rows found for this target.</p>
            ) : (
              sortedLincs.map((row, idx) => {
                const direction = valueDirection(row.value);

                return (
                  <div
                    key={`${row.experiment_label || idx}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-stone-900">
                          {row.experiment_label || 'Unnamed experiment'}
                        </p>
                        <p className="mt-2 text-xs text-stone-500">
                          Feature: {row.feature_name || '-'}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          Value: {String(row.value ?? '-')}
                        </p>
                      </div>

                      {direction === 'up' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Up
                        </span>
                      ) : direction === 'down' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          Down
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700">
                          Neutral
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}