'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertTriangle, X, Download } from 'lucide-react';
import { createTarget } from '@/lib/db';
import type { DealStage, Vertical } from '@/lib/types';
import { VERTICALS, DEAL_STAGES } from '@/lib/types';

interface ImportRow {
  name: string;
  vertical: string;
  geography: string;
  stage: string;
  source: string;
  revenue: string;
  arr: string;
  recurring_revenue_pct: string;
  gross_margin_pct: string;
  ebita_margin_pct: string;
  customer_count: string;
  employee_count: string;
  asking_price: string;
  yoy_growth_pct: string;
  description: string;
  website: string;
  founder_name: string;
}

interface ValidationResult {
  row: number;
  data: ImportRow;
  errors: string[];
  warnings: string[];
}

const REQUIRED_COLUMNS = ['name'];
const OPTIONAL_COLUMNS = [
  'vertical', 'geography', 'stage', 'source', 'revenue', 'arr',
  'recurring_revenue_pct', 'gross_margin_pct', 'ebita_margin_pct',
  'customer_count', 'employee_count', 'asking_price', 'yoy_growth_pct',
  'description', 'website', 'founder_name',
];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  return rows;
}

function validateRow(row: ImportRow, rowNum: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.name || row.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (row.vertical && !VERTICALS.includes(row.vertical as Vertical)) {
    warnings.push(`Unknown vertical "${row.vertical}" — will default to "Other"`);
  }

  if (row.stage && !DEAL_STAGES.some(s => s.key === row.stage)) {
    warnings.push(`Unknown stage "${row.stage}" — will default to "identified"`);
  }

  if (row.source && !['proprietary', 'broker', 'inbound', 'referral', 'other'].includes(row.source)) {
    warnings.push(`Unknown source "${row.source}" — will default to "proprietary"`);
  }

  const numFields = ['revenue', 'arr', 'recurring_revenue_pct', 'gross_margin_pct', 'ebita_margin_pct', 'customer_count', 'employee_count', 'asking_price', 'yoy_growth_pct'] as const;
  for (const f of numFields) {
    const val = row[f];
    if (val && val.trim()) {
      const cleaned = val.replace(/[$,%\s]/g, '');
      if (isNaN(Number(cleaned))) {
        warnings.push(`"${f}" value "${val}" is not a valid number`);
      }
    }
  }

  return { row: rowNum, data: row, errors, warnings };
}

