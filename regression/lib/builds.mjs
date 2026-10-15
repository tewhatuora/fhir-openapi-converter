// Locating the two converter builds: the published release (baseline) and
// the current checkout (candidate). Both end up as a path to a cli.js that
// is run as `node <cli.js>`.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const sha256File = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const githubHeaders = () => ({
  accept: 'application/vnd.github+json',
  'user-agent': 'fhir-openapi-converter-regression',
  ...(process.env.GITHUB_TOKEN
    ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
});

/** GitHub's "latest" release: newest non-draft, non-prerelease. */
const resolveLatestTag = async (repo) => {
  // The web redirect needs no API token and isn't rate limited.
  const res = await fetch(`https://github.com/${repo}/releases/latest`, {
    redirect: 'manual',
  });
  const location = res.headers.get('location') || '';
  const match = location.match(/\/releases\/tag\/([^/?#]+)$/);
  if (!match) {
    throw new Error(
      `Could not resolve the latest release of ${repo} (HTTP ${res.status}, location "${location}"). ` +
        'If every release is a prerelease, use --baseline newest.'
    );
  }
  return decodeURIComponent(match[1]);
};

/** Newest published release with a cli.js asset, prereleases included. */
const resolveNewestTag = async (repo) => {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=50`,
    { headers: githubHeaders() }
  );
  if (!res.ok) {
    throw new Error(
      `GitHub API returned HTTP ${res.status} listing releases of ${repo}. ` +
        'Set GITHUB_TOKEN if you are rate limited, or pass a tag with --baseline.'
    );
  }
  const releases = (await res.json())
    .filter((r) => !r.draft && r.assets.some((a) => a.name === 'cli.js'))
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  if (releases.length === 0) {
    throw new Error(`No published release of ${repo} has a cli.js asset.`);
  }
  return releases[0].tag_name;
};

/**
 * Resolves --baseline to a local cli.js.
 *   latest      GitHub's latest release (excludes prereleases)
 *   newest      newest release including prereleases
 *   <tag>       a specific release tag, e.g. v1.2.4-6
 *   <path>      an existing cli.js on disk
 */
export const resolveBaseline = async ({ spec, repo, cacheDir, log }) => {
  if (spec.endsWith('.js') && fs.existsSync(spec)) {
    const cli = path.resolve(spec);
    return { kind: 'file', label: cli, cli, sha256: sha256File(cli) };
  }
  const tag =
    spec === 'latest'
      ? await resolveLatestTag(repo)
      : spec === 'newest'
        ? await resolveNewestTag(repo)
        : spec;
  const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/cli.js`;
  // Not named *.js: the root `eslint .` has no global ignores and would
  // otherwise lint (and prettier-check) the minified bundle.
  const cli = path.join(cacheDir, tag, 'cli.js.release');
  if (!fs.existsSync(cli)) {
    log(`Downloading baseline ${tag} from ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Downloading ${url} failed with HTTP ${res.status}. Does release ${tag} have a cli.js asset?`
      );
    }
    const body = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(`${cli}.tmp`, body);
    fs.renameSync(`${cli}.tmp`, cli);
  } else {
    log(`Using cached baseline ${tag} (${cli})`);
  }
  return {
    kind: 'release',
    requested: spec,
    tag,
    label: `release ${tag}`,
    releaseUrl: `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`,
    downloadUrl: url,
    cli,
    sha256: sha256File(cli),
  };
};

const git = (repoRoot, args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
};

/** Describes the checkout the candidate is built from. */
export const describeCheckout = (repoRoot) => {
  const status = git(repoRoot, [
    'status',
    '--porcelain',
    '--',
    '.',
    ':(exclude)regression',
  ]);
  return {
    commit: git(repoRoot, ['rev-parse', 'HEAD']),
    branch: git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']),
    describe: git(repoRoot, ['describe', '--tags', '--always', '--dirty']),
    uncommittedFiles:
      status === null ? null : status.split('\n').filter(Boolean).length,
  };
};

const run = (cmd, args, cwd, log) => {
  log(`$ ${cmd} ${args.join(' ')}  (in ${cwd})`);
  execFileSync(cmd, args, {
    cwd,
    // Build output goes to our stderr so it doesn't mix with report output.
    stdio: ['ignore', process.stderr, process.stderr],
    shell: process.platform === 'win32',
  });
};

/**
 * Builds the checkout with its own `yarn build` and returns the resulting
 * cli.js. `cliPath` is relative to the repository root.
 */
export const buildCandidate = ({ repoRoot, cliPath, log }) => {
  const cli = path.resolve(repoRoot, cliPath);
  if (!fs.existsSync(path.join(repoRoot, 'node_modules'))) {
    run('yarn', ['install', '--immutable'], repoRoot, log);
  }
  run('yarn', ['build'], repoRoot, log);
  if (!fs.existsSync(cli)) {
    throw new Error(
      `Candidate ${cli} does not exist after yarn build. Pass --candidate-cli if the build writes somewhere else.`
    );
  }
  return {
    kind: 'checkout',
    label: 'current checkout',
    cli,
    sha256: sha256File(cli),
    checkout: describeCheckout(repoRoot),
  };
};

/** Uses an existing cli.js as the candidate, without building (--skip-build). */
export const candidateFromFile = (file, repoRoot) => {
  const cli = path.resolve(file);
  if (!fs.existsSync(cli)) throw new Error(`Candidate ${cli} does not exist.`);
  return {
    kind: 'file',
    label: cli,
    cli,
    sha256: sha256File(cli),
    checkout: describeCheckout(repoRoot),
  };
};
