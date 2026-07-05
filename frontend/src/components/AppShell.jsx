import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  PlusCircle,
  Trophy as Award,
  Coins,
  User,
  Sparkle as Sparkles,
  Lightning as Zap,
  Sun,
  Moon,
  ShieldCheck
} from '@phosphor-icons/react';
import ProfileDrawer from './profile/ProfileDrawer';

export default function AppShell({ children }) {
  const {
    currentUser,
    wallet,
    articles,
    activeTab,
    setActiveTab,
    claimTreasuryGrant,
    setActiveArticle,
    theme,
    toggleTheme,
    identityState,
    sponsorshipLedger
  } = useApp();

  const user = currentUser || {};
  const balance = Number(wallet?.balance?.availableBalance || 0);
  const titleRank = user.creatorProfile?.titleRank || 'Civis';

  const tabs = [
    { id: 'feed', label: 'Feed', icon: BookOpen },
    { id: 'create', label: 'Publish', icon: PlusCircle },
    { id: 'laurels', label: 'Laurels', icon: Award },
    { id: 'earnings', label: 'Earnings', icon: Coins },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveArticle(null);
  };

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || 'Feed';
  const publishedCount = articles.filter((a) => a.creatorId === user.id).length;

  return (
    <div className="min-h-screen bg-obsidian font-sans antialiased text-ivory selection:bg-gold/25 selection:text-ivory relative overflow-hidden">
      {/* Floating Ambient Blur Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-gold/8 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-bronze/8 blur-[100px] pointer-events-none z-0"></div>

      <div className="min-h-screen bg-[linear-gradient(135deg,var(--background)_0%,var(--surface-muted)_48%,var(--background)_100%)] relative z-10">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-stone-gray/10 bg-charcoal/80 px-5 py-6 shadow-2xl backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-xl border border-gold/25 bg-gold/15 p-1.5 w-10 h-10 flex items-center justify-center shadow-[0_12px_30px_rgba(212,175,55,0.14)] shrink-0">
                <img src="/favicon.svg" alt="logo" className="h-7 w-7 object-contain" />
              </div>
              <div>
                <h1 className="font-display m-0 text-lg font-semibold tracking-[0.16em] text-ivory">
                  SCRIPTORIUM
                </h1>
                <p className="m-0 mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-gray">
                  Identity-first creator economy
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold tracking-wide uppercase transition-all duration-300 relative border cursor-pointer ${
                      isActive
                        ? 'bg-gold/8 border-gold/25 text-gold shadow-sm'
                        : 'border-transparent text-stone-gray hover:bg-obsidian/45 hover:text-ivory'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gold rounded-r shadow-[0_0_8px_rgba(212,175,55,0.8)]"></span>
                    )}
                    <Icon className={`h-5 w-5 transition-transform ${isActive ? 'stroke-[2.2px] scale-110 text-gold' : 'stroke-[1.8px] text-stone-gray group-hover:text-gold'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3 rounded-2xl border border-stone-gray/10 bg-obsidian/45 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-gray">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Identity layer active
              </div>
              <div className="space-y-2 rounded-xl border border-stone-gray/10 bg-obsidian/45 p-3 text-[10px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-gray">Session</span>
                  <span className="font-bold text-emerald-400">{identityState.sessionStatus}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-gray">Wallet</span>
                  <span className="font-bold text-sand">{identityState.walletMode}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-stone-gray">Sponsored</span>
                  <span className="font-bold text-gold">{sponsorshipLedger.length} events</span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="m-0 text-[10px] text-stone-gray">Spendable USDC</p>
                  <p className="font-display m-0 text-2xl font-semibold text-ivory">${balance.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-stone-gray/10 pt-3 text-xs">
                <div>
                  <span className="block text-stone-gray">Rank</span>
                  <span className="font-semibold text-sand">{titleRank}</span>
                </div>
                <div>
                  <span className="block text-stone-gray">Articles</span>
                  <span className="font-semibold text-sand">{publishedCount}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
            <header className="sticky top-0 z-40 border-b border-stone-gray/10 bg-charcoal/86 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:px-6 lg:px-8 lg:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 lg:hidden">
                    <div className="shrink-0 rounded-lg border border-gold/20 bg-gold/15 p-1 w-8 h-8 flex items-center justify-center">
                      <img src="/favicon.svg" alt="logo" className="h-5.5 w-5.5 object-contain" />
                    </div>
                    <span className="truncate text-sm font-semibold tracking-[0.12em] text-ivory">SCRIPTORIUM</span>
                  </div>
                  <p className="m-0 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-gold lg:block">
                    {activeTabLabel}
                  </p>
                  <h2 className="font-display m-0 mt-1 hidden text-2xl font-semibold tracking-tight text-ivory lg:block">
                    Where AI and creators publish together.
                  </h2>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-gray/15 bg-obsidian/65 text-stone-gray transition hover:border-gold/30 hover:text-gold active:scale-95 sm:h-10 sm:w-10"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <div className="flex items-center gap-2 rounded-xl border border-stone-gray/15 bg-obsidian/65 px-3 py-1.5 sm:py-2">
                    <div className="text-right">
                      <span className="block text-[9px] font-semibold uppercase tracking-wider text-stone-gray">
                        USDC Balance
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 hidden items-center gap-3 text-xs text-stone-gray lg:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-gray/10 bg-obsidian/45 px-3 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  {identityState.walletStatus} wallet
                </span>
                <span className="rounded-full border border-stone-gray/10 bg-obsidian/45 px-3 py-1.5">
                  Network fee covered for eligible actions
                </span>
              </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>

            <ProfileDrawer />

            <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-gray/10 bg-charcoal/94 px-2 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:hidden">
              <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors duration-200 ${
                        isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-stone-gray hover:bg-obsidian/45 hover:text-sand'
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.3px] text-gold' : 'stroke-[1.9px] text-stone-gray'}`} />
                      <span className="max-w-full truncate leading-none">{tab.label}</span>
                      {isActive && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