function parseNumber(val: string | undefined): number | undefined {
  if (!val || !val.trim()) return undefined;
  const cleaned = val.replace(/[$,%\s]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? undefined : num;
}

export default function BulkImport({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        alert('CSV must have a header row and at least one data row.');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
      const results: ValidationResult[] = [];

      for (let i = 1; i < rows.length; i++) {
        const rowData: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          if (ALL_COLUMNS.includes(headers[j])) {
            rowData[headers[j]] = rows[i][j] || '';
          }
        }
        results.push(validateRow(rowData as unknown as ImportRow, i));
      }

      setValidations(results);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setStep('importing');
    let imported = 0;
    let errors = 0;

    for (const v of validations) {
      if (v.errors.length > 0) {
        errors++;
        continue;
      }
      const d = v.data;
      createTarget({
        name: d.name.trim(),
        vertical: (VERTICALS.includes(d.vertical as Vertical) ? d.vertical : 'Other') as Vertical,
        geography: d.geography || '',
        stage: (DEAL_STAGES.some(s => s.key === d.stage) ? d.stage : 'identified') as DealStage,
        source: (['proprietary', 'broker', 'inbound', 'referral', 'other'].includes(d.source) ? d.source : 'proprietary') as 'proprietary' | 'broker' | 'inbound' | 'referral' | 'other',
        revenue: parseNumber(d.revenue),
        arr: parseNumber(d.arr),
        recurring_revenue_pct: parseNumber(d.recurring_revenue_pct),
        gross_margin_pct: parseNumber(d.gross_margin_pct),
        ebita_margin_pct: parseNumber(d.ebita_margin_pct),
        customer_count: parseNumber(d.customer_count),
        employee_count: parseNumber(d.employee_count),
        asking_price: parseNumber(d.asking_price),
        yoy_growth_pct: parseNumber(d.yoy_growth_pct),
        description: d.description || undefined,
        website: d.website || undefined,
        founder_name: d.founder_name || undefined,
      });
      imported++;
    }

    setImportCount(imported);
    setErrorCount(errors);
    setStep('done');
  };

  const downloadTemplate = () => {
    const header = ALL_COLUMNS.join(',');
    const example = 'Acme SaaS Inc,Healthcare,"Ontario, Canada",identified,proprietary,5000000,4200000,84,78,22,250,30,20000000,12,Cloud EHR for specialist clinics,https://acme.example.com,Jane Smith';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dealforge-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasErrors = validations.some(v => v.errors.length > 0);
  const hasWarnings = validations.some(v => v.warnings.length > 0);
  const validCount = validations.filter(v => v.errors.length === 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold">Bulk Import Targets</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Import targets from a CSV file</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
                <p className="text-sm font-medium">Click to upload a CSV file</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Required column: name. Optional: vertical, geography, stage, source, revenue, arr, etc.
                </p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              </div>

              <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent)' }}>
                <Download size={14} /> Download CSV template
              </button>

              <div className="rounded-xl p-4" style={{ background: 'var(--background)' }}>
                <h3 className="text-xs font-semibold mb-2">Supported Columns</h3>
                <div className="grid grid-cols-3 gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {ALL_COLUMNS.map(col => (
                    <span key={col} className="flex items-center gap-1">
                      {REQUIRED_COLUMNS.includes(col) ? (
                        <span className="text-[10px] text-red-400">*</span>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>·</span>
                      )}
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={16} />
                  <span className="font-medium">{validations.length} rows</span>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}>
                  <Check size={14} /> {validCount} valid
                </div>
                {hasErrors && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
                    <X size={14} /> {validations.filter(v => v.errors.length > 0).length} with errors
                  </div>
                )}
                {hasWarnings && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--warning)' }}>
                    <AlertTriangle size={14} /> {validations.filter(v => v.warnings.length > 0).length} with warnings
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Row</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Name</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Vertical</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Stage</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted)' }}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validations.map(v => (
                      <tr key={v.row} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="p-2 font-mono" style={{ color: 'var(--muted)' }}>{v.row}</td>
                        <td className="p-2">
                          {v.errors.length > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>Error</span>
                          ) : v.warnings.length > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>Warning</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>Valid</span>
                          )}
                        </td>
                        <td className="p-2 font-medium">{v.data.name || '—'}</td>
                        <td className="p-2" style={{ color: 'var(--muted-foreground)' }}>{v.data.vertical || 'Other'}</td>
                        <td className="p-2" style={{ color: 'var(--muted-foreground)' }}>{v.data.stage || 'identified'}</td>
                        <td className="p-2">
                          {[...v.errors, ...v.warnings].map((msg, i) => (
                            <div key={i} className="text-[10px]" style={{ color: v.errors.includes(msg) ? 'var(--danger)' : 'var(--warning)' }}>
                              {msg}
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 rounded-full border-2 mx-auto mb-3" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              <p className="text-sm">Importing targets...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="text-lg font-bold">{importCount} target{importCount !== 1 ? 's' : ''} imported</p>
                {errorCount > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--warning)' }}>
                    {errorCount} row{errorCount !== 1 ? 's' : ''} skipped due to errors
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          {step === 'upload' && (
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setValidations([]); }} className="btn btn-secondary">Back</button>
              <button onClick={handleImport} disabled={validCount === 0} className="btn btn-primary" style={{ opacity: validCount === 0 ? 0.5 : 1 }}>
                Import {validCount} Target{validCount !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={() => { onComplete(); onClose(); }} className="btn btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
