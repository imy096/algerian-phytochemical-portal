import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { api } from '../lib/api';

export default function DiseasesExplorer() {
  const { data, isLoading } = useQuery({
    queryKey: ['diseases'],
    queryFn: () => api.diseases.list({}),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Diseases</h1>
        <p className="text-gray-600 mt-1">Explore disease associations with compounds and plants</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading diseases...</div>
      ) : data?.data?.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No disease data available yet
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.map((disease: any) => (
            <Link
              key={disease.disease_id}
              to={`/diseases/${disease.disease_id}`}
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg shrink-0">
                  <Activity className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {disease.name}
                  </h3>
                  {disease.mesh_id && (
                    <p className="text-sm text-gray-600 mt-1">MeSH: {disease.mesh_id}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
