import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type ContributionType =
  | 'data_submission'
  | 'correction'
  | 'publication'
  | 'missing_data'
  | 'partnership'
  | 'general_contact';

export default function Collaborate() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    institution: '',
    contribution_type: 'data_submission' as ContributionType,
    message: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [createdSubmissionId, setCreatedSubmissionId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [uploadErrorMessage, setUploadErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.message.trim()) {
      setErrorMessage('Please provide a message describing your contribution.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    setUploadSuccessMessage('');
    setUploadErrorMessage('');

    try {
      const response = await api.collaboration.submit({
        full_name: form.name || null,
        email: form.email || null,
        institution: form.institution || null,
        contribution_type: form.contribution_type,
        message: form.message,
      });

      const submissionId = response?.data?.submission_id || null;
      setCreatedSubmissionId(submissionId);

      setSuccessMessage(
        submissionId
          ? 'Pending submission created successfully. You can now upload supporting files linked to this review record.'
          : 'Submission created successfully.'
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while submitting your contribution.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!createdSubmissionId) {
      setUploadErrorMessage('Please submit the form first to create a pending submission.');
      return;
    }

    if (!selectedFile) {
      setUploadErrorMessage('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadSuccessMessage('');
    setUploadErrorMessage('');

    try {
      await api.collaboration.uploadFile(selectedFile, createdSubmissionId);
      setUploadSuccessMessage(
        `File uploaded successfully and linked to submission ${createdSubmissionId}.`
      );
      setSelectedFile(null);
    } catch (error) {
      setUploadErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while uploading the file.'
      );
    } finally {
      setUploading(false);
    }
  };

  const templateCards = [
    {
      title: 'Publication Template',
      description:
        'Use this template to submit publication metadata anchored to DOI or PubMed ID.',
      href: '/templates/publication_submission_template.csv',
      button: 'Download publication template',
    },
    {
      title: 'Plant Evidence Template',
      description:
        'Use this template for plant-linked ethnobotanical or medicinal evidence extracted from articles.',
      href: '/templates/plant_evidence_submission_template.csv',
      button: 'Download plant evidence template',
    },
    {
      title: 'Compound Template',
      description:
        'Use this template for article-reported compounds associated with plants.',
      href: '/templates/compound_submission_template.csv',
      button: 'Download compound template',
    },
    {
      title: 'Missing Entities Template',
      description:
        'Use this template to report plants, compounds, or plant–compound links missing from the platform.',
      href: '/templates/missing_entities_template.csv',
      button: 'Download missing data template',
    },
  ];

  const docCards = [
    {
      title: 'Contributor Data Guide',
      description:
        'Explains what data to submit, minimum required fields, and how the platform processes contributions.',
      href: '/docs/contributor_data_guide.md',
      button: 'Open contributor guide',
    },
    {
      title: 'Missing Data Reporting Guide',
      description:
        'Explains how to report missing plants, compounds, and plant–compound relations professionally.',
      href: '/docs/missing_data_reporting_guide.md',
      button: 'Open missing data guide',
    },
    {
      title: 'Review and Curation Policy',
      description:
        'Explains pending, under review, approved, rejected, and needs revision statuses.',
      href: '/docs/review_and_curation_policy.md',
      button: 'Open review policy',
    },
    {
      title: 'Data Release and Citation',
      description:
        'Explains how the portal and future data releases should be cited and reused.',
      href: '/docs/data_release_and_citation.md',
      button: 'Open citation guide',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-green-50 to-teal-50 p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-gray-800">
              Collaborate with the Platform
            </h1>
            <p className="mt-3 leading-7 text-gray-600">
              This portal welcomes contributions from researchers, botanists,
              taxonomists, phytochemists, agronomists, pharmacologists, and
              institutional partners. Contributors may submit structured data,
              suggest publications, report corrections, or identify missing plants,
              compounds, and relations.
            </p>
            <p className="mt-3 leading-7 text-gray-500">
              Uploaded files and submitted records are treated as pending review materials
              and are not automatically integrated into the public scientific database.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              to="/collaborate/gaps"
              className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              View Priority Data Gaps
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Quick Contact</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use the form below for corrections, partnership inquiries, small
            evidence additions, or general scientific questions.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Structured Submission</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            For article-derived datasets, use the official CSV templates to
            submit publication metadata, plant evidence, compound tables, or
            missing data reports.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Review-First Workflow</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Every contribution first becomes a pending submission. Files are
            stored privately and linked to a submission record before any review
            or later ingestion.
          </p>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Download Official Templates</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Use these files for structured contributions. Contributors are not
            expected to know the internal database schema.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {templateCards.map((item) => (
            <div key={item.title} className="rounded-xl border bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
              <a
                href={item.href}
                download
                className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
              >
                {item.button}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Guides and Policies</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            These documents explain how to prepare contributions professionally,
            how missing data should be reported, how review works, and how data
            should be cited and reused.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {docCards.map((item) => (
            <div key={item.title} className="rounded-xl border bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-lg border border-teal-600 px-4 py-2 text-teal-700 hover:bg-teal-50"
              >
                {item.button}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Step 1: Create Pending Submission</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Start here. Your message creates a pending review record. After that,
            you can upload supporting files linked to the generated submission ID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          />

          <input
            name="institution"
            placeholder="Institution"
            value={form.institution}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          />

          <select
            name="contribution_type"
            value={form.contribution_type}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
          >
            <option value="data_submission">Data Submission</option>
            <option value="correction">Correction</option>
            <option value="publication">Publication Suggestion</option>
            <option value="missing_data">Missing Data Report</option>
            <option value="partnership">Partnership</option>
            <option value="general_contact">General Contact</option>
          </select>

          <textarea
            name="message"
            placeholder="Describe your contribution, correction, publication, or missing data..."
            value={form.message}
            onChange={handleChange}
            className="w-full rounded-lg border p-3"
            rows={6}
          />

          {successMessage ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {createdSubmissionId ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Pending submission ID: <span className="font-medium">{createdSubmissionId}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-5 py-3 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Creating submission...' : 'Create pending submission'}
          </button>
        </form>
      </section>

      <section className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold">Step 2: Upload Supporting Files</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Upload CSV, XLSX, XLS, or PDF files only after creating a pending submission.
            Files are stored privately and linked to the submission for later review.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-gray-50 p-5">
          <input
            type="file"
            accept=".csv,.xls,.xlsx,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setSelectedFile(file);
              setUploadSuccessMessage('');
              setUploadErrorMessage('');
            }}
            className="block w-full text-sm text-gray-700"
          />

          {selectedFile ? (
            <div className="text-sm text-gray-700">
              Selected file: <span className="font-medium">{selectedFile.name}</span>
            </div>
          ) : null}

          {uploadSuccessMessage ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {uploadSuccessMessage}
            </div>
          ) : null}

          {uploadErrorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {uploadErrorMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleFileUpload}
            disabled={uploading}
            className="rounded-lg bg-teal-600 px-5 py-3 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload file to pending submission'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-gray-50 p-6">
        <h2 className="mb-3 text-lg font-semibold">Professional Submission Note</h2>
        <p className="text-sm leading-7 text-gray-600">
          Contributors are encouraged to submit source-linked scientific data
          rather than fully enriched database-ready records. The portal will
          review, normalize, and enrich accepted submissions internally after
          scientific verification.
        </p>
      </section>
    </div>
  );
}