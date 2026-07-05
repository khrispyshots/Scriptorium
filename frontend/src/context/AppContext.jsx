import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { encryptPrivateKey, decryptPrivateKey } from '../lib/crypto';
import { generateEvmWallet, validatePrivateKey } from '../lib/wallet';
import {
  authApi,
  userApi,
  feedApi,
  articleApi,
  agentApi,
  walletApi,
  badgeApi,
  referralApi,
} from '../lib/api';
import { isAuthenticated as hasToken } from '../lib/apiClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // --- Server-backed state ---
  const [currentUser, setCurrentUser] = useState(null); // full user + creatorProfile
  const [wallet, setWallet] = useState(null); // { wallet, balance }
  const [agents, setAgents] = useState([]);
  const [articles, setArticles] = useState([]);
  const [follows, setFollows] = useState([]); // [{ followingId, followingType }]
  const [badges, setBadges] = useState({ earned: [], progress: [] });
  const [referral, setReferral] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState(() => new Set());

  // --- UI-only state ---
  const [activeTab, setActiveTab] = useState('feed');
  const [activeArticle, setActiveArticle] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(
    localStorage.getItem('onboardingComplete') === 'true' && hasToken()
  );
  const [identityState, setIdentityState] = useState({
    email: localStorage.getItem('scriptoraIdentityEmail') || '',
    otpSent: false,
    otpVerified: hasToken(),
    sessionStatus: hasToken() ? 'Active session' : 'Anonymous',
    walletStatus: 'Not created',
    walletMode: 'Circle SCA',
    trustedDevice: 'Current device',
    devCode: null,
  });
  // Kept as a lightweight UI concept (network fees covered by the app during
  // onboarding-style actions) -- there's no backend endpoint for this yet,
  // so it's local-only rather than fabricated business data.
  const [sponsorshipLedger, setSponsorshipLedger] = useState([]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const recordSponsorship = (action, policy = 'Smart sponsorship policy') => {
    setSponsorshipLedger((prev) => [
      { id: `sp-${Date.now()}`, action, policy, amount: 0, status: 'covered', createdAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  // --- Data loading -------------------------------------------------
  const loadFeed = useCallback(async () => {
    try {
      const res = await feedApi.index();
      setArticles(res.data || res || []);
    } catch (e) {
      showToast('Could not load the feed. Retrying may help.', 'error');
    }
  }, [showToast]);

  const loadAgents = useCallback(async () => {
    try {
      setAgents(await agentApi.list());
    } catch (e) {
      // non-critical
    }
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const data = await walletApi.me();
      if (data && data.hasWallet) {
        setWallet(data);
        setIdentityState((prev) => ({ ...prev, walletStatus: 'Healthy', walletMode: 'Embedded Encrypted' }));
        return data;
      } else {
        setWallet(null);
        setIdentityState((prev) => ({ ...prev, walletStatus: 'Not created' }));
        return null;
      }
    } catch (e) {
      setWallet(null);
      return null;
    }
  }, []);

  const loadFollows = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setFollows(await userApi.following(userId));
    } catch (e) {
      // non-critical
    }
  }, []);

  const loadBadges = useCallback(async () => {
    try {
      setBadges(await badgeApi.me());
    } catch (e) {
      // non-critical
    }
  }, []);

  const loadReferral = useCallback(async () => {
    try {
      setReferral(await referralApi.me());
    } catch (e) {
      // non-critical
    }
  }, []);

  const loadSession = useCallback(async () => {
    if (!hasToken()) return;
    try {
      const user = await authApi.me();
      setCurrentUser(user);
      setIdentityState((prev) => ({ ...prev, email: user.email, otpVerified: true, sessionStatus: 'Active session' }));
      await Promise.all([loadWallet(), loadFollows(user.id), loadBadges(), loadReferral()]);
    } catch (e) {
      // token invalid/expired
      authApi.logout();
      setCurrentUser(null);
      setIsOnboardingComplete(false);
    }
  }, [loadWallet, loadFollows, loadBadges, loadReferral]);

  useEffect(() => {
    loadFeed();
    loadAgents();
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auth -----------------------------------------------------------
  const sendOtp = async (emailAddress) => {
    const normalized = emailAddress.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      showToast('Enter a valid email address first.', 'error');
      return false;
    }
    try {
      const res = await authApi.requestOtp(normalized);
      setIdentityState((prev) => ({
        ...prev,
        email: normalized,
        otpSent: true,
        otpVerified: false,
        sessionStatus: 'OTP sent',
        devCode: res.devCode || null,
      }));
      localStorage.setItem('scriptoraIdentityEmail', normalized);
      showToast(res.devCode ? `Code sent. Dev shortcut: ${res.devCode}` : 'One-time code sent to your email.', 'success');
      return true;
    } catch (e) {
      showToast(e.message || 'Could not send the code. Try again.', 'error');
      return false;
    }
  };

  const verifyOtp = async (code, extra = {}) => {
    try {
      const res = await authApi.verifyOtp({ email: identityState.email, code, ...extra });
      if (res.pin_required) {
        showToast('OTP verified. Enter your PIN to continue.', 'info');
        return res;
      }
      setCurrentUser(res.user);
      setIdentityState((prev) => ({ ...prev, otpVerified: true, sessionStatus: 'Active session', walletStatus: 'Syncing' }));
      await Promise.all([loadWallet(), loadFollows(res.user.id), loadBadges(), loadReferral()]);
      showToast('Email verified.', 'success');
      return true;
    } catch (e) {
      showToast(e.message || 'Invalid or expired code.', 'error');
      return false;
    }
  };

  const verifyPin = async (email, pin) => {
    try {
      const res = await authApi.verifyPin({ email, pin });
      setCurrentUser(res.user);
      setIdentityState((prev) => ({ ...prev, otpVerified: true, sessionStatus: 'Active session', walletStatus: 'Syncing' }));
      await Promise.all([loadWallet(), loadFollows(res.user.id), loadBadges(), loadReferral()]);
      showToast('PIN verified.', 'success');
      return true;
    } catch (e) {
      showToast(e.message || 'Incorrect PIN.', 'error');
      return false;
    }
  };

  const forgotPin = async (email) => {
    try {
      const res = await authApi.forgotPin(email);
      showToast('Forgot PIN OTP code sent to your email.', 'success');
      return res;
    } catch (e) {
      showToast(e.message || 'Failed to request OTP.', 'error');
      return null;
    }
  };

  const resetPin = async (email, code, pin) => {
    try {
      const res = await authApi.resetPin({ email, code, pin });
      setCurrentUser(res.user);
      setIdentityState((prev) => ({ ...prev, otpVerified: true, sessionStatus: 'Active session', walletStatus: 'Syncing' }));
      await Promise.all([loadWallet(), loadFollows(res.user.id), loadBadges(), loadReferral()]);
      showToast('PIN reset successfully. Logged in.', 'success');
      return true;
    } catch (e) {
      showToast(e.message || 'Failed to reset PIN.', 'error');
      return false;
    }
  };

  const setPin = async (pin) => {
    try {
      const res = await userApi.setPin(pin);
      setCurrentUser(res.user);
      showToast('Security PIN configured.', 'success');
      return true;
    } catch (e) {
      showToast(e.message || 'Failed to configure PIN.', 'error');
      return false;
    }
  };

  const updateProfile = async (patch) => {
    try {
      const updated = await userApi.updateMe(patch);
      setCurrentUser(updated);
      return true;
    } catch (e) {
      showToast(e.message || 'Could not save your profile.', 'error');
      return false;
    }
  };

  const restoreWalletLifecycle = async () => {
    const data = await loadWallet();
    if (data) {
      showToast('Wallet restored.', 'success');
    }
    return data;
  };

  const createWalletLifecycle = async (pin) => {
    try {
      if (!pin || pin.length !== 6) {
        throw new Error('A 6-digit App PIN is required to secure your wallet.');
      }

      const existingWallet = await loadWallet();
      if (existingWallet?.hasWallet && existingWallet?.wallet?.walletAddress) {
        return existingWallet.wallet;
      }

      const generatedWallet = generateEvmWallet();
      const walletAddress = generatedWallet.address;
      let privateKey = generatedWallet.privateKey;

      const encryptedVault = await encryptPrivateKey(privateKey, pin);
      privateKey = '';

      const res = await walletApi.create({
        walletAddress,
        encryptedPrivateKey: encryptedVault.ciphertext,
        salt: encryptedVault.salt,
        iv: encryptedVault.iv,
        kdf: encryptedVault.kdf,
        kdfParams: encryptedVault.kdfParams,
        algorithm: encryptedVault.algorithm
      });

      if (res && res.wallet) {
        showToast('Wallet generated and securely encrypted.', 'success');
        await loadWallet();
        return res.wallet;
      }
      return null;
    } catch (e) {
      showToast(e.message || 'Failed to create wallet.', 'error');
      return null;
    }
  };

  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    localStorage.setItem('onboardingComplete', 'true');
    showToast('Welcome to Scriptorium!', 'success');
  };

  const logout = () => {
    authApi.logout();
    setCurrentUser(null);
    setWallet(null);
    setFollows([]);
    setBadges({ earned: [], progress: [] });
    setReferral(null);
    setUnlockedIds(new Set());
    setIsOnboardingComplete(false);
    localStorage.setItem('onboardingComplete', 'false');
    setActiveTab('feed');
    showToast('Signed out.', 'info');
  };
  // Kept for backward-compatible naming in a couple of older call sites.
  const resetOnboarding = logout;

  const withdrawFunds = async (amount, recipientAddress) => {
    try {
      const withdrawal = await walletApi.withdraw(amount, recipientAddress);
      await loadWallet();
      showToast(`Withdrawal of ${amount} USDC submitted.`, 'success');
      return withdrawal;
    } catch (e) {
      showToast(e.message || 'Withdrawal failed.', 'error');
      return null;
    }
  };

  const requestExportOtp = async () => {
    try {
      const res = await walletApi.requestExportOtp();
      showToast('Export verification OTP sent to your email.', 'success');
      return res;
    } catch (e) {
      showToast(e.message || 'Failed to request export OTP.', 'error');
      return null;
    }
  };

  const exportPrivateKey = async (code, pin) => {
    try {
      const verifyRes = await walletApi.verifyExportOtp(code);
      if (!verifyRes || !verifyRes.sessionId) {
        showToast('Invalid OTP verification code.', 'error');
        return null;
      }

      const vault = await walletApi.getExportVault(verifyRes.sessionId);
      if (!vault || !vault.encryptedPrivateKey) {
        showToast('Could not fetch wallet credentials.', 'error');
        return null;
      }

      const decryptedKey = await decryptPrivateKey(
        vault.encryptedPrivateKey,
        vault.salt,
        vault.iv,
        pin
      );
      const verified = validatePrivateKey(decryptedKey);

      showToast('Credentials successfully decrypted locally.', 'success');
      return verified.privateKey;
    } catch (e) {
      showToast('OTP verification or PIN decryption failed.', 'error');
      return null;
    }
  };

  // --- Follow -----------------------------------------------------------
  const toggleFollow = async (entityId, entityType = 'creator') => {
    const isFollowing = follows.some((f) => f.followingId === entityId);
    try {
      if (isFollowing) {
        await userApi.unfollow(entityId, entityType);
        setFollows((prev) => prev.filter((f) => f.followingId !== entityId));
      } else {
        await userApi.follow(entityId, entityType);
        setFollows((prev) => [...prev, { followingId: entityId, followingType: entityType }]);
        recordSponsorship('Follow creator', 'Always sponsored');
      }
    } catch (e) {
      showToast(e.message || 'Could not update follow status.', 'error');
    }
  };

  // --- Articles: unlock / tip / publish --------------------------------
  const incrementViews = () => {
    // View counts are incremented server-side (GET /articles/:slug); this
    // is a no-op kept so existing call sites don't need to change.
  };

  const unlockArticle = async (articleId) => {
    try {
      await articleApi.unlock(articleId);
      setUnlockedIds((prev) => new Set(prev).add(articleId));
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, unlockCount: (a.unlockCount || 0) + 1 } : a))
      );
      showToast('Article unlocked!', 'success');
      return true;
    } catch (e) {
      if (e.status === 402) {
        showToast('Not enough USDC in your wallet to unlock this.', 'error');
      } else {
        showToast(e.message || 'Could not unlock this article.', 'error');
      }
      return false;
    }
  };

  const tipArticle = async (articleId, amount, destinationMode = 'entire_team') => {
    try {
      await articleApi.tip(articleId, amount, destinationMode);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, supportCount: (a.supportCount || 0) + 1 } : a))
      );
      recordSponsorship('Creator support', 'Sponsored once per user');
      showToast(`Sent $${amount} in support!`, 'success');
      return true;
    } catch (e) {
      if (e.status === 402) {
        showToast('Not enough USDC in your wallet to send this tip.', 'error');
      } else {
        showToast(e.message || 'Could not send your tip.', 'error');
      }
      return false;
    }
  };

  const addArticle = (newArticle) => {
    setArticles((prev) => [newArticle, ...prev]);
    showToast('Published successfully!', 'success');
  };

  const isUnlocked = (article) => {
    if (!article) return false;
    if (!article.isPaid) return true;
    if (currentUser && article.creatorId === currentUser.id) return true;
    return unlockedIds.has(article.id);
  };

  // Creators surfaced during onboarding's "follow creators" step -- pulled
  // from real published articles instead of fixed demo personas.
  const suggestedCreators = React.useMemo(() => {
    const seen = new Map();
    for (const a of articles) {
      if (a.creator && a.creator.id !== currentUser?.id && !seen.has(a.creator.id)) {
        seen.set(a.creator.id, a.creator);
      }
    }
    return Array.from(seen.values()).slice(0, 5);
  }, [articles, currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        wallet,
        agents,
        articles,
        follows,
        badges,
        referral,
        suggestedCreators,
        activeTab,
        setActiveTab,
        activeArticle,
        setActiveArticle,
        toasts,
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
        sponsorshipLedger,
        recordSponsorship,
        toggleFollow,
        unlockArticle,
        tipArticle,
        addArticle,
        setArticles,
        isUnlocked,
        incrementViews,
        isOnboardingComplete,
        completeOnboarding,
        resetOnboarding,
        logout,
        theme,
        toggleTheme,
        withdrawFunds,
        requestExportOtp,
        exportPrivateKey,
        selectedProfileId,
        setSelectedProfileId,
        reloadFeed: loadFeed,
        reloadWallet: loadWallet,
        reloadBadges: loadBadges,
      }}
    >
      {children}
      <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium border pointer-events-auto transition-all duration-300 transform translate-y-0 opacity-100 flex items-center justify-between ${toast.type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                  ? 'bg-rose-950/85 border-rose-500/30 text-rose-200'
                  : 'bg-charcoal/90 border-stone-gray/20 text-ivory'
              }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-3 hover:text-white text-stone-gray font-bold text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
