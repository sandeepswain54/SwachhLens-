import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { TeamsProvider } from '@/contexts/TeamsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MAIN_NAV, SYSTEM_NAV } from '@/lib/nav';
import Complaints from '@/pages/Complaints';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Placeholder from '@/pages/Placeholder';
import TeamsAssignments from '@/pages/TeamsAssignments';

const OTHER_NAV_ITEMS = [...MAIN_NAV, ...SYSTEM_NAV].filter(
  (item) => item.path !== '/' && item.path !== '/teams' && item.path !== '/complaints'
);

function ProtectedArea() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400 dark:bg-[#0b100d]">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <ReportsProvider>
      <TeamsProvider>
        <AppLayout />
      </TeamsProvider>
    </ReportsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedArea />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/teams" element={<TeamsAssignments />} />
              {OTHER_NAV_ITEMS.map((item) => (
                <Route
                  key={item.path}
                  path={item.path}
                  element={<Placeholder title={item.label} />}
                />
              ))}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
