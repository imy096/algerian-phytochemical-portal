import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  Leaf,
  FlaskConical,
  MapPin,
  BookOpen,
  Sparkles,
  TestTube2,
  Image as ImageIcon,
  Dna,
  ChevronRight,
  Boxes,
  HeartPulse,
  FolderTree,
} from 'lucide-react';
import { api } from '../lib/api';

type EvidenceItem = {
  evidence_id?: string;
  plant_id?: string;
  plant_name_raw?: string;
  attribute_type?: string;
  raw_text?: string;
  clean_text?: string;
  display_text?: string;
  source_sheet?: string;
  source_row?: number;
};

type PlantCompound = {
  compound_id: string;
  compound_name?: string;
  compound_name_raw?: string;
  compound_name_normalized?: string;
  plant_part?: string;
  evidence_type?: string;
};

type PlantData = {
  plant_id: string;
  plant_name_raw?: string;
  scientific_name?: string;
  family?: string | null;
  genus?: string | null;
  species?: string | null;
  tax_id?: string | null;
  endemic_flag?: boolean | null;
  image_url?: string | null;
  image?: string | null;
  plant_image_url?: string | null;
  compounds?: PlantCompound[];
  compound_count?: number;
  evidence_groups?: Record<string, EvidenceItem[]>;
  evidence?: EvidenceItem[];
  evidence_count?: number;
  visible_evidence_count?: number;
  evidence_types?: string[];
  section_counts?: Record<string, number>;
};

type ApiListResponse<T> = {
  data: T[];
};

type PathwayRow = {
  compound_id?: string | null;
  kegg_id?: string | null;
  kegg_name?: string | null;
  kegg_pathway?: string | null;
};

type TherapeuticConceptRow = {
  concept_normalized?: string;
  plant_id?: string;
  plant_name_raw?: string;
  scientific_name?: string;
  family?: string | null;
  genus?: string | null;
  total_evidence_records?: number;
  ethnobotany_records?: number;
  medicinal_records?: number;
};

type TherapeuticPlantResponse = {
  plant_id: string;
  concepts?: string[];
  concept_rows?: TherapeuticConceptRow[];
  evidence?: EvidenceItem[];
  evidence_split?: {
    ethnobotany?: EvidenceItem[];
    medicinal_potential?: EvidenceItem[];
  };
};

type GenusContextRow = EvidenceItem & {
  genus?: string | null;
  family?: string | null;
  species?: string | null;
};

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
      index === 0 && part ? part.charAt(0).toUpperCase() + part.slice(1) : part
    )
    .join('_');
}

function getPlantImageCandidates(plant?: PlantData | null) {
  if (!plant) return [];

  const folderCandidates = Array.from(
    new Set(
      [
        titleCaseFolder(plant.scientific_name),
        titleCaseFolder(plant.plant_name_raw),
        titleCaseFolder(`${plant.genus || ''} ${plant.species || ''}`),
        cleanFolderName(plant.scientific_name),
        cleanFolderName(plant.plant_name_raw),
        cleanFolderName(`${plant.genus || ''} ${plant.species || ''}`),
      ].filter(Boolean)
    )
  );

  const fileNames = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'image',
    'plant',
    'main',
    'photo',
  ];

  const extensions = ['jpg', 'jpeg', 'png', 'webp'];

  const paths: string[] = [];

  if (plant.image_url) paths.push(plant.image_url);
  if (plant.plant_image_url) paths.push(plant.plant_image_url);
  if (plant.image) paths.push(plant.image);

  for (const folder of folderCandidates) {
    for (const fileName of fileNames) {
      for (const ext of extensions) {
        paths.push(`/assets/plant-images/raw/${folder}/${fileName}.${ext}`);
      }
    }
  }

  return paths;
}

