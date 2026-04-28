import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Leaf,
  Filter,
  Search,
  Sprout,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';

const PAGE_SIZE = 50;

function cleanFolderName(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/[×]/g, 'x')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function titleCaseFolder(value?: string | null) {
  const cleaned = cleanFolderName(value).toLowerCase();

  return cleaned
    .split('_')
    .map((part, index) =>
      index === 0 && part
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part
    )
    .join('_');
}

function getPlantImageCandidates(plant: any) {
  const folderCandidates = Array.from(
    new Set(
      [
        titleCaseFolder(plant?.scientific_name),
        titleCaseFolder(plant?.plant_name_raw),
        titleCaseFolder(`${plant?.genus || ''} ${plant?.species || ''}`),
        cleanFolderName(plant?.scientific_name),
        cleanFolderName(plant?.plant_name_raw),
        cleanFolderName(`${plant?.genus || ''} ${plant?.species || ''}`),
      ].filter(Boolean)
    )
  );

  const fileNames = [
    '1', '2', '3', '4', '5',
    '6', '7', '8', '9', '10',
    'image', 'plant', 'main', 'photo',
  ];

  const extensions = ['jpg', 'jpeg', 'png', 'webp'];

  const paths: string[] = [];

  for (const folder of folderCandidates) {
    for (const fileName of fileNames) {
      for (const ext of extensions) {
        paths.push(`/assets/plant-images/raw/${folder}/${fileName}.${ext}`);
      }
    }
  }

  return paths;
}

function PlantImageCard({ plant }: { plant: any }) {
  const candidates = getPlantImageCandidates(plant);
  const [imageIndex, setImageIndex] = useState(0);

  const imageUrl = candidates[imageIndex];

  return (
    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-teal-100 via-sand-50 to-primary-50">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={plant?.plant_name_raw || plant?.scientific_name || 'Plant image'}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          loading="lazy"
          onError={() => setImageIndex((index) => index + 1)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 shadow-md backdrop-blur-sm">
            <Sprout className="h-10 w-10 text-teal-700" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    </div>
  );
}

export default function PlantsExplorer() {
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<{
    q: string;
    genus: string;
    family: string;
    endemic: boolean | undefined;
  }>({
    q: '',
    genus: '',
    family: '',
    endemic: undefined,
  });

  const skip = (page - 1) * PAGE_SIZE;

  const { data, isLoading, error } = useQuery({
    queryKey: ['plants', filters, page],
    queryFn: () =>
      api.plants.list({
        ...filters,
        skip,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const plants = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  const resetFilters = () => {
    setFilters({
      q: '',
      genus: '',
      family: '',
      endemic: undefined,
    });
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-primary-100 bg-gradient-to-r from-teal-50 via-white to-sand-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100">
            <Leaf className="h-8 w-8 text-teal-700" />
          </div>

          <div>
            <h1 className="text-4xl font-bold text-primary-900">
              Algerian Flora Explorer
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-primary-700">
              Browse curated plant records from the Algerian chemogenomic phytochemical
              portal. Explore taxonomic information, linked compounds, images when
              available, and biological context.
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="card sticky top-28">
          <div className="mb-5 flex items-center gap-2">
            <Filter className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-primary-900">Filters</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-primary-900">
                Search plant name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
                <input
                  type="text"
                  placeholder="e.g. Artemisia"
                  value={filters.q}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, q: e.target.value }));
                    setPage(1);
                  }}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-primary-900">
                Genus
              </label>
              <input
                type="text"
                placeholder="e.g. Thymus"
                value={filters.genus}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, genus: e.target.value }));
                  setPage(1);
                }}
                className="input"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-primary-900">
                Family
              </label>
              <input
                type="text"
                placeholder="e.g. Lamiaceae"
                value={filters.family}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, family: e.target.value }));
                  setPage(1);
                }}
                className="input"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-primary-900">
                Endemism
              </label>
              <select
                value={
                  filters.endemic === undefined
                    ? ''
                    : filters.endemic
                      ? 'true'
                      : 'false'
                }
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    endemic:
                      e.target.value === ''
                        ? undefined
                        : e.target.value === 'true',
                  }));
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All plants</option>
                <option value="true">Endemic only</option>
                <option value="false">Non-endemic</option>
              </select>
            </div>

            <button className="btn btn-secondary w-full" onClick={resetFilters}>
              Clear Filters
            </button>
          </div>
        </aside>

        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">Plant Records</h2>
            <p className="mt-1 text-sm text-primary-700">
              {plants.length > 0
                ? `Showing page ${page} • up to ${PAGE_SIZE} plant records`
                : 'No plant records found yet'}
            </p>
          </div>

          {isLoading ? (
            <div className="card py-16 text-center">
              <p className="text-primary-700">Loading plant records...</p>
            </div>
          ) : error ? (
            <div className="card py-16 text-center">
              <p className="text-primary-700">Unable to load plant records right now.</p>
            </div>
          ) : plants.length === 0 ? (
            <div className="card py-16 text-center">
              <Leaf className="mx-auto mb-4 h-14 w-14 text-primary-300" />
              <p className="font-medium text-primary-800">
                No plants found matching your filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {plants.map((plant: any) => (
                  <Link
                    key={plant.plant_id}
                    to={`/plants/${plant.plant_id}`}
                    className="group overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <PlantImageCard plant={plant} />

                    <div className="p-6">
                      <h3 className="text-lg font-bold italic leading-snug text-primary-900 group-hover:text-teal-700">
                        {plant.plant_name_raw || plant.scientific_name || 'Unnamed plant'}
                      </h3>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-primary-500">Family</span>
                          <span className="text-right font-medium text-primary-900">
                            {plant.family || 'Unknown'}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-primary-500">Genus</span>
                          <span className="text-right font-medium text-primary-900">
                            {plant.genus || 'Unknown'}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-primary-500">Species</span>
                          <span className="text-right font-medium text-primary-900">
                            {plant.species || 'Not specified'}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-primary-500">Plant ID</span>
                          <span className="break-all text-right font-mono text-xs text-primary-700">
                            {plant.plant_id}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {plant.genus && (
                          <span className="badge badge-gray">{plant.genus}</span>
                        )}
                        {plant.family && (
                          <span className="badge badge-accent">{plant.family}</span>
                        )}
                        {plant.endemic_flag && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            Endemic
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-100 bg-white px-4 py-2 text-primary-900 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="rounded-xl bg-primary-50 px-4 py-2 text-sm font-medium text-primary-900">
                  Page {page}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={plants.length < PAGE_SIZE}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-100 bg-white px-4 py-2 text-primary-900 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}