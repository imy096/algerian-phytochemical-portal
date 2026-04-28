import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { api } from '../lib/api';

export default function DiseaseDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: disease, isLoading } = useQuery({
    queryKey: ['disease', id],
    queryFn: () => api.diseases.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading disease details...</div>;
  }

  if (!disease) {
    return <div className="text-center py-12 text-gray-500">Disease not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start space-x-4">
          <div className="p-4 bg-primary-100 rounded-lg">
            <Activity className="w-10 h-10 text-primary-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{disease.name}</h1>
            {disease.mesh_id && (
              <p className="text-gray-600 mt-1">MeSH ID: {disease.mesh_id}</p>
            )}
          </div>
        </div>

        {disease.description && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-gray-700 leading-relaxed">{disease.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
