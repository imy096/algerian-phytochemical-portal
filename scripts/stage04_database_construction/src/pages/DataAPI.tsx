import { Code, Database, Download, Key, Book, Server } from 'lucide-react';

export default function DataAPI() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-900 flex items-center gap-3">
          <Server className="w-8 h-8 text-teal-600" />
          Data & API Access
        </h1>
        <p className="text-primary-700 mt-2">
          Programmatic access to the Algerian Chemogenomic Phytochemical Database
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card hover:shadow-lg transition-all">
          <Database className="w-12 h-12 text-teal-600 mb-4" />
          <h3 className="text-xl font-bold text-primary-900 mb-2">REST API</h3>
          <p className="text-sm text-primary-700 mb-4">
            Comprehensive RESTful API for querying plants, compounds, genes, pathways, and disease data
          </p>
          <a href="/api/docs" target="_blank" className="btn btn-primary w-full flex items-center justify-center gap-2">
            <Book className="w-4 h-4" />
            View API Docs
          </a>
        </div>

        <div className="card hover:shadow-lg transition-all">
          <Download className="w-12 h-12 text-gold-600 mb-4" />
          <h3 className="text-xl font-bold text-primary-900 mb-2">Data Downloads</h3>
          <p className="text-sm text-primary-700 mb-4">
            Download complete datasets in CSV, JSON, or RDF formats for offline analysis
          </p>
          <button className="btn btn-secondary w-full">
            Coming Soon
          </button>
        </div>

        <div className="card hover:shadow-lg transition-all">
          <Key className="w-12 h-12 text-primary-600 mb-4" />
          <h3 className="text-xl font-bold text-primary-900 mb-2">SPARQL Endpoint</h3>
          <p className="text-sm text-primary-700 mb-4">
            Query the knowledge graph using SPARQL for advanced semantic queries
          </p>
          <button className="btn btn-secondary w-full">
            Coming Soon
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-primary-900 mb-4 flex items-center gap-2">
          <Code className="w-6 h-6 text-teal-600" />
          Quick Start Guide
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg text-primary-900 mb-3">1. Base URL</h3>
            <div className="bg-sand-50 rounded-lg p-4 font-mono text-sm border border-primary-200">
              <code className="text-primary-900">https://api.algeria-phyto-chem.org/api</code>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-primary-900 mb-3">2. Authentication</h3>
            <p className="text-primary-700 mb-3">
              The API is currently open for public read access. No authentication required for GET requests.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg text-primary-900 mb-3">3. Example Requests</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-primary-900 mb-2">List all plants</h4>
                <div className="bg-sand-50 rounded-lg p-4 border border-primary-200">
                  <code className="text-sm font-mono text-primary-900 block mb-2">
                    GET /api/plants?limit=10&offset=0
                  </code>
                  <pre className="text-xs text-primary-700 overflow-x-auto">
{`curl -X GET "https://api.algeria-phyto-chem.org/api/plants?limit=10&offset=0" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-primary-900 mb-2">Search compounds</h4>
                <div className="bg-sand-50 rounded-lg p-4 border border-primary-200">
                  <code className="text-sm font-mono text-primary-900 block mb-2">
                    GET /api/search?query=quercetin&type=compound
                  </code>
                  <pre className="text-xs text-primary-700 overflow-x-auto">
{`curl -X GET "https://api.algeria-phyto-chem.org/api/search?query=quercetin&type=compound" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-primary-900 mb-2">Get knowledge graph network</h4>
                <div className="bg-sand-50 rounded-lg p-4 border border-primary-200">
                  <code className="text-sm font-mono text-primary-900 block mb-2">
                    GET /api/graph/plant-compound-network?limit=100
                  </code>
                  <pre className="text-xs text-primary-700 overflow-x-auto">
{`curl -X GET "https://api.algeria-phyto-chem.org/api/graph/plant-compound-network?limit=100" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">Available Endpoints</h2>

        <div className="space-y-3">
          {endpoints.map((endpoint, idx) => (
            <div key={idx} className="border border-primary-200 rounded-lg p-4 hover:bg-sand-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    endpoint.method === 'GET' ? 'badge-primary' :
                    endpoint.method === 'POST' ? 'badge-accent' :
                    'badge-gray'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-primary-900">{endpoint.path}</code>
                </div>
              </div>
              <p className="text-sm text-primary-700">{endpoint.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-teal-50 border-teal-200">
        <h2 className="text-2xl font-bold text-primary-900 mb-3">Need Help?</h2>
        <p className="text-primary-700 mb-4">
          For technical support, feature requests, or collaboration inquiries, please contact us:
        </p>
        <a
          href="mailto:api@algeria-phyto-chem.org"
          className="text-teal-600 hover:text-teal-700 font-semibold"
        >
          api@algeria-phyto-chem.org
        </a>
      </div>
    </div>
  );
}

const endpoints = [
  { method: 'GET', path: '/api/plants', description: 'List all plants with optional filters' },
  { method: 'GET', path: '/api/plants/{id}', description: 'Get detailed plant information' },
  { method: 'GET', path: '/api/compounds', description: 'List all compounds' },
  { method: 'GET', path: '/api/compounds/{id}', description: 'Get detailed compound information' },
  { method: 'GET', path: '/api/diseases', description: 'List all diseases' },
  { method: 'GET', path: '/api/pathways', description: 'List all pathways' },
  { method: 'GET', path: '/api/genes', description: 'List all genes' },
  { method: 'GET', path: '/api/search', description: 'Global search across all entity types' },
  { method: 'GET', path: '/api/graph/plant-compound-network', description: 'Get plant-compound network data' },
  { method: 'GET', path: '/api/graph/compound-target-network', description: 'Get compound-target interactions' },
  { method: 'GET', path: '/api/graph/disease-pathway-network', description: 'Get disease-pathway associations' },
  { method: 'GET', path: '/api/signatures', description: 'List transcriptomic signatures' },
  { method: 'GET', path: '/api/signatures/{id}', description: 'Get signature with gene expression data' },
  { method: 'GET', path: '/api/publications', description: 'List scientific publications' },
  { method: 'GET', path: '/api/analytics/stats', description: 'Get database statistics' },
];
