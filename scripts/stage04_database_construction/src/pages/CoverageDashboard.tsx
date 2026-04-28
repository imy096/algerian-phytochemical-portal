import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Database,
  Leaf,
  FlaskConical,
  Activity,
  HelpCircle,
  X,
  Download,
  Search,
  PanelRightOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type CoverageResponse = {
  total_plants: number;
  total_compounds: number;
  total_plant_compound_links: number;
  endemic_plants: number;
  coverage: {
    plants_with_compounds: number;
    plants_without_compounds: number;
    plants_with_complete_taxonomy: number;
    plants_with_missing_taxonomy: number;
    plants_with_complete_core_attributes: number;
    partial_plant_attributes: number;
    compounds_with_toxicity: number;
    compounds_without_toxicity: number;
    compounds_with_complete_identifiers: number;
    compounds_with_missing_identifiers: number;
    compounds_with_kegg: number;
    compounds_without_kegg: number;
    compounds_with_omics: number;
    compounds_without_omics: number;
    compounds_with_geo_only_omics: number;
    compounds_with_lincs_only_omics: number;
  };
};

type GapPlant = {
  plant_id?: string;
  scientific_name?: string;
  genus?: string;
  family?: string;
  species?: string;
  missing_fields?: string;
  priority?: string;
  notes?: string;
};

type GapCompound = {
  compound_id?: string;
  compound_name?: string;
  linked_plant_name?: string;
  status?: string;
  missing_identifiers?: string;
  missing_structure_fields?: string;
  missing_bioactivity_fields?: string;
  missing_omics_fields?: string;
  priority?: string;
  notes?: string;
};

type GapsResponse = {
  summary?: {
    plants_without_compounds_count?: number;
    plants_with_missing_taxonomy_count?: number;
    partial_plant_attributes_count?: number;
    compounds_without_toxicity_count?: number;
    compounds_with_missing_identifiers_count?: number;
    compounds_without_kegg_count?: number;
    compounds_without_omics_count?: number;
    compounds_with_geo_only_omics_count?: number;
    compounds_with_lincs_only_omics_count?: number;
  };
  plants_without_compounds?: GapPlant[];
  plants_with_missing_taxonomy?: GapPlant[];
  partial_plant_attributes?: GapPlant[];
  compounds_without_toxicity?: GapCompound[];
  compounds_with_missing_identifiers?: GapCompound[];
  compounds_without_kegg?: GapCompound[];
  compounds_without_omics?: GapCompound[];
  compounds_with_geo_only_omics?: GapCompound[];
  compounds_with_lincs_only_omics?: GapCompound[];
};

