export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job for one night.
export type DigestRow = {
  job: string;
  owner: string | null; // views show null as —
  runs: number; // log lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null;
  first: string; // `at` of the first line, offset kept as logged
  last: string; // `at` of the last line
};

export type Digest = {
  night: string;
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted not thrown
};

// null when runs/<night>.jsonl does not exist. An empty file gives rows: [].
export type ReadNight = (runsDir: string, night: string) => Digest | null;