function PlantHeroImage({ plant, title }: { plant: PlantData; title: string }) {
  const candidates = getPlantImageCandidates(plant);
  const [imageIndex, setImageIndex] = useState(0);

  const imageUrl = candidates[imageIndex];

  if (!imageUrl) {
    return (
      <div className="flex h-[300px] w-full max-w-sm flex-col items-center justify-center rounded-[28px] border border-dashed border-stone-300 bg-white/70 text-stone-400">
        <ImageIcon className="mb-3 h-12 w-12" />
        <p className="text-sm font-medium">Plant image</p>
        <p className="mt-1 text-xs">Shown here when available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
      <img
        src={imageUrl}
        alt={title}
        className="h-[300px] w-full object-cover"
        onError={() => setImageIndex((index) => index + 1)}
      />
    </div>
  );
}

function getGroupedEvidence(plant?: PlantData | null): Record<string, EvidenceItem[]> {
  if (!plant) return {};

  if (plant.evidence_groups && Object.keys(plant.evidence_groups).length > 0) {
    return plant.evidence_groups;
  }

  if (plant.evidence && Array.isArray(plant.evidence)) {
    return plant.evidence.reduce((acc: Record<string, EvidenceItem[]>, item) => {
      const key = item.attribute_type || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  return {};
}

function getScientificTitle(plant?: PlantData | null): string {
  if (!plant) return 'Unknown Plant';
  return plant.scientific_name || plant.plant_name_raw || 'Unknown Plant';
}

function getCompoundLabel(compound: PlantCompound): string {
  return (
    compound.compound_name ||
    compound.compound_name_raw ||
    compound.compound_name_normalized ||
    compound.compound_id
  );
}

function normalizeEvidenceText(text?: string) {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function paragraphizeEvidenceText(text?: string) {
  const normalized = normalizeEvidenceText(text);
  if (!normalized) return 'No information available.';

  const parts = normalized
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return normalized;
  if (parts.length === 1) return parts[0];

  return parts
    .map((part) => {
      const clean = part.replace(/\.$/, '').trim();
      if (!clean) return '';
      const first = clean.charAt(0).toUpperCase() + clean.slice(1);
      return `${first}.`;
    })
    .filter(Boolean)
    .join(' ');
}

function getBestEvidenceText(item?: EvidenceItem) {
  return item?.display_text || item?.clean_text || item?.raw_text || '';
}

function isDisplayableEvidenceText(text?: string) {
  const value = (text || '').trim().toLowerCase();

  if (!value) return false;

  const blocked = new Set([
    'not applicable',
    'not applicable.',
    'not specified',
    'not specified.',
    'no information available',
    'no information available.',
  ]);

  return !blocked.has(value);
}

function getPreviewText(items: EvidenceItem[] | undefined, fallback = 'Not available') {
  if (!items || items.length === 0) return fallback;

  const visibleItems = items.filter((item) =>
    isDisplayableEvidenceText(getBestEvidenceText(item))
  );

  if (visibleItems.length === 0) return fallback;

  const text = paragraphizeEvidenceText(getBestEvidenceText(visibleItems[0]));
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function prettyLabel(value?: string | null) {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function countVisibleEvidence(items?: EvidenceItem[]) {
  return (items || []).filter((item) =>
    isDisplayableEvidenceText(getBestEvidenceText(item))
  ).length;
}

function HeroPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value?: string | number | null;
  tone?: 'neutral' | 'green';
}) {
  if (value === null || value === undefined || value === '') return null;

  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
      : 'border-stone-200 bg-white text-stone-700';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${cls}`}
    >
      {label}: {String(value)}
    </span>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-800">{String(value)}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-stone-100 bg-stone-50/70 px-6 py-4">
        <div className="text-emerald-700">{icon}</div>
        <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function NarrativeSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: EvidenceItem[];
}) {
  const visibleItems = (items || []).filter((item) =>
    isDisplayableEvidenceText(getBestEvidenceText(item))
  );

  if (visibleItems.length === 0) return null;

  return (
    <Section title={title} icon={icon}>
      <div className="space-y-4">
        {visibleItems.map((item, index) => (
          <div
            key={item.evidence_id || `${title}-${index}`}
            className="rounded-2xl border border-stone-100 bg-[#fcfbf7] px-5 py-4"
          >
            <p className="text-[15px] leading-8 text-stone-700">
              {paragraphizeEvidenceText(getBestEvidenceText(item))}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function GenusContextSection({
  genus,
  groups,
}: {
  genus?: string | null;
  groups: Record<string, GenusContextRow[]>;
}) {
  const groupEntries = Object.entries(groups).filter(([, items]) =>
    items.some((item) => isDisplayableEvidenceText(getBestEvidenceText(item)))
  );

  if (!genus || groupEntries.length === 0) return null;

  return (
    <Section title={`Genus-level context: ${genus}`} icon={<Dna className="h-5 w-5" />}>
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-sm leading-7 text-amber-900">
          These annotations describe the genus <strong>{genus}</strong>. They are shown
          as genus-level contextual knowledge and should not be interpreted as confirmed
          species-specific evidence unless supported by the plant-level sections above.
        </p>
      </div>

      <div className="space-y-4">
        {groupEntries.map(([attributeType, items]) => {
          const visible = items.filter((item) =>
            isDisplayableEvidenceText(getBestEvidenceText(item))
          );

          return (
            <div
              key={attributeType}
              className="rounded-2xl border border-stone-200 bg-[#fcfbf7] px-5 py-4"
            >
              <h3 className="mb-3 text-base font-semibold text-stone-800">
                {prettyLabel(attributeType)}
              </h3>

              <div className="space-y-3">
                {visible.slice(0, 3).map((item, index) => (
                  <p
                    key={item.evidence_id || `${attributeType}-${index}`}
                    className="text-[15px] leading-8 text-stone-700"
                  >
                    {paragraphizeEvidenceText(getBestEvidenceText(item))}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export default function PlantDetail() {
  const params = useParams();
  const plantId = params.id || params.plantId || '';

  const {
    data: plant,
    isLoading,
    error,
  } = useQuery<PlantData>({
    queryKey: ['plant', plantId],
    queryFn: async () => {
      const result = await api.plants.get(plantId);
      return result;
    },
    enabled: !!plantId,
    retry: false,
  });

  const { data: pathwayResponse } = useQuery<ApiListResponse<PathwayRow>>({
    queryKey: ['plant-pathways', plantId],
    queryFn: () => api.plants.pathways(plantId),
    enabled: !!plantId,
    retry: false,
  });

  const { data: therapeutics } = useQuery<TherapeuticPlantResponse>({
    queryKey: ['plant-therapeutics', plantId],
    queryFn: () => api.therapeutics.plant(plantId),
    enabled: !!plantId,
    retry: false,
  });

  const { data: genusContextResponse } = useQuery<ApiListResponse<GenusContextRow>>({
    queryKey: ['plant-genus-context', plantId],
    queryFn: () => api.plants.genusContext(plantId),
    enabled: !!plantId,
    retry: false,
  });

  const evidenceGroups = getGroupedEvidence(plant);
  const title = getScientificTitle(plant);
  const compounds = plant?.compounds || [];
  const pathways = pathwayResponse?.data || [];
  const genusContextRows = genusContextResponse?.data || [];

  const genusContextGroups = useMemo(() => {
    return genusContextRows.reduce((acc: Record<string, GenusContextRow[]>, item) => {
      const key = item.attribute_type || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [genusContextRows]);

  const botanicalOverview = evidenceGroups.botanical_characteristics || [];
  const geography = evidenceGroups.geography_climate || [];
  const ethnobotany = evidenceGroups.ethnobotany || [];
  const medicinalPotential = evidenceGroups.medicinal_potential || [];
  const extraction = evidenceGroups.extraction_methodology || [];
  const plantParts = evidenceGroups.plant_part_used || [];
  const valorization = evidenceGroups.plant_valorization || [];

  const overviewText =
    getPreviewText(botanicalOverview, '') ||
    getPreviewText(medicinalPotential, '') ||
    getPreviewText(ethnobotany, '') ||
    'No curated overview is available for this plant yet.';

  const plantPartPreview = getPreviewText(
    plantParts,
    'No plant-part information available.'
  );

  const distinctPathways = useMemo(() => {
    return Array.from(
      new Set(
        pathways
          .map((row) => row.kegg_pathway || row.kegg_name)
          .filter((v): v is string => Boolean(v))
      )
    );
  }, [pathways]);

  const visibleEvidenceCount =
    plant?.visible_evidence_count ??
    (plant?.evidence || []).filter((item) =>
      isDisplayableEvidenceText(getBestEvidenceText(item))
    ).length;

  const therapeuticConceptRows = useMemo(() => {
    const rows = therapeutics?.concept_rows || [];
    return rows
      .filter((row) => {
        const eth = row.ethnobotany_records || 0;
        const med = row.medicinal_records || 0;
        const total = row.total_evidence_records || 0;
        const hasConcept = Boolean((row.concept_normalized || '').trim());
        return hasConcept && (eth > 0 || med > 0 || total > 0);
      })
      .sort((a, b) => {
        return (
          (b.total_evidence_records || 0) - (a.total_evidence_records || 0) ||
          (b.medicinal_records || 0) - (a.medicinal_records || 0) ||
          (b.ethnobotany_records || 0) - (a.ethnobotany_records || 0) ||
          (a.concept_normalized || '').localeCompare(b.concept_normalized || '')
        );
      });
  }, [therapeutics]);

  const therapeuticConcepts = useMemo(() => {
    const direct = (therapeutics?.concepts || []).filter(Boolean);
    if (direct.length > 0) {
      return Array.from(new Set(direct)).sort((a, b) => a.localeCompare(b));
    }

    return Array.from(
      new Set(
        therapeuticConceptRows
          .map((row) => row.concept_normalized || '')
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [therapeutics, therapeuticConceptRows]);

  const therapeuticsEthnobotany = useMemo(() => {
    const fromApi = therapeutics?.evidence_split?.ethnobotany || [];
    const visible = fromApi.filter((item) =>
      isDisplayableEvidenceText(getBestEvidenceText(item))
    );
    return visible.length > 0
      ? visible
      : ethnobotany.filter((item) =>
          isDisplayableEvidenceText(getBestEvidenceText(item))
        );
  }, [therapeutics, ethnobotany]);

  const therapeuticsMedicinal = useMemo(() => {
    const fromApi = therapeutics?.evidence_split?.medicinal_potential || [];
    const visible = fromApi.filter((item) =>
      isDisplayableEvidenceText(getBestEvidenceText(item))
    );
    return visible.length > 0
      ? visible
      : medicinalPotential.filter((item) =>
          isDisplayableEvidenceText(getBestEvidenceText(item))
        );
  }, [therapeutics, medicinalPotential]);

  const therapeuticsVisibleCount =
    countVisibleEvidence(therapeuticsEthnobotany) +
    countVisibleEvidence(therapeuticsMedicinal);

  const hasTherapeutics =
    therapeuticConceptRows.length > 0 ||
    therapeuticConcepts.length > 0 ||
    therapeuticsVisibleCount > 0;

  const noSupportingEvidence = [geography, extraction, valorization].every(
    (group) =>
      group.filter((item) =>
        isDisplayableEvidenceText(getBestEvidenceText(item))
      ).length === 0
  );

  if (isLoading) {
    return <div className="py-12 text-center text-stone-500">Loading plant...</div>;
  }

  if (!plantId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-stone-600">
        Plant ID missing from route
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-center font-medium text-stone-600">
          Failed to load plant details
        </div>
        <pre className="mt-4 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-stone-100 p-4 text-left text-xs text-stone-700">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-stone-600">
        Plant not found
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[32px] border border-stone-200 bg-gradient-to-r from-[#dce8d4] via-[#f5f0df] to-[#e6efe2] shadow-sm">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-900/10 to-transparent" />
          <div className="absolute right-10 top-10 select-none text-[110px] opacity-10">
            🌿
          </div>
          <div className="absolute bottom-0 left-10 select-none text-[85px] opacity-10">
            🍃
          </div>
        </div>

        <div className="relative grid items-start gap-8 p-8 md:p-10 xl:grid-cols-[300px_1fr]">
          <div className="flex items-center justify-center">
            <PlantHeroImage plant={plant} title={title} />
          </div>

          <div className="min-w-0 space-y-6">
            <div>
              <h1 className="break-words text-3xl font-bold italic tracking-tight text-stone-900 md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Plant ID: {plant.plant_id}
                {plant.tax_id ? ` • Taxonomy ID: ${plant.tax_id}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <HeroPill label="Family" value={plant.family} />
              <HeroPill label="Genus" value={plant.genus} />
              <HeroPill label="Species" value={plant.species} />
              <HeroPill
                label="Status"
                value={plant.endemic_flag ? 'Endemic' : null}
                tone="green"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Linked Compounds"
                value={plant.compound_count ?? compounds.length}
              />
              <MiniStat label="Visible Evidence" value={visibleEvidenceCount} />
              <MiniStat label="Evidence Types" value={plant.evidence_types?.length || 0} />
              <MiniStat label="Pathway Links" value={distinctPathways.length} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.35fr_1fr_1fr]">
        <Section title="Botanical Overview" icon={<BookOpen className="h-5 w-5" />}>
          <p className="text-[15px] leading-8 text-stone-700">{overviewText}</p>
        </Section>

        <Section title="Therapeutic Snapshot" icon={<HeartPulse className="h-5 w-5" />}>
          {hasTherapeutics ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {therapeuticConcepts.slice(0, 4).map((concept) => (
                  <Link
                    key={concept}
                    to={`/therapeutics/${encodeURIComponent(concept)}`}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                  >
                    {prettyLabel(concept)}
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                    Ethnobotany
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">
                    {countVisibleEvidence(therapeuticsEthnobotany)}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700">
                    Medicinal
                  </p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    {countVisibleEvidence(therapeuticsMedicinal)}
                  </p>
                </div>
              </div>

              {therapeuticConcepts.length > 4 && (
                <p className="text-xs text-stone-500">
                  +{therapeuticConcepts.length - 4} more therapeutic concepts
                </p>
              )}
            </div>
          ) : (
            <p className="text-[15px] leading-8 text-stone-700">
              No classified therapeutic profile is available for this plant yet.
            </p>
          )}
        </Section>

        <Section title="Plant Parts Used" icon={<TestTube2 className="h-5 w-5" />}>
          <p className="text-[15px] leading-8 text-stone-700">{plantPartPreview}</p>
        </Section>
      </section>

      <GenusContextSection genus={plant.genus} groups={genusContextGroups} />

      {hasTherapeutics && (
        <Section title="Therapeutic Profile" icon={<HeartPulse className="h-5 w-5" />}>
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  Normalized Concepts
                </p>
                <p className="mt-1 text-lg font-semibold text-stone-800">
                  {therapeuticConcepts.length}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                  Ethnobotanical Evidence
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-900">
                  {countVisibleEvidence(therapeuticsEthnobotany)}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-wide text-amber-700">
                  Medicinal Evidence
                </p>
                <p className="mt-1 text-lg font-semibold text-amber-900">
                  {countVisibleEvidence(therapeuticsMedicinal)}
                </p>
              </div>
            </div>

            {therapeuticConceptRows.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-lg font-semibold text-stone-800">
                    Therapeutic Concepts
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {therapeuticConceptRows.map((row, index) => {
                    const concept = row.concept_normalized || '';
                    const eth = row.ethnobotany_records || 0;
                    const med = row.medicinal_records || 0;
                    const total = row.total_evidence_records || eth + med;

                    return (
                      <Link
                        key={`${concept}-${index}`}
                        to={`/therapeutics/${encodeURIComponent(concept)}`}
                        className="group rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-800 group-hover:text-emerald-800">
                              {prettyLabel(concept)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {eth > 0 && (
                                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                  Ethnobotany: {eth}
                                </span>
                              )}
                              {med > 0 && (
                                <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                  Medicinal: {med}
                                </span>
                              )}
                              <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700">
                                Total: {total}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-lg font-semibold text-emerald-900">
                    Ethnobotanical Evidence
                  </h3>
                </div>

                {countVisibleEvidence(therapeuticsEthnobotany) === 0 ? (
                  <p className="text-sm text-emerald-800/80">
                    No classified ethnobotanical therapeutic evidence is available for this
                    plant yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {therapeuticsEthnobotany.map((item, index) => (
                      <div
                        key={item.evidence_id || `ther-eth-${index}`}
                        className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-4"
                      >
                        <p className="text-[15px] leading-8 text-stone-700">
                          {paragraphizeEvidenceText(getBestEvidenceText(item))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-700" />
                  <h3 className="text-lg font-semibold text-amber-900">
                    Medicinal Evidence
                  </h3>
                </div>

                {countVisibleEvidence(therapeuticsMedicinal) === 0 ? (
                  <p className="text-sm text-amber-800/80">
                    No classified medicinal therapeutic evidence is available for this
                    plant yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {therapeuticsMedicinal.map((item, index) => (
                      <div
                        key={item.evidence_id || `ther-med-${index}`}
                        className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-4"
                      >
                        <p className="text-[15px] leading-8 text-stone-700">
                          {paragraphizeEvidenceText(getBestEvidenceText(item))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>
      )}

      <section className="grid items-start gap-6 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <NarrativeSection
            title="Geography & Climate"
            icon={<MapPin className="h-5 w-5" />}
            items={geography}
          />

          <NarrativeSection
            title="Extraction Methodology"
            icon={<TestTube2 className="h-5 w-5" />}
            items={extraction}
          />

          <NarrativeSection
            title="Plant Valorization"
            icon={<Leaf className="h-5 w-5" />}
            items={valorization}
          />

          {noSupportingEvidence && (
            <Section title="Supporting Evidence" icon={<BookOpen className="h-5 w-5" />}>
              <p className="text-[15px] leading-8 text-stone-600">
                No additional curated supporting evidence is available yet for this plant.
              </p>
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          <Section title="Linked Compounds" icon={<FlaskConical className="h-5 w-5" />}>
            {compounds.length === 0 ? (
              <p className="text-sm text-stone-500">No compounds available.</p>
            ) : (
              <div className="space-y-3">
                {compounds.slice(0, 10).map((compound) => (
                  <Link
                    key={compound.compound_id}
                    to={`/compounds/${compound.compound_id}`}
                    className="block rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition hover:bg-amber-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold leading-7 text-stone-800">
                          {getCompoundLabel(compound)}
                        </h3>
                        {(compound.plant_part || compound.evidence_type) && (
                          <p className="mt-1 text-xs text-stone-500">
                            {[compound.plant_part, compound.evidence_type]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Pathway Context" icon={<Boxes className="h-5 w-5" />}>
            {distinctPathways.length === 0 ? (
              <p className="text-sm text-stone-500">
                No pathway context is available yet through linked compounds.
              </p>
            ) : (
              <div className="space-y-3">
                {distinctPathways.slice(0, 8).map((pathway, idx) => (
                  <div
                    key={`${pathway}-${idx}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <p className="text-sm text-stone-700">{pathway}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Taxonomic Summary" icon={<Dna className="h-5 w-5" />}>
            <div className="grid gap-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  Scientific Name
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {plant.scientific_name || plant.plant_name_raw || 'Not available'}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  Family
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {plant.family || 'Not available'}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  Genus
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {plant.genus || 'Not available'}
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-stone-500">
                  Species
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {plant.species || 'Not available'}
                </p>
              </div>
            </div>
          </Section>
        </aside>
      </section>
    </div>
  );
}