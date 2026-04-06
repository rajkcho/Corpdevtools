'use client';

import { useState, useEffect } from 'react';
import { Save, TestTube, Trash2, Download, Upload } from 'lucide-react';

interface AISettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'custom';
  api_key: string;
  model: string;
  base_url: string;
}

const DEFAULT_MODELS: Record<string, { label: string; models: string[] }> = {
  openrouter: {
    label: 'OpenRouter',
    models: [
      'anthropic/claude-sonnet-4',
      'google/gemini-2.5-flash',
      'meta-llama/llama-4-maverick',
      'deepseek/deepseek-chat-v3-0324',
      'mistralai/mistral-large',
    ],
  },
  openai: { label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  anthropic: { label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'] },
  custom: { label: 'Custom (OpenAI-compatible)', models: [] },
};

function getAISettings(): AISettings {
  if (typeof window === 'undefined') return { provider: 'openrouter', api_key: '', model: '', base_url: '' };
  const raw = localStorage.getItem('dealforge_ai_settings');
  return raw ? JSON.parse(raw) : { provider: 'openrouter', api_key: '', model: 'anthropic/claude-sonnet-4', base_url: '' };
}

function saveAISettings(settings: AISettings): void {
  localStorage.setItem('dealforge_ai_settings', JSON.stringify(settings));
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings>(getAISettings());
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    saveAISettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const baseUrl = settings.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : settings.provider === 'openai'
        ? 'https://api.openai.com/v1'
        : settings.provider === 'anthropic'
        ? 'https://api.anthropic.com/v1'
        : settings.base_url;

      if (!settings.api_key) {
        setTestResult('Error: No API key configured');
        setTesting(false);
        return;
      }

      if (settings.provider === 'anthropic') {
        const res = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.api_key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: 50,
            messages: [{ role: 'user', content: 'Reply with just: DealForge AI connected successfully.' }],
          }),
        });
        const data = await res.json();
        if (data.content) {
          setTestResult(`Success: ${data.content[0]?.text || 'Connected'}`);
        } else {
          setTestResult(`Error: ${data.error?.message || JSON.stringify(data)}`);
        }
      } else {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`,
          },
          body: JSON.stringify({
            model: settings.model,
            max_tokens: 50,
            messages: [{ role: 'user', content: 'Reply with just: DealForge AI connected successfully.' }],
          }),
        });
        const data = await res.json();
        if (data.choices) {
          setTestResult(`Success: ${data.choices[0]?.message?.content || 'Connected'}`);
        } else {
          setTestResult(`Error: ${data.error?.message || JSON.stringify(data)}`);
        }
      }
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Connection failed'}`);
    }
    setTesting(false);
  };

  // Data export/import
  const handleExportData = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dealforge_'));
    const data: Record<string, unknown> = {};
    for (const key of keys) {
      data[key] = JSON.parse(localStorage.getItem(key) || '[]');
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dealforge-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('dealforge_')) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
        alert('Data imported successfully. Refresh the page to see changes.');
      } catch {
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (confirm('Are you sure? This will delete ALL DealForge data. This cannot be undone.')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('dealforge_'));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      alert('All data cleared. Refresh the page.');
    }
  };

  const providerConfig = DEFAULT_MODELS[settings.provider];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Configure AI provider and manage your data
        </p>
      </div>

      {/* AI Provider Configuration */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">AI Provider</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Connect an AI provider for meeting note summarization, document analysis, and risk identification.
          OpenRouter gives access to multiple free models.
        </p>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Provider</label>
          <select
            value={settings.provider}
            onChange={e => setSettings(s => ({
              ...s,
              provider: e.target.value as AISettings['provider'],
              model: DEFAULT_MODELS[e.target.value]?.models[0] || '',
            }))}
            className="w-full"
          >
            {Object.entries(DEFAULT_MODELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>API Key</label>
          <input
            type="password"
            value={settings.api_key}
            onChange={e => setSettings(s => ({ ...s, api_key: e.target.value }))}
            placeholder="sk-..."
            className="w-full font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Model</label>
          {providerConfig.models.length > 0 ? (
            <select value={settings.model} onChange={e => setSettings(s => ({ ...s, model: e.target.value }))} className="w-full font-mono text-sm">
              {providerConfig.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input value={settings.model} onChange={e => setSettings(s => ({ ...s, model: e.target.value }))} placeholder="model-name" className="w-full font-mono" />
          )}
        </div>

        {settings.provider === 'custom' && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Base URL</label>
            <input value={settings.base_url} onChange={e => setSettings(s => ({ ...s, base_url: e.target.value }))} placeholder="https://api.example.com/v1" className="w-full font-mono" />
          </div>
        )}

        {testResult && (
          <div className="p-3 rounded-lg text-sm" style={{
            background: testResult.startsWith('Success') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: testResult.startsWith('Success') ? 'var(--success)' : 'var(--danger)',
          }}>
            {testResult}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={14} /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
          <button onClick={handleTest} disabled={testing || !settings.api_key} className="btn btn-secondary">
            <TestTube size={14} /> {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Data Management</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          All data is stored locally in your browser. Export regularly to avoid data loss.
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportData} className="btn btn-secondary">
            <Download size={14} /> Export All Data
          </button>
          <label className="btn btn-secondary cursor-pointer">
            <Upload size={14} /> Import Data
            <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
          </label>
          <button onClick={handleClearData} className="btn btn-danger">
            <Trash2 size={14} /> Clear All Data
          </button>
        </div>
      </div>

      {/* Demo Data */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Demo Data</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Load sample targets, touchpoints, a DD project with risks and findings to explore the platform.
          Includes 10 sample VMS companies across various verticals with realistic data.
        </p>
        <button
          onClick={() => {
            import('@/lib/seed').then(mod => {
              if (mod.hasDemoData()) {
                if (!confirm('You already have data. Loading demo data will add to it. Continue?')) return;
              }
              mod.seedDemoData();
              alert('Demo data loaded! Navigate to Pipeline or Dashboard to see it.');
            });
          }}
          className="btn btn-secondary"
        >
          Load Demo Data
        </button>
      </div>
    </div>
  );
}
