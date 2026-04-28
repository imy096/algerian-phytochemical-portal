import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Download,
  Database,
  ChevronDown,
  ChevronRight,
  Microscope,
  FileSearch,
} from 'lucide-react';
import { api } from '../lib/api';

type SignatureGene = {
  gene_id: string;
  log_fc?: number | null;
  adj_p_value?: number | null;
  direction?: string | number | null;
  gene?: {
    symbol?: string | null;
    description?: string | null;
  } | null;
};

type SignatureDetailData = {
  signature_id: string;
  level?: string | null;
  source?: string | null;
  experiment_id?: string | null;
  compound_id?: string | null;
  plant_id?: string | null;
  metadata?: Record<string, any> | null;
  genes?: SignatureGene[];
};

function StatCard({
  title,
  value,
  tone = 'stone',
  icon,
}: {
  title: string;
  value: string | number;
  tone?: 'stone' | 'green' | 'rose';
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === 'green'
      ? 'from-emerald-50 to-emerald-100/50 border-emerald-200'
      : tone === 'rose'
      ? 'from-rose-50 to-rose-100/50 border-rose-200'
      : 'from-stone-50 to-stone-100/50 border-stone-200';

  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-5 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="text-3xl font-bold text-stone-900 mt-2">{value}</p>
        </div>
        <div className="text-stone-600">{icon}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  rightSlot,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function normalizeDirection(gene: SignatureGene): 'up' | 'down' | null {
  const direction = String(gene.direction ?? '').trim().toLowerCase();

  if (direction === 'up' || direction === '+1' || direction === '1') {
    return 'up';
  }

  if (direction === 'down' || direction === '-1') {
    return 'down';
  }

  if (gene.log_fc != null) {
    if (gene.log_fc > 0) return 'up';
    if (gene.log_fc < 0) return 'down';
  }

  return null;
}

function displayEffectValue(gene: SignatureGene): string {
  const direction = String(gene.direction ?? '').trim().toLowerCase();

  if (direction === 'up' || direction === '+1' || direction === '1') {
    return '+1';
  }

  if (direction === 'down' || direction === '-1') {
    return '-1';
  }

  if (gene.log_fc != null) {
    return gene.log_fc.toFixed(3);
  }

  return 'N/A';
}

function GeneAccordion({
  title,
  genes,
  tone,
  defaultOpen = true,
}: {
  title: string;
  genes: SignatureGene[];
  tone: 'up' | 'down';
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const accent =
    tone === 'up'
      ? {
          header: 'text-emerald-700',
          pill: 'bg-emerald-100 text-emerald-800',
          border: 'border-emerald-200',
        }
      : {
          header: 'text-rose-700',
          pill: 'bg-rose-100 text-rose-800',
          border: 'border-rose-200',
        };

  return (
    <div className={`rounded-2xl border ${accent.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left bg-stone-50 hover:bg-stone-100 transition"
      >
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${accent.pill}`}>
            {genes.length}
          </span>
          <span className={`text-base font-semibold ${accent.header}`}>{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-stone-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-stone-500" />
        )}
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-t border-stone-200">
              <tr>
                <th className="text-left p-3 font-semibold text-stone-700">Gene Symbol</th>
                <th className="text-left p-3 font-semibold text-stone-700">Description</th>
                <th className="text-right p-3 font-semibold text-stone-700">Effect</th>
                <th className="text-right p-3 font-semibold text-stone-700">Adj. P-value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {genes.slice(0, 20).map((gene) => (
                <tr key={gene.gene_id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-3 font-mono font-semibold text-stone-800">
                    {gene.gene?.symbol || gene.gene_id || 'N/A'}
                  </td>
                  <td className="p-3 text-stone-600">
                    {gene.gene?.description || 'N/A'}
                  </td>
                  <td className="p-3 text-right font-semibold text-stone-800">
                    {displayEffectValue(gene)}
                  </td>
                  <td className="p-3 text-right text-stone-600">
                    {gene.adj_p_value != null ? gene.adj_p_value.toExponential(2) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SignatureDetail() {
  const { signatureId } = useParams<{ signatureId: string }>();

  const { data: signature, isLoading, error } = useQuery<SignatureDetailData>({
    queryKey: ['signature', signatureId],
    queryFn: () => api.signatures.getById(signatureId!),
    enabled: !!signatureId,
  });

  const upregulatedGenes = useMemo(
    () => signature?.genes?.filter((g) => normalizeDirection(g) === 'up') || [],
    [signature]
  );

  const downregulatedGenes = useMemo(
    () => signature?.genes?.filter((g) => normalizeDirection(g) === 'down') || [],
    [signature]
  );

  const metadataEntries = useMemo(
    () => Object.entries(signature?.metadata || {}),
    [signature]
  );

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-sm text-center text-stone-500">
        Loading signature...
      </div>
    );
  }

  if (error || !signature) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-sm text-center">
        <Database className="w-14 h-14 text-stone-400 mx-auto mb-4" />
        <p className="text-stone-700 font-medium">Signature not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 xl:px-8 space-y-8 pb-12">
      {/* Hero */}
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-emerald-50 to-teal-50 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-600" />
              Transcriptomic Signature
            </h1>
            <p className="text-stone-600 mt-2">
              {signature.experiment_id || `Signature ID: ${signature.signature_id}`}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {signature.source && (
                <span className="rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-sm font-medium">
                  {signature.source}
                </span>
              )}
              {signature.level && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-sm font-medium capitalize">
                  {signature.level}
                </span>
              )}
              {signature.compound_id && (
                <span className="rounded-full bg-stone-100 text-stone-700 px-3 py-1 text-sm font-medium">
                  Compound: {signature.compound_id}
                </span>
              )}
              {signature.plant_id && (
                <span className="rounded-full bg-stone-100 text-stone-700 px-3 py-1 text-sm font-medium">
                  Plant: {signature.plant_id}
                </span>
              )}
            </div>
          </div>

          <button className="btn btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </section>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          title="Upregulated genes"
          value={upregulatedGenes.length}
          tone="green"
          icon={<TrendingUp className="w-7 h-7" />}
        />
        <StatCard
          title="Downregulated genes"
          value={downregulatedGenes.length}
          tone="rose"
          icon={<TrendingDown className="w-7 h-7" />}
        />
        <StatCard
          title="Total genes loaded"
          value={signature.genes?.length || 0}
          tone="stone"
          icon={<Microscope className="w-7 h-7" />}
        />
      </div>

      {/* Interpretation */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <p className="font-medium text-stone-800 mb-1">How to interpret this data</p>
        <p>
          Positive values (+1) indicate upregulated genes, while negative values (-1)
          indicate downregulated genes in response to compound perturbation. These
          values represent transcriptomic response signatures rather than direct
          biological causation.
        </p>
      </div>

      {/* Metadata */}
      {metadataEntries.length > 0 && (
        <Section
          title="Experimental Metadata"
          icon={<FileSearch className="w-5 h-5 text-emerald-600" />}
        >
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {metadataEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-medium text-stone-800 mt-2 break-words">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Genes */}
      <Section
        title="Transcriptomic Response (LINCS / GEO)"
        icon={<Microscope className="w-5 h-5 text-emerald-600" />}
      >
        <div className="space-y-5">
          <GeneAccordion
            title="Upregulated Genes"
            genes={upregulatedGenes}
            tone="up"
            defaultOpen={true}
          />
          <GeneAccordion
            title="Downregulated Genes"
            genes={downregulatedGenes}
            tone="down"
            defaultOpen={false}
          />
        </div>
      </Section>
    </div>
  );
}