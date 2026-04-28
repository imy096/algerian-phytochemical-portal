import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';

type DashboardSubmission = {
  submission_id: string;
  submission_type?: string;
  status?: string;
  users?: {
    full_name?: string;
  };
};

function StatusBadge({ status }: { status?: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-200' },
    under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    needs_revision: { label: 'Needs Revision', className: 'bg-stone-100 text-stone-800 border-stone-200' },
  };

  const badge = badges[status || 'pending'] || badges.pending;

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export default function AdminPanel() {
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: api.admin.dashboard,
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api.admin.submissions.list(),
  });

  const approvedCount =
    submissions?.data?.filter((s: { status?: string }) => s.status === 'approved').length || 0;

  const rejectedCount =
    submissions?.data?.filter((s: { status?: string }) => s.status === 'rejected').length || 0;

  const recentSubmissions: DashboardSubmission[] = dashboard?.recent_submissions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="mt-1 text-gray-600">
              Manage submissions, validation, and curation workflow
            </p>
          </div>
        </div>

        <Link
          to="/admin-collaboration-review"
          className="inline-flex items-center gap-2 rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          Open Review Center
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-accent-600" />
            <div>
              <p className="text-sm text-gray-500">Pending Submissions</p>
              <p className="text-3xl font-bold text-gray-900">
                {dashboard?.pending_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-3xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <XCircle className="h-6 w-6 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-3xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
          <Link
            to="/admin-collaboration-review"
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            Review all →
          </Link>
        </div>

        {recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div
                key={submission.submission_id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {submission.submission_type || 'Submission'}
                    </p>
                    <p className="text-sm text-gray-500">
                      by {submission.users?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={submission.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-gray-500">No recent submissions</p>
        )}
      </div>
    </div>
  );
}