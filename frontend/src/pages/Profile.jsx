import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { userApi, referralApi } from '../lib/api';
import { shortenAddress } from '../lib/wallet';
import {
  Trophy as Award,
  Gear as Settings,
  Coins,
  Users,
  ArrowRight,
  BookOpen,
  Key,
  Fingerprint,
  Lock,
  X,
  Copy,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';

export default function Profile() {
  const {
    currentUser,
    wallet,
    follows,
    articles,
    badges,
    logout,
    setActiveTab,
    showToast,
    requestExportOtp,
    exportPrivateKey
  } = useApp();

  const user = currentUser || {};
  const profile = user.creatorProfile || {};
  const balance = Number(wallet?.balance?.availableBalance || 0);

  const publishedArticles = articles.filter(a => a.creatorId === user.id);
  const followingCount = follows.length;
  const [followersCount, setFollowersCount] = useState(0);
  const [referralStats, setReferralStats] = useState({ invited: 0, active: 0, rewards: 0 });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStep, setExportStep] = useState(1); // 1: input otp, 2: show key
  const [exportOtpVal, setExportOtpVal] = useState('');
  const [exportedKey, setExportedKey] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [exportDevCode, setExportDevCode] = useState('');
  const [exportPinVal, setExportPinVal] = useState('');
  const [isExportKeyVisible, setIsExportKeyVisible] = useState(false);

  const handleExportKeyClick = async () => {
    setExportBusy(true);
    const res = await requestExportOtp();
    setExportBusy(false);
    if (res) {
      if (res.devCode) {
        setExportDevCode(res.devCode);
      } else {
        setExportDevCode('');
      }
      setExportOtpVal('');
      setExportedKey('');
      setIsExportKeyVisible(false);
      setExportStep(1);
      setIsExportOpen(true);
    }
  };

  const handleVerifyExport = async () => {
    if (!exportOtpVal.trim()) {
      showToast('Enter the OTP code.', 'error');
      return;
    }
    setExportPinVal('');
    setExportStep(1.5);
  };

  const handleVerifyPinAndDecrypt = async () => {
    if (exportPinVal.length !== 6) {
      showToast('Enter your 6-digit PIN.', 'error');
      return;
    }
    setExportBusy(true);
    const key = await exportPrivateKey(exportOtpVal.trim(), exportPinVal.trim());
    setExportBusy(false);
    if (key) {
      setExportedKey(key);
      setIsExportKeyVisible(false);
      setExportStep(2);
    }
  };

  useEffect(() => {
    if (!isExportKeyVisible) return undefined;
    const timeoutId = window.setTimeout(() => setIsExportKeyVisible(false), 60000);
    return () => window.clearTimeout(timeoutId);
  }, [isExportKeyVisible]);

  useEffect(() => {
    if (!user.id) return;
    userApi.followers(user.id).then((rows) => setFollowersCount(rows.length)).catch(() => {});
    Promise.all([referralApi.me(), referralApi.rewards()])
      .then(([me, rewards]) => {
        setReferralStats({
          invited: me.referrals?.length || 0,
          active: me.referrals?.filter((r) => r.status === 'active').length || 0,
          rewards: (rewards || []).reduce((sum, r) => sum + Number(r.amount || 0), 0),
        });
      })
      .catch(() => {});
  }, [user.id]);

  const referralLink = `${window.location.origin}/invite?ref=${user.username || ''}`;

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* Wallet Balance Shortcut Card */}
      <div className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex items-center justify-between">
        <div>
          <span className="text-[9px] text-stone-gray uppercase tracking-widest font-bold block">
            Wallet Balance
          </span>
          <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
            ${balance.toFixed(2)} USDC
          </span>
        </div>
        <button
          onClick={() => setActiveTab('earnings')}
          className="bg-obsidian border border-stone-gray/15 hover:border-gold/30 hover:text-gold text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all duration-300"
        >
          Manage Wallet
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Profile Information Card */}
      <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15 flex flex-col items-center text-center relative">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-20 h-20 rounded-full border-2 border-gold/40 object-cover shadow-lg mb-3"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/40 bg-gold/10 text-2xl font-bold text-gold shadow-lg mb-3">
            {user.displayName?.[0] || '?'}
          </div>
        )}

        <div className="flex items-center gap-1.5 justify-center mb-1">
          <h2 className="font-display text-md font-semibold text-ivory tracking-tight m-0">
            {user.displayName}
          </h2>
          <span className="bg-gold/15 border border-gold/30 text-gold text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            {profile.titleRank || 'Civis'}
          </span>
        </div>
        <span className="text-xs text-stone-gray">@{user.username}</span>

        {wallet?.wallet?.walletAddress && (
          <div className="mt-3 w-full rounded-2xl border border-gold/20 bg-obsidian/75 p-3 text-left">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-gold">Primary wallet</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet.wallet.walletAddress);
                  showToast('Wallet address copied to clipboard!', 'success');
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-gray/15 bg-charcoal px-2 py-1 text-[9px] font-bold text-ivory hover:border-gold/40 hover:text-gold"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <p className="m-0 break-all rounded-xl border border-stone-gray/10 bg-black/25 px-3 py-2 font-mono text-[11px] leading-relaxed text-ivory">
              {wallet.wallet.walletAddress}
            </p>
            <span className="mt-2 inline-flex rounded-full border border-stone-gray/10 bg-charcoal px-2 py-1 font-mono text-[9px] text-stone-gray">
              {shortenAddress(wallet.wallet.walletAddress)}
            </span>
          </div>
        )}

        <p className="text-xs text-stone-gray leading-relaxed max-w-xs mt-3">
          {profile.bio || 'No bio yet.'}
        </p>

        {/* Social Metrics */}
        <div className="flex items-center gap-6 mt-4 text-xs border-t border-stone-gray/10 pt-3.5 w-full justify-center">
          <div className="flex flex-col">
            <span className="font-extrabold text-ivory text-sm">{followersCount}</span>
            <span className="text-[9px] text-stone-gray uppercase tracking-wider font-semibold">Followers</span>
          </div>
          <div className="h-6 w-px bg-stone-gray/15"></div>
          <div className="flex flex-col">
            <span className="font-extrabold text-ivory text-sm">{followingCount}</span>
            <span className="text-[9px] text-stone-gray uppercase tracking-wider font-semibold">Following</span>
          </div>
          <div className="h-6 w-px bg-stone-gray/15"></div>
          <div className="flex flex-col">
            <span className="font-extrabold text-ivory text-sm">{publishedArticles.length}</span>
            <span className="text-[9px] text-stone-gray uppercase tracking-wider font-semibold">Articles</span>
          </div>
        </div>
      </div>

      {/* 2. Badge Laurel Chest */}
      <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15">
        <div className="flex items-center gap-1.5 mb-3">
          <Award className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-xs text-ivory uppercase tracking-wider">
            Laurel Badges Chest
          </h3>
        </div>

        {badges.earned.length === 0 ? (
          <p className="m-0 text-xs text-stone-gray">No badges earned yet -- publish, unlock, or support to start collecting laurels.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.earned.map((ub) => (
              <div
                key={ub.id}
                className="bg-obsidian border border-gold/20 rounded-xl px-3 py-2 flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-gold" />
                <div>
                  <span className="text-xs font-bold text-sand block leading-none">{ub.badge?.name}</span>
                  <span className="text-[8px] text-stone-gray block mt-0.5">{ub.badge?.description || ub.badge?.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2.5 Referral Guild Dashboard */}
      <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15 text-left space-y-4">
        <div className="flex items-center justify-between border-b border-stone-gray/10 pb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gold" />
            <h3 className="font-bold text-xs text-ivory uppercase tracking-wider m-0">
              Patron Referral Guild
            </h3>
          </div>
        </div>

        <p className="text-[11px] text-stone-gray leading-relaxed m-0">
          Invite creators. Earn when they earn. Referral rewards activate only when your invitees create real value (publish articles or receive splits).
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center bg-obsidian/45 p-3 rounded-xl border border-stone-gray/5">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-ivory">{referralStats.invited}</span>
            <span className="text-[8px] text-stone-gray uppercase tracking-wider font-semibold">Invited</span>
          </div>
          <div className="flex flex-col border-l border-r border-stone-gray/10">
            <span className="text-sm font-extrabold text-ivory">{referralStats.active}</span>
            <span className="text-[8px] text-stone-gray uppercase tracking-wider font-semibold">Active</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-emerald-400">${referralStats.rewards.toFixed(3)}</span>
            <span className="text-[8px] text-stone-gray uppercase tracking-wider font-semibold">Rewards</span>
          </div>
        </div>

        {/* Copy Referral Link */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold text-stone-gray uppercase tracking-wider">
            Your Guild Referral Link
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-grow bg-obsidian border border-stone-gray/15 rounded-xl px-3 py-2 text-[10px] text-stone-gray select-all outline-none font-mono"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralLink);
                showToast("Referral link copied to clipboard!", "success");
              }}
              className="bg-gold hover:bg-gold/90 text-obsidian font-bold text-[10px] px-3.5 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center border-none"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account and treasury actions */}
      <div className="glass-panel rounded-2xl p-5 border border-gold/20 bg-gold/5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Settings className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-xs text-gold uppercase tracking-wider">
            Account Treasury
          </h3>
        </div>
        <p className="text-[10px] text-stone-gray leading-normal mb-4">
          Export your wallet private credentials or leave the current session.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportKeyClick}
            disabled={exportBusy}
            className="bg-gold hover:bg-gold/90 text-obsidian text-[11px] font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md border-none disabled:opacity-50"
          >
            <Key className="w-4 h-4" />
            Export Private Key
          </button>

          <button
            onClick={logout}
            className="bg-obsidian border border-stone-gray/15 text-stone-gray hover:text-gold text-[11px] font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* 4. List of User Published Articles */}
      <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15">
        <div className="flex items-center gap-1.5 mb-4">
          <BookOpen className="w-4 h-4 text-gold" />
          <h3 className="font-bold text-xs text-ivory uppercase tracking-wider">
            Your Publications
          </h3>
        </div>

        {publishedArticles.length === 0 ? (
          <div className="text-center py-6 text-xs text-stone-gray">
            You haven't published any articles yet.
          </div>
        ) : (
          <div className="space-y-3">
            {publishedArticles.map((art) => (
              <div
                key={art.id}
                className="flex items-center justify-between border-b border-stone-gray/5 pb-2.5 last:border-0 last:pb-0"
              >
                <div>
                  <span className="font-semibold text-xs text-sand block truncate max-w-[200px]">
                    {art.title}
                  </span>
                  <span className="text-[10px] text-stone-gray">
                    {art.category} &bull; {art.unlockCount || 0} unlocks
                  </span>
                </div>
                <div className="bg-obsidian px-2.5 py-1 rounded-lg border border-stone-gray/10 text-[10px] text-gold font-bold font-mono">
                  ${Number(art.unlockPrice).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXPORT PRIVATE KEY DRAWER OVERLAY */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-left">
          <div className="w-full max-w-sm bg-charcoal border border-stone-gray/15 rounded-t-[32px] p-6 space-y-5 animate-slide-up shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2">
              <div>
                <h3 className="font-bold text-md text-ivory m-0 leading-none">Export Wallet</h3>
                <span className="text-[10px] text-stone-gray mt-1 block">Verification required to access credentials</span>
              </div>
              <button 
                onClick={() => {
                  setIsExportOpen(false);
                  setExportedKey('');
                  setIsExportKeyVisible(false);
                }}
                className="bg-obsidian p-1.5 rounded-full border border-stone-gray/10 text-stone-gray hover:text-ivory cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Input OTP */}
            {exportStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                    Verification Code
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                    <Fingerprint className="h-5 w-5 text-gold" />
                    <input
                      value={exportOtpVal}
                      onChange={(event) => setExportOtpVal(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-center font-mono text-xl tracking-[0.35em] text-ivory outline-none border-none text-ivory"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                    />
                  </div>
                  <p className="m-0 mt-3 text-center text-[10px] text-stone-gray">
                    Check your registered email address for the OTP.{exportDevCode ? ` Dev shortcut: ${exportDevCode}.` : ''}
                  </p>
                </div>

                <button
                  onClick={handleVerifyExport}
                  disabled={exportBusy}
                  className="w-full py-2.5 bg-gold hover:bg-gold/90 text-obsidian font-bold rounded-xl active:scale-98 cursor-pointer text-xs flex items-center justify-center border-none disabled:opacity-50"
                >
                  {exportBusy ? 'Verifying...' : 'Verify and Export'}
                </button>
              </div>
            )}

            {/* Step 1.5: Input App PIN */}
            {exportStep === 1.5 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                    App Security PIN
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                    <Lock className="h-5 w-5 text-gold" />
                    <input
                      value={exportPinVal}
                      onChange={(event) => setExportPinVal(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-center font-mono text-xl tracking-[0.35em] text-ivory outline-none border-none text-ivory"
                      inputMode="numeric"
                      type="password"
                      maxLength={6}
                      placeholder="******"
                    />
                  </div>
                  <p className="m-0 mt-3 text-center text-[10px] text-stone-gray">
                    Enter your 6-digit security PIN to locally decrypt the credentials.
                  </p>
                </div>

                <button
                  onClick={handleVerifyPinAndDecrypt}
                  disabled={exportBusy || exportPinVal.length !== 6}
                  className="w-full py-2.5 bg-gold hover:bg-gold/90 text-obsidian font-bold rounded-xl active:scale-98 cursor-pointer text-xs flex items-center justify-center border-none disabled:opacity-50"
                >
                  {exportBusy ? 'Decrypting...' : 'Decrypt and Reveal'}
                </button>
              </div>
            )}

            {/* Step 2: Show Key */}
            {exportStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3">
                  <span className="font-bold text-rose-400 block text-[10px] uppercase tracking-wider text-center">
                    ⚠️ CRITICAL WARNING
                  </span>
                  <p className="text-[10px] text-stone-gray m-0 leading-normal text-center">
                    This gives full control of your wallet. Anyone with this key can move your funds. Scriptorium will never ask for it.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold text-stone-gray uppercase tracking-wider">
                    Wallet Private Key
                  </span>
                  <div className="flex gap-2">
                    <input
                      type={isExportKeyVisible ? 'text' : 'password'}
                      readOnly
                      value={exportedKey}
                      className="flex-grow bg-obsidian border border-stone-gray/15 rounded-xl px-3 py-2 text-[10px] text-[#FCFBF7] select-all outline-none font-mono"
                    />
                    <button
                      onClick={() => setIsExportKeyVisible((prev) => !prev)}
                      className="bg-obsidian border border-stone-gray/15 text-stone-gray hover:text-gold font-bold text-[10px] px-3 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      {isExportKeyVisible ? <EyeSlash className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportedKey);
                        showToast("Private key copied to clipboard!", "success");
                      }}
                      className="bg-gold hover:bg-gold/90 text-obsidian font-bold text-[10px] px-3.5 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center border-none"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsExportOpen(false);
                    setExportedKey('');
                    setIsExportKeyVisible(false);
                  }}
                  className="w-full py-2.5 bg-obsidian border border-stone-gray/10 text-stone-gray hover:text-ivory font-bold rounded-xl text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
