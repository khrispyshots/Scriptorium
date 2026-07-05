import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  Coins,
  Cpu,
  EnvelopeSimple,
  Fingerprint,
  Heart,
  Lock,
  LockOpen as Unlock,
  ShieldCheck,
  Sparkle as Sparkles,
  TrendUp as TrendingUp,
  UserPlus,
  Wallet
} from '@phosphor-icons/react';

// Declared OUTSIDE the parent component to prevent losing input focus on re-renders
const StepShell = ({ eyebrow, title, copy, children, footer }) => (
  <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 py-8 text-left">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-gold/25 bg-gold/15 p-1 w-8 h-8 flex items-center justify-center shrink-0">
          <img src="/favicon.svg" alt="logo" className="h-5.5 w-5.5 object-contain" />
        </div>
        <span className="font-display text-xs font-bold tracking-[0.18em] text-ivory">SCRIPTORIUM</span>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-gray">
        {eyebrow}
      </span>
    </div>

    <section className="my-8 space-y-5 flex-1 flex flex-col justify-center">
      <div className="space-y-2 text-center mb-4">
        <h1 className="font-display m-0 text-3xl font-semibold tracking-tight text-ivory">{title}</h1>
        <p className="m-0 text-sm leading-relaxed text-[#A3A3A3]">{copy}</p>
      </div>
      {children}
    </section>

    <footer className="space-y-3">{footer}</footer>
  </div>
);

