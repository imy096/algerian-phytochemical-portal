const API_BASE = 'http://127.0.0.1:8000/api';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

async function fetchAPI<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120000);

  try {
    const isFormData = options?.body instanceof FormData;

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: isFormData
        ? {
            ...(options?.headers || {}),
          }
        : {
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
          },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout while calling ${endpoint}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function cleanQueryParams(params?: QueryParams) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  ) as Record<string, string | number | boolean>;
}

function toQueryString(params?: QueryParams) {
  const cleanParams = cleanQueryParams(params);
  return new URLSearchParams(
    Object.entries(cleanParams).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  ).toString();
}

export const api = {
  plants: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/plants${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/plants/${id}`),
    compounds: (id: string) => fetchAPI(`/plants/${id}/compounds`),
    signatures: (id: string) => fetchAPI(`/plants/${id}/signatures`),
    pathways: (id: string) => fetchAPI(`/plants/${id}/pathways`),
    traditionalUses: (id: string) => fetchAPI(`/plants/${id}/traditional_uses`),
    evidence: (id: string) => fetchAPI(`/plants/${id}/evidence`),
  },

  therapeutics: {
    concepts: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/therapeutics/concepts${query ? `?${query}` : ''}`);
    },
    conceptDetail: (conceptName: string, params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(
        `/therapeutics/concepts/${encodeURIComponent(conceptName)}${query ? `?${query}` : ''}`
      );
    },
    plant: (plantId: string) => fetchAPI(`/therapeutics/plants/${plantId}`),
  },

  collaboration: {
    submit: (data: unknown) =>
      fetchAPI('/collaboration/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    uploadFile: (file: File, submissionId?: string) => {
      const formData = new FormData();
      formData.append('file', file);

      if (submissionId) {
        formData.append('submission_id', submissionId);
      }

      return fetchAPI('/collaboration/upload-file', {
        method: 'POST',
        body: formData,
      });
    },
  },

  adminCollaboration: {
    listSubmissions: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/admin-collaboration/submissions${query ? `?${query}` : ''}`);
    },

    getSubmission: (submissionId: string) =>
      fetchAPI(`/admin-collaboration/submissions/${submissionId}`),

    getSubmissionFiles: (submissionId: string) =>
      fetchAPI(`/admin-collaboration/submissions/${submissionId}/files`),

    getValidationReports: (submissionId: string) =>
      fetchAPI(`/admin-collaboration/submissions/${submissionId}/validation-reports`),

    updateStatus: (submissionId: string, status: string) =>
      fetchAPI(`/admin-collaboration/submissions/${submissionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  submissionValidation: {
    validateSubmission: (submissionId: string) =>
      fetchAPI(`/submission-validation/validate/${submissionId}`, {
        method: 'POST',
      }),
  },

  curation: {
    getParsedRows: (submissionId: string, params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/curation/submission/${submissionId}/rows${query ? `?${query}` : ''}`);
    },

    getSummary: (submissionId: string) =>
      fetchAPI(`/curation/submission/${submissionId}/summary`),

    getApprovedRows: (submissionId: string, params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(
        `/curation/submission/${submissionId}/approved-rows${query ? `?${query}` : ''}`
      );
    },

    updateRow: (
      parsedRowId: string,
      data: { review_status: string; curator_notes?: string }
    ) =>
      fetchAPI(`/curation/rows/${parsedRowId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    bulkReview: (data: {
      parsed_row_ids: string[];
      review_status: string;
      curator_notes?: string;
    }) =>
      fetchAPI(`/curation/rows/bulk-review`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  compounds: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/compounds${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/compounds/${id}`),
    plants: (id: string) => fetchAPI(`/compounds/${id}/plants`),
    pubchem: (id: string) => fetchAPI(`/compounds/${id}/pubchem`),
    chembl: (id: string) => fetchAPI(`/compounds/${id}/chembl`),
    kegg: (id: string) => fetchAPI(`/compounds/${id}/kegg`),
    pathways: (id: string) => fetchAPI(`/compounds/${id}/pathways`),
    lincs: (id: string) => fetchAPI(`/compounds/${id}/lincs`),
    geo: (id: string) => fetchAPI(`/compounds/${id}/geo`),
    toxicity: (id: string) => fetchAPI(`/compounds/${id}/toxicity`),
    targets: (id: string) => fetchAPI(`/compounds/${id}/targets`),
    npClassification: (id: string) => fetchAPI(`/compounds/${id}/np-classification`),
    nmr: (id: string) => fetchAPI(`/compounds/${id}/nmr`),
    comptoxProperties: (id: string) =>
      fetchAPI(`/compounds/${id}/comptox-properties`),
  },

  targets: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/targets${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/targets/${encodeURIComponent(id)}`),
  },

  genes: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/genes${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/genes/${id}`),
    pathways: (id: string) => fetchAPI(`/genes/${id}/pathways`),
    signatures: (id: string) => fetchAPI(`/genes/${id}/signatures`),
  },

  pathways: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/pathways${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/pathways/${id}`),
    compounds: (id: string) => fetchAPI(`/pathways/${id}/compounds`),
    genes: (id: string) => fetchAPI(`/pathways/${id}/genes`),
  },

  diseases: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/diseases${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchAPI(`/diseases/${id}`),
    compounds: (id: string) => fetchAPI(`/diseases/${id}/compounds`),
    plants: (id: string) => fetchAPI(`/diseases/${id}/plants`),
  },

  search: {
    global: (q: string, entityType?: string) => {
      const params = new URLSearchParams({ q });
      if (entityType) params.append('entity_type', entityType);
      return fetchAPI(`/search?${params.toString()}`);
    },
    autocomplete: (q: string, entityType: string) => {
      const params = new URLSearchParams({ q, entity_type: entityType });
      return fetchAPI(`/search/autocomplete?${params.toString()}`);
    },
  },

  analytics: {
    coverage: () => fetchAPI('/analytics/coverage'),
    gaps: () => fetchAPI('/analytics/gaps'),
    stats: () => fetchAPI('/analytics/stats'),
    regions: () => fetchAPI('/analytics/regions'),
  },

  admin: {
    submissions: {
      list: (status?: string) => {
        const params = status ? `?status=${encodeURIComponent(status)}` : '';
        return fetchAPI(`/admin/submissions${params}`);
      },
      get: (id: string) => fetchAPI(`/admin/submissions/${id}`),
      create: (data: unknown) =>
        fetchAPI('/admin/submissions', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      review: (id: string, data: unknown) =>
        fetchAPI(`/admin/submissions/${id}/review`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
    },
    dashboard: () => fetchAPI('/admin/dashboard'),
  },

  graph: {
    getNodeNetwork: (nodeId: string, nodeType: string, depth: number = 1) => {
      const params = new URLSearchParams({
        node_type: nodeType,
        depth: depth.toString(),
      });
      return fetchAPI(`/graph/network/${nodeId}?${params.toString()}`);
    },
    getPlantCompoundNetwork: (
      limit: number = 100,
      plantFamily?: string,
      chemicalClass?: string
    ) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (plantFamily) params.append('plant_family', plantFamily);
      if (chemicalClass) params.append('chemical_class', chemicalClass);
      return fetchAPI(`/graph/plant-compound-network?${params.toString()}`);
    },
    getCompoundTargetNetwork: (limit: number = 100, compoundId?: string) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (compoundId) params.append('compound_id', compoundId);
      return fetchAPI(`/graph/compound-target-network?${params.toString()}`);
    },
    getDiseasePathwayNetwork: (limit: number = 100, diseaseId?: string) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (diseaseId) params.append('disease_id', diseaseId);
      return fetchAPI(`/graph/disease-pathway-network?${params.toString()}`);
    },
    getNodeStats: (nodeId: string, nodeType: string) => {
      const params = new URLSearchParams({ node_type: nodeType });
      return fetchAPI(`/graph/node-stats/${nodeId}?${params.toString()}`);
    },
  },

  signatures: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/signatures${query ? `?${query}` : ''}`);
    },
    getById: (id: string, includeGenes: boolean = true) => {
      const params = new URLSearchParams({
        include_genes: includeGenes.toString(),
      });
      return fetchAPI(`/signatures/${id}?${params.toString()}`);
    },
    getTopGenes: (id: string, direction?: string, limit: number = 50) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (direction) params.append('direction', direction);
      return fetchAPI(`/signatures/${id}/top-genes?${params.toString()}`);
    },
    getCompoundSignatures: (compoundId: string) => {
      return fetchAPI(`/signatures/compound/${compoundId}/signatures`);
    },
    compareSignatures: (signatureIds: string[], topN: number = 100) => {
      const params = new URLSearchParams({
        signature_ids: signatureIds.join(','),
        top_n: topN.toString(),
      });
      return fetchAPI(`/signatures/compare/signatures?${params.toString()}`);
    },
    listGeoStudies: (
      organism?: string,
      limit: number = 50,
      offset: number = 0
    ) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (organism) params.append('organism', organism);
      return fetchAPI(`/signatures/geo-studies/?${params.toString()}`);
    },
    getGeoStudy: (gseAccession: string) => {
      return fetchAPI(`/signatures/geo-studies/${gseAccession}`);
    },
  },

  publications: {
    list: (params?: QueryParams) => {
      const query = toQueryString(params);
      return fetchAPI(`/publications${query ? `?${query}` : ''}`);
    },
    getById: (id: string) => fetchAPI(`/publications/${id}`),
    getByPubmed: (pubmedId: string) =>
      fetchAPI(`/publications/pubmed/${pubmedId}`),
    getRelatedData: (id: string) =>
      fetchAPI(`/publications/${id}/related-data`),
    getStats: () => fetchAPI('/publications/stats/overview'),
  },
};