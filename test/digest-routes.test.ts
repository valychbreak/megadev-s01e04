import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(runsDir, '2026-02-01.jsonl'),
    [
      '{"at":"2026-02-01T01:00:00+01:00","job":"b/job","status":"fail","owner":null,"error":"boom"}',
      '{"at":"2026-02-01T01:01:00+01:00","job":"a/job","status":"ok","owner":"rook"}',
      'not json',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, '2026-02-02.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir });
});

describe('digest page', () => {
  it('200 with rows sorted by job, fail marked, null owner as —, bad line noted', async () => {
    const res = await app.request('/digest/2026-02-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('⚠');
    expect(html).toContain('—');
    expect(html).toContain('1 line(s)');
  });
  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2000-01-01')).status).toBe(404);
  });
  it('empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-02-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
});

describe('digest json', () => {
  it('200 with the same jobs in the same order as the page', async () => {
    const json = (await (await app.request('/api/digest/2026-02-01')).json()) as { rows: { job: string }[]; badLines: number };
    expect(json.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(json.badLines).toBe(1);
  });
  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2000-01-01')).status).toBe(404);
  });
  it('empty night gives no rows', async () => {
    const json = (await (await app.request('/api/digest/2026-02-02')).json()) as { rows: unknown[] };
    expect(json.rows).toEqual([]);
  });
});

describe('status board links', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await app.request('/')).text();
    expect(html).toContain('href="/digest/2026-02-01"');
    expect(html).toContain('fail 1');
  });
});
