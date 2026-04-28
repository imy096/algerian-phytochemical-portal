import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, ExternalLink, Calendar, Users } from 'lucide-react';
import { api } from '../lib/api';

export default function Publications() {
  const [filters, setFilters] = useState({
    query: '',
    yearFrom: '',
    yearTo: '',
    journal: '',
    limit: 50,
    offset: 0,
  });

  const { data: publications, isLoading } = useQuery({
    queryKey: ['publications', filters],
    queryFn: () => api.publications.list(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['publication-stats'],
    queryFn: api.publications.getStats,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-teal-600" />
          Publications & References
        </h1>
        <p className="text-primary-700 mt-2">
          Scientific literature and evidence sources for the Algerian medicinal plant database
        </p>
      </div>

      {stats && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary-900">Total Publications</h3>
              <BookOpen className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-3xl font-bold text-teal-700">{stats.total_publications || 0}</div>
          </div>

          <div className="card bg-gradient-to-br from-gold-50 to-gold-100/50 border-gold-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary-900">Top Journals</h3>
              <Users className="w-6 h-6 text-gold-600" />
            </div>
            <div className="text-3xl font-bold text-gold-700">{stats.top_journals?.length || 0}</div>
          </div>

          <div className="card col-span-2">
            <h3 className="font-semibold text-primary-900 mb-3">Top Publishing Journals</h3>
            <div className="space-y-1 text-sm">
              {stats.top_journals?.slice(0, 3).map((journal: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-primary-700 truncate">{journal.journal}</span>
                  <span className="font-semibold text-primary-900 ml-2">{journal.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-primary-900 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Search Publications
            </label>
            <input
              type="text"
              placeholder="Search by title, authors, keywords..."
              className="input"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value, offset: 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-900 mb-2">Year From</label>
            <input
              type="number"
              placeholder="2000"
              className="input"
              value={filters.yearFrom}
              onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value, offset: 0 })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-900 mb-2">Year To</label>
            <input
              type="number"
              placeholder="2024"
              className="input"
              value={filters.yearTo}
              onChange={(e) => setFilters({ ...filters, yearTo: e.target.value, offset: 0 })}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-primary-700">Loading publications...</p>
          </div>
        </div>
      ) : publications && publications.length > 0 ? (
        <div className="space-y-4">
          {publications.map((pub: any) => (
            <PublicationCard key={pub.reference_id} publication={pub} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <BookOpen className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <p className="text-primary-700">No publications found</p>
        </div>
      )}

      {publications && publications.length > 0 && (
        <div className="flex justify-center gap-4">
          <button
            className="btn btn-secondary"
            disabled={filters.offset === 0}
            onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            disabled={publications.length < filters.limit}
            onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function PublicationCard({ publication }: { publication: any }) {
  return (
    <div className="card hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-primary-900 mb-2 leading-tight">
            {publication.title}
          </h3>

          {publication.authors && (
            <div className="flex items-center gap-2 text-sm text-primary-700 mb-2">
              <Users className="w-4 h-4" />
              <span>{publication.authors}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-primary-600 mb-3">
            {publication.journal && (
              <span className="font-semibold">{publication.journal}</span>
            )}
            {publication.year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {publication.year}
              </span>
            )}
            {publication.pubmed_id && (
              <span className="badge badge-primary">PMID: {publication.pubmed_id}</span>
            )}
          </div>

          {publication.abstract && (
            <p className="text-sm text-primary-700 line-clamp-3">
              {publication.abstract}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {publication.url && (
            <a
              href={publication.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View
            </a>
          )}
          {publication.doi && (
            <a
              href={`https://doi.org/${publication.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              DOI: {publication.doi}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
