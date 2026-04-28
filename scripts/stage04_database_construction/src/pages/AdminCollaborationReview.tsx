import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Submission = {
  submission_id: string;
  submission_type?: string;
  full_name?: string;
  email?: string;
  institution?: string;
  title?: string;
  message?: string;
  status?: string;
  created_at?: string;
};

type SubmissionFile = {
  file_id: string;
  original_filename: string;
  storage_path: string;
  mime_type?: string;
  file_size?: number;
  uploaded_at?: string;
  signed_url?: string | null;
};

type ValidationReport = {
  report_id: string;
  submission_id: string;
  file_id?: string;
  template_type?: string | null;
  file_name?: string | null;
  validation_status?: string;
  total_rows?: number | null;
  valid_rows?: number | null;
  invalid_rows?: number | null;
  missing_required_columns?: string[];
  extra_columns?: string[];
  row_level_errors?: Array<{ row: number | null; errors: string[] }>;
  summary?: Record<string, unknown>;
};

type ParsedRow = {
  parsed_row_id: string;
  submission_id: string;
  file_id?: string | null;
  report_id?: string | null;
  template_type?: string | null;
  row_number?: number | null;
  raw_row?: Record<string, unknown>;
  normalized_row?: Record<string, unknown>;
  is_valid?: boolean;
  validation_errors?: string[];
  review_status?: string;
  curator_notes?: string | null;
  reviewed_at?: string | null;
  approved_for_import?: boolean;
};

type CurationSummary = {
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
  unreviewed_rows?: number;
  approved_rows?: number;
  rejected_rows?: number;
  needs_revision_rows?: number;
  approved_for_import_rows?: number;
};

type QueryResponse<T> = {
  data?: T[];
  count?: number;
  limit?: number;
  offset?: number;
  summary?: CurationSummary;
};

const submissionStatusOptions = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'needs_revision',
] as const;

const rowReviewOptions = [
  'unreviewed',
  'approved',
  'rejected',
  'needs_revision',
] as const;

type RowReviewStatus = (typeof rowReviewOptions)[number];
type SubmissionStatus = (typeof submissionStatusOptions)[number];

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'needs_revision':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'under_review':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
}

function reviewBadgeClass(status?: string) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'needs_revision':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
}

function validBadgeClass(isValid?: boolean) {
  return isValid
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-red-100 text-red-700 border-red-200';
}

