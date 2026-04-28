import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FlaskConical, Filter, Search, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

type CompoundRow = {
  compound_id: string;
  compound_name_raw?: string | null;
  compound_name_normalized?: string | null;
  iupac_name?: string | null;
  molecular_formula?: string | null;
  molecular_weight?: number | null;
  pubchem_cid?: string | null;
};

const moleculeImages = import.meta.glob('../assets/molecule_images/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function fileBaseName(path: string) {
  return path.split('/').pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
}

function normalizeForCompare(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[β]/g, 'beta')
    .replace(/[α]/g, 'alpha')
    .replace(/[γ]/g, 'gamma')
    .replace(/[δ]/g, 'delta')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getCompoundImageUrl(compound?: CompoundRow | null) {
  if (!compound?.compound_id) return null;

  const id = compound.compound_id;
  const idLower = id.toLowerCase();

  const nameTokens = [
    compound.compound_name_normalized,
    compound.compound_name_raw,
    'iupac_name' in compound ? compound.iupac_name : null,
  ]
    .map(normalizeForCompare)
    .filter(Boolean);

  const entries = Object.entries(moleculeImages);

  const exactOrPrefix = entries.find(([path]) => {
    const base = fileBaseName(path).toLowerCase();
    return base === idLower || base.startsWith(`${idLower}_`) || base.startsWith(`${idLower}-`);
  });

  if (exactOrPrefix) return exactOrPrefix[1];

  const idLoose = normalizeForCompare(id);

  const looseWithName = entries.find(([path]) => {
    const base = normalizeForCompare(fileBaseName(path));
    return base.includes(idLoose) && nameTokens.some((token) => base.includes(token));
  });

  if (looseWithName) return looseWithName[1];

  const looseIdOnly = entries.find(([path]) => {
    const base = normalizeForCompare(fileBaseName(path));
    return base.includes(idLoose);
  });

  return looseIdOnly?.[1] || null;
}

function CompoundStructureImage({
  compound,
  large = false,
}: {
  compound?: CompoundRow | null;
  large?: boolean;
}) {
  const imageUrl = getCompoundImageUrl(compound);

  if (!imageUrl) {
    return (
      <div
        className={
          large
            ? 'flex min-h-[280px] items-center justify-center rounded-[28px] border border-stone-200 bg-white shadow-sm'
            : 'flex h-36 items-center justify-center rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-emerald-50/40'
        }
      >
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 rounded-full border border-emerald-100 bg-white p-3 shadow-sm">
            <FlaskConical className={large ? 'h-14 w-14 text-emerald-600' : 'h-7 w-7 text-emerald-600'} />
          </div>
          <p className={large ? 'text-base font-medium text-stone-700' : 'text-xs text-gray-500'}>
            2D structure space
          </p>
          {large && (
            <p className="mt-2 text-sm text-stone-500">
              No local structure image found for this compound.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        large
          ? 'flex min-h-[280px] items-center justify-center overflow-hidden rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm'
          : 'flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white p-3'
      }
    >
      <img
        src={imageUrl}
        alt={compound?.compound_name_raw || compound?.compound_name_normalized || compound?.compound_id || 'Compound structure'}
        className={large ? 'max-h-[260px] max-w-full object-contain' : 'max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105'}
        loading="lazy"
      />
    </div>
  );
}


function chooseDisplayName(compound: CompoundRow) {
  const candidates = [
    compound.compound_name_normalized,
    compound.compound_name_raw,
    compound.iupac_name,
  ].filter((v): v is string => Boolean(v && v.trim()));

  if (candidates.length === 0) return compound.compound_id;

  const sorted = [...candidates].sort((a, b) => a.length - b.length);
  return sorted[0];
}

function formatMw(value?: number | null) {
  if (value === null || value === undefined) return null;
  return `MW = ${value.toFixed(2)}`;
}

export default function CompoundsExplorer() {
  const [filters, setFilters] = useState({
    q: '',
    min_mw: undefined as number | undefined,
    max_mw: undefined as number | undefined,
  });

  const activeFilters = useMemo(
    () => ({
      q: filters.q || undefined,
      min_mw: filters.min_mw,
      max_mw: filters.max_mw,
    }),
    [filters]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['compounds', activeFilters],
    queryFn: () => api.compounds.list(activeFilters),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/80 p-2 shadow-sm border border-emerald-100">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phytochemical Compounds</h1>
            <p className="mt-1 text-gray-600">
              Explore natural compounds from Algerian plants
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card border border-stone-200 shadow-sm">
        <div className="mb-4 flex items-center space-x-2">
          <div className="rounded-lg bg-emerald-50 p-2">
            <Filter className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by compound name or ID"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="input pl-10"
            />
          </div>

          <input
            type="number"
            placeholder="Min Molecular Weight"
            value={filters.min_mw || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                min_mw: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="input"
          />

          <input
            type="number"
            placeholder="Max Molecular Weight"
            value={filters.max_mw || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                max_mw: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="input"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading compounds...</div>
      ) : data?.data?.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          No compounds found matching your criteria
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.data?.map((compound: CompoundRow) => {
            const displayName = chooseDisplayName(compound);

            return (
              <Link
                key={compound.compound_id}
                to={`/compounds/${compound.compound_id}`}
                className="group card border border-stone-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="space-y-4">
                  <CompoundStructureImage compound={compound} />

                  {/* Centered details */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <h3 className="min-h-[48px] text-base font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-700">
                      {displayName}
                    </h3>

                    {compound.molecular_formula && (
                      <p className="mt-2 break-all text-sm font-mono text-gray-600">
                        {compound.molecular_formula}
                      </p>
                    )}

                    {compound.molecular_weight != null && (
                      <div className="mt-3">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          {formatMw(compound.molecular_weight)}
                        </span>
                      </div>
                    )}

                    <p className="mt-3 break-all text-xs text-gray-500">
                      Compound ID: {compound.compound_id}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data?.count > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-700">{data.count}</span> compounds
        </div>
      )}
    </div>
  );
}