import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore - no types available for cytoscape-dagre
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

interface NetworkData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties?: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    weight?: number;
  }>;
}

interface CytoscapeNetworkProps {
  data: NetworkData;
  height?: string;
  layout?: string;
}

export default function CytoscapeNetwork({ data, height = '500px', layout = 'dagre' }: CytoscapeNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const nodeColorMap: Record<string, string> = {
      plant: '#51b0b4',
      compound: '#cfa057',
      gene: '#a89170',
      pathway: '#b8936a',
      disease: '#5f4e3d',
    };

    const elements = [
      ...data.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          ...node.properties,
        },
      })),
      ...data.edges.map(edge => ({
        data: {
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          label: edge.type,
          weight: edge.weight || 1,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => nodeColorMap[ele.data('type')] || '#999',
            'label': 'data(label)',
            'color': '#333',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '10px',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'width': '40px',
            'height': '40px',
            'border-width': 2,
            'border-color': '#fff',
            'overlay-padding': '4px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#2d7680',
            'background-color': '#379499',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': (ele: any) => Math.max(1, (ele.data('weight') || 1) * 2),
            'line-color': '#c0ad8f',
            'target-arrow-color': '#c0ad8f',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#2d7680',
            'target-arrow-color': '#2d7680',
            'width': 3,
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: layout,
        directed: true,
        padding: 30,
        spacingFactor: 1.2,
        nodeDimensionsIncludeLabels: true,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', (evt: any) => {
      const node = evt.target;
      console.log('Node clicked:', node.data());
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [data, layout]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, background: '#fdfcfb', borderRadius: '8px' }}
      className="border-2 border-primary-100"
    />
  );
}