export default function AdminCollaborationReview() {
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus>('pending');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [validationReports, setValidationReports] = useState<ValidationReport[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [curationSummary, setCurationSummary] = useState<CurationSummary | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [curatorNote, setCuratorNote] = useState('');

  const [rowReviewFilter, setRowReviewFilter] = useState<string>('all');
  const [rowValidityFilter, setRowValidityFilter] = useState<string>('all');
  const [rowSearch, setRowSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>('all');

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [validationRunning, setValidationRunning] = useState(false);
  const [bulkReviewRunning, setBulkReviewRunning] = useState(false);
  const [singleRowUpdatingId, setSingleRowUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const resetDetailState = () => {
    setFiles([]);
    setValidationReports([]);
    setParsedRows([]);
    setCurationSummary(null);
    setSelectedRowIds([]);
    setCuratorNote('');
    setRowReviewFilter('all');
    setRowValidityFilter('all');
    setRowSearch('');
    setSelectedReportId('all');
  };

  const loadSubmissions = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.adminCollaboration.listSubmissions({
        status: statusFilter,
        limit: 50,
        offset: 0,
      });

      const nextSubmissions = response.data || [];
      setSubmissions(nextSubmissions);

      if (nextSubmissions.length === 0) {
        setSelected(null);
        resetDetailState();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetail = async (submissionId: string) => {
    setDetailLoading(true);
    setMessage('');

    try {
      const detail = await api.adminCollaboration.getSubmission(submissionId);
      const linkedFiles = await api.adminCollaboration.getSubmissionFiles(submissionId);
      const reports = await api.adminCollaboration.getValidationReports(submissionId);
      const parsed = await api.curation.getParsedRows(submissionId, { limit: 500, offset: 0 });
      const summary = await api.curation.getSummary(submissionId);

      setSelected(detail.data || null);
      setFiles(linkedFiles.data || []);
      setValidationReports(reports.data || []);
      setParsedRows(parsed.data || []);
      setCurationSummary(summary.summary || null);
      setSelectedRowIds([]);
      setCuratorNote('');
      setRowReviewFilter('all');
      setRowValidityFilter('all');
      setRowSearch('');
      setSelectedReportId('all');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load submission details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateSubmissionStatus = async (newStatus: string) => {
    if (!selected?.submission_id) return;

    setStatusUpdating(true);
    setMessage('');

    try {
      await api.adminCollaboration.updateStatus(selected.submission_id, newStatus);
      setMessage(`Submission status updated to "${newStatus}".`);
      await loadSubmissionDetail(selected.submission_id);
      await loadSubmissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update submission status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const runValidation = async () => {
    if (!selected?.submission_id) return;

    setValidationRunning(true);
    setMessage('');

    try {
      const result = await api.submissionValidation.validateSubmission(selected.submission_id);
      setValidationReports(result.data || []);

      const parsed = await api.curation.getParsedRows(selected.submission_id, { limit: 500, offset: 0 });
      const summary = await api.curation.getSummary(selected.submission_id);

      setParsedRows(parsed.data || []);
      setCurationSummary(summary.summary || null);

      setMessage(`Validation completed. Reports created: ${result.reports_created ?? 0}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Validation failed.');
    } finally {
      setValidationRunning(false);
    }
  };

  const toggleRowSelection = (rowId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const runBulkReview = async (reviewStatus: RowReviewStatus) => {
    if (!selected?.submission_id) return;

    if (selectedRowIds.length === 0) {
      setMessage('Select at least one parsed row first.');
      return;
    }

    setBulkReviewRunning(true);
    setMessage('');

    try {
      const result = await api.curation.bulkReview({
        parsed_row_ids: selectedRowIds,
        review_status: reviewStatus,
        curator_notes: curatorNote || undefined,
      });

      setMessage(`Updated ${result.updated_count} row(s) to "${reviewStatus}".`);

      const parsed = await api.curation.getParsedRows(selected.submission_id, { limit: 500, offset: 0 });
      const summary = await api.curation.getSummary(selected.submission_id);

      setParsedRows(parsed.data || []);
      setCurationSummary(summary.summary || null);
      setSelectedRowIds([]);
      setCuratorNote('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update parsed rows.');
    } finally {
      setBulkReviewRunning(false);
    }
  };

  const updateSingleRow = async (parsedRowId: string, reviewStatus: RowReviewStatus) => {
    if (!selected?.submission_id) return;

    setSingleRowUpdatingId(parsedRowId);
    setMessage('');

    try {
      await api.curation.updateRow(parsedRowId, {
        review_status: reviewStatus,
        curator_notes: curatorNote || undefined,
      });

      const parsed = await api.curation.getParsedRows(selected.submission_id, { limit: 500, offset: 0 });
      const summary = await api.curation.getSummary(selected.submission_id);

      setParsedRows(parsed.data || []);
      setCurationSummary(summary.summary || null);
      setMessage(`Row updated to "${reviewStatus}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update row.');
    } finally {
      setSingleRowUpdatingId(null);
    }
  };

  useEffect(() => {
    void loadSubmissions();
  }, [statusFilter]);

  const reportOptions = useMemo(() => {
    const ids = Array.from(
      new Set(
        parsedRows
          .map((row) => row.report_id)
          .filter((value): value is string => Boolean(value))
      )
    );
    return ids;
  }, [parsedRows]);

  const filteredRows = useMemo(() => {
    return parsedRows.filter((row) => {
      const matchesReview =
        rowReviewFilter === 'all' ? true : (row.review_status || 'unreviewed') === rowReviewFilter;

      const matchesValidity =
        rowValidityFilter === 'all'
          ? true
          : rowValidityFilter === 'valid'
            ? row.is_valid === true
            : row.is_valid === false;

      const matchesReport =
        selectedReportId === 'all' ? true : row.report_id === selectedReportId;

      const haystack = JSON.stringify(row.normalized_row || row.raw_row || {}).toLowerCase();
      const matchesSearch = rowSearch.trim()
        ? haystack.includes(rowSearch.trim().toLowerCase())
        : true;

      return matchesReview && matchesValidity && matchesReport && matchesSearch;
    });
  }, [parsedRows, rowReviewFilter, rowValidityFilter, selectedReportId, rowSearch]);

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedRowIds.includes(row.parsed_row_id));

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredRows.map((row) => row.parsed_row_id);

    if (allVisibleSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-800">Submission Review Center</h1>
        <p className="mt-2 leading-7 text-gray-600">
          Review collaboration submissions, inspect linked files, validate templates,
          and curate parsed rows before any approved scientific import workflow.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-700">Filter submissions by status:</span>

        {submissionStatusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg border px-4 py-2 text-sm ${
              statusFilter === status
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}

        <button
          type="button"
          onClick={() => void loadSubmissions()}
          className="ml-auto rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {message ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.2fr]">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Submissions</h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions found for this status.</p>
          ) : (
            <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
              {submissions.map((submission) => (
                <button
                  key={submission.submission_id}
                  type="button"
                  onClick={() => void loadSubmissionDetail(submission.submission_id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected?.submission_id === submission.submission_id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {submission.full_name || 'Unnamed contributor'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {submission.title || submission.submission_type || 'Submission'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass(submission.status)}`}
                    >
                      {submission.status || 'pending'}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                    {submission.message || 'No message'}
                  </p>

                  <p className="mt-3 text-xs text-gray-400">
                    {formatDate(submission.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Submission Detail</h2>

          {detailLoading ? (
            <p className="text-sm text-gray-500">Loading detail...</p>
          ) : !selected ? (
            <p className="text-sm text-gray-500">
              Select a submission from the left to inspect files, validation reports,
              and parsed rows for curator review.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Submission ID</p>
                  <p className="break-all text-sm font-medium">{selected.submission_id}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium">{selected.status || 'pending'}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Contributor</p>
                  <p className="text-sm font-medium">{selected.full_name || '-'}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Email</p>
                  <p className="break-all text-sm font-medium">{selected.email || '-'}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Institution</p>
                  <p className="text-sm font-medium">{selected.institution || '-'}</p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="mb-1 text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">{formatDate(selected.created_at)}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="mb-2 text-xs text-gray-500">Type / Title</p>
                <p className="text-sm font-medium">
                  {selected.title || selected.submission_type || '-'}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="mb-2 text-xs text-gray-500">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {selected.message || '-'}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Submission Actions</p>
                <div className="flex flex-wrap gap-2">
                  {submissionStatusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={statusUpdating}
                      onClick={() => void updateSubmissionStatus(status)}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        selected.status === status
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={validationRunning}
                    onClick={() => void runValidation()}
                    className="rounded-lg border border-indigo-600 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                  >
                    {validationRunning ? 'Running validation...' : 'Run validation'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Linked Files</p>

                {files.length === 0 ? (
                  <p className="text-sm text-gray-500">No files linked to this submission.</p>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.file_id}
                        className="flex flex-col gap-2 rounded-lg border bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {file.original_filename}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {file.mime_type || 'Unknown type'}
                              {typeof file.file_size === 'number'
                                ? ` • ${(file.file_size / 1024).toFixed(1)} KB`
                                : ''}
                            </p>
                          </div>

                          {file.signed_url ? (
                            <a
                              href={file.signed_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-teal-600 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
                            >
                              Open file
                            </a>
                          ) : null}
                        </div>

                        <p className="break-all text-xs text-gray-400">{file.storage_path}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-800">Validation Reports</p>

                {validationReports.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No validation reports loaded yet. Run validation to inspect CSV structure.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {validationReports.map((report) => (
                      <div
                        key={report.report_id}
                        className="space-y-3 rounded-lg border bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {report.file_name || 'Unnamed file'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Template: {report.template_type || 'Not detected'}
                            </p>
                          </div>

                          <span className="rounded-full border bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            {report.validation_status || 'unknown'}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Total rows</p>
                            <p className="text-sm font-semibold">{report.total_rows ?? 0}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Valid rows</p>
                            <p className="text-sm font-semibold">{report.valid_rows ?? 0}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Invalid rows</p>
                            <p className="text-sm font-semibold">{report.invalid_rows ?? 0}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="mb-2 text-xs text-gray-500">Missing required columns</p>
                            {report.missing_required_columns && report.missing_required_columns.length > 0 ? (
                              <ul className="space-y-1 text-sm text-red-700">
                                {report.missing_required_columns.map((col) => (
                                  <li key={col}>• {col}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-600">None</p>
                            )}
                          </div>

                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="mb-2 text-xs text-gray-500">Extra columns</p>
                            {report.extra_columns && report.extra_columns.length > 0 ? (
                              <ul className="space-y-1 text-sm text-amber-700">
                                {report.extra_columns.map((col) => (
                                  <li key={col}>• {col}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-600">None</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-gray-50 p-3">
                          <p className="mb-2 text-xs text-gray-500">Row-level errors</p>
                          {report.row_level_errors && report.row_level_errors.length > 0 ? (
                            <div className="max-h-52 space-y-2 overflow-auto">
                              {report.row_level_errors.slice(0, 20).map((item, idx) => (
                                <div key={idx} className="rounded-md border bg-white p-2">
                                  <p className="text-xs text-gray-500">
                                    Row {item.row ?? 'unknown'}
                                  </p>
                                  <ul className="mt-1 space-y-1 text-sm text-red-700">
                                    {(item.errors || []).map((err, errIdx) => (
                                      <li key={errIdx}>• {err}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              No row-level errors recorded.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-800">Parsed Rows for Curation</p>
                  <span className="rounded-full border bg-white px-3 py-1 text-xs text-gray-600">
                    Visible rows: {filteredRows.length}
                  </span>
                </div>

                {curationSummary ? (
                  <div className="mb-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-semibold">{curationSummary.total_rows ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Approved</p>
                      <p className="text-sm font-semibold">{curationSummary.approved_rows ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Rejected</p>
                      <p className="text-sm font-semibold">{curationSummary.rejected_rows ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Needs Revision</p>
                      <p className="text-sm font-semibold">{curationSummary.needs_revision_rows ?? 0}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs text-gray-500">Unreviewed</p>
                      <p className="text-sm font-semibold">{curationSummary.unreviewed_rows ?? 0}</p>
                    </div>
                  </div>
                ) : null}

                <div className="mb-4 grid gap-3 lg:grid-cols-4">
                  <input
                    value={rowSearch}
                    onChange={(e) => setRowSearch(e.target.value)}
                    placeholder="Search parsed content..."
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />

                  <select
                    value={rowReviewFilter}
                    onChange={(e) => setRowReviewFilter(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="all">All review states</option>
                    {rowReviewOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rowValidityFilter}
                    onChange={(e) => setRowValidityFilter(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="all">All validity states</option>
                    <option value="valid">Valid only</option>
                    <option value="invalid">Invalid only</option>
                  </select>

                  <select
                    value={selectedReportId}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="all">All validation reports</option>
                    {reportOptions.map((reportId) => (
                      <option key={reportId} value={reportId}>
                        {reportId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 space-y-3">
                  <textarea
                    value={curatorNote}
                    onChange={(e) => setCuratorNote(e.target.value)}
                    placeholder="Curator notes for selected rows or the next single-row action..."
                    className="min-h-[90px] w-full rounded-lg border px-3 py-2 text-sm"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {allVisibleSelected ? 'Unselect visible rows' : 'Select visible rows'}
                    </button>

                    <button
                      type="button"
                      disabled={bulkReviewRunning}
                      onClick={() => void runBulkReview('approved')}
                      className="rounded-lg border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60"
                    >
                      Approve selected
                    </button>
                    <button
                      type="button"
                      disabled={bulkReviewRunning}
                      onClick={() => void runBulkReview('rejected')}
                      className="rounded-lg border border-red-600 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Reject selected
                    </button>
                    <button
                      type="button"
                      disabled={bulkReviewRunning}
                      onClick={() => void runBulkReview('needs_revision')}
                      className="rounded-lg border border-amber-600 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                    >
                      Mark needs revision
                    </button>

                    <span className="ml-auto rounded-full border bg-white px-3 py-1 text-xs text-gray-600">
                      Selected rows: {selectedRowIds.length}
                    </span>
                  </div>
                </div>

                {filteredRows.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No parsed rows match the current filters. Run validation first or adjust the filters.
                  </p>
                ) : (
                  <div className="max-h-[32rem] space-y-3 overflow-auto">
                    {filteredRows.map((row) => (
                      <div key={row.parsed_row_id} className="rounded-lg border bg-white p-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(row.parsed_row_id)}
                            onChange={() => toggleRowSelection(row.parsed_row_id)}
                            className="mt-1"
                          />

                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                row {row.row_number ?? 'unknown'}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-1 text-xs ${validBadgeClass(row.is_valid)}`}
                              >
                                {row.is_valid ? 'valid' : 'invalid'}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-1 text-xs ${reviewBadgeClass(row.review_status)}`}
                              >
                                {row.review_status || 'unreviewed'}
                              </span>
                              {row.report_id ? (
                                <span className="rounded-full border bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                  report {row.report_id}
                                </span>
                              ) : null}
                            </div>

                            <pre className="overflow-auto whitespace-pre-wrap rounded border bg-gray-50 p-2 text-xs">
                              {JSON.stringify(row.normalized_row || row.raw_row || {}, null, 2)}
                            </pre>

                            {row.validation_errors && row.validation_errors.length > 0 ? (
                              <div className="text-sm text-red-700">
                                {row.validation_errors.map((err, idx) => (
                                  <div key={idx}>• {err}</div>
                                ))}
                              </div>
                            ) : null}

                            {row.curator_notes ? (
                              <div className="rounded border bg-yellow-50 p-2 text-sm text-gray-700">
                                <strong>Curator notes:</strong> {row.curator_notes}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                disabled={singleRowUpdatingId === row.parsed_row_id}
                                onClick={() => void updateSingleRow(row.parsed_row_id, 'approved')}
                                className="rounded-lg border border-green-600 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-60"
                              >
                                Approve row
                              </button>
                              <button
                                type="button"
                                disabled={singleRowUpdatingId === row.parsed_row_id}
                                onClick={() => void updateSingleRow(row.parsed_row_id, 'rejected')}
                                className="rounded-lg border border-red-600 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                              >
                                Reject row
                              </button>
                              <button
                                type="button"
                                disabled={singleRowUpdatingId === row.parsed_row_id}
                                onClick={() => void updateSingleRow(row.parsed_row_id, 'needs_revision')}
                                className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                              >
                                Needs revision
                              </button>
                            </div>

                            {row.reviewed_at ? (
                              <p className="text-xs text-gray-400">
                                Reviewed at: {formatDate(row.reviewed_at)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}