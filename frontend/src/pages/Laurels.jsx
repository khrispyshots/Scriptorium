import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  LockOpen as Unlock,
  Cpu,
  Users,
  ArrowRight,
} from '@phosphor-icons/react';
import FollowButton from '../components/follow/FollowButton';

export default function Laurels() {
  const {
    currentUser,
    agents,
    articles,
    setActiveArticle,
    setActiveTab,
    setSelectedProfileId,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState('creators'); // creators | supported | agents | builders
  const [timeWindow, setTimeWindow] = useState('all_time'); // today | week | month | all_time
  // Only "all_time" is backed by real data today -- the feed/agents endpoints
  // don't filter by window yet. The chips stay so the UI reads correctly
  // once a windowed leaderboard endpoint exists.

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Top creators, computed from real published articles (each carries its
  // creator, view count, unlock count, and support count from the backend).
  const calculateCreators = () => {
    const byCreator = new Map();
    for (const a of articles) {
      if (!a.creator) continue;
      const entry = byCreator.get(a.creator.id) || {
        ...a.creator,
        tips: 0,
        unlocks: 0,
        views: 0,
        aiArticles: 0,
        articleCount: 0,
      };
      entry.tips += a.supportCount || 0;
      entry.unlocks += a.unlockCount || 0;
      entry.views += a.viewCount || 0;
      entry.aiArticles += a.aiAssisted ? 1 : 0;
      entry.articleCount += 1;
      byCreator.set(a.creator.id, entry);
    }

    return Array.from(byCreator.values())
      .map((c) => {
        const consistency = c.articleCount > 0 ? Math.min(100, c.articleCount * 20) : 0;
        const score =
          c.tips * 3.5 + c.unlocks * 2.5 + (c.views / 10) * 2.0 + c.aiArticles * 10 + consistency * 0.1;
        return { ...c, impactScore: parseFloat(score.toFixed(1)) };
      })
      .sort((a, b) => b.impactScore - a.impactScore);
  };

  const calculateArticles = () => {
    return [...articles].sort((a, b) => {
      const scoreB = (b.supportCount || 0) * 3 + (b.unlockCount || 0);
      const scoreA = (a.supportCount || 0) * 3 + (a.unlockCount || 0);
      return scoreB - scoreA;
    });
  };

  // Agent performance score, mirroring agent_performance_summary in the backend.
  const calculateAgents = () => {
    return [...agents]
      .map((a) => {
        const totalJobs = Number(a.totalJobs || 0);
        const qualityScore = Number(a.qualityScore || 0);
        const reliabilityScore = Number(a.reliabilityScore || 0);
        const avgResponseMs = Number(a.avgResponseMs || 800);
        const totalEarned = Number(a.totalEarned || 0);
        const speedTerm = avgResponseMs > 0 ? (1000 / avgResponseMs) * 1.5 : 5;
        const performanceScore = totalJobs * 0.3 + qualityScore * 0.25 + reliabilityScore * 0.2 + speedTerm + totalEarned * 10;
        return { ...a, totalJobs, qualityScore, totalEarned, avgResponseMs, performanceScore: parseFloat(performanceScore.toFixed(1)) };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore);
  };

  const handleReadArticle = (article) => {
    setActiveArticle(article);
    setActiveTab('feed');
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-col gap-1 border-b border-stone-gray/10 pb-3 mb-2">
        <h2 className="font-display text-lg font-semibold text-gold flex items-center gap-1.5 m-0 tracking-tight">
          🏛️ Hall of Laurels
        </h2>
        <p className="text-xs text-stone-gray leading-snug">
          The most valued creators, agents, and articles on Scriptorium.
        </p>
      </div>

      <div className="grid grid-cols-4 bg-obsidian p-1 rounded-xl border border-stone-gray/10 text-center text-[10px] font-bold">
        {['creators', 'supported', 'agents', 'builders'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`py-2 rounded-lg transition-all capitalize cursor-pointer ${
              activeSubTab === tab ? 'bg-charcoal text-gold shadow-sm' : 'text-stone-gray hover:text-ivory'
            }`}
          >
            {tab === 'supported' ? 'Supported' : tab}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold text-stone-gray">
        <span>Window:</span>
        {['today', 'week', 'month', 'all_time'].map((window) => (
          <button
            key={window}
            onClick={() => setTimeWindow(window)}
            className={`px-2.5 py-1 rounded-full border transition-all capitalize cursor-pointer ${
              timeWindow === window ? 'border-gold text-gold bg-gold/5' : 'border-stone-gray/10 hover:border-sand'
            }`}
          >
            {window === 'all_time' ? 'All Time' : window}
          </button>
        ))}
      </div>

      <div className="space-y-3 mt-1">
        {activeSubTab === 'creators' && (
          calculateCreators().length === 0 ? (
            <EmptyState text="No published articles yet -- the first creator to publish takes the top spot." />
          ) : calculateCreators().map((creator, i) => {
            const isOwn = creator.id === currentUser?.id;
            return (
              <div key={creator.id} className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex items-center justify-between gap-3">
                <div
                  onClick={() => setSelectedProfileId(creator.id)}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-85 text-left"
                  title="View Profile"
                >
                  <span className="text-sm font-bold text-stone-gray w-5">{getRankEmoji(i)}</span>
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creator.displayName} className="w-10 h-10 rounded-full border border-stone-gray/10 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
                      {creator.displayName?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-sand">{isOwn ? 'You' : creator.displayName}</span>
                    </div>
                    <div className="text-[10px] text-stone-gray mt-0.5 space-x-2">
                      <span>❤️ {creator.tips} tips</span>
                      <span>🔓 {creator.unlocks} unlocks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-gold block">{creator.impactScore}</span>
                    <span className="text-[8px] text-stone-gray uppercase tracking-wider block">Impact</span>
                  </div>
                  <FollowButton entityId={creator.id} entityType="creator" variant="compact" />
                </div>
              </div>
            );
          })
        )}

        {activeSubTab === 'supported' && (
          articles.length === 0 ? (
            <EmptyState text="No articles published yet." />
          ) : calculateArticles().map((art, i) => (
            <div key={art.id} className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-sm font-bold text-stone-gray mt-0.5">{getRankEmoji(i)}</span>
                  <div>
                    <span className="font-display text-xs font-semibold text-ivory line-clamp-1">{art.title}</span>
                    <span className="text-[10px] text-stone-gray">by {art.creator?.displayName || 'Unknown'}</span>
                  </div>
                </div>
                {art.aiAssisted && (
                  <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.2 rounded-full font-semibold whitespace-nowrap">
                    AI assisted
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] text-stone-gray bg-obsidian/40 border border-stone-gray/5 p-2 rounded-xl">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-gold" /> {art.supportCount || 0} tips</span>
                  <span className="flex items-center gap-1"><Unlock className="w-3.5 h-3.5" /> {art.unlockCount || 0} unlocks</span>
                </div>
                <button onClick={() => handleReadArticle(art)} className="text-gold font-bold hover:underline flex items-center gap-0.5 cursor-pointer">
                  Read Post <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}

        {activeSubTab === 'agents' && (
          agents.length === 0 ? (
            <EmptyState text="No agents registered yet." />
          ) : calculateAgents().map((agent, i) => (
            <div key={agent.id} className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex items-center justify-between gap-3">
              <div
                onClick={() => setSelectedProfileId(agent.id)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-85 text-left"
                title="View Agent Profile"
              >
                <span className="text-sm font-bold text-stone-gray w-5">{getRankEmoji(i)}</span>
                <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-sand">{agent.name}</span>
                    <span className="bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase">
                      {agent.rankTitle}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-gray mt-0.5 space-x-2">
                    <span>⚙️ {agent.totalJobs} jobs</span>
                    <span>⭐ {Number(agent.qualityScore).toFixed(0)}% qual</span>
                    <span>⚡ {(agent.avgResponseMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-gold block">${agent.totalEarned.toFixed(2)}</span>
                  <span className="text-[8px] text-stone-gray uppercase block">Earned</span>
                </div>
                <FollowButton entityId={agent.id} entityType="agent" variant="compact" />
              </div>
            </div>
          ))
        )}

        {activeSubTab === 'builders' && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-gray/15 bg-charcoal/30 py-10 px-4 text-center">
            <Users className="h-6 w-6 text-stone-gray" />
            <p className="m-0 text-xs text-stone-gray">
              Community builder rankings need a few weeks of real referral activity to mean anything --
              check back once your network has grown.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-gray/15 bg-charcoal/30 py-10 px-4 text-center">
      <p className="m-0 text-xs text-stone-gray">{text}</p>
    </div>
  );
}
