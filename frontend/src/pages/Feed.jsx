import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  ChatCircle as MessageSquare,
  ShareNetwork as Share2,
  LockOpen as Unlock,
  ArrowRight,
  ShieldCheck,
  TrendUp as TrendingUp,
  ArrowBendDownRight as CornerDownRight,
  UserPlus,
  X,
  Lightning as Zap,
  ArrowsClockwise as RefreshCw,
  Star,
  Eye,
  ArrowLeft
} from '@phosphor-icons/react';
import FollowButton from '../components/follow/FollowButton';

export default function Feed() {
  const {
    currentUser,
    wallet,
    articles,
    unlockArticle,
    tipArticle,
    isUnlocked,
    activeArticle,
    setActiveArticle,
    toggleFollow,
    follows,
    suggestedCreators,
    incrementViews,
    setSelectedProfileId,
    setActiveTab,
    showToast
  } = useApp();

  const balance = Number(wallet?.balance?.availableBalance || 0);

  // Feed Filter Tabs
  const [feedFilter, setFeedFilter] = useState('for_you'); // for_you | following | trending

  // Dialog State
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedArticleToUnlock, setSelectedArticleToUnlock] = useState(null);

  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedArticleToTip, setSelectedArticleToTip] = useState(null);
  const [tipAmount, setTipAmount] = useState('0.01');
  const [tipDestination, setTipDestination] = useState('entire_team');

  // Low Balance Drawer State
  const [isLowBalanceOpen, setIsLowBalanceOpen] = useState(false);
  const [lowBalanceRequired, setLowBalanceRequired] = useState(0);

  const openUnlockFlow = (e, article) => {
    e.stopPropagation();
    setSelectedArticleToUnlock(article);
    setShowUnlockModal(true);
  };

  const openTipFlow = (e, article) => {
    e.stopPropagation();
    setSelectedArticleToTip(article);
    setShowTipModal(true);
  };

  const handleUnlockConfirm = async () => {
    if (selectedArticleToUnlock) {
      if (balance < selectedArticleToUnlock.unlockPrice) {
        setLowBalanceRequired(selectedArticleToUnlock.unlockPrice);
        setIsLowBalanceOpen(true);
        setShowUnlockModal(false);
        return;
      }
      const ok = await unlockArticle(selectedArticleToUnlock.id);
      setShowUnlockModal(false);
      if (ok) setActiveArticle(selectedArticleToUnlock);
    }
  };

  const handleTipConfirm = async () => {
    if (selectedArticleToTip) {
      const needed = parseFloat(tipAmount);
      if (isNaN(needed) || needed <= 0) return;
      if (balance < needed) {
        setLowBalanceRequired(needed);
        setIsLowBalanceOpen(true);
        setShowTipModal(false);
        return;
      }
      await tipArticle(selectedArticleToTip.id, tipAmount, tipDestination);
      setShowTipModal(false);
    }
  };

  // Filter logic
  const getFilteredArticles = () => {
    if (feedFilter === 'following') {
      return articles.filter(a =>
        follows.some(f => f.followingId === a.creatorId && f.followingType === 'creator')
      );
    }
    if (feedFilter === 'trending') {
      // Sort by views or supportCount
      return [...articles].sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    return articles;
  };

  // Render Single Feed Card
  const renderFeedCard = (article) => {
    const author = article.creator || {};
    const isOwner = article.creatorId === currentUser?.id;
    const unlocked = isUnlocked(article);

    return (
      <div
        key={article.id}
        onClick={() => {
          incrementViews(article.id);
          if (unlocked) {
            setActiveArticle(article);
          }
        }}
        className={`premium-panel group rounded-2xl p-5 transition-all duration-300 sm:p-6 ${unlocked ? 'cursor-pointer hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_24px_54px_var(--shadow-color)]' : 'opacity-95'
          }`}
      >
        {/* User Info Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div
            onClick={(e) => { e.stopPropagation(); setSelectedProfileId(author.id); }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 text-left"
            title="View Profile"
          >
            <img
              src={author.avatarUrl}
              alt={author.displayName}
              className="h-11 w-11 rounded-2xl border border-stone-gray/20 object-cover shadow-sm"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-sand">
                  {author.id === currentUser?.id ? 'You' : author.displayName}
                </span>
              </div>
              <span className="text-[10px] text-stone-gray">@{author.username}</span>
            </div>
          </div>

          <FollowButton
            entityId={author.id}
            entityType="creator"
            variant="compact"
          />
        </div>

        {/* Article Title & Body Preview */}
        <div className="mb-4 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-gold tracking-[0.18em] uppercase">
              {article.category}
            </span>
            {article.aiAssisted && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                <ShieldCheck className="w-2.5 h-2.5" />
                AI Assisted
              </span>
            )}
          </div>
          <h2 className="font-display text-balance mb-2 text-lg font-semibold leading-tight text-ivory transition-colors group-hover:text-gold sm:text-xl">
            {article.title}
          </h2>
          <p className="line-clamp-3 text-sm leading-relaxed text-stone-gray">
            {article.preview}
          </p>
        </div>

        {/* Lock / Unlock Banner UI Overlay */}
        {!unlocked && !isOwner && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-obsidian/80 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-gold/10 p-2">
                <Unlock className="w-4 h-4 text-gold" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-stone-gray block">Unlock Paid Article</span>
                <span className="text-xs font-bold text-ivory">${article.unlockPrice.toFixed(3)} USDC</span>
              </div>
            </div>
            <button
              onClick={(e) => openUnlockFlow(e, article)}
              className="flex items-center gap-1 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-obsidian shadow-md transition-all duration-300 hover:bg-gold/90 active:scale-95"
            >
              Unlock <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Owner Access Badge Card */}
        {isOwner && article.isPaid && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-gold/5 p-3 px-3.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gold/15 p-1.5 text-gold">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <div className="text-left">
                <span className="text-[9px] text-stone-gray block leading-none">Author Access</span>
                <span className="text-xs font-bold text-gold mt-1 block leading-none">Your Article</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveArticle(article);
              }}
              className="bg-obsidian border border-gold/20 hover:bg-gold hover:text-obsidian text-gold text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              View Article
            </button>
          </div>
        )}

        {/* Social stats footer */}
        <div className="flex items-center justify-between border-t border-stone-gray/10 pt-3 text-[11px] text-stone-gray">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => openTipFlow(e, article)}
              className="flex items-center gap-1 hover:text-gold transition-all duration-200 cursor-pointer"
            >
              <Heart className="w-4 h-4" />
              <span>{article.supportCount} Support</span>
            </button>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>Comments</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-obsidian px-2 py-1 text-[10px]">
              <Eye className="h-3 w-3" />
              {article.views || 0}
            </span>
            <Share2 className="h-3.5 w-3.5 cursor-pointer hover:text-white" />
          </div>
        </div>
      </div>
    );
  };

  // Render Full Article Details View
  const renderDetailView = () => {
    const author = activeArticle.creator || {};

    return (
      <div className="flex flex-col gap-5 pb-6">
        <button
          onClick={() => setActiveArticle(null)}
          className="flex items-center gap-1.5 self-start rounded-xl border border-stone-gray/10 bg-charcoal px-3 py-2 text-xs font-semibold text-stone-gray transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Feed
        </button>

        {/* Main Content Card */}
        <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15">
          <div className="flex items-center justify-between mb-4">
            <div
              onClick={() => setSelectedProfileId(author.id)}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 text-left"
              title="View Profile"
            >
              <img
                src={author.avatarUrl}
                alt={author.displayName}
                className="w-10 h-10 rounded-full border border-stone-gray/20 object-cover"
              />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-sand">
                    {activeArticle.creatorId === currentUser?.id ? 'You' : author.displayName}
                  </span>
                </div>
                <span className="text-[10px] text-stone-gray">@{author.username}</span>
              </div>
            </div>

            <FollowButton
              entityId={author.id}
              entityType="creator"
              variant="compact"
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gold tracking-widest uppercase">
              {activeArticle.category}
            </span>
            {activeArticle.aiAssisted && (
              <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-medium">
                AI Assisted
              </span>
            )}
          </div>

          <h1 className="font-display text-xl font-semibold text-ivory leading-tight mb-4 text-left">
            {activeArticle.title}
          </h1>

          <div className="text-xs text-stone-gray leading-relaxed space-y-4 whitespace-pre-line border-b border-stone-gray/10 pb-5 mb-5 text-left">
            {activeArticle.body}
          </div>

          {/* Creator Controls vs Reader actions */}
          {activeArticle.creatorId === currentUser?.id ? (
            <div className="border-t border-stone-gray/10 pt-4 mt-2 space-y-3">
              <span className="text-[9px] font-bold text-gold uppercase tracking-wider block text-left">
                Creator Management Console
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => showToast('Edit mode activated. Scriptorium keys validated.', 'success')}
                  className="bg-charcoal border border-stone-gray/15 hover:border-gold/30 hover:text-gold text-[10px] font-bold py-2.5 px-1 rounded-xl cursor-pointer text-center bg-transparent"
                >
                  Edit Article
                </button>
                <button
                  onClick={() => {
                    setActiveArticle(null);
                    setActiveTab('earnings');
                  }}
                  className="bg-charcoal border border-stone-gray/15 hover:border-gold/30 hover:text-gold text-[10px] font-bold py-2.5 px-1 rounded-xl cursor-pointer text-center bg-transparent"
                >
                  View Earnings
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://scriptorium.net/article/${activeArticle.slug}`);
                    showToast('Article sharing link copied!', 'success');
                  }}
                  className="bg-charcoal border border-stone-gray/15 hover:border-gold/30 hover:text-gold text-[10px] font-bold py-2.5 px-1 rounded-xl cursor-pointer text-center bg-transparent"
                >
                  Share Link
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs mb-4">
              <span className="text-stone-gray">Appreciated the collective agent efforts?</span>
              <button
                onClick={(e) => openTipFlow(e, activeArticle)}
                className="bg-gold hover:bg-gold/90 text-obsidian font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-103"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                Tip Team split
              </button>
            </div>
          )}
        </div>

        {/* Contributor Graph Splits */}
        <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-gold" />
              <h3 className="font-bold text-xs text-ivory tracking-wide uppercase">
                Contributor Payment Splits
              </h3>
            </div>
            <span className="text-[10px] text-stone-gray">USDC x402 Graph</span>
          </div>

          <div className="space-y-3">
            {activeArticle.contributors.map((c, i) => {
              const roleLabel = c.role ? c.role.charAt(0).toUpperCase() + c.role.slice(1) : 'Contributor';
              const name = c.role?.toLowerCase() === 'creator' ? author.displayName : roleLabel;
              return (
                <div key={i} className="flex items-center justify-between text-xs border-b border-stone-gray/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    {c.type === 'agent' ? (
                      <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.2 rounded font-bold tracking-tight">
                        AGENT
                      </span>
                    ) : c.role?.toLowerCase() === 'referrer' ? (
                      <span className="bg-purple-950/40 text-purple-300 border border-purple-500/20 text-[9px] px-1.5 py-0.2 rounded font-bold tracking-tight">
                        REF
                      </span>
                    ) : (
                      <span className="bg-bronze/10 text-bronze border border-bronze/20 text-[9px] px-1.5 py-0.2 rounded font-bold tracking-tight">
                        USER
                      </span>
                    )}
                    <span className="text-sand font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-gray text-[10px]">{c.split}% share</span>
                    <span className="font-bold text-ivory">${(activeArticle.unlockPrice * (c.split / 100)).toFixed(4)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comment block placeholders */}
        <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15 text-left">
          <h4 className="font-bold text-xs text-stone-gray uppercase tracking-wider mb-3">
            Guild Comments
          </h4>
          <div className="rounded-xl border border-dashed border-stone-gray/15 p-4 text-center">
            <p className="m-0 text-[11px] text-stone-gray">Comments are coming soon.</p>
          </div>
        </div>

      </div>
    );
  };

  const filteredArticles = getFilteredArticles();
  const totalUnlockable = articles.filter((article) => article.isPaid).length;
  const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
  const totalSupport = articles.reduce((sum, article) => sum + (article.supportCount || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {activeArticle ? renderDetailView() : (
        <>
          <section className="premium-panel rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                  Creator intelligence feed
                </p>
                <h1 className="font-display text-balance m-0 mt-2 text-2xl font-semibold leading-tight text-ivory sm:text-3xl">
                  Discover AI-assisted essays with transparent USDC splits.
                </h1>
                <p className="m-0 mt-3 text-sm leading-relaxed text-stone-gray">
                  Read classical creator posts, unlock paid research, and route support to the whole contributor graph.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[320px]">
                <div className="surface-inset rounded-2xl px-3 py-2.5">
                  <span className="block text-lg font-semibold text-ivory">{articles.length}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-gray">Articles</span>
                </div>
                <div className="surface-inset rounded-2xl px-3 py-2.5">
                  <span className="block text-lg font-semibold text-ivory">{totalUnlockable}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-gray">Paid</span>
                </div>
                <div className="surface-inset rounded-2xl px-3 py-2.5">
                  <span className="block text-lg font-semibold text-ivory">{totalSupport + totalViews}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-gray">Signals</span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-lg font-semibold text-ivory">Reading queue</h2>
              <p className="m-0 mt-1 text-xs text-stone-gray">
                {filteredArticles.length} articles shown
              </p>
            </div>

            <div className="grid grid-cols-3 rounded-2xl border border-stone-gray/10 bg-obsidian p-1 text-center text-xs font-bold sm:w-[360px]">
              <button
                onClick={() => setFeedFilter('for_you')}
                className={`rounded-xl py-2 transition-all ${feedFilter === 'for_you' ? 'bg-charcoal text-gold shadow-sm' : 'text-stone-gray hover:text-ivory'
                  }`}
              >
                For You
              </button>
              <button
                onClick={() => setFeedFilter('following')}
                className={`rounded-xl py-2 transition-all ${feedFilter === 'following' ? 'bg-charcoal text-gold shadow-sm' : 'text-stone-gray hover:text-ivory'
                  }`}
              >
                Following
              </button>
              <button
                onClick={() => setFeedFilter('trending')}
                className={`rounded-xl py-2 transition-all ${feedFilter === 'trending' ? 'bg-charcoal text-gold shadow-sm' : 'text-stone-gray hover:text-ivory'
                  }`}
              >
                Trending
              </button>
            </div>
          </div>

          {/* Cards Stack */}
          <div className="grid gap-4 xl:grid-cols-2">
            {feedFilter === 'following' && filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-stone-gray/15 rounded-2xl bg-charcoal/30">
                <span className="text-stone-gray text-xs block mb-4">
                  Follow creators to build your reading feed.
                </span>

                {/* Suggested Creators list */}
                <div className="w-full text-left space-y-3 mt-2">
                  {suggestedCreators.length > 0 && (
                    <span className="text-[10px] text-gold uppercase tracking-wider font-bold block mb-1">
                      Suggested Authors:
                    </span>
                  )}
                  {suggestedCreators.map((creator) => (
                    <div key={creator.id} className="flex items-center justify-between bg-charcoal p-3 rounded-xl border border-stone-gray/10">
                      <div className="flex items-center gap-2">
                        {creator.avatarUrl ? (
                          <img src={creator.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
                            {creator.displayName?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-semibold text-sand block">{creator.displayName}</span>
                          <span className="text-[9px] text-stone-gray block">@{creator.username}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFollow(creator.id, 'creator')}
                        className="border border-gold/45 text-gold text-[9px] font-bold px-3 py-1 rounded-lg hover:bg-gold/10 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              filteredArticles.map(article => renderFeedCard(article))
            )}
          </div>
        </>
      )}

      {/* 1. UNLOCK TRANSACTION CONFIRMATION DRAWER */}
      {showUnlockModal && selectedArticleToUnlock && (
        <div className="fixed inset-0 bg-obsidian/75 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-charcoal border-t border-stone-gray/20 w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-4 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-stone-gray/20 rounded-full mx-auto mb-1"></div>

            <div className="text-center">
              <h3 className="font-bold text-base text-gold uppercase tracking-wider mb-1">
                Authorize Unlock Payment
              </h3>
              <p className="text-xs text-stone-gray">
                Review the contributor split before opening this article.
              </p>
            </div>

            <div className="bg-obsidian border border-stone-gray/10 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-gray">Article Title</span>
                <span className="text-ivory font-semibold truncate max-w-[200px]">{selectedArticleToUnlock.title}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-gray">Unlock Fee</span>
                <span className="text-gold font-bold">${selectedArticleToUnlock.unlockPrice.toFixed(3)} USDC</span>
              </div>
              <div className="flex justify-between text-xs border-t border-stone-gray/10 pt-2">
                <span className="text-stone-gray">Wallet Balance</span>
                <span className="text-emerald-400 font-semibold">${balance.toFixed(3)} USDC</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/15 bg-emerald-950/20 px-3 py-2 text-[10px]">
                <span className="flex items-center gap-1.5 text-stone-gray">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Network fee covered
                </span>
                <span className="font-semibold text-emerald-300">Included</span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-stone-gray tracking-wider mb-2 block">
                Automatic splits to contributors:
              </span>
              <div className="space-y-1 bg-obsidian/50 p-3 rounded-xl border border-stone-gray/5">
                {selectedArticleToUnlock.contributors.map((c, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-stone-gray">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3 text-stone-gray/50" />
                      {c.role} ({c.split}%)
                    </span>
                    <span>${(selectedArticleToUnlock.unlockPrice * (c.split / 100)).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 bg-obsidian hover:bg-stone-gray/10 text-stone-gray text-[11px] font-semibold py-2 rounded-xl border border-stone-gray/15 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockConfirm}
                className="flex-1 bg-gold hover:bg-gold/90 text-obsidian text-[11px] font-semibold py-2 rounded-xl cursor-pointer transition-colors shadow-md"
              >
                Authorize Split Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUPPORT TIPPING DRAWER */}
      {showTipModal && selectedArticleToTip && (
        <div className="fixed inset-0 bg-obsidian/75 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-charcoal border-t border-stone-gray/20 w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-4 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-stone-gray/20 rounded-full mx-auto mb-1"></div>

            <div className="text-center">
              <h3 className="font-bold text-base text-gold uppercase tracking-wider mb-1">
                Tip Support
              </h3>
              <p className="text-xs text-stone-gray">
                Support the article team or creator with micro-payout splits.
              </p>
            </div>

            {/* Price Presets */}
            <div className="grid grid-cols-4 gap-2">
              {['0.01', '0.05', '0.10', '0.25'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTipAmount(preset)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${tipAmount === preset
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-stone-gray/15 bg-obsidian text-stone-gray'
                    }`}
                >
                  ${preset}
                </button>
              ))}
            </div>

            {/* Custom inputs */}
            <div className="flex items-center gap-2 bg-obsidian border border-stone-gray/15 rounded-xl px-3 py-2 text-xs">
              <span className="text-stone-gray">Custom (USDC):</span>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                step="0.01"
                className="bg-transparent border-0 outline-none flex-1 text-right text-ivory font-bold pr-1"
              />
            </div>

            {/* Destination Mode Info */}
            <div className="bg-obsidian border border-stone-gray/10 rounded-2xl p-4 flex flex-col gap-1 text-left">
              <span className="text-[10px] font-bold text-gold uppercase tracking-wider leading-none">
                Split Distribution
              </span>
              <span className="text-[10px] text-stone-gray leading-normal mt-1">
                Your support is automatically distributed across the entire team (author, editor agents, and platform fee splits).
              </span>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowTipModal(false)}
                className="flex-1 bg-obsidian hover:bg-stone-gray/10 text-stone-gray text-[11px] font-semibold py-2 rounded-xl border border-stone-gray/15 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTipConfirm}
                className="flex-1 bg-gold hover:bg-gold/90 text-obsidian text-[11px] font-semibold py-2 rounded-xl cursor-pointer transition-colors shadow-md"
              >
                Send Split Tip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. LOW BALANCE FAUCET INSUFFICIENT STATE MODAL DRAWER */}
      {isLowBalanceOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal border border-stone-gray/15 rounded-t-[32px] p-6 space-y-5 animate-slide-up shadow-2xl relative">

            {/* Header */}
            <div className="flex justify-between items-center pb-2 text-left">
              <div>
                <h3 className="font-bold text-md text-ivory m-0 leading-none">Insufficient Balance</h3>
                <span className="text-[10px] text-stone-gray mt-1 block">You need more USDC to execute this action</span>
              </div>
              <button
                onClick={() => setIsLowBalanceOpen(false)}
                className="bg-obsidian p-1.5 rounded-full border border-stone-gray/10 text-stone-gray hover:text-ivory cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price comparisons */}
            <div className="space-y-3.5 bg-obsidian/60 border border-stone-gray/10 rounded-2xl p-4 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-stone-gray">Required Funds:</span>
                <span className="font-bold text-white">${lowBalanceRequired.toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-gray">Your Wallet Balance:</span>
                <span className="font-bold text-rose-400">${balance.toFixed(4)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-gray">Network Fee:</span>
                <span className="font-bold text-emerald-400">Included when eligible</span>
              </div>
            </div>

            {/* Deposit notice */}
            <div className="space-y-3">
              <p className="text-[11px] text-stone-gray text-center leading-normal">
                Please transfer USDC to your Scriptorium wallet address to continue. You can view your wallet address in the <strong>Earnings</strong> or <strong>Profile</strong> tabs.
              </p>
              <button
                onClick={() => setIsLowBalanceOpen(false)}
                className="w-full py-2.5 bg-gold hover:bg-gold/90 text-obsidian font-bold rounded-xl text-xs cursor-pointer border-none"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
