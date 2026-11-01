import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Digest, DigestRow, ReadNight, RunStatus } from './types.js';

type Entry = { at: string; job: string; status: RunStatus; owner: string | null; error: string | null };

function parseLine(line: string): Entry | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (o.status !== 'ok' && o.status !== 'retry' && o.status !== 'fail') return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (!e) {
      badLines++;
      continue;
    }
    const row = rows.get(e.job);
    if (!row) {
      rows.set(e.job, {
        job: e.job, owner: e.owner, runs: 1, retries: e.status === 'retry' ? 1 : 0,
        lastStatus: e.status, lastError: e.error, first: e.at, last: e.at,
      });
    } else {
      row.runs++;
      if (e.status === 'retry') row.retries++;
      row.lastStatus = e.status;
      row.lastError = e.error;
      row.last = e.at;
      row.owner = e.owner ?? row.owner;
    }
  }
  const digest: Digest = {
    night,
    rows: [...rows.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0)),
    badLines,
  };
  return digest;
};
