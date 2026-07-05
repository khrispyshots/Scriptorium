import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { runProducerOrchestration } from '../services/producerService';
import { articleApi } from '../lib/api';
import { 
  Sparkle as Sparkles,
  Terminal, 
  ArrowRight, 
  CheckCircle, 
  ArrowsClockwise as RefreshCw,
  WarningCircle as AlertCircle,
  Lightning as Zap,
  ShieldCheck
} from '@phosphor-icons/react';

export default function CreateArticle() {
  const { currentUser, wallet, agents, reloadFeed, setActiveTab, showToast } = useApp();
  const activeUser = currentUser || {};
  const balance = Number(wallet?.balance?.availableBalance || 0);

  const agentFor = (serviceType) => agents.find((a) => a.serviceType === serviceType);
  const priceFor = (serviceType) => Number(agentFor(serviceType)?.price || 0);

  // Form parameters
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [unlockPrice, setUnlockPrice] = useState('0.01');
  const [aiAssistance, setAiAssistance] = useState(true);

  // Agent choices
  const [useResearch, setUseResearch] = useState(true);
  const [useEdit, setUseEdit] = useState(true);
  const [useFactCheck, setUseFactCheck] = useState(true);

  // Orchestration Simulation States
  const [isProcessing, setIsProcessing] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [tempFinishedArticle, setTempFinishedArticle] = useState(null);
  const [viewStep, setViewStep] = useState('form'); // form | logs | review


  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Calculate pricing requirements from the real agent roster (fetched from
  // the backend on load) rather than hardcoded demo prices.
  const getRequiredCost = () => {
    if (!aiAssistance) return 0;
    return (
      (useResearch ? priceFor('research') : 0) +
      (useEdit ? priceFor('edit') : 0) +
      (useFactCheck ? priceFor('factcheck') : 0) +
      priceFor('summary')
    );
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Please fill out both the title and content body.', 'error');
      return;
    }

    const price = parseFloat(unlockPrice);
    if (isNaN(price) || price < 0) {
      showToast('Invalid unlock price.', 'error');
      return;
    }

    const requiredBudget = getRequiredCost();
    if (aiAssistance && balance < requiredBudget) {
      showToast('Insufficient USDC balance to authorize AI budget. Add funds.', 'error');
      return;
    }

    if (!aiAssistance) {
      // Standard direct publish -- no agents hired, straight to the feed.
      try {
        const created = await articleApi.create({
          title,
          body,
          preview: body.slice(0, 120) + (body.length > 120 ? '...' : ''),
          category,
          unlock_price: price,
        });
        await articleApi.publish(created.id);
        await reloadFeed();
        showToast('Published successfully!', 'success');
        setTitle('');
        setBody('');
        setActiveTab('feed');
      } catch (e) {
        showToast(e.message || 'Could not publish this article.', 'error');
      }
      return;
    }

    // AI Publish Flow - Trigger Orchestrator
    setIsProcessing(true);
    setViewStep('logs');
    setConsoleLogs([]);
    setTempFinishedArticle(null);

    const draftPayload = {
      title,
      body,
      category,
      unlockPrice: price,
      useResearch,
      useEdit,
      useFactCheck
    };

    try {
      const result = await runProducerOrchestration(
        draftPayload,
        activeUser,
        null,
        (updatedLogs) => setConsoleLogs(updatedLogs)
      );

      if (result.success) {
        setTempFinishedArticle(result.article);
        setIsProcessing(false);
        setViewStep('review');
        await reloadFeed();
      } else {
        showToast(result.error || 'Agent execution failed.', 'error');
        setViewStep('form');
        setIsProcessing(false);
      }
    } catch (e) {
      console.error(e);
      alert('An orchestration error occurred.');
      setViewStep('form');
      setIsProcessing(false);
    }
  };

  // The article is already published server-side by the time we reach the
  // review step (publish-with-ai creates + publishes in one call), so this
  // just moves the UI on.
  const handleFinalApprove = () => {
    setViewStep('form');
    setTitle('');
    setBody('');
    setActiveTab('feed');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* View Title */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-gray/10 mb-2">
        <span className="font-bold text-xs tracking-wider text-stone-gray uppercase">
          {viewStep === 'form' && 'Create New Article'}
          {viewStep === 'logs' && 'Agent Orchestrator Ledger'}
          {viewStep === 'review' && 'Review AI Improvements'}
        </span>
        <span className="text-[10px] text-stone-gray font-semibold">
          Step: {viewStep === 'form' ? '1/3' : viewStep === 'logs' ? '2/3' : '3/3'}
        </span>
      </div>

      {/* STEP 1: FORM INPUT */}
      {viewStep === 'form' && (
        <div className="space-y-4 text-left">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. How guild treasuries reward collaborative writing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-obsidian border border-stone-gray/15 rounded-xl px-4 py-2.5 text-xs text-ivory outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
              Content Draft
            </label>
            <textarea
              placeholder="Write your article body here. Click 'Publish with AI' to have Apollo Research references and Veritas checks appended automatically..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows="6"
              className="bg-obsidian border border-stone-gray/15 rounded-xl px-4 py-2.5 text-xs text-ivory outline-none focus:border-gold/40 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Category and Price Layout */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-obsidian border border-stone-gray/15 rounded-xl px-3 py-2.5 text-xs text-ivory outline-none focus:border-gold/40 cursor-pointer"
              >
                {['Crypto', 'AI Agents', 'Economics', 'Philosophy', 'Tutorial'].map(c => (
                  <option key={c} value={c} className="bg-charcoal text-ivory">{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
                Unlock Price (USDC)
              </label>
              <input
                type="number"
                step="0.005"
                min="0"
                placeholder="0.01"
                value={unlockPrice}
                onChange={(e) => setUnlockPrice(e.target.value)}
                className="bg-obsidian border border-stone-gray/15 rounded-xl px-3 py-2.5 text-xs text-ivory outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* AI Assistance Section */}
          <div className="glass-panel rounded-2xl p-4 border border-stone-gray/15 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <span className="text-xs font-bold text-ivory">Publish with AI Agent Network</span>
              </div>
              <input
                type="checkbox"
                checked={aiAssistance}
                onChange={(e) => setAiAssistance(e.target.checked)}
                className="w-4 h-4 rounded border-stone-gray/15 text-gold focus:ring-gold bg-obsidian cursor-pointer"
              />
            </div>

            {aiAssistance && (
              <div className="space-y-2 border-t border-stone-gray/10 pt-3">
                <span className="text-[9px] uppercase font-bold text-stone-gray tracking-wider">
                  Select Specialist Agents (paid from budget):
                </span>
                
                {/* Research agent */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={useResearch}
                      onChange={(e) => setUseResearch(e.target.checked)}
                      className="rounded text-gold focus:ring-gold bg-obsidian border-stone-gray/15"
                    />
                    <div>
                      <span className="text-sand font-medium block">{agentFor('research')?.name || 'Research agent'}</span>
                      <span className="text-[9px] text-stone-gray">Appends citations and verified references.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gold font-bold">{priceFor('research').toFixed(3)} USDC</span>
                </label>

                {/* Editor agent */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={useEdit}
                      onChange={(e) => setUseEdit(e.target.checked)}
                      className="rounded text-gold focus:ring-gold bg-obsidian border-stone-gray/15"
                    />
                    <div>
                      <span className="text-sand font-medium block">{agentFor('edit')?.name || 'Editor agent'}</span>
                      <span className="text-[9px] text-stone-gray">Refines flow and fixes raw structures.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gold font-bold">{priceFor('edit').toFixed(3)} USDC</span>
                </label>

                {/* Fact-check agent */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={useFactCheck}
                      onChange={(e) => setUseFactCheck(e.target.checked)}
                      className="rounded text-gold focus:ring-gold bg-obsidian border-stone-gray/15"
                    />
                    <div>
                      <span className="text-sand font-medium block">{agentFor('factcheck')?.name || 'Fact-check agent'}</span>
                      <span className="text-[9px] text-stone-gray">Performs validity checks on logic claims.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gold font-bold">{priceFor('factcheck').toFixed(3)} USDC</span>
                </label>

                {/* Costs Sum */}
                <div className="flex items-center justify-between border-t border-stone-gray/5 pt-2.5 text-xs">
                  <span className="text-stone-gray">Orchestration Budget Allocation:</span>
                  <span className="font-bold text-emerald-400 font-mono">${getRequiredCost().toFixed(3)} USDC</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/15 bg-emerald-950/15 px-3 py-2 text-[10px]">
                  <span className="flex items-center gap-1.5 text-stone-gray">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Network fee policy
                  </span>
                  <span className="font-bold text-emerald-300">Covered if eligible</span>
                </div>

                {/* Insufficient balance warning */}
                {balance < getRequiredCost() && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex flex-col gap-2 mt-3 text-left">
                    <div className="flex gap-2 items-start text-rose-400 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Insufficient Balance</span>
                        <p className="text-[10px] text-stone-gray m-0 mt-1 leading-normal">
                          Your wallet balance is <strong>${balance.toFixed(4)} USDC</strong>. 
                          You need at least <strong>${getRequiredCost().toFixed(4)} USDC</strong> to authorize the Producer Agent budget.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handlePublish}
            className="w-full bg-gold hover:bg-gold/90 text-obsidian font-bold py-2.5 rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2 text-[11px] tracking-wide"
          >
            {aiAssistance ? 'Trigger Producer Orchestrator' : 'Publish Directly'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: LOGGING OUTPUT STREAM TERMINAL */}
      {viewStep === 'logs' && (
        <div className="flex flex-col gap-4 text-left">
          <div className="glass-panel rounded-2xl border border-stone-gray/15 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs border-b border-stone-gray/10 pb-2 text-stone-gray">
              <Terminal className="w-4 h-4 text-gold" />
              <span>Contributor split ledger</span>
            </div>

            {/* Terminal screen */}
            <div className="bg-obsidian border border-stone-gray/25 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-2 text-emerald-400/90 leading-tight">
              {consoleLogs.map((log, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-stone-gray font-normal select-none">[{log.timestamp}]</span>
                  <span className="whitespace-pre-line">{log.text}</span>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex items-center gap-1.5 text-gold py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Producer Agent compiling...</span>
                </div>
              )}
              
              <div ref={logsEndRef} />
            </div>
            
            <p className="text-[10px] text-stone-gray leading-normal px-1">
              Note: The Producer Agent coordinates contributor settlement through your Scriptora wallet.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW AI CONTENT */}
      {viewStep === 'review' && tempFinishedArticle && (
        <div className="flex flex-col gap-4 text-left">
          <div className="glass-panel rounded-2xl border border-stone-gray/15 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-ivory">Article Finalization Successful</h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
                  Resulting Article Title
                </span>
                <p className="font-display text-sm font-semibold text-sand mt-0.5">
                  {tempFinishedArticle.title}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
                  Content Body (Apollo & Veritas Included)
                </span>
                <div className="bg-obsidian border border-stone-gray/10 rounded-xl p-3 h-48 overflow-y-auto text-xs text-stone-gray leading-relaxed whitespace-pre-line mt-1">
                  {tempFinishedArticle.body}
                </div>
              </div>

              {/* Splits configuration overview */}
              <div className="border-t border-stone-gray/10 pt-3">
                <span className="text-[10px] font-bold text-stone-gray uppercase tracking-wider">
                  Calculated Split Schema (Graph)
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {tempFinishedArticle.contributors.map((c, i) => (
                    <div key={i} className="flex justify-between bg-obsidian/45 border border-stone-gray/5 p-2 rounded text-[10px] text-stone-gray">
                      <span>{c.role}</span>
                      <span className="font-bold text-gold">{c.split}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setViewStep('form')}
                className="flex-1 bg-obsidian hover:bg-stone-gray/10 text-stone-gray text-[11px] font-semibold py-2 rounded-xl border border-stone-gray/15 cursor-pointer transition-colors"
              >
                Discard / Redraft
              </button>
              <button 
                onClick={handleFinalApprove}
                className="flex-1 bg-gold hover:bg-gold/90 text-obsidian text-[11px] font-semibold py-2 rounded-xl cursor-pointer transition-colors shadow-md text-center"
              >
                Approve & Publish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
