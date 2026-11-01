import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const d = readNight('runs', '2026-10-28')!;
    expect(d.rows.map((r) => r.job)).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']);
    expect(d.badLines).toBe(1);
    const fx = d.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null, owner: 'rook' });
    const nb = d.rows.find((r) => r.job === 'notes/backup')!;
    expect(nb).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(d.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
  });

  it('keeps the logged offset in first and last', () => {
    const r = readNight('runs', '2026-10-28')!.rows.find((x) => x.job === 'lane/sync')!;
    expect(r.first).toBe('2026-10-28T23:00:06+01:00');
    expect(r.last.endsWith('+01:00')).toBe(true);
  });

  it('returns null for a missing night and no rows for an empty one', () => {
    expect(readNight('runs', '2000-01-01')).toBeNull();
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });
});