export default function Onboarding() {
  const {
    currentUser,
    follows,
    toggleFollow,
    completeOnboarding,
    showToast,
    identityState,
    sendOtp,
    verifyOtp,
    verifyPin,
    forgotPin,
    resetPin,
    setPin,
    updateProfile,
    restoreWalletLifecycle,
    createWalletLifecycle,
    recordSponsorship,
    suggestedCreators,
    articles,
    unlockArticle,
    tipArticle,
    isUnlocked,
  } = useApp();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(identityState.email || '');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [walletProgress, setWalletProgress] = useState(12);
  const [walletText, setWalletText] = useState('Waiting for verified identity...');
  const [walletDone, setWalletDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const [enterPinVal, setEnterPinVal] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetDevCode, setResetDevCode] = useState('');
  const [pinEmail, setPinEmail] = useState('');

  const featuredArticle = articles[0];
  const featuredUnlocked = featuredArticle ? isUnlocked(featuredArticle) : false;
  const [featuredTipped, setFeaturedTipped] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUsername((prev) => prev || currentUser.username || '');
      setDisplayName((prev) => prev || currentUser.displayName || '');
    }
  }, [currentUser]);

  const interestsList = [
    'AI Publishing',
    'Creator Economy',
    'Research',
    'Fintech',
    'Philosophy',
    'Web3 Without Jargon',
    'Agent Workflows'
  ];

  const introSlides = [
    {
      eyebrow: 'Welcome',
      title: 'Collaborative AI publishing',
      copy: 'Draft, refine, and publish essays with specialist agents while Scriptorium handles the money movement quietly.',
      Icon: Sparkles,
      stats: ['AI co-writing', 'Creator splits', 'Premium feed']
    },
    {
      eyebrow: 'Agents',
      title: 'Publish with a producer agent',
      copy: 'Research, editing, and verification can run as one guided workflow before you approve the final article.',
      Icon: Cpu,
      stats: ['Research', 'Editing', 'Fact-checks']
    },
    {
      eyebrow: 'Earnings',
      title: 'Earn from readers',
      copy: 'Readers unlock articles or support creators. Contributors, agents, referrers, and creators receive their shares.',
      Icon: Coins,
      stats: ['Unlocks', 'Support', 'Referrals']
    }
  ];

  // Wallet "restoring" / "creation" step
  useEffect(() => {
    if (step !== 7) return undefined;

    setWalletProgress(20);
    setWalletText('Checking for an existing wallet...');

    const runWalletFlow = async () => {
      try {
        const existingWallet = await restoreWalletLifecycle();
        if (existingWallet) {
          setWalletProgress(100);
          setWalletText('Wallet restored successfully.');
          setWalletDone(true);
          return;
        }

        setWalletProgress(50);
        setWalletText('Generating secure credentials locally...');
        
        await new Promise(r => setTimeout(r, 600));
        
        setWalletText('Encrypting private key with security PIN...');
        setWalletProgress(75);
        
        // newPin contains the PIN established in Step 15
        const newWallet = await createWalletLifecycle(newPin || '000000');
        if (newWallet) {
          setWalletProgress(100);
          setWalletText('Encrypted wallet successfully initialized.');
          setWalletDone(true);
        } else {
          setWalletText('Wallet creation failed. Please try again.');
        }
      } catch (err) {
        setWalletText('Wallet setup failed.');
        showToast('Error setting up EOA wallet.', 'error');
      }
    };

    runWalletFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSendOtp = async () => {
    setBusy(true);
    const ok = await sendOtp(email);
    setBusy(false);
    if (ok) setStep(5);
  };

  const handleVerifyOtp = async () => {
    setBusy(true);
    const res = await verifyOtp(otp);
    setBusy(false);
    if (res) {
      if (res.pin_required) {
        setPinEmail(res.email);
        setEnterPinVal('');
        setStep(12);
      } else {
        setStep(6);
      }
    }
  };

  const handleProfileNext = async () => {
    if (!username.trim() || !displayName.trim()) {
      showToast('Add a username and display name.', 'error');
      return;
    }
    setBusy(true);
    const ok = await updateProfile({ username: username.trim(), display_name: displayName.trim() });
    setBusy(false);
    if (ok) {
      setNewPin('');
      setConfirmPin('');
      setStep(15);
    }
  };

  const handleVerifyPin = async () => {
    if (enterPinVal.length !== 6) {
      showToast('Please enter a 6-digit PIN.', 'error');
      return;
    }
    setBusy(true);
    const ok = await verifyPin(pinEmail || email, enterPinVal);
    setBusy(false);
    if (ok) {
      setStep(7);
    }
  };

  const handleSendResetOtp = async () => {
    if (!resetEmail.trim()) {
      showToast('Please enter your email address.', 'error');
      return;
    }
    setBusy(true);
    const res = await forgotPin(resetEmail.trim());
    setBusy(false);
    if (res) {
      if (res.devCode) {
        setResetDevCode(res.devCode);
      } else {
        setResetDevCode('');
      }
      setResetOtp('');
      setNewPin('');
      setStep(14);
    }
  };

  const handleResetPinSubmit = async () => {
    if (resetOtp.length !== 6) {
      showToast('Please enter a 6-digit verification code.', 'error');
      return;
    }
    if (newPin.length !== 6) {
      showToast('Please enter a 6-digit security PIN.', 'error');
      return;
    }
    setBusy(true);
    const ok = await resetPin(resetEmail.trim(), resetOtp, newPin);
    setBusy(false);
    if (ok) {
      setStep(7);
    }
  };

  const handleCreatePinSubmit = async () => {
    if (newPin.length !== 6) {
      showToast('Please enter a 6-digit security PIN.', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('PIN and confirmation PIN do not match.', 'error');
      return;
    }
    setBusy(true);
    const ok = await setPin(newPin);
    setBusy(false);
    if (ok) {
      setStep(7);
    }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(item => item !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#0A0A0A] text-ivory relative">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at top, rgba(212,175,55,0.15), transparent 42%), linear-gradient(180deg, rgba(10,10,10,0.35), #0A0A0A)'
        }}
      />

      {step === 1 && (
        <StepShell
          eyebrow="Introduction"
          title="SCRIPTORIUM"
          copy="Collaborative AI Publisher Guild"
          footer={
            <div className="space-y-4">
              <div className="flex justify-center gap-1.5">
                {introSlides.map((slide, index) => (
                  <span
                    key={slide.eyebrow}
                    className={`h-1.5 rounded-full transition-all ${index + 1 === step ? 'w-6 bg-gold' : 'w-1.5 bg-white/15'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#121212] font-bold text-sm rounded-xl transition-all duration-300 hover:shadow-[0_4px_16px_rgba(212,175,55,0.2)] active:scale-98 shadow-[0_10px_25px_rgba(0,0,0,0.5)] cursor-pointer text-center border-none"
              >
                Get Started
              </button>
              <button
                onClick={() => setStep(4)}
                className="w-full py-2.5 bg-transparent border border-white/10 hover:border-gold/30 hover:bg-white/5 text-stone-gray hover:text-ivory text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer text-center"
              >
                Already a citizen? Sign In
              </button>
            </div>
          }
        >
          <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center w-full">
            <div className="rounded-2xl border border-gold/25 bg-gold/15 p-2.5 w-14 h-14 flex items-center justify-center shadow-lg mb-4">
              <img src="/favicon.svg" alt="logo" className="h-9 w-9 object-contain" />
            </div>

            <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent my-2"></div>

            <div className="space-y-2 text-center w-full">
              <div className="flex items-center gap-3 bg-[#121212]/60 border border-white/5 py-2.5 px-3.5 rounded-xl text-left">
                <span className="text-sm">✍️</span>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Write Together</span>
                  <span className="text-xs text-zinc-200">Co-publish essays alongside expert AI agents.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#121212]/60 border border-white/5 py-2.5 px-3.5 rounded-xl text-left">
                <span className="text-sm">⚡</span>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Publish Instantly</span>
                  <span className="text-xs text-zinc-200">Deploy works instantly to the public feed.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#121212]/60 border border-white/5 py-2.5 px-3.5 rounded-xl text-left">
                <span className="text-sm">💵</span>
                <div>
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Get Paid Fairly</span>
                  <span className="text-xs text-zinc-200">Earn splits in USDC powered by Circle wallets.</span>
                </div>
              </div>
            </div>
          </div>
        </StepShell>
      )}

      {(step === 2 || step === 3) && (
        <StepShell
          eyebrow={introSlides[step - 1].eyebrow}
          title={introSlides[step - 1].title}
          copy={introSlides[step - 1].copy}
          footer={
            <div className="space-y-4">
              <div className="flex justify-center gap-1.5">
                {introSlides.map((slide, index) => (
                  <span
                    key={slide.eyebrow}
                    className={`h-1.5 rounded-full transition-all ${index + 1 === step ? 'w-6 bg-gold' : 'w-1.5 bg-white/15'}`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(prev => prev - 1)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-[#A3A3A3] cursor-pointer">
                  Back
                </button>
                <button onClick={() => setStep(prev => prev + 1)} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-[#121212] cursor-pointer border-none">
                  {step === 3 ? 'Create account' : 'Next'}
                </button>
              </div>
            </div>
          }
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
            <div
              className="relative mx-auto mb-6 flex aspect-square max-w-[220px] items-center justify-center rounded-[32px] border border-gold/15"
              style={{
                background:
                  'radial-gradient(circle, rgba(212,175,55,0.16), rgba(255,255,255,0.03) 62%, transparent)'
              }}
            >
              {(() => {
                const Icon = introSlides[step - 1].Icon;
                return <Icon className="h-20 w-20 text-gold" />;
              })()}
              <div className="absolute -right-2 top-8 rounded-2xl border border-white/10 bg-black/50 p-3 text-emerald-300 shadow-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="absolute -left-2 bottom-8 rounded-2xl border border-white/10 bg-black/50 p-3 text-gold shadow-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {introSlides[step - 1].stats.map((stat) => (
                <span key={stat} className="rounded-xl border border-white/10 bg-black/25 p-2 text-[10px] font-bold text-stone-gray">
                  {stat}
                </span>
              ))}
            </div>
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell
          eyebrow="Identity"
          title="Sign in to Scriptorium"
          copy="Create or restore your secure publisher wallet with your email."
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer"
              >
                Back
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl space-y-3">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                  Email Address
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
                  <EnvelopeSimple className="h-4.5 w-4.5 text-gold shrink-0" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-ivory outline-none border-none"
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={busy}
                className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#121212] font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_4px_12px_rgba(212,175,55,0.15)] active:scale-95 cursor-pointer border-none disabled:opacity-50"
              >
                {busy ? 'Sending...' : 'Send Verification Code'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </StepShell>
      )}

      {step === 5 && (
        <StepShell
          eyebrow="OTP"
          title="Verify your code"
          copy="OTP verification connects this session securely to your publisher account."
          footer={
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">
                Back
              </button>
              <button onClick={handleVerifyOtp} disabled={busy} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian disabled:opacity-50 cursor-pointer border-none">
                {busy ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          }
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray">
              One-time code
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
              <Fingerprint className="h-5 w-5 text-gold" />
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-center font-mono text-xl tracking-[0.35em] text-ivory outline-none border-none"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
              />
            </div>
            <p className="m-0 mt-3 text-center text-[11px] text-stone-gray">
              Expires in 5 minutes.{identityState.devCode ? ` Dev shortcut: ${identityState.devCode}.` : ' Check your email.'}
            </p>
          </div>
        </StepShell>
      )}

      {step === 6 && (
        <StepShell
          eyebrow="Profile"
          title="Set your public profile"
          copy="Your identity is verified. Now choose how readers and collaborators will see you."
          footer={
            <div className="flex gap-3">
              <button onClick={() => setStep(5)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">
                Back
              </button>
              <button onClick={handleProfileNext} disabled={busy} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian disabled:opacity-50 cursor-pointer border-none">
                {busy ? 'Saving...' : 'Continue'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none focus:border-gold/50 text-ivory"
            />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/\s+/g, '_').toLowerCase())}
              placeholder="username"
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none focus:border-gold/50 text-ivory"
            />
          </div>
        </StepShell>
      )}

      {step === 7 && (
        <StepShell
          eyebrow="Wallet"
          title="Restoring your wallet"
          copy="Wallet lifecycle runs behind the scenes through Circle user-controlled infrastructure."
          footer={
            <button
              disabled={!walletDone}
              onClick={() => {
                recordSponsorship('Wallet restore', 'Always sponsored');
                setStep(8);
              }}
              className="w-full rounded-xl bg-gold py-3 text-sm font-bold text-obsidian disabled:opacity-40 cursor-pointer border-none"
            >
              Continue
            </button>
          }
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
              <Wallet className="h-8 w-8" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${walletProgress}%` }} />
            </div>
            <p className="m-0 mt-3 text-xs font-semibold text-emerald-300">{walletText}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
              <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">SCA enabled</span>
              <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">Setup sponsored</span>
            </div>
          </div>
        </StepShell>
      )}

      {step === 8 && (
        <StepShell
          eyebrow="Interests"
          title="Tune your feed"
          copy="Pick a few topics so the first feed feels made for you."
          footer={
            <div className="flex gap-3">
              <button onClick={() => setStep(7)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">Back</button>
              <button disabled={selectedInterests.length === 0} onClick={() => setStep(9)} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian disabled:opacity-40 cursor-pointer border-none">Next</button>
            </div>
          }
        >
          <div className="flex flex-wrap justify-center gap-2">
            {interestsList.map((interest) => {
              const selected = selectedInterests.includes(interest);
              return (
                <button key={interest} onClick={() => toggleInterest(interest)} className={`rounded-full border px-4 py-2 text-xs font-bold transition cursor-pointer ${selected ? 'border-gold bg-gold text-obsidian' : 'border-white/10 bg-white/5 text-ivory'}`}>
                  {interest}
                </button>
              );
            })}
          </div>
        </StepShell>
      )}

      {step === 9 && (
        <StepShell
          eyebrow="Discovery"
          title="Follow creators"
          copy="Follow signals are always sponsored because they grow the network."
          footer={
            <div className="flex gap-3">
              <button onClick={() => setStep(8)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">Back</button>
              <button onClick={() => setStep(10)} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none">Next</button>
            </div>
          }
        >
          <div className="space-y-3">
            {suggestedCreators.length === 0 && (
              <p className="text-center text-sm text-stone-gray">
                No other creators have published yet &mdash; you could be the first.
              </p>
            )}
            {suggestedCreators.map((creator) => {
              const isFollowing = follows.some(f => f.followingId === creator.id);
              return (
                <div key={creator.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
                        {creator.displayName?.[0] || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-bold text-ivory">{creator.displayName}</p>
                      <p className="m-0 truncate text-xs text-stone-gray">@{creator.username}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleFollow(creator.id, 'creator')} className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${isFollowing ? 'border border-white/10 bg-white/5 text-stone-gray' : 'bg-gold text-obsidian border-none'}`}>
                    <UserPlus className="h-3.5 w-3.5" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </StepShell>
      )}

      {step === 10 && (
        <StepShell
          eyebrow="First unlock"
          title="Try a sponsored read"
          copy="Your first unlock experience can be sponsored so the payment flow feels instant."
          footer={
            <div className="flex gap-3">
              <button onClick={() => setStep(9)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">Back</button>
              <button onClick={() => setStep(11)} className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none">Next</button>
            </div>
          }
        >
          {featuredArticle ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">Featured</span>
              <h2 className="font-display mb-2 mt-4 text-lg font-semibold text-ivory">{featuredArticle.title}</h2>
              <p className="m-0 text-sm leading-relaxed text-[#A3A3A3]">{featuredArticle.preview}</p>
              <div className="mt-4 space-y-2">
                {featuredArticle.isPaid && (
                  <button
                    onClick={() => unlockArticle(featuredArticle.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold cursor-pointer ${featuredUnlocked ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-gold/25 bg-gold/10 text-gold'}`}
                  >
                    <Unlock className="h-4 w-4" />
                    {featuredUnlocked ? 'Unlocked' : `Unlock $${featuredArticle.unlockPrice}`}
                  </button>
                )}
                <button
                  onClick={async () => {
                    const ok = await tipArticle(featuredArticle.id, '0.01', 'entire_team');
                    if (ok) setFeaturedTipped(true);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold cursor-pointer ${featuredTipped ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-black/20 text-stone-gray'}`}
                >
                  <Heart className="h-4 w-4" />
                  {featuredTipped ? 'Supported' : 'Support creator ($0.01)'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-stone-gray">No articles published yet.</p>
          )}
        </StepShell>
      )}

      {step === 11 && (
        <StepShell
          eyebrow="Ready"
          title="You are all set"
          copy="Identity, wallet, trusted device, feed, and first payment experience are ready."
          footer={
            <button onClick={completeOnboarding} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none">
              Enter Scriptorium <ArrowRight className="h-4 w-4" />
            </button>
          }
        >
          <div className="grid gap-2 text-sm">
            {[
              ['Email verified', identityState.email],
              ['Session', identityState.sessionStatus],
              ['Wallet', 'Circle Smart Contract Account'],
              ['Network fee', 'Sponsored for setup']
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                <span className="flex items-center gap-2 font-bold text-ivory"><ShieldCheck className="h-4 w-4 text-emerald-300" />{label}</span>
                <span className="text-right text-xs text-stone-gray">{value}</span>
              </div>
            ))}
          </div>
        </StepShell>
      )}

      {step === 12 && (
        <StepShell
          eyebrow="Security PIN"
          title="Verify your PIN"
          copy="Enter your 6-digit security PIN to access your account."
          footer={
            <div className="space-y-4 w-full">
              <button
                onClick={handleVerifyPin}
                disabled={busy || enterPinVal.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none disabled:opacity-50"
              >
                {busy ? 'Verifying...' : 'Unlock Account'}
              </button>
              <div className="text-center">
                <button
                  onClick={() => {
                    setResetEmail(email);
                    setStep(13);
                  }}
                  className="bg-transparent border-none text-stone-gray hover:text-gold text-xs cursor-pointer font-bold"
                >
                  Forgot your security PIN?
                </button>
              </div>
            </div>
          }
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
              <Lock className="h-5 w-5 text-gold" />
              <input
                value={enterPinVal}
                onChange={(e) => setEnterPinVal(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-center font-mono text-xl tracking-[0.35em] text-ivory outline-none border-none"
                inputMode="numeric"
                type="password"
                maxLength={6}
                placeholder="******"
              />
            </div>
          </div>
        </StepShell>
      )}

      {step === 13 && (
        <StepShell
          eyebrow="Forgot PIN"
          title="Reset your PIN"
          copy="Enter your email to request an OTP code for verification."
          footer={
            <div className="flex gap-3 w-full">
              <button onClick={() => setStep(12)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">Cancel</button>
              <button
                onClick={handleSendResetOtp}
                disabled={busy || !resetEmail.trim()}
                className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none disabled:opacity-50"
              >
                {busy ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          }
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-4 py-3 text-sm text-ivory outline-none focus:border-gold/50"
            />
          </div>
        </StepShell>
      )}

      {step === 14 && (
        <StepShell
          eyebrow="Reset PIN"
          title="Verify OTP & Create PIN"
          copy="Enter the OTP code received and select your new 6-digit PIN."
          footer={
            <div className="flex gap-3 w-full">
              <button onClick={() => setStep(13)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-stone-gray cursor-pointer">Back</button>
              <button
                onClick={handleResetPinSubmit}
                disabled={busy || resetOtp.length !== 6 || newPin.length !== 6}
                className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none disabled:opacity-50"
              >
                {busy ? 'Resetting...' : 'Reset PIN & Log In'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                Verification Code
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                <Fingerprint className="h-5 w-5 text-gold" />
                <input
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg tracking-[0.35em] text-ivory outline-none border-none"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                />
              </div>
              {resetDevCode && (
                <p className="m-0 mt-2 text-[10px] text-zinc-500 text-left font-mono">Dev shortcut: {resetDevCode}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                New 6-Digit Security PIN
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                <Lock className="h-5 w-5 text-gold" />
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg tracking-[0.35em] text-ivory outline-none border-none"
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  placeholder="******"
                />
              </div>
            </div>
          </div>
        </StepShell>
      )}

      {step === 15 && (
        <StepShell
          eyebrow="Security PIN"
          title="Configure Security PIN"
          copy="Create a secure 6-digit PIN to authorize future login sessions."
          footer={
            <button
              onClick={handleCreatePinSubmit}
              disabled={busy || newPin.length !== 6 || confirmPin.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-obsidian cursor-pointer border-none disabled:opacity-50"
            >
              {busy ? 'Configuring PIN...' : 'Configure PIN & Continue'}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                Choose 6-Digit PIN
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                <Lock className="h-5 w-5 text-gold" />
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg tracking-[0.35em] text-ivory outline-none border-none"
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  placeholder="******"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-gray text-left">
                Confirm 6-Digit PIN
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-3 py-3">
                <Lock className="h-5 w-5 text-gold" />
                <input
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-center font-mono text-lg tracking-[0.35em] text-ivory outline-none border-none"
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  placeholder="******"
                />
              </div>
            </div>
          </div>
        </StepShell>
      )}
    </div>
  );
}
