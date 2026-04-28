import { useMemo, useState } from 'react';
import {
  Database,
  Code2,
  Download,
  Copy,
  Check,
  ExternalLink,
  FileJson,
  Table2,
  FlaskConical,
  Leaf,
  Target,
  Network,
  BookOpen,
  TerminalSquare,
} from 'lucide-react';

type EndpointGroup = {
  title: string;
  icon: React.ReactNode;
  description: string;
  endpoints: Array<{
    method: 'GET';
    path: string;
    description: string;
    params?: string[];
  }>;
};

type DownloadItem = {
  title: string;
  description: string;
  format: string;
  href: string;
  note?: string;
};

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

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'violet' | 'good';
}) {
  const cls =
    tone === 'violet'
      ? 'border-violet-200 bg-violet-50 text-violet-800'
      : tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-stone-200 bg-stone-50 text-stone-700';

  return <span className={cx('rounded-full border px-3 py-1 text-xs font-medium', cls)}>{children}</span>;
}

function SectionHeader({
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
        <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-stone-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function CopyButton({
  text,
}: {
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({
  code,
}: {
  code: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-950">
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-stone-400">Example</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-stone-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DataAccess() {
  const baseUrl = 'http://127.0.0.1:8000';

  const endpointGroups: EndpointGroup[] = useMemo(
    () => [
      {
        title: 'Plants',
        icon: <Leaf className="h-5 w-5 text-emerald-700" />,
        description: 'Retrieve plant records and plant-level metadata for browsing or downstream scripting.',
        endpoints: [
          {
            method: 'GET',
            path: '/api/plants',
            description: 'List plants with search, pagination, and summary information.',
            params: ['q', 'limit', 'skip'],
          },
          {
            method: 'GET',
            path: '/api/plants/{plant_id}',
            description: 'Retrieve a single plant record by internal plant identifier.',
          },
        ],
      },
      {
        title: 'Compounds',
        icon: <FlaskConical className="h-5 w-5 text-violet-700" />,
        description: 'Access compound records, identifiers, linked targets, and evidence layers.',
        endpoints: [
          {
            method: 'GET',
            path: '/api/compounds',
            description: 'List compounds with search, pagination, and summary fields.',
            params: ['q', 'limit', 'skip'],
          },
          {
            method: 'GET',
            path: '/api/compounds/{compound_id}',
            description: 'Retrieve a single compound and its core metadata.',
          },
          {
            method: 'GET',
            path: '/api/compounds/{compound_id}/targets',
            description: 'Retrieve compound–target interaction rows.',
          },
          {
            method: 'GET',
            path: '/api/compounds/{compound_id}/chembl',
            description: 'Retrieve ChEMBL-linked bioactivity evidence for the compound.',
          },
          {
            method: 'GET',
            path: '/api/compounds/{compound_id}/lincs',
            description: 'Retrieve LINCS-linked evidence for the compound.',
          },
          {
            method: 'GET',
            path: '/api/compounds/{compound_id}/geo',
            description: 'Retrieve GEO-linked evidence for the compound.',
          },
        ],
      },
      {
        title: 'Targets',
        icon: <Target className="h-5 w-5 text-red-700" />,
        description: 'Retrieve target records, linked compounds, and target-level evidence summaries.',
        endpoints: [
          {
            method: 'GET',
            path: '/api/targets',
            description: 'List targets with search, pagination, and evidence summaries.',
            params: ['q', 'limit', 'skip'],
          },
          {
            method: 'GET',
            path: '/api/targets/{target_key}',
            description: 'Retrieve a target detail view including compound links and LINCS rows.',
          },
        ],
      },
      {
        title: 'Knowledge Graph',
        icon: <Network className="h-5 w-5 text-sky-700" />,
        description: 'Access graph-ready node/edge structures for network exploration.',
        endpoints: [
          {
            method: 'GET',
            path: '/api/graph',
            description: 'Retrieve graph nodes and edges for global graph modes.',
            params: ['mode', 'limit', 'min_score'],
          },
          {
            method: 'GET',
            path: '/api/graph/focus',
            description: 'Retrieve focused graph neighborhoods around a query.',
            params: ['q', 'graph_mode', 'pool_limit', 'min_score'],
          },
        ],
      },
    ],
    []
  );

  const downloadItems: DownloadItem[] = useMemo(
    () => [
      {
        title: 'Plants table',
        description: 'Core plant-level table for botanical and taxonomic analysis.',
        format: 'JSON / API',
        href: `${baseUrl}/api/plants?limit=100&skip=0`,
        note: 'Use pagination for large retrieval.',
      },
      {
        title: 'Compounds table',
        description: 'Core compound-level data including identifiers and linked metadata.',
        format: 'JSON / API',
        href: `${baseUrl}/api/compounds?limit=100&skip=0`,
        note: 'Useful for Python or notebook-based analyses.',
      },
      {
        title: 'Targets table',
        description: 'Target summary records with evidence-oriented fields.',
        format: 'JSON / API',
        href: `${baseUrl}/api/targets?limit=100&skip=0`,
        note: 'Can be converted to tabular form in Python.',
      },
      {
        title: 'Graph export',
        description: 'Graph-ready node/edge structure for network workflows.',
        format: 'JSON / API',
        href: `${baseUrl}/api/graph?mode=plant_compound&limit=250`,
        note: 'Useful for graph analysis and downstream visualization.',
      },
      {
        title: 'Compound–target interactions',
        description: 'Programmatic access to interaction rows through compound-level target endpoints.',
        format: 'JSON / API',
        href: `${baseUrl}/api/compounds/CMPD_EXAMPLE/targets`,
        note: 'Replace CMPD_EXAMPLE with a real compound ID.',
      },
      {
        title: 'ChEMBL evidence',
        description: 'Bioactivity-level evidence linked to compounds.',
        format: 'JSON / API',
        href: `${baseUrl}/api/compounds/CMPD_EXAMPLE/chembl`,
        note: 'Replace CMPD_EXAMPLE with a real compound ID.',
      },
    ],
    [baseUrl]
  );

  const pythonRequestsExample = `import requests
import pandas as pd

base_url = "${baseUrl}"

resp = requests.get(
    f"{base_url}/api/compounds",
    params={"limit": 100, "skip": 0}
)
resp.raise_for_status()

payload = resp.json()
rows = payload.get("data", [])
df = pd.DataFrame(rows)

print(df.head())
print(df.shape)`;

  const pythonTargetsExample = `import requests
import pandas as pd

base_url = "${baseUrl}"
compound_id = "CMPD_EXAMPLE"

resp = requests.get(f"{base_url}/api/compounds/{compound_id}/targets")
resp.raise_for_status()

payload = resp.json()
rows = payload.get("data", [])
df = pd.DataFrame(rows)

print(df[["gene_name", "target_external_id", "score", "action", "mode"]].head())`;

  const pythonGraphExample = `import requests
import pandas as pd

base_url = "${baseUrl}"

resp = requests.get(
    f"{base_url}/api/graph",
    params={"mode": "compound_target", "limit": 200, "min_score": 400}
)
resp.raise_for_status()

payload = resp.json()

nodes_df = pd.DataFrame(payload.get("nodes", []))
edges_df = pd.DataFrame(payload.get("edges", []))

print(nodes_df.head())
print(edges_df.head())`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f5f3ff,white_35%,#f8fafc_82%)] px-4 pb-10 pt-5 md:px-6 xl:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <ShellCard className="px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <SectionHeader
                icon={<Database className="h-6 w-6 text-violet-700" />}
                title="Data Access"
                subtitle="Programmatic access, downloadable data, and Python examples for researchers."
              />
              <p className="mt-5 text-sm leading-7 text-stone-600 md:text-base">
                This portal supports both interactive browsing and structured programmatic access.
                Researchers can retrieve data through REST-style API endpoints, reuse selected resources
                in Python workflows, and access graph-ready or tabular data for downstream analysis.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Pill tone="violet">API endpoints</Pill>
                <Pill tone="good">Python-ready</Pill>
                <Pill>JSON access</Pill>
                <Pill>Graph-ready data</Pill>
                <Pill>PubChem-aware</Pill>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-stone-900">What this page is for</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                <li>• discover available endpoints</li>
                <li>• retrieve structured data in JSON</li>
                <li>• use the data in Python notebooks</li>
                <li>• prepare downstream analyses and exports</li>
              </ul>
            </div>
          </div>
        </ShellCard>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <ShellCard className="p-6">
            <SectionHeader
              icon={<BookOpen className="h-5 w-5 text-stone-700" />}
              title="How to use programmatic access"
              subtitle="You do not need to think of the API as another website page. It is the organized interface between the portal and your scripts."
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold text-stone-900">Interactive portal use</p>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Browse plants, compounds, targets, publications, the graph, and the virtual lab through the website interface.
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold text-stone-900">Programmatic use</p>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Use API endpoints to retrieve JSON responses in Python, convert them into tables with pandas,
                  and build your own workflows, notebooks, statistics, or visualizations.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-5">
              <p className="text-sm font-semibold text-violet-900">Recommended workflow</p>
              <ol className="mt-3 space-y-2 text-sm leading-7 text-violet-900">
                <li>1. Identify the entity you need (plant, compound, target, graph).</li>
                <li>2. Call the corresponding endpoint.</li>
                <li>3. Load the returned JSON into Python.</li>
                <li>4. Convert to a DataFrame if the resource is tabular.</li>
                <li>5. Reuse the results for analysis, filtering, or downstream modeling.</li>
              </ol>
            </div>
          </ShellCard>

          <ShellCard className="p-6">
            <SectionHeader
              icon={<ExternalLink className="h-5 w-5 text-sky-700" />}
              title="Linked external identifier ecosystems"
              subtitle="These sources are relevant to the current portal content and should be acknowledged in downstream workflows."
            />

            <div className="mt-5 space-y-4">
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold text-stone-900">PubChem</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  Compound records and identifiers can be aligned with PubChem CIDs when available. This is useful for
                  interoperability, annotation, and external compound-level enrichment workflows.
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold text-stone-900">ChEMBL</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  ChEMBL-linked assay and target evidence can be accessed through compound-level endpoints for bioactivity-aware analysis.
                </p>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold text-stone-900">Graph / interaction layer</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  Graph endpoints expose node-edge structures suitable for network-oriented workflows and downstream graph analysis.
                </p>
              </div>
            </div>
          </ShellCard>
        </div>

        <ShellCard className="p-6">
          <SectionHeader
            icon={<Code2 className="h-5 w-5 text-violet-700" />}
            title="API catalog"
            subtitle="Use these endpoints from scripts, notebooks, or downstream applications."
          />

          <div className="mt-6 space-y-6">
            {endpointGroups.map((group) => (
              <div key={group.title} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-stone-200 bg-white p-3">{group.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{group.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{group.description}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {group.endpoints.map((endpoint) => {
                    const fullUrl = `${baseUrl}${endpoint.path}`;
                    return (
                      <div
                        key={`${group.title}-${endpoint.path}`}
                        className="rounded-2xl border border-stone-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Pill tone="good">{endpoint.method}</Pill>
                            <code className="rounded-lg bg-stone-100 px-3 py-1 text-sm text-stone-800">
                              {endpoint.path}
                            </code>
                          </div>
                          <CopyButton text={fullUrl} />
                        </div>

                        <p className="mt-3 text-sm leading-7 text-stone-600">{endpoint.description}</p>

                        {endpoint.params && endpoint.params.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {endpoint.params.map((param) => (
                              <Pill key={param}>{param}</Pill>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ShellCard>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ShellCard className="p-6">
            <SectionHeader
              icon={<Download className="h-5 w-5 text-emerald-700" />}
              title="Data downloads and reusable resources"
              subtitle="These are the most immediately useful resources for researchers who want to work in Python or notebook-based environments."
            />

            <div className="mt-6 space-y-4">
              {downloadItems.map((item) => (
                <div key={item.title} className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-stone-600">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill>{item.format}</Pill>
                        {item.note ? <Pill tone="violet">{item.note}</Pill> : null}
                      </div>
                    </div>

                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </div>

                  <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                    <span className="font-medium">URL:</span> {item.href}
                  </div>
                </div>
              ))}

              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-5">
                <p className="text-sm font-semibold text-stone-900">Later extension</p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  Additional tabular metabolite resources can be added here later without changing the overall data-access structure.
                </p>
              </div>
            </div>
          </ShellCard>

          <ShellCard className="p-6">
            <SectionHeader
              icon={<TerminalSquare className="h-5 w-5 text-stone-700" />}
              title="Python examples"
              subtitle="These examples show how researchers can retrieve portal data and load them into Python workflows."
            />

            <div className="mt-6 space-y-6">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-violet-700" />
                  <p className="text-sm font-semibold text-stone-900">Example 1 — load compounds into pandas</p>
                </div>
                <CodeBlock code={pythonRequestsExample} />
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-violet-700" />
                  <p className="text-sm font-semibold text-stone-900">Example 2 — retrieve compound–target rows</p>
                </div>
                <CodeBlock code={pythonTargetsExample} />
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Network className="h-4 w-4 text-violet-700" />
                  <p className="text-sm font-semibold text-stone-900">Example 3 — load graph nodes and edges</p>
                </div>
                <CodeBlock code={pythonGraphExample} />
              </div>
            </div>
          </ShellCard>
        </div>

        <ShellCard className="p-6">
          <SectionHeader
            icon={<Database className="h-5 w-5 text-violet-700" />}
            title="Practical notes"
            subtitle="These notes help researchers use the data responsibly and efficiently."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-900">Response format</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Current API responses are JSON-oriented and suitable for parsing in Python or JavaScript.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-900">Tabular reuse</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Many endpoint responses can be converted directly into pandas DataFrames for filtering and statistics.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-900">Pagination</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                List endpoints use pagination parameters such as <code>limit</code> and <code>skip</code>.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-semibold text-stone-900">Later growth</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Additional exports such as metabolite-related tables can be appended later without redesigning this page.
              </p>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}