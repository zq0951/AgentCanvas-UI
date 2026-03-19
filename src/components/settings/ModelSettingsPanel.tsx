'use client';

import React, { useState, useEffect } from 'react';
import { Save, Globe, Cpu, Key, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface ModelConfig {
  provider: 'openai' | 'gemini' | 'ollama' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt?: string;
  zeroFrictionCount?: number;
  autoReadClipboard?: boolean;
}

export default function ModelSettingsPanel() {
  const [config, setConfig] = useState<ModelConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    systemPrompt: '',
    zeroFrictionCount: 3,
    autoReadClipboard: false,
  });
  
  const [isSaved, setIsSaved] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nexus-model-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig({
          ...parsed,
          systemPrompt: parsed.systemPrompt ?? '',
          zeroFrictionCount: parsed.zeroFrictionCount ?? 3,
          autoReadClipboard: parsed.autoReadClipboard ?? false,
        });
      } catch (e) {
        console.error('Failed to parse config');
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('nexus-model-config', JSON.stringify(config));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const fetchModels = async () => {
    const isLocalProvider = config.provider === 'ollama' || config.provider === 'custom';
    if (!config.apiKey && !isLocalProvider) {
      setFetchError("API KEY REQUIRED FOR FETCH");
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      const models = data.models || [];
      
      if (models.length === 0) {
        setFetchError("NO MODELS FOUND IN RESPONSE");
      } else {
        setAvailableModels(models);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setFetchError(err.message || "CONNECTION FAILED");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Globe size={16} className="text-slate-500" />
          API Provider
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(['openai', 'gemini', 'ollama', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                const defaults: Record<string, Partial<ModelConfig>> = {
                  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
                  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3-flash-preview' },
                  ollama: { baseUrl: 'http://localhost:11434/api', model: 'llama3' },
                  custom: { baseUrl: '', model: '' }
                };
                setConfig({ ...config, provider: p, ...defaults[p] });
                setAvailableModels([]);
                setFetchError(null);
              }}
              className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left flex flex-col gap-1 ${
                config.provider === p 
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]' 
                  : 'border-slate-200 text-slate-700 hover:border-slate-400 bg-white'
              }`}
            >
              <span className="capitalize">{p}</span>
              <span className={`text-[10px] font-medium ${config.provider === p ? 'text-slate-300' : 'text-slate-400'}`}>
                {p === 'ollama' ? 'Local Inference' : 'Cloud Service'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
            <Key size={12} />
            API Key
          </label>
          <input 
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder={(config.provider === 'ollama' || config.provider === 'custom') ? 'Not required for local/custom' : 'Paste your API key here'}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
            <Globe size={12} />
            Endpoint URL
          </label>
          <input 
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
              <Cpu size={12} />
              Model Selection
            </label>
            <button 
              onClick={fetchModels}
              disabled={isFetching}
              className="px-2 py-1 rounded-md hover:bg-slate-100 text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'FETCHING...' : 'FETCH AVAILABLE MODELS'}
            </button>
          </div>
          
          <div className="relative">
            <input 
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="Select or type model ID"
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm"
            />
            
            {/* Quick Select Dropdown */}
            {availableModels.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[110] max-h-60 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 border-t-4 border-t-indigo-500">
                <div className="px-2 py-1.5 mb-1 text-[10px] font-bold text-slate-400 border-b border-slate-50 flex justify-between items-center">
                  <span>FOUND {availableModels.length} MODELS</span>
                  <button onClick={() => setAvailableModels([])} className="hover:text-slate-900">CLOSE</button>
                </div>
                {availableModels.map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setConfig({...config, model: m});
                      setAvailableModels([]);
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors border-b border-slate-50 last:border-0"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {fetchError && (
            <div className="flex items-center gap-1.5 mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-red-600">
              <AlertCircle size={12} className="shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-tight leading-none">{fetchError}</span>
            </div>
          )}
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
            <Sparkles size={12} />
            System Prompt
          </label>
          <textarea 
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            rows={3}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-sm resize-none"
          />
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
              Zero-Friction Buttons
            </label>
            <input 
              type="number"
              min={0}
              max={10}
              value={config.zeroFrictionCount}
              onChange={(e) => setConfig({ ...config, zeroFrictionCount: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-bold focus:border-slate-900 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
              Auto Clipboard
            </label>
            <button
              onClick={() => setConfig({ ...config, autoReadClipboard: !config.autoReadClipboard })}
              className={`w-full px-4 py-2 rounded-xl border text-sm font-bold transition-all flex items-center justify-between ${
                config.autoReadClipboard 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <span>{config.autoReadClipboard ? 'ENABLED' : 'DISABLED'}</span>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${config.autoReadClipboard ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.autoReadClipboard ? 'left-4.5' : 'left-0.5'}`} style={{ left: config.autoReadClipboard ? '1.125rem' : '0.125rem' }} />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 active:scale-[0.98] border border-slate-800"
        >
          {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaved ? 'CONFIGURATION SAVED' : 'SAVE CHANGES'}
        </button>

        <p className="text-[10px] text-slate-400 text-center font-bold leading-relaxed tracking-tight">
          PRIVATE STORAGE: Keys are stored locally in your browser session. <br />
          NexusBoard never logs or transmits your sensitive credentials.
        </p>
      </div>
    </div>
  );
}
