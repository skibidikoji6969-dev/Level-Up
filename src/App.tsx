import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { ensureAcademicProfile } from '@/lib/actions';
import Layout from '@/components/Layout';
import Onboarding from '@/pages/Onboarding';
import AcademicDashboard from '@/pages/AcademicDashboard';
import Dashboard from '@/pages/Dashboard';
import CharacterStats from '@/pages/CharacterStats';
import StudyTracker from '@/pages/StudyTracker';
import Heatmap from '@/pages/Heatmap';
import Planner from '@/pages/Planner';
import Journal from '@/pages/Journal';
import Achievements from '@/pages/Achievements';
import Analytics from '@/pages/Analytics';
import Insights from '@/pages/Insights';
import Goals from '@/pages/Goals';
import DataManagement from '@/pages/DataManagement';
import Settings from '@/pages/Settings';
import Timeline from '@/pages/Timeline';
import Reviews from '@/pages/Reviews';
import Statistics from '@/pages/Statistics';
import ToastContainer from '@/components/ToastContainer';
import CommandPalette from '@/components/CommandPalette';

function App() {
  const profile = useLiveQuery(() => db.academicProfile.get('academic'), []);

  useEffect(() => {
    ensureAcademicProfile();
  }, []);

  // profile === undefined -> still loading from IndexedDB, render nothing briefly
  // to avoid a flash of the onboarding screen for already-onboarded users.
  if (profile === undefined) return null;

  if (!profile.onboarded) {
    return <Onboarding onDone={() => {}} />;
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/academic" element={<AcademicDashboard />} />
          <Route path="/character" element={<CharacterStats />} />
          <Route path="/study" element={<StudyTracker />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/data" element={<DataManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <CommandPalette />
      <ToastContainer />
    </>
  );
}

export default App;
