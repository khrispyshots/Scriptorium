import { http, setToken } from './apiClient';

// --- shape adapters --------------------------------------------------
// The backend returns article_contributors rows; the frontend (originally
// built against mock data) expects a flatter `contributors` array. Adapting
// here means the page components don't need to know about the difference.
function adaptArticle(article) {
  if (!article) return article;
  return {
    ...article,
    unlockPrice: Number(article.unlockPrice || 0),
    unlockCount: article.unlocksCount ?? article.unlockCount ?? 0,
    supportCount: article.tipsCount ?? article.supportCount ?? 0,
    contributors: (article.contributors || article.articleContributors || []).map((c) => ({
      id: c.contributorId,
      role: c.role,
      type: c.contributorType,
      split: Number(c.splitPercentage),
      earned: Number(c.amountEarned || 0),
    })),
  };
}

// --- auth --------------------------------------------------------------
export const authApi = {
  requestOtp: (email) => http.post('/auth/request-otp', { email }, { auth: false }),
  verifyOtp: async ({ email, code, username, displayName, referralCode }) => {
    const data = await http.post('/auth/verify-otp', {
      email,
      code,
      username,
      display_name: displayName,
      referral_code: referralCode,
    }, { auth: false });
    if (data.token) setToken(data.token);
    return data;
  },
  verifyPin: async ({ email, pin }) => {
    const data = await http.post('/auth/verify-pin', { email, pin }, { auth: false });
    if (data.token) setToken(data.token);
    return data;
  },
  forgotPin: (email) => http.post('/auth/forgot-pin', { email }, { auth: false }),
  resetPin: async ({ email, code, pin }) => {
    const data = await http.post('/auth/reset-pin', { email, code, pin }, { auth: false });
    if (data.token) setToken(data.token);
    return data;
  },
  me: () => http.get('/auth/me'),
  logout: () => setToken(null),
};

// --- users / follow ------------------------------------------------------
export const userApi = {
  getByUsername: (username) => http.get(`/users/${username}`),
  updateMe: (patch) => http.patch('/users/me', patch),
  setPin: (pin) => http.post('/users/set-pin', { pin }),
  follow: (followingId, followingType = 'creator') =>
    http.post('/users/follow', { following_id: followingId, following_type: followingType }),
  unfollow: (followingId, followingType = 'creator') =>
    http.post('/users/unfollow', { following_id: followingId, following_type: followingType }),
  followers: (userId) => http.get(`/follow/${userId}/followers`, { auth: false }),
  following: (userId) => http.get(`/follow/${userId}/following`, { auth: false }),
};

// --- feed / articles -----------------------------------------------------
function adaptFeedPage(res) {
  if (Array.isArray(res)) return res.map(adaptArticle);
  if (res && Array.isArray(res.data)) return { ...res, data: res.data.map(adaptArticle) };
  return res;
}

export const feedApi = {
  index: (page = 1) => http.get(`/feed?page=${page}`, { auth: false }).then(adaptFeedPage),
  trending: () => http.get('/feed/trending', { auth: false }).then(adaptFeedPage),
  category: (category) => http.get(`/feed/category/${category}`, { auth: false }).then(adaptFeedPage),
};

export const articleApi = {
  create: (draft) => http.post('/articles', draft).then(adaptArticle),
  show: (slug) => http.get(`/articles/${slug}`, { auth: false }).then(adaptArticle),
  update: (id, patch) => http.patch(`/articles/${id}`, patch).then(adaptArticle),
  publish: (id) => http.post(`/articles/${id}/publish`).then(adaptArticle),
  publishWithAi: (draft) =>
    http.post('/articles/publish-with-ai', draft).then((res) => ({
      ...res,
      article: adaptArticle(res.article),
    })),
  unlock: (id) => http.post(`/articles/${id}/unlock`),
  access: (id) => http.get(`/articles/${id}/access`),
  tip: (id, amount, destinationMode = 'entire_team') =>
    http.post(`/articles/${id}/tip`, { amount, destinationMode: destinationMode }),
};

// --- agents / producer -----------------------------------------------------
export const agentApi = {
  list: () => http.get('/agents', { auth: false }),
  show: (id) => http.get(`/agents/${id}`, { auth: false }),
};

export const producerApi = {
  plan: (payload) => http.post('/producer/plan', payload),
  run: (runId) => http.post(`/producer/run/${runId}`),
  show: (runId) => http.get(`/producer/runs/${runId}`),
};

// --- wallet -----------------------------------------------------------
export const walletApi = {
  me: () => http.get('/wallet/me'),
  create: (payload) => http.post('/wallet/create', payload),
  fund: (amount) => http.post('/wallet/fund', { amount }),
  withdraw: (amount, recipientAddress) =>
    http.post('/wallet/withdraw', { amount, recipient_address: recipientAddress }),
  requestExportOtp: () => http.post('/wallet/export/request-otp'),
  verifyExportOtp: (code) => http.post('/wallet/export/verify-otp', { code }),
  getExportVault: (sessionId) => http.get(`/wallet/export/vault?session_id=${sessionId}`),
};

// --- payments -----------------------------------------------------------
export const paymentApi = {
  show: (id) => http.get(`/payments/${id}`),
  byUser: (userId) => http.get(`/payments/user/${userId}`),
  byArticle: (articleId) => http.get(`/payments/article/${articleId}`),
};

// --- referrals -----------------------------------------------------------
export const referralApi = {
  me: () => http.get('/referrals/me'),
  claim: () => http.post('/referrals/claim'),
  rewards: () => http.get('/referrals/rewards'),
};

// --- badges -----------------------------------------------------------
export const badgeApi = {
  list: () => http.get('/badges', { auth: false }),
  me: () => http.get('/badges/me'),
  evaluate: () => http.post('/badges/evaluate'),
};

// --- earnings -----------------------------------------------------------
export const earningsApi = {
  me: () => http.get('/earnings/me'),
  article: (id) => http.get(`/earnings/articles/${id}`),
  agent: (id) => http.get(`/earnings/agents/${id}`),
};

// --- leaderboard -----------------------------------------------------------
export const leaderboardApi = {
  get: (category, window = 'all_time') =>
    http.get(`/leaderboard?category=${category}&window=${window}`, { auth: false }),
};

export { adaptArticle };
