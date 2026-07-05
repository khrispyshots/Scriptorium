import { articleApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls the real Producer Agent endpoint (POST /articles/publish-with-ai),
 * which actually runs the x402 pay-per-agent flow server-side, then replays
 * the *real* logs it returns into the terminal UI with a short stagger so
 * the pacing still feels alive. Nothing here is simulated anymore -- the
 * 402 challenges, payments, and agent outputs all really happened by the
 * time this function returns.
 */
export const runProducerOrchestration = async (draftPayload, activeUser, onStepProgress, onLogUpdate) => {
  const logs = [];
  const pushLog = (text) => {
    logs.push({ timestamp: new Date().toLocaleTimeString(), text });
    if (onLogUpdate) onLogUpdate([...logs]);
  };

  const services = [];
  if (draftPayload.useResearch) services.push('research');
  if (draftPayload.useEdit) services.push('edit');
  if (draftPayload.useFactCheck) services.push('factcheck');
  services.push('summary'); // always included, matches the flat fee shown in the UI

  pushLog('Starting Producer Agent workflow...');
  await delay(300);
  pushLog(`Analyzing draft: "${draftPayload.title}"...`);
  await delay(300);
  pushLog(`Requesting ${services.join(', ')} from the agent network...`);

  try {
    const res = await articleApi.publishWithAi({
      title: draftPayload.title,
      body: draftPayload.body,
      category: draftPayload.category,
      unlock_price: draftPayload.unlockPrice,
      services,
    });

    // Replay the real x402 challenge/payment/completion log lines the
    // backend recorded, one at a time, for the terminal effect.
    for (const line of res.run?.logs || []) {
      await delay(350);
      pushLog(line);
    }

    await delay(200);
    pushLog('Producer Agent run complete. Article published.');

    return { success: true, article: res.article, run: res.run };
  } catch (e) {
    if (e instanceof ApiError && e.status === 402) {
      pushLog(`FAILED: insufficient balance. Required: $${e.body?.total_cost ?? '?'} USDC.`);
      return { success: false, error: 'Insufficient wallet balance to pay the requested agents.' };
    }
    pushLog(`FAILED: ${e.message || 'agent execution error'}.`);
    return { success: false, error: e.message || 'Agent execution failed.' };
  }
};
