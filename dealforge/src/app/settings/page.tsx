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
    localStorage.setItem('dealforge_last_backup', new Date().toISOString());
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

      {/* Storage Stats */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Storage Usage</h2>
        {(() => {
          const keys = typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('dealforge_')) : [];
          const totalBytes = keys.reduce((sum, k) => sum + (localStorage.getItem(k)?.length || 0) * 2, 0);
          const dataBreakdown = keys.map(k => {
            const size = (localStorage.getItem(k)?.length || 0) * 2;
            const items = (() => { try { const d = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(d) ? d.length : 1; } catch { return 1; } })();
            return { key: k.replace('dealforge_', ''), size, items };
          }).sort((a, b) => b.size - a.size);
          const lastBackup = typeof window !== 'undefined' ? localStorage.getItem('dealforge_last_backup') : null;

          return (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono">{(totalBytes / 1024).toFixed(0)}KB</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Storage</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono">{keys.length}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Data Collections</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: 'var(--background)' }}>
                  <div className="text-lg font-bold font-mono" style={{ color: lastBackup ? 'var(--success)' : 'var(--warning)' }}>
                    {lastBackup ? `${Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)}d` : 'Never'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Last Backup</div>
                </div>
              </div>
              <div className="space-y-1">
                {dataBreakdown.filter(d => d.size > 0).map(d => (
                  <div key={d.key} className="flex items-center justify-between text-xs py-1">
                    <span className="capitalize" style={{ color: 'var(--muted-foreground)' }}>{d.key.replace(/_/g, ' ')}</span>
                    <span className="font-mono" style={{ color: 'var(--muted)' }}>{d.items} items · {(d.size / 1024).toFixed(1)}KB</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Outreach Settings */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Outreach Settings</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Default sender information used in outreach email templates, LOI generation, and document headers.
        </p>
        {(() => {
          const [outreach, setOutreach] = useState(() => {
            if (typeof window === 'undefined') return { senderName: '', senderTitle: '', companyName: '', senderEmail: '', senderPhone: '' };
            const raw = localStorage.getItem('dealforge_outreach_settings');
            return raw ? JSON.parse(raw) : { senderName: '', senderTitle: 'Director, M&A', companyName: '', senderEmail: '', senderPhone: '' };
          });
          const [outreachSaved, setOutreachSaved] = useState(false);

          return (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Your Name</label>
                  <input value={outreach.senderName} onChange={e => setOutreach((s: typeof outreach) => ({ ...s, senderName: e.target.value }))} placeholder="John Smith" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Title</label>
                  <input value={outreach.senderTitle} onChange={e => setOutreach((s: typeof outreach) => ({ ...s, senderTitle: e.target.value }))} placeholder="Director, M&A" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Company Name</label>
                  <input value={outreach.companyName} onChange={e => setOutreach((s: typeof outreach) => ({ ...s, companyName: e.target.value }))} placeholder="Your Company" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</label>
                  <input value={outreach.senderEmail} onChange={e => setOutreach((s: typeof outreach) => ({ ...s, senderEmail: e.target.value }))} placeholder="you@company.com" type="email" className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</label>
                  <input value={outreach.senderPhone} onChange={e => setOutreach((s: typeof outreach) => ({ ...s, senderPhone: e.target.value }))} placeholder="+1 (555) 123-4567" className="w-full" />
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('dealforge_outreach_settings', JSON.stringify(outreach));
                  setOutreachSaved(true);
                  setTimeout(() => setOutreachSaved(false), 2000);
                }}
                className="btn btn-primary"
              >
                <Save size={14} /> {outreachSaved ? 'Saved!' : 'Save Outreach Settings'}
              </button>
            </>
          );
        })()}
      </div>

      {/* Data Integrity */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Data Integrity Check</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Verify data consistency across all collections and identify orphaned records.
        </p>
        {(() => {
          const [results, setResults] = useState<{ label: string; status: 'ok' | 'warning' | 'error'; detail: string }[] | null>(null);

          const runCheck = () => {
            const issues: { label: string; status: 'ok' | 'warning' | 'error'; detail: string }[] = [];

            const targets = JSON.parse(localStorage.getItem('dealforge_targets') || '[]');
            const touchpoints = JSON.parse(localStorage.getItem('dealforge_touchpoints') || '[]');
            const contacts = JSON.parse(localStorage.getItem('dealforge_contacts') || '[]');
            const ddProjects = JSON.parse(localStorage.getItem('dealforge_dd_projects') || '[]');
            const targetIds = new Set(targets.map((t: { id: string }) => t.id));

            // Check targets have required fields
            const badTargets = targets.filter((t: { name?: string; stage?: string }) => !t.name || !t.stage);
            issues.push({
              label: 'Target data quality',
              status: badTargets.length > 0 ? 'warning' : 'ok',
              detail: badTargets.length > 0 ? `${badTargets.length} targets missing name or stage` : `${targets.length} targets valid`,
            });

            // Orphaned touchpoints
            const orphanedTPs = touchpoints.filter((tp: { target_id: string }) => !targetIds.has(tp.target_id));
            issues.push({
              label: 'Touchpoint references',
              status: orphanedTPs.length > 0 ? 'warning' : 'ok',
              detail: orphanedTPs.length > 0 ? `${orphanedTPs.length} touchpoints reference deleted targets` : `${touchpoints.length} touchpoints valid`,
            });

            // Orphaned contacts
            const orphanedContacts = contacts.filter((c: { target_id: string }) => !targetIds.has(c.target_id));
            issues.push({
              label: 'Contact references',
              status: orphanedContacts.length > 0 ? 'warning' : 'ok',
              detail: orphanedContacts.length > 0 ? `${orphanedContacts.length} contacts reference deleted targets` : `${contacts.length} contacts valid`,
            });

            // DD projects referencing valid targets
            const orphanedDD = ddProjects.filter((p: { target_id: string }) => !targetIds.has(p.target_id));
            issues.push({
              label: 'DD project references',
              status: orphanedDD.length > 0 ? 'warning' : 'ok',
              detail: orphanedDD.length > 0 ? `${orphanedDD.length} DD projects reference deleted targets` : `${ddProjects.length} DD projects valid`,
            });

            // Targets in advanced stages without contacts
            const advancedNoContacts = targets.filter((t: { id: string; stage: string }) =>
              ['loi_submitted', 'loi_signed', 'due_diligence', 'closing'].includes(t.stage) &&
              !contacts.some((c: { target_id: string }) => c.target_id === t.id)
            );
            issues.push({
              label: 'Advanced targets with contacts',
              status: advancedNoContacts.length > 0 ? 'warning' : 'ok',
              detail: advancedNoContacts.length > 0 ? `${advancedNoContacts.length} advanced targets missing contacts` : 'All advanced targets have contacts',
            });

            // Targets in DD without DD project
            const ddTargetsNoProject = targets.filter((t: { id: string; stage: string }) =>
              t.stage === 'due_diligence' && !ddProjects.some((p: { target_id: string }) => p.target_id === t.id)
            );
            issues.push({
              label: 'DD targets have projects',
              status: ddTargetsNoProject.length > 0 ? 'warning' : 'ok',
              detail: ddTargetsNoProject.length > 0 ? `${ddTargetsNoProject.length} targets in DD stage without a DD project` : 'All DD targets have projects',
            });

            setResults(issues);
          };

          return (
            <>
              <button onClick={runCheck} className="btn btn-secondary">
                Run Integrity Check
              </button>
              {results && (
                <div className="space-y-2 mt-3">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--background)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{
                          background: r.status === 'ok' ? 'var(--success)' : r.status === 'warning' ? 'var(--warning)' : 'var(--danger)',
                        }} />
                        <span className="text-sm font-medium">{r.label}</span>
                      </div>
                      <span className="text-xs" style={{ color: r.status === 'ok' ? 'var(--success)' : 'var(--warning)' }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
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

      {/* Keyboard Shortcuts Reference */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {[
            { keys: '⌘K / Ctrl+K', description: 'Open command palette / global search' },
            { keys: '?', description: 'Show keyboard shortcuts overlay' },
            { keys: 'G then D', description: 'Go to Dashboard' },
            { keys: 'G then P', description: 'Go to Pipeline' },
            { keys: 'G then T', description: 'Go to Targets' },
            { keys: 'G then A', description: 'Go to Analytics' },
            { keys: 'G then I', description: 'Go to Due Diligence' },
            { keys: 'G then O', description: 'Go to Outreach' },
            { keys: 'G then S', description: 'Go to Settings' },
            { keys: 'ESC', description: 'Close modals and overlays' },
          ].map(s => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span className="text-sm">{s.description}</span>
              <kbd className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
