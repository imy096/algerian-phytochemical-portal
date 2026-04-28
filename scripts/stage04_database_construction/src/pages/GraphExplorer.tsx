import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';

type GraphNode = {
  id: string;
  label: string;
  type: 'plant' | 'compound' | 'target';
  x?: number;
  y?: number;
  target_external_id?: string;
};

type GraphEdge = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  score?: number;
  score_band?: 'low' | 'moderate' | 'high' | 'unknown';
  action?: string | null;
  mode?: string | null;
};

type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    node_count: number;
    edge_count: number;
    limit: number;
    mode?: string;
    graph_mode?: 'plant_compound' | 'compound_target';
    query?: string;
    query_normalized?: string;
    matched_rows?: number;
    matched_plant_labels?: string[];
    matched_compound_labels?: string[];
    matched_target_labels?: string[];
    match_strategy?: 'exact' | 'partial';
    description?: string;
    plant_count?: number;
    compound_count?: number;
    target_count?: number;
    min_score?: number;
  };
};

async function fetchWithTimeout(url: string): Promise<GraphResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to load graph (${res.status})`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default function GraphExplorer() {
  const navigate = useNavigate();
  const graphRef = useRef<any>(null);

  const [graphMode, setGraphMode] = useState<'plant_compound' | 'compound_target'>('plant_compound');
  const [limit, setLimit] = useState(150);
  const [minScore, setMinScore] = useState(400);
  const [searchInput, setSearchInput] = useState('');
  const [focusQuery, setFocusQuery] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  const queryKey = focusQuery.trim()
    ? ['knowledge-graph', graphMode, 'focus', focusQuery, minScore]
    : ['knowledge-graph', graphMode, 'global', limit, minScore];

  const queryUrl = focusQuery.trim()
    ? `http://127.0.0.1:8000/api/graph/focus?q=${encodeURIComponent(
        focusQuery
      )}&graph_mode=${graphMode}&min_score=${minScore}`
    : `http://127.0.0.1:8000/api/graph?mode=${graphMode}&limit=${limit}&min_score=${minScore}`;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchWithTimeout(queryUrl),
  });

  useEffect(() => {
    if (!data || !graphRef.current) return;

    const t = setTimeout(() => {
      try {
        graphRef.current.zoomToFit(500, 50);
      } catch {
        // no-op
      }
    }, 350);

    return () => clearTimeout(t);
  }, [data]);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    return {
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        score: edge.score,
        score_band: edge.score_band,
        action: edge.action,
        mode: edge.mode,
      })),
    };
  }, [data]);

  const nodeStats = useMemo(() => {
    const plants = data?.nodes.filter((n) => n.type === 'plant').length ?? 0;
    const compounds = data?.nodes.filter((n) => n.type === 'compound').length ?? 0;
    const targets = data?.nodes.filter((n) => n.type === 'target').length ?? 0;
    return { plants, compounds, targets };
  }, [data]);

  const selectedNodeStats = useMemo(() => {
    if (!selectedNode || !data) return { degree: 0, neighbors: [] as GraphNode[] };

    const neighborIds = new Set<string>();

    data.edges.forEach((edge) => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : (edge.source as GraphNode).id;
      const targetId =
        typeof edge.target === 'string' ? edge.target : (edge.target as GraphNode).id;

      if (sourceId === selectedNode.id) {
        neighborIds.add(targetId);
      } else if (targetId === selectedNode.id) {
        neighborIds.add(sourceId);
      }
    });

    const neighbors = data.nodes.filter((node) => neighborIds.has(node.id));

    return {
      degree: neighbors.length,
      neighbors,
    };
  }, [selectedNode, data]);

  const focusSummary = useMemo(() => {
    if (!data?.meta || data.meta.mode !== 'focus') return null;

    return {
      plants: data.meta.matched_plant_labels || [],
      compounds: data.meta.matched_compound_labels || [],
      targets: data.meta.matched_target_labels || [],
      strategy: data.meta.match_strategy || 'partial',
      matchedRows: data.meta.matched_rows || 0,
    };
  }, [data]);

  const handleLoadFocus = () => {
    const q = searchInput.trim();
    if (!q) return;
    setSelectedNode(null);
    setSelectedEdge(null);
    setHoveredNodeId(null);
    setFocusQuery(q);
  };

  const handleResetGraph = () => {
    setSearchInput('');
    setFocusQuery('');
    setSelectedNode(null);
    setSelectedEdge(null);
    setHoveredNodeId(null);
  };

  const handleClearFocusOnly = () => {
    setFocusQuery('');
    setSelectedNode(null);
    setSelectedEdge(null);
    setHoveredNodeId(null);
  };

  const handleFitGraph = () => {
    if (!graphRef.current) return;
    try {
      graphRef.current.zoomToFit(500, 50);
    } catch {
      // no-op
    }
  };

  const nodeColor = (type: GraphNode['type']) => {
    if (type === 'plant') return '#2e7d32';
    if (type === 'compound') return '#1565c0';
    return '#b91c1c';
  };

  const nodeRadius = (type: GraphNode['type']) => {
    if (type === 'plant') return 6;
    if (type === 'compound') return 4.5;
    return 5.5;
  };

  const linkColor = (edge: any) => {
    if (edge.type === 'compound_target') {
      if (edge.score_band === 'high') return '#dc2626';
      if (edge.score_band === 'moderate') return '#f59e0b';
      return '#d1d5db';
    }
    return '#cbd5e1';
  };

  if (isLoading) {
    return <div className="p-6 text-stone-600">Loading knowledge graph...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        Failed to load graph: {(error as Error).message}
      </div>
    );
  }

  const noResults = data?.meta.mode === 'focus' && (data?.meta.node_count ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Knowledge Graph</h1>
        <p className="mt-2 text-sm text-stone-600">
          Explore connected relationships across the portal.
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Nodes: {data?.meta.node_count ?? 0} | Edges: {data?.meta.edge_count ?? 0}
          {data?.meta.mode === 'focus' && data?.meta.query
            ? ` | Focus: "${data.meta.query}"`
            : ''}
          {isFetching ? ' | Refreshing...' : ''}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-stone-800">Graph modes</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-medium text-stone-800">Plant → Compound</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              Best for phytochemical exploration from plants to associated compounds.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-medium text-stone-800">Compound → Target</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              Best for interaction evidence using compound-target links filtered by STITCH score.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-medium text-stone-800">Node colors</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-green-700" />
                <span>Plant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-700" />
                <span>Compound</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-red-700" />
                <span>Target</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[180px_minmax(0,1.4fr)_150px_170px_auto_auto]">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Graph mode
                </label>
                <select
                  value={graphMode}
                  onChange={(e) => {
                    const value = e.target.value as 'plant_compound' | 'compound_target';
                    setGraphMode(value);
                    setSelectedNode(null);
                    setSelectedEdge(null);
                    setHoveredNodeId(null);
                    setFocusQuery('');
                    setSearchInput('');
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="plant_compound">Plant → Compound</option>
                  <option value="compound_target">Compound → Target</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Focus search
                </label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLoadFocus();
                    }
                  }}
                  placeholder={
                    graphMode === 'plant_compound'
                      ? 'Search plant or compound name...'
                      : 'Search compound id, gene name, or target id...'
                  }
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Global limit
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={Boolean(focusQuery)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={250}>250</option>
                  <option value={400}>400</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  STITCH score
                </label>
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  disabled={graphMode !== 'compound_target'}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-stone-100"
                >
                  <option value={0}>All</option>
                  <option value={400}>Medium+</option>
                  <option value={800}>High only</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  Show labels
                </label>
              </div>

              <div className="flex gap-2 items-end">
                <button
                  type="button"
                  onClick={handleLoadFocus}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Load focus
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClearFocusOnly}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Clear focus
              </button>
              <button
                type="button"
                onClick={handleResetGraph}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleFitGraph}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Fit graph
              </button>
            </div>

            <div className="mt-3 text-xs text-stone-500">
              {graphMode === 'compound_target'
                ? 'Default recommendation: use Medium+ STITCH score for a cleaner and more reliable interaction graph.'
                : 'Best use: search one plant or one compound for a readable neighborhood graph.'}
            </div>
          </div>

          {focusSummary && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-stone-800">Focus summary</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    Match strategy
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-800">
                    {focusSummary.strategy}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    Matched rows
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-800">
                    {focusSummary.matchedRows}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    Query
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-stone-800">
                    {data?.meta.query}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-sm font-medium text-stone-700">Matched plants</p>
                  <div className="flex flex-wrap gap-2">
                    {focusSummary.plants.length > 0 ? (
                      focusSummary.plants.slice(0, 10).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-stone-700">Matched compounds</p>
                  <div className="flex flex-wrap gap-2">
                    {focusSummary.compounds.length > 0 ? (
                      focusSummary.compounds.slice(0, 10).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-800"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-500">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-stone-700">Matched targets</p>
                  <div className="flex flex-wrap gap-2">
                    {focusSummary.targets.length > 0 ? (
                      focusSummary.targets.slice(0, 10).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-800"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-500">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Nodes shown</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">
                {data?.meta.node_count ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Edges shown</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">
                {data?.meta.edge_count ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Plants shown</p>
              <p className="mt-2 text-2xl font-bold text-green-700">{nodeStats.plants}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Compounds shown</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{nodeStats.compounds}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-stone-500">Targets shown</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{nodeStats.targets}</p>
            </div>
          </div>

          {noResults && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
              No graph matches were found for this query. Try another spelling or reset to global mode.
            </div>
          )}

          <div className="h-[620px] w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:h-[700px]">
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              backgroundColor="#ffffff"
              linkColor={linkColor}
              linkWidth={(link: any) =>
                link.type === 'compound_target'
                  ? link.score_band === 'high'
                    ? 2
                    : 1.4
                  : 1
              }
              nodeRelSize={6}
              cooldownTicks={100}
              onNodeHover={(node) =>
                setHoveredNodeId((node as GraphNode | null)?.id ?? null)
              }
              onBackgroundClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
                setHoveredNodeId(null);
              }}
              onNodeClick={(node: any) => {
                setSelectedNode(node as GraphNode);
                setSelectedEdge(null);
              }}
              onLinkClick={(link: any) => {
                setSelectedEdge(link as GraphEdge);
                setSelectedNode(null);
              }}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const radius = nodeRadius(node.type);
                const label = node.label || '';
                const isHovered = hoveredNodeId === node.id;
                const isSelected = selectedNode?.id === node.id;

                ctx.beginPath();
                ctx.arc(node.x, node.y, isSelected ? radius + 2 : radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = nodeColor(node.type);
                ctx.fill();

                if (isSelected) {
                  ctx.strokeStyle = '#111827';
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                }

                if (showLabels || isHovered || isSelected) {
                  const fontSize = Math.max(10 / globalScale, 2.5);
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.fillStyle = '#1f2937';
                  ctx.fillText(label, node.x + radius + 4, node.y + 3);
                }
              }}
            />
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Selected node</h2>

            {!selectedNode ? (
              <p className="mt-3 text-sm leading-6 text-stone-500">
                Click a plant, compound, or target node to inspect it here.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Label</p>
                    <p className="text-sm font-medium text-stone-900">{selectedNode.label}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">ID</p>
                    <p className="break-all text-sm text-stone-700">{selectedNode.id}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Type</p>
                    <p
                      className={`text-sm font-medium ${
                        selectedNode.type === 'plant'
                          ? 'text-green-700'
                          : selectedNode.type === 'compound'
                          ? 'text-blue-700'
                          : 'text-red-700'
                      }`}
                    >
                      {selectedNode.type}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">
                      Direct connections
                    </p>
                    <p className="text-sm font-medium text-stone-900">
                      {selectedNodeStats.degree}
                    </p>
                  </div>

                  {selectedNode.type === 'target' && selectedNode.target_external_id && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-stone-500">
                        External target id
                      </p>
                      <p className="break-all text-sm text-stone-700">
                        {selectedNode.target_external_id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedNode.type === 'plant' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/plants/${selectedNode.id}`)}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                    >
                      Open plant page
                    </button>
                  )}

                  {selectedNode.type === 'compound' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/compounds/${selectedNode.id}`)}
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                    >
                      Open compound page
                    </button>
                  )}

                  {selectedNode.type === 'target' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/targets/${encodeURIComponent(selectedNode.label)}`)
                      }
                      className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
                    >
                      Open target page
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSearchInput(selectedNode.label)}
                    className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Use in search
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Selected edge</h2>

            {!selectedEdge ? (
              <p className="mt-3 text-sm text-stone-500">
                Click an edge to inspect relation details here.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">Type</p>
                  <p className="font-medium text-stone-900">{selectedEdge.type}</p>
                </div>

                {selectedEdge.score !== undefined && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Score</p>
                    <p className="font-medium text-stone-900">{selectedEdge.score}</p>
                  </div>
                )}

                {selectedEdge.score_band && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Score band</p>
                    <p className="font-medium text-stone-900">{selectedEdge.score_band}</p>
                  </div>
                )}

                {selectedEdge.mode && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Mode</p>
                    <p className="font-medium text-stone-900">{selectedEdge.mode}</p>
                  </div>
                )}

                {selectedEdge.action && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-500">Action</p>
                    <p className="font-medium text-stone-900">{selectedEdge.action}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Connected nodes</h2>

            {!selectedNode ? (
              <p className="mt-3 text-sm text-stone-500">No node selected yet.</p>
            ) : selectedNodeStats.neighbors.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No connected nodes found.</p>
            ) : (
              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {selectedNodeStats.neighbors.slice(0, 40).map((neighbor) => (
                  <button
                    key={neighbor.id}
                    type="button"
                    onClick={() => {
                      setSelectedNode(neighbor);
                      setSelectedEdge(null);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left hover:bg-stone-100"
                  >
                    <span className="truncate pr-3 text-sm text-stone-800">
                      {neighbor.label}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        neighbor.type === 'plant'
                          ? 'text-green-700'
                          : neighbor.type === 'compound'
                          ? 'text-blue-700'
                          : 'text-red-700'
                      }`}
                    >
                      {neighbor.type}
                    </span>
                  </button>
                ))}

                {selectedNodeStats.neighbors.length > 40 && (
                  <p className="pt-2 text-xs text-stone-500">
                    Showing 40 of {selectedNodeStats.neighbors.length} connected nodes.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}