import { describe, expect, it, vi } from 'vitest';
import {
  ATTEMPT_COLUMNS,
  SUMMARY_COLUMNS,
  attemptsToCsv,
  buildExportFilenames,
  downloadCsv,
  escapeCsvCell,
  sanitizeFilenamePart,
  summaryToCsv
} from './CsvExport.js';

describe('CsvExport', () => {
  it('escapes RFC 4180 cells', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('uses stable attempt and summary column order with a BOM', () => {
    const attemptsCsv = attemptsToCsv([
      { session_id: 's1', attempt_number: 1, timestamp: '2026-07-18T05:00:00.000Z', correct: true }
    ], 'Alex');
    expect(attemptsCsv.startsWith('\uFEFF')).toBe(true);
    expect(attemptsCsv.slice(1).split('\r\n')[0]).toBe(ATTEMPT_COLUMNS.join(','));
    expect(attemptsCsv).toContain(',Alex,');
    expect(attemptsCsv).toContain(',true,');

    const summaryCsv = summaryToCsv({ session_id: 's1', username: 'Alex' });
    expect(summaryCsv.slice(1).split('\r\n')[0]).toBe(SUMMARY_COLUMNS.join(','));
  });

  it('sanitizes filenames and creates matching timestamps', () => {
    expect(sanitizeFilenamePart(' Alex/Smith:* ')).toBe('Alex_Smith__');
    expect(buildExportFilenames(' Alex/Smith:* ', new Date('2026-07-18T05:14:03.000Z'))).toEqual({
      attempts: 'attempts_Alex_Smith___2026-07-18T05-14-03Z.csv',
      session: 'session_Alex_Smith___2026-07-18T05-14-03Z.csv'
    });
  });

  it('downloads through a temporary object URL', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const append = vi.fn();
    const anchor = { click, remove, hidden: false, href: '', download: '' };
    const doc = { createElement: vi.fn(() => anchor), body: { append } };
    const urlApi = { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() };

    downloadCsv('file.csv', '\uFEFFa\r\n', doc, urlApi);

    expect(anchor.download).toBe('file.csv');
    expect(anchor.href).toBe('blob:test');
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