const COLORS = ['#38936c', '#ef6820', '#5bae88', '#f28b44'];

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-stone-900">{value}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  total,
  tone = 'green',
}: {
  label: string;
  value: number;
  total: number;
  tone?: 'green' | 'amber';
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const Icon = percentage >= 50 ? CheckCircle : AlertCircle;
  const iconColor = tone === 'green' ? 'text-emerald-600' : 'text-amber-600';
  const barColor = tone === 'green' ? 'bg-emerald-600' : 'bg-amber-600';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-stone-900">
            {value} / {total}
          </span>
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-stone-200">
        <div
          className={`h-2 rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-1 text-xs text-stone-500">{percentage.toFixed(1)}% coverage</p>
    </div>
  );
}

function stringifyItem(item: Record<string, unknown>): string {
  return Object.entries(item)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ');
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const escapeCell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCell(row[header])).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function FullListModal<T extends Record<string, unknown>>({
  open,
  title,
  items,
  renderLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  items: T[];
  renderLabel: (item: T) => string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const combined = `${renderLabel(item)} ${stringifyItem(item)}`.toLowerCase();
      return combined.includes(q);
    });
  }, [items, query, renderLabel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h3 className="text-2xl font-bold text-stone-900">{title}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {filteredItems.length} visible item(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  `${title.toLowerCase().replace(/\s+/g, '_')}.csv`,
                  filteredItems
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-stone-200 px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search within this gap list..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-stone-500">No matching records found.</p>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item, index) => (
                <div
                  key={`${title}-${index}`}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="text-sm font-medium text-stone-900">
                    {renderLabel(item)}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-stone-600">
                    {stringifyItem(item)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GapListCard<T extends Record<string, unknown>>({
  title,
  count,
  items,
  renderLabel,
  emptyText,
}: {
  title: string;
  count: number;
  items: T[];
  renderLabel: (item: T) => string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">
            {title} ({count})
          </h3>

          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PanelRightOpen className="h-4 w-4" />
            View full list
          </button>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">{emptyText}</p>
          ) : (
            <>
              {items.slice(0, 8).map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
                >
                  {renderLabel(item)}
                </div>
              ))}
              {items.length > 8 && (
                <p className="pt-1 text-xs text-stone-500">
                  Previewing 8 of {items.length} items.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <FullListModal
        open={open}
        title={title}
        items={items}
        renderLabel={renderLabel}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function CoverageDashboard() {
  const {
    data: coverage,
    isLoading: coverageLoading,
    error: coverageError,
  } = useQuery<CoverageResponse>({
    queryKey: ['coverage'],
    queryFn: api.analytics.coverage,
  });

  const {
    data: gaps,
    isLoading: gapsLoading,
    error: gapsError,
  } = useQuery<GapsResponse>({
    queryKey: ['gaps'],
    queryFn: api.analytics.gaps,
  });

  const coverageData = useMemo(() => {
    if (!coverage?.coverage) return [];

    return [
      {
        category: 'Plants with Compounds',
        covered: coverage.coverage.plants_with_compounds,
        missing: coverage.coverage.plants_without_compounds,
      },
      {
        category: 'Complete Taxonomy',
        covered: coverage.coverage.plants_with_complete_taxonomy,
        missing: coverage.coverage.plants_with_missing_taxonomy,
      },
      {
        category: 'Compounds with Toxicity',
        covered: coverage.coverage.compounds_with_toxicity,
        missing: coverage.coverage.compounds_without_toxicity,
      },
      {
        category: 'Compounds with Any Omics',
        covered: coverage.coverage.compounds_with_omics,
        missing: coverage.coverage.compounds_without_omics,
      },
    ];
  }, [coverage]);

  const pieData = useMemo(() => {
    return [
      {
        name: 'Plants with Compounds',
        value: coverage?.coverage?.plants_with_compounds || 0,
      },
      {
        name: 'Plants without Compounds',
        value: coverage?.coverage?.plants_without_compounds || 0,
      },
    ];
  }, [coverage]);

  if (coverageLoading || gapsLoading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading coverage data...
      </div>
    );
  }

  if (coverageError || gapsError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        <p className="font-semibold">Failed to load coverage or knowledge-gap data.</p>
        <pre className="mt-3 whitespace-pre-wrap text-xs">
          {String(
            (coverageError as Error)?.message ||
              (gapsError as Error)?.message ||
              'Unknown error'
          )}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-emerald-50 to-lime-50 p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Database className="h-9 w-9 text-emerald-700" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
              Coverage & Knowledge Gaps
            </h1>
            <p className="mt-3 max-w-4xl leading-7 text-stone-600">
              Track how complete the platform currently is and identify high-priority
              missing data that researchers can help fill.
            </p>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-500">
              This page is organized around contribution priorities: missing compounds,
              missing taxonomy, incomplete plant attributes, missing toxicity, missing KEGG,
              compounds missing at least one key identifier, and omics coverage split into
              no-omics, GEO-only, and LINCS-only categories.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Plants"
          value={coverage?.total_plants?.toLocaleString() || 0}
          subtitle="Current plant records in the platform"
          icon={<Leaf className="h-5 w-5" />}
        />
        <SummaryCard
          title="Total Compounds"
          value={coverage?.total_compounds?.toLocaleString() || 0}
          subtitle={`${coverage?.total_plant_compound_links || 0} plant–compound links`}
          icon={<FlaskConical className="h-5 w-5" />}
        />
        <SummaryCard
          title="Plant Compound Coverage"
          value={
            coverage?.total_plants
              ? `${Math.round(
                  ((coverage.coverage?.plants_with_compounds || 0) / coverage.total_plants) * 100
                )}%`
              : '0%'
          }
          subtitle="Plants currently linked to at least one compound"
          icon={<Activity className="h-5 w-5" />}
        />
        <SummaryCard
          title="Priority Gaps"
          value={
            (gaps?.summary?.plants_without_compounds_count || 0) +
            (gaps?.summary?.plants_with_missing_taxonomy_count || 0) +
            (gaps?.summary?.partial_plant_attributes_count || 0) +
            (gaps?.summary?.compounds_without_toxicity_count || 0) +
            (gaps?.summary?.compounds_with_missing_identifiers_count || 0) +
            (gaps?.summary?.compounds_without_kegg_count || 0) +
            (gaps?.summary?.compounds_without_omics_count || 0) +
            (gaps?.summary?.compounds_with_geo_only_omics_count || 0) +
            (gaps?.summary?.compounds_with_lincs_only_omics_count || 0)
          }
          subtitle="Combined records across current priority gap categories"
          icon={<HelpCircle className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-stone-900">Coverage Analysis</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={coverageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="covered" fill="#38936c" name="Covered" radius={[6, 6, 0, 0]} />
            <Bar dataKey="missing" fill="#e5e7eb" name="Missing" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-stone-900">
            Plant Compound Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={82}
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-stone-900">Coverage Metrics</h2>
          <div className="space-y-4">
            <MetricRow
              label="Plants with Compounds"
              value={coverage?.coverage?.plants_with_compounds || 0}
              total={coverage?.total_plants || 0}
              tone="green"
            />
            <MetricRow
              label="Plants with Complete Taxonomy"
              value={coverage?.coverage?.plants_with_complete_taxonomy || 0}
              total={coverage?.total_plants || 0}
              tone="amber"
            />
            <MetricRow
              label="Compounds with Toxicity"
              value={coverage?.coverage?.compounds_with_toxicity || 0}
              total={coverage?.total_compounds || 0}
              tone="amber"
            />
            <MetricRow
              label="Compounds with Any Omics"
              value={coverage?.coverage?.compounds_with_omics || 0}
              total={coverage?.total_compounds || 0}
              tone="amber"
            />
          </div>
        </div>
      </div>

      {gaps && (
        <>
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-bold text-stone-900">Knowledge Gap Summary</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Plants without compounds</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.plants_without_compounds_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Plants with missing taxonomy</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.plants_with_missing_taxonomy_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Partial plant attributes</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.partial_plant_attributes_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Compounds without toxicity</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_without_toxicity_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">
                  Compounds missing ≥1 key identifier
                </p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_with_missing_identifiers_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Compounds without KEGG</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_without_kegg_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Compounds without omics</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_without_omics_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-500">Compounds with GEO-only</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_with_geo_only_omics_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 md:col-span-2 xl:col-span-1">
                <p className="text-sm text-stone-500">Compounds with LINCS-only</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {gaps.summary?.compounds_with_lincs_only_omics_count || 0}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-600">
              Preview cards below show only a compact sample. Use “View full list” to
              search the complete category and export it as CSV without cluttering the page.
              For compounds, “missing ≥1 key identifier” means one or more of PubChem,
              ChEMBL, or KEGG is absent.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <GapListCard<GapPlant>
              title="Plants Without Compounds"
              count={gaps.summary?.plants_without_compounds_count || 0}
              items={gaps.plants_without_compounds || []}
              renderLabel={(plant) =>
                `${plant.scientific_name || plant.plant_id || 'Unknown plant'}`
              }
              emptyText="No plants in this gap category."
            />

            <GapListCard<GapPlant>
              title="Plants With Missing Taxonomy"
              count={gaps.summary?.plants_with_missing_taxonomy_count || 0}
              items={gaps.plants_with_missing_taxonomy || []}
              renderLabel={(plant) =>
                `${plant.scientific_name || plant.plant_id || 'Unknown plant'}${
                  plant.missing_fields ? ` — missing: ${plant.missing_fields}` : ''
                }`
              }
              emptyText="No plants in this gap category."
            />

            <GapListCard<GapPlant>
              title="Partial Plant Attributes"
              count={gaps.summary?.partial_plant_attributes_count || 0}
              items={gaps.partial_plant_attributes || []}
              renderLabel={(plant) =>
                `${plant.scientific_name || plant.plant_id || 'Unknown plant'}${
                  plant.missing_fields ? ` — missing: ${plant.missing_fields}` : ''
                }`
              }
              emptyText="No plants in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds Without Toxicity"
              count={gaps.summary?.compounds_without_toxicity_count || 0}
              items={gaps.compounds_without_toxicity || []}
              renderLabel={(compound) =>
                compound.compound_name || compound.compound_id || 'Unknown compound'
              }
              emptyText="No compounds in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds Missing ≥1 Key Identifier"
              count={gaps.summary?.compounds_with_missing_identifiers_count || 0}
              items={gaps.compounds_with_missing_identifiers || []}
              renderLabel={(compound) =>
                `${compound.compound_name || compound.compound_id || 'Unknown compound'}${
                  compound.missing_identifiers
                    ? ` — missing: ${compound.missing_identifiers}`
                    : ''
                }`
              }
              emptyText="No compounds in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds Without KEGG"
              count={gaps.summary?.compounds_without_kegg_count || 0}
              items={gaps.compounds_without_kegg || []}
              renderLabel={(compound) =>
                compound.compound_name || compound.compound_id || 'Unknown compound'
              }
              emptyText="No compounds in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds Without Omics"
              count={gaps.summary?.compounds_without_omics_count || 0}
              items={gaps.compounds_without_omics || []}
              renderLabel={(compound) =>
                `${compound.compound_name || compound.compound_id || 'Unknown compound'}${
                  compound.missing_omics_fields
                    ? ` — missing: ${compound.missing_omics_fields}`
                    : ''
                }`
              }
              emptyText="No compounds in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds With GEO-Only"
              count={gaps.summary?.compounds_with_geo_only_omics_count || 0}
              items={gaps.compounds_with_geo_only_omics || []}
              renderLabel={(compound) =>
                `${compound.compound_name || compound.compound_id || 'Unknown compound'}${
                  compound.missing_omics_fields
                    ? ` — missing: ${compound.missing_omics_fields}`
                    : ''
                }`
              }
              emptyText="No compounds in this gap category."
            />

            <GapListCard<GapCompound>
              title="Compounds With LINCS-Only"
              count={gaps.summary?.compounds_with_lincs_only_omics_count || 0}
              items={gaps.compounds_with_lincs_only_omics || []}
              renderLabel={(compound) =>
                `${compound.compound_name || compound.compound_id || 'Unknown compound'}${
                  compound.missing_omics_fields
                    ? ` — missing: ${compound.missing_omics_fields}`
                    : ''
                }`
              }
              emptyText="No compounds in this gap category."
            />
          </div>
        </>
      )}
    </div>
  );
}