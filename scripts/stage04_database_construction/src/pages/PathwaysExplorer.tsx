import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { api } from '../lib/api';

export default function PathwaysExplorer() {
  const { data, isLoading } = useQuery({
    queryKey: ['pathways'],
    queryFn: () => api.pathways.list({}),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biological Pathways</h1>
        <p className="text-gray-600 mt-1">Explore biological pathways and mechanisms</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading pathways...</div>
      ) : data?.data?.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No pathway data available yet
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {data?.data?.map((pathway: any) => (
            <div key={pathway.pathway_id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg shrink-0">
                  <Activity className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{pathway.name}</h3>
                  {pathway.source_db && (
                    <span className="badge badge-gray mt-2">{pathway.source_db}</span>
                  )}
                  {pathway.description && (
                    <p className="text-sm text-gray-600 mt-2">{pathway.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
