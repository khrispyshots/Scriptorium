import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { paymentApi } from '../lib/api';
import { isLikelyEvmAddress, shortenAddress } from '../lib/wallet';
import { 
  TrendUp as TrendingUp,
  Stack as Layers,
  ShareNetwork as Share2,
  Clock, 
  Wallet,
  Copy,
  Plus,
  ArrowUpRight,
  ArrowsClockwise as RefreshCw,
  CheckCircle,
  X,
  Lightning as Zap
} from '@phosphor-icons/react';

export default function Earnings() {
  const {
    currentUser,
    wallet,
    articles,
    withdrawFunds,
    showToast,
    identityState,
    sponsorshipLedger,
    reloadWallet
  } = useApp();

  const activeUser = currentUser || {};
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    paymentApi.byUser(currentUser.id).then((res) => setPayments(res.data || res || [])).catch(() => {});
  }, [currentUser]);

  const [activeSegment, setActiveSegment] = useState('summary'); // summary | ledger

  // Drawers trigger states
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Withdrawal form states
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isConfirmingWithdrawal, setIsConfirmingWithdrawal] = useState(false);
  const [withdrawReceipt, setWithdrawReceipt] = useState(null);

  // Calculate earnings details from real wallet + creator profile data
  const totalBalance = Number(wallet?.balance?.availableBalance || 0);
  const pendingBalance = Number(wallet?.balance?.pendingBalance || 0);
  const walletAddress = wallet?.wallet?.walletAddress || '';
  const profile = activeUser.creatorProfile || {};
  const unlocksEarned = Number(profile.unlockEarned || 0);
  const tipsEarned = Number(profile.tipEarned || 0);
  const referralsEarned = Number(profile.referralEarned || 0);
  const totalRevenue = Number(profile.totalEarned || 0);
  const coveredFeeEvents = sponsorshipLedger.length;

  // Payments where this user is payer or recipient (fetched from /payments/user/:id)
  const userLedger = payments;

  // Active user's published articles
  const userArticles = articles.filter(a => a.creatorId === activeUser.id);

  const handleCopyAddress = () => {
    if (!walletAddress) {
      showToast('Wallet is still being provisioned.', 'info');
      return;
    }
    navigator.clipboard.writeText(walletAddress);
    showToast('Wallet address copied to clipboard!', 'success');
  };



  // Withdrawal action flow
  const handleWithdrawSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(withdrawAmount);
    
    if (!isLikelyEvmAddress(withdrawAddress.trim())) {
      showToast('Invalid destination wallet address.', 'error');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid withdrawal amount.', 'error');
      return;
    }
    if (parsedAmount > totalBalance) {
      showToast('Withdrawal amount exceeds your available balance.', 'error');
      return;
    }

    setIsConfirmingWithdrawal(true);
  };

  const handleConfirmWithdrawal = async () => {
    const withdrawal = await withdrawFunds(parseFloat(withdrawAmount), withdrawAddress);
    if (withdrawal) {
      setWithdrawReceipt({
        recipient: withdrawal.recipientAddress || withdrawAddress,
        amount: parseFloat(withdrawal.amount ?? withdrawAmount),
        txHash: withdrawal.txReference || 'pending',
        timestamp: new Date().toLocaleTimeString()
      });
      setWithdrawAddress('');
      setWithdrawAmount('');
      setIsConfirmingWithdrawal(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left relative">
      
      {/* Segment tabs */}
      <div className="flex bg-obsidian p-1 rounded-xl border border-stone-gray/10">
        <button
          onClick={() => setActiveSegment('summary')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSegment === 'summary' 
              ? 'bg-charcoal text-gold shadow-sm' 
              : 'text-stone-gray hover:text-ivory'
          }`}
        >
          Wallet & Summary
        </button>
        <button
          onClick={() => setActiveSegment('ledger')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSegment === 'ledger' 
              ? 'bg-charcoal text-gold shadow-sm' 
              : 'text-stone-gray hover:text-ivory'
          }`}
        >
          Payment Ledger ({userLedger.length})
        </button>
      </div>

      {activeSegment === 'summary' && (
        <div className="space-y-4">
          
          {/* 1. Available Wallet Balance Card */}
          <div className="glass-panel rounded-2xl p-5 border border-gold/20 bg-gradient-to-br from-charcoal to-obsidian relative overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] text-stone-gray uppercase tracking-widest font-bold block">
                  Available Spendable Balance
                </span>
                <h2 className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-1 mb-0 leading-none">
                  ${totalBalance.toFixed(4)} <span className="text-xs text-stone-gray font-semibold">USDC</span>
                </h2>
              </div>
              <span className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                ACTIVE
              </span>
            </div>

            {/* Wallet Address Row */}
            <div className="mb-4 rounded-2xl border border-gold/25 bg-obsidian/75 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold">
                  <Wallet className="h-4 w-4" />
                  Primary EVM Wallet
                </span>
                <button
                  onClick={handleCopyAddress}
                  title="Copy wallet address"
                  disabled={!walletAddress}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-gray/15 bg-charcoal px-2.5 py-1.5 text-[10px] font-bold text-ivory transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <p className="m-0 break-all rounded-xl border border-stone-gray/10 bg-black/30 px-3 py-2 font-mono text-[12px] leading-relaxed text-ivory">
                {walletAddress || 'Wallet address will appear here after setup.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                <span className="rounded-full border border-stone-gray/10 bg-charcoal px-2 py-1 text-stone-gray">
                  Network: {wallet?.wallet?.networkName || wallet?.wallet?.network || 'Arc Testnet'}
                </span>
                <span className="rounded-full border border-stone-gray/10 bg-charcoal px-2 py-1 text-stone-gray">
                  Currency: {wallet?.wallet?.currency || 'USDC'}
                </span>
                <span className="rounded-full border border-stone-gray/10 bg-charcoal px-2 py-1 text-stone-gray">
                  Chain ID: {wallet?.wallet?.chainId || '5042002'}
                </span>
                {walletAddress && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                    {shortenAddress(walletAddress)}
                  </span>
                )}
              </div>
            </div>

            {/* Withdraw button */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsWithdrawOpen(true)}
                disabled={!walletAddress}
                className="w-full bg-gold hover:bg-gold/90 transition-colors text-obsidian font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw Earnings
              </button>
            </div>

          </div>

          <div className="glass-panel rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-ivory">
                    Smart Sponsorship Engine
                  </h3>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                    Policy driven
                  </span>
                </div>
                <p className="m-0 mt-2 text-[11px] leading-relaxed text-stone-gray">
                  Eligible actions show as covered or included. Wallet setup, follows, and first-use creator actions stay invisible to readers.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  <div className="rounded-xl border border-stone-gray/10 bg-obsidian/60 p-2">
                    <span className="block text-stone-gray">Account</span>
                    <span className="font-bold text-emerald-400">{identityState.walletMode}</span>
                  </div>
                  <div className="rounded-xl border border-stone-gray/10 bg-obsidian/60 p-2">
                    <span className="block text-stone-gray">Covered</span>
                    <span className="font-bold text-sand">{coveredFeeEvents} events</span>
                  </div>
                  <div className="rounded-xl border border-stone-gray/10 bg-obsidian/60 p-2">
                    <span className="block text-stone-gray">Pending</span>
                    <span className="font-bold text-gold">${pendingBalance.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Wallet restore', 'Follow', 'First unlock', 'First support', 'Badge claim'].map((policy) => (
                    <span key={policy} className="rounded-full border border-stone-gray/10 bg-obsidian/60 px-2 py-1 text-[9px] font-semibold text-stone-gray">
                      {policy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Lifetime Creator Performance Card */}
          <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15 bg-gradient-to-br from-charcoal/40 to-obsidian/40 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-20 h-20 text-gold" />
            </div>

            <span className="text-[10px] text-stone-gray uppercase tracking-widest font-bold">
              Total Creator Revenue (Lifetime)
            </span>
            <h3 className="text-xl font-extrabold text-gold tracking-tight mt-1 mb-4">
              ${totalRevenue.toFixed(4)} <span className="text-xs text-stone-gray font-medium">USDC</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5 border-t border-stone-gray/5 pt-3.5">
              <div>
                <span className="text-[8px] text-stone-gray uppercase font-bold block">Paid Unlocks</span>
                <span className="text-xs font-bold text-sand">${unlocksEarned.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-[8px] text-stone-gray uppercase font-bold block">Tips/Support</span>
                <span className="text-xs font-bold text-sand">${tipsEarned.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-[8px] text-stone-gray uppercase font-bold block">Referral Cuts</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">+${referralsEarned.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* 3. Published Articles Performance summary list */}
          <div className="glass-panel rounded-2xl p-5 border border-stone-gray/15">
            <div className="flex items-center gap-1.5 mb-3.5">
              <Layers className="w-4 h-4 text-gold" />
              <h3 className="font-bold text-xs text-ivory uppercase tracking-wider">
                Article performance summary
              </h3>
            </div>

            {userArticles.length === 0 ? (
              <div className="text-center py-6 text-xs text-stone-gray">
                No publications found yet. Go to the Publish tab to make your first AI-assisted article!
              </div>
            ) : (
              <div className="space-y-3">
                {userArticles.map((art) => {
                  const creatorContributor = art.contributors.find(c => c.id === activeUser.id);
                  const accumulated = creatorContributor ? creatorContributor.earned : 0;
                  
                  return (
                    <div key={art.id} className="flex justify-between items-center border-b border-stone-gray/5 pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <span className="font-semibold text-xs text-sand block line-clamp-1">
                          {art.title}
                        </span>
                        <span className="text-[10px] text-stone-gray">
                          {art.unlockCount} unlocks • {art.supportCount} tips
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs text-ivory block">
                          ${accumulated.toFixed(3)}
                        </span>
                        <span className="text-[9px] text-stone-gray uppercase">Earned</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Referral Invite Link */}
          <div className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="text-[9px] font-bold text-gold uppercase tracking-wider block">
                Tribune Referral Invite
              </span>
              <p className="text-[11px] text-stone-gray leading-normal mt-0.5">
                Share your invite. You receive a 2% cut of referred creator platform fees.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/join?ref=${activeUser.username}`);
                showToast('Referral link copied to clipboard!', 'success');
              }}
              className="bg-obsidian border border-stone-gray/15 text-stone-gray hover:text-gold transition-colors text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              Copy Link
            </button>
          </div>
        </div>
      )}

      {activeSegment === 'ledger' && (
        <div className="space-y-3">
          {userLedger.length === 0 ? (
            <div className="text-center py-10 bg-charcoal rounded-2xl border border-stone-gray/15 text-xs text-stone-gray">
              No transactions recorded in payment graph yet. Unlock an article or send a tip!
            </div>
          ) : (
            userLedger.map((p) => {
              const isPayer = p.payerUserId === activeUser.id;
              const isFunding = p.paymentType === 'wallet_funding';
              const isWithdrawal = p.paymentType === 'withdrawal';
              
              let directionSign = '-';
              let colorClass = 'text-rose-400';
              let descriptionText = '';

              if (isFunding) {
                directionSign = '+';
                colorClass = 'text-emerald-400 font-mono';
                descriptionText = 'Claimed from Scriptora treasury';
              } else if (isWithdrawal) {
                directionSign = '-';
                colorClass = 'text-rose-400';
                descriptionText = 'Withdrew to external address';
              } else {
                directionSign = isPayer ? '-' : '+';
                colorClass = isPayer ? 'text-rose-400' : 'text-emerald-400';
                descriptionText = isPayer ? 'Sent to publisher team' : 'Received share from reader';
              }

              return (
                <div key={p.id} className="glass-panel rounded-2xl p-4 border border-stone-gray/15 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] text-stone-gray border-b border-stone-gray/5 pb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(p.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="font-mono">{(p.txReference || 'pending').substring(0, 10)}...</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-semibold text-sand block">
                        {p.paymentType === 'content_unlock' && 'Paid Article Unlock'}
                        {p.paymentType === 'content_tip' && 'Support Tip Split'}
                        {p.paymentType === 'wallet_funding' && 'Treasury Grant'}
                        {p.paymentType === 'withdrawal' && 'USDC Withdrawal'}
                      </span>
                      <span className="text-[10px] text-stone-gray">
                        {descriptionText}
                      </span>
                      {p.networkFeeLabel && (
                        <span className="mt-1 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                          Network fee: {p.networkFeeLabel}
                        </span>
                      )}
                    </div>
                    <div className={`text-right font-bold text-xs ${colorClass}`}>
                      {directionSign}${Number(p.amount).toFixed(3)}
                    </div>
                  </div>

                  {/* Splits graph visualization (not for funding/withdrawals) */}
                  {!isFunding && !isWithdrawal && p.splits && (
                    <div className="bg-obsidian/60 border border-stone-gray/10 rounded-xl p-3 space-y-1.5 text-[10px] text-stone-gray text-left">
                      <span className="font-bold text-[9px] uppercase text-stone-gray tracking-wider flex items-center gap-1.5 mb-1">
                        <Layers className="w-3 h-3 text-gold" />
                        x402 split distribution:
                      </span>
                      {p.splits.map((s, i) => (
                        <div key={i} className="flex justify-between">
                          <span>&bull; {s.recipientType} ({Number(s.splitPercentage)}%)</span>
                          <span className="font-mono text-sand">${Number(s.amount).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* 5. DRAWER OVERLAYS (Simulated Slide-up Panels) */}
      {/* ======================================================= */}



      {/* B. WITHDRAW DRAWER */}
      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-charcoal border border-stone-gray/15 rounded-t-[32px] p-6 space-y-5 animate-slide-up shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2">
              <div>
                <h3 className="font-bold text-md text-ivory m-0 leading-none">Withdraw USDC</h3>
                <span className="text-[10px] text-stone-gray mt-1 block">Send USDC to an external address</span>
              </div>
              <button 
                onClick={() => {
                  setIsWithdrawOpen(false);
                  setIsConfirmingWithdrawal(false);
                  setWithdrawReceipt(null);
                }}
                className="bg-obsidian p-1.5 rounded-full border border-stone-gray/10 text-stone-gray hover:text-ivory cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* WITHDRAWAL PROCESS ROUTER */}
            {!isConfirmingWithdrawal && !withdrawReceipt && (
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div className="bg-obsidian/60 border border-stone-gray/10 rounded-2xl p-4 text-xs flex justify-between">
                  <span className="text-stone-gray">Available Balance:</span>
                  <span className="font-bold text-emerald-400">${totalBalance.toFixed(4)} USDC</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="bg-obsidian border border-stone-gray/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-stone-gray/40 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-obsidian border border-stone-gray/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37]/50 transition-colors placeholder:text-stone-gray/40 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-white font-bold rounded-xl active:scale-98 transition-transform cursor-pointer text-[11px] tracking-wide"
                >
                  Withdraw USDC
                </button>
              </form>
            )}

            {/* CONFIRMATION OVERLAY */}
            {isConfirmingWithdrawal && !withdrawReceipt && (
              <div className="space-y-5 text-center">
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-4 text-xs text-left space-y-2 leading-relaxed">
                  <span className="font-bold text-gold block text-[10px] uppercase tracking-wider">
                    Confirm Transaction Detail
                  </span>
                  <div className="flex justify-between">
                    <span className="text-stone-gray">Send amount:</span>
                    <span className="font-bold text-white">${parseFloat(withdrawAmount).toFixed(4)} USDC</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-stone-gray">Recipient:</span>
                    <span className="font-mono text-white text-[10px] break-all">{withdrawAddress}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirmingWithdrawal(false)}
                    className="flex-1 py-2.5 bg-obsidian border border-stone-gray/10 text-stone-gray hover:text-ivory font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmWithdrawal}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-98"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS RECEIPT CARD */}
            {withdrawReceipt && (
              <div className="space-y-5 text-center py-2">
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <h4 className="font-bold text-md text-ivory mt-2 mb-1 leading-none">Withdrawal Sent</h4>
                  <p className="text-xs text-stone-gray m-0 px-4">
                    ${withdrawReceipt.amount.toFixed(4)} USDC is on its way.
                  </p>
                </div>

                <div className="bg-obsidian border border-stone-gray/10 rounded-2xl p-4 text-left text-[10px] text-stone-gray font-mono space-y-1.5">
                  <span className="font-bold text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">
                    TRANSACTION RECEIPT
                  </span>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="text-white">${withdrawReceipt.amount.toFixed(4)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient:</span>
                    <span className="text-white">{withdrawReceipt.recipient.substring(0, 8)}...</span>
                  </div>
                  <div className="flex flex-col">
                    <span>TX Hash:</span>
                    <span className="text-[#D4AF37] break-all mt-0.5">{withdrawReceipt.txHash}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsWithdrawOpen(false);
                    setWithdrawReceipt(null);
                  }}
                  className="w-full py-2.5 bg-[#1E1E1E] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-zinc-800"
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
