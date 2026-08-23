import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FeedbackProvider } from '@/contexts/FeedbackContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { ProfilesProvider } from '@/contexts/ProfilesContext';
import { ReportsProvider } from '@/contexts/ReportsContext';
import { TeamsProvider } from '@/contexts/TeamsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { VehiclesProvider } from '@/contexts/VehiclesContext';
import { MAIN_NAV, SYSTEM_NAV } from '@/lib/nav';
import AIAnalytics from '@/pages/AIAnalytics';
import Complaints from '@/pages/Complaints';
import Dashboard from '@/pages/Dashboard';
import Feedback from '@/pages/Feedback';
import Login from '@/pages/Login';
import Notifications from '@/pages/Notifications';
import Placeholder from '@/pages/Placeholder';
import ReportsInsights from '@/pages/ReportsInsights';
import TeamsAssignments from '@/pages/TeamsAssignments';
import Users from '@/pages/Users';
import Vehicles from '@/pages/Vehicles';
import WasteHotspots from '@/pages/WasteHotspots';

const OTHER_NAV_ITEMS = [...MAIN_NAV, ...SYSTEM_NAV].filter(
  (item) =>
    item.path !== '/' &&
    item.path !== '/teams' &&
    item.path !== '/complaints' &&
    item.path !== '/vehicles' &&
    item.path !== '/waste-hotspots' &&
    item.path !== '/ai-analytics' &&
    item.path !== '/reports-insights' &&
    item.path !== '/users' &&
    item.path !== '/feedback' &&
    item.path !== '/notifications'
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
        <VehiclesProvider>
          <NotificationsProvider>
            <AppLayout />
          </NotificationsProvider>
        </VehiclesProvider>
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
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/waste-hotspots" element={<WasteHotspots />} />
              <Route path="/ai-analytics" element={<AIAnalytics />} />
              <Route path="/reports-insights" element={<ReportsInsights />} />
              <Route
                path="/users"
                element={
                  <ProfilesProvider>
                    <Users />
                  </ProfilesProvider>
                }
              />
              <Route
                path="/feedback"
                element={
                  <FeedbackProvider>
                    <Feedback />
                  </FeedbackProvider>
                }
              />
              <Route path="/notifications" element={<Notifications />} />
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
