import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AppShell from './components/AppShell';
import Feed from './pages/Feed';
import CreateArticle from './pages/CreateArticle';
import Laurels from './pages/Laurels';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';

function MainApp() {
  const { activeTab, isOnboardingComplete } = useApp();

  if (!isOnboardingComplete) {
    return <Onboarding />;
  }

  return (
    <AppShell>
      {activeTab === 'feed' && <Feed />}
      {activeTab === 'create' && <CreateArticle />}
      {activeTab === 'laurels' && <Laurels />}
      {activeTab === 'earnings' && <Earnings />}
      {activeTab === 'profile' && <Profile />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
