import React, { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const PlantsExplorer = lazy(() => import('./pages/PlantsExplorer'));
const PlantDetail = lazy(() => import('./pages/PlantDetail'));
const TargetDetail = lazy(() => import('./pages/TargetDetail'));
const CompoundsExplorer = lazy(() => import('./pages/CompoundsExplorer'));
const CompoundDetail = lazy(() => import('./pages/CompoundDetail'));
const TargetsExplorer = lazy(() => import('./pages/TargetsExplorer'));
const DiseasesExplorer = lazy(() => import('./pages/DiseasesExplorer'));
const DiseaseDetail = lazy(() => import('./pages/DiseaseDetail'));
const PathwaysExplorer = lazy(() => import('./pages/PathwaysExplorer'));
const CoverageDashboard = lazy(() => import('./pages/CoverageDashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const GraphExplorer = lazy(() => import('./pages/GraphExplorer'));
const SignaturesExplorer = lazy(() => import('./pages/SignaturesExplorer'));
const SignatureDetail = lazy(() => import('./pages/SignatureDetail'));
const Publications = lazy(() => import('./pages/Publications'));
const DataAPI = lazy(() => import('./pages/DataAPI'));
const TherapeuticsExplorer = lazy(() => import('./pages/TherapeuticsExplorer'));
const TherapeuticConceptDetail = lazy(() => import('./pages/TherapeuticConceptDetail'));
const Collaborate = lazy(() => import('./pages/Collaborate'));
const AdminCollaborationReview = lazy(() => import('./pages/AdminCollaborationReview'));
const ResearchLab = lazy(() => import('./pages/ResearchLab'));
const DataAccess = lazy(() => import('./pages/DataAccess'));
const ChatAssistant = lazy(() => import('./pages/ChatAssistant'));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0,
    },
  },
});

function PageLoading() {
  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-primary-900">Loading page...</h2>
      <p className="mt-3 text-primary-700">
        Please wait while the module is loading.
      </p>
    </div>
  );
}

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown route error',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('Route render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-red-800">This module failed to load</h2>
          <p className="mt-3 text-red-700">
            The rest of the portal is still available.
          </p>
          <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-sm text-red-700">
            {this.state.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function SafePage({ children }: { children: ReactNode }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route
              index
              element={
                <SafePage>
                  <Home />
                </SafePage>
              }
            />

            <Route
              path="about"
              element={
                <SafePage>
                  <About />
                </SafePage>
              }
            />

            <Route
              path="plants"
              element={
                <SafePage>
                  <PlantsExplorer />
                </SafePage>
              }
            />
            <Route
              path="plants/:id"
              element={
                <SafePage>
                  <PlantDetail />
                </SafePage>
              }
            />

            <Route
              path="compounds"
              element={
                <SafePage>
                  <CompoundsExplorer />
                </SafePage>
              }
            />
            <Route
              path="compounds/:id"
              element={
                <SafePage>
                  <CompoundDetail />
                </SafePage>
              }
            />

            <Route
              path="targets"
              element={
                <SafePage>
                  <TargetsExplorer />
                </SafePage>
              }
            />
			
			
			<Route
              path="targets/:targetKey"
              element={
                <SafePage>
                  <TargetDetail />
                </SafePage>
              }
            />

            <Route
              path="diseases"
              element={
                <SafePage>
                  <DiseasesExplorer />
                </SafePage>
              }
            />
            <Route
              path="diseases/:id"
              element={
                <SafePage>
                  <DiseaseDetail />
                </SafePage>
              }
            />

            <Route
              path="pathways"
              element={
                <SafePage>
                  <PathwaysExplorer />
                </SafePage>
              }
            />

            <Route
              path="graph"
              element={
                <SafePage>
                  <GraphExplorer />
                </SafePage>
              }
            />

            <Route
              path="signatures"
              element={
                <SafePage>
                  <SignaturesExplorer />
                </SafePage>
              }
            />
            <Route
              path="signatures/:signatureId"
              element={
                <SafePage>
                  <SignatureDetail />
                </SafePage>
              }
            />

            <Route
              path="publications"
              element={
                <SafePage>
                  <Publications />
                </SafePage>
              }
            />

            <Route
              path="data-api"
              element={
                <SafePage>
                  <DataAPI />
                </SafePage>
              }
            />

            <Route
              path="therapeutics"
              element={
                <SafePage>
                  <TherapeuticsExplorer />
                </SafePage>
              }
            />
            <Route
              path="therapeutics/:conceptName"
              element={
                <SafePage>
                  <TherapeuticConceptDetail />
                </SafePage>
              }
            />

            <Route
              path="lab"
              element={
                <SafePage>
                  <ResearchLab />
                </SafePage>
              }
            />


            <Route
              path="/chat"
              element={
                <SafePage>
                  <ChatAssistant />
                 </SafePage>
              }
            />
            <Route
              path="data-access"
              element={
                <SafePage>
                  <DataAccess />
                </SafePage>
              }
            />


            <Route
              path="collaborate"
              element={
                <SafePage>
                  <Collaborate />
                </SafePage>
              }
            />
            <Route
              path="collaborate/gaps"
              element={
                <SafePage>
                  <CoverageDashboard />
                </SafePage>
              }
            />

            <Route
              path="admin"
              element={
                <SafePage>
                  <AdminPanel />
                </SafePage>
              }
            />
            <Route
              path="admin-collaboration-review"
              element={
                <SafePage>
                  <AdminCollaborationReview />
                </SafePage>
              }
            />
            <Route
              path="admin-collaboration"
              element={<Navigate to="/admin-collaboration-review" replace />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}