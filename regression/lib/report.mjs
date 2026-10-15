// Renders the comparison results as Markdown and a JSON summary.

const MAX_ROWS_PER_FILE = 40;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\n/g, ' ');
const code = (s) => `<code>${esc(s)}</code>`;
const short = (sha) => (sha ? sha.slice(0, 12) : 'unknown');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const STATUS = {
  match: '✅ match',
  differ: '❌ differs',
  error: '⚠️ error',
};

const describeBuild = (b) => {
  if (b.kind === 'release') {
    const asked =
      b.requested !== b.tag ? ` (resolved from \`${b.requested}\`)` : '';
    return `[${b.tag}](${b.releaseUrl})${asked}, cli.js sha256 \`${short(b.sha256)}\``;
  }
  const c = b.checkout || {};
  const tree =
    c.commit == null
      ? ''
      : ` at \`${short(c.commit)}\` (${c.describe}, branch \`${c.branch}\`${
          c.uncommittedFiles
            ? `, ${plural(c.uncommittedFiles, 'uncommitted file')} outside regression/`
            : ''
        })`;
  if (b.kind === 'checkout')
    return `checkout${tree}, built with \`yarn build\`, cli.js sha256 \`${short(b.sha256)}\``;
  return `\`${b.cli}\` (not rebuilt; checkout${tree}), sha256 \`${short(b.sha256)}\``;
};

/** One-line counts for the summary table. */
const summariseIg = (r) => {
  if (r.status === 'error') return esc(r.error);
  const c = r.comparison;
  const parts = [];
  if (!c.exitCode.match) parts.push('exit code');
  if (!c.files.match)
    parts.push(
      `${c.files.onlyBaseline.length + c.files.onlyCandidate.length} file(s) added/removed`
    );
  if (!c.messages.match)
    parts.push(
      `${c.messages.onlyBaseline.length + c.messages.onlyCandidate.length} message(s)`
    );
  const differing = c.capabilityStatements.filter(
    (cs) => cs.status !== 'match'
  );
  if (differing.length) {
    const diffs = differing.reduce(
      (n, cs) =>
        n +
        Math.max(0, ...Object.values(cs.files).map((f) => f.diffCount || 0)),
      0
    );
    parts.push(
      `${differing.length} CapabilityStatement(s), ${plural(diffs, 'path')}`
    );
  }
  return parts.join('; ') || '–';
};

const renderDiffTable = (result, lines) => {
  lines.push(
    '',
    '| Change | Path | Baseline | Candidate |',
    '| --- | --- | --- | --- |'
  );
  for (const d of result.diffs.slice(0, MAX_ROWS_PER_FILE)) {
    lines.push(
      `| ${d.op} | ${code(d.path)} | ${'before' in d ? code(trim(d.before)) : ''} | ${'after' in d ? code(trim(d.after)) : ''} |`
    );
  }
  if (result.diffCount > MAX_ROWS_PER_FILE) {
    lines.push(
      '',
      `…and ${result.diffCount - MAX_ROWS_PER_FILE} more (see report.json and the output folders).`
    );
  }
};

const trim = (s, max = 160) => (s.length > max ? `${s.slice(0, max)}…` : s);

const renderCapabilityStatement = (cs, lines) => {
  const entries = Object.entries(cs.files);
  if (cs.status === 'match') {
    lines.push(
      `- **${esc(cs.id)}**: match (${entries.map(([f]) => f.split('.').pop()).join(', ')})`
    );
    return;
  }
  lines.push('', `#### CapabilityStatement \`${cs.id}\``);
  const json = entries.find(([f]) => f.endsWith('.json'));
  const yaml = entries.find(([f]) => /\.ya?ml$/.test(f));
  const sameDiffs =
    json &&
    yaml &&
    json[1].status === 'differ' &&
    yaml[1].status === 'differ' &&
    json[1].signature === yaml[1].signature;
  for (const [file, result] of entries) {
    if (sameDiffs && file === yaml[0]) {
      lines.push('', `\`${file}\`: same differences as the JSON file.`);
      continue;
    }
    if (result.status === 'match') lines.push('', `\`${file}\`: match`);
    else if (result.status === 'only-baseline')
      lines.push('', `\`${file}\`: **only written by the baseline**`);
    else if (result.status === 'only-candidate')
      lines.push('', `\`${file}\`: **only written by the candidate**`);
    else {
      const { added, removed, changed } = result.counts;
      lines.push(
        '',
        `\`${file}\`: ${plural(result.diffCount, 'difference')} (${added} added, ${removed} removed, ${changed} changed)`
      );
      for (const e of result.parseErrors)
        lines.push('', `> Could not parse ${esc(e)}; compared as text.`);
      renderDiffTable(result, lines);
    }
  }
};

const renderIg = (r, lines) => {
  lines.push('', `### ${r.id}: ${STATUS[r.status]}`, '');
  if (r.description) lines.push(`${esc(r.description)}  `);
  lines.push(
    `Source: ${r.packageUrl ? `<${r.packageUrl}>` : `\`${r.inputFolder}\``}  `
  );
  for (const dep of r.dependencyUrls || [])
    lines.push(`Dependency: <${dep}>  `);
  if (r.options && Object.keys(r.options).length)
    lines.push(`Options: \`${JSON.stringify(r.options)}\`  `);
  for (const w of r.warnings || []) lines.push(`> ⚠️ ${esc(w)}`);
  if (r.status === 'error') {
    lines.push('', `Harness error: ${esc(r.error)}`);
    return;
  }
  const { baseline: b, candidate: c, comparison: cmp } = r;
  lines.push(
    '',
    '| | Baseline | Candidate |',
    '| --- | --- | --- |',
    `| Exit code | ${b.exitCode ?? esc(b.signal || b.spawnError)}${b.timedOut ? ' (timed out)' : ''} | ${c.exitCode ?? esc(c.signal || c.spawnError)}${c.timedOut ? ' (timed out)' : ''} |`,
    `| Files written | ${b.files.length} | ${c.files.length} |`,
    `| Warnings/errors logged | ${b.messages.length} | ${c.messages.length} |`,
    `| Network requests (cache / fetched / failed) | ${b.network.fromCache} / ${b.network.fetched} / ${b.network.failed} | ${c.network.fromCache} / ${c.network.fetched} / ${c.network.failed} |`,
    `| Duration | ${(b.durationMs / 1000).toFixed(1)}s | ${(c.durationMs / 1000).toFixed(1)}s |`
  );
  if (!cmp.files.match) {
    lines.push('');
    for (const f of cmp.files.onlyBaseline)
      lines.push(`- File only written by the baseline: \`${f}\``);
    for (const f of cmp.files.onlyCandidate)
      lines.push(`- File only written by the candidate: \`${f}\``);
  }
  if (!cmp.messages.match) {
    lines.push(
      '',
      'Messages that differ (warnings, errors and stderr, normalised):',
      ''
    );
    for (const m of cmp.messages.onlyBaseline)
      lines.push(`- baseline only: ${code(trim(m, 300))}`);
    for (const m of cmp.messages.onlyCandidate)
      lines.push(`- candidate only: ${code(trim(m, 300))}`);
  } else if (b.messages.length) {
    lines.push(
      '',
      `Both builds logged the same ${plural(b.messages.length, 'warning/error line')}, e.g. ${code(trim(b.messages[0], 200))}`
    );
  }
  if (cmp.capabilityStatements.length) {
    lines.push('');
    for (const cs of cmp.capabilityStatements)
      renderCapabilityStatement(cs, lines);
  } else {
    lines.push('', 'Neither build wrote any OpenAPI files.');
  }
};

export const renderMarkdown = (report) => {
  const counts = { match: 0, differ: 0, error: 0 };
  for (const r of report.igs) counts[r.status]++;
  const lines = [
    '# Converter regression report',
    '',
    `- Baseline: ${describeBuild(report.baseline)}`,
    `- Candidate: ${describeBuild(report.candidate)}`,
    `- IG list: \`${report.config}\` (${plural(report.igs.length, 'IG')}${report.skipped.length ? `, skipped: ${report.skipped.join(', ')}` : ''})`,
    `- Network cache: \`${report.cache.dir}\` (mode ${report.cache.mode}; ${report.cache.entries} entries)`,
    `- Generated: ${report.generatedAt}`,
    '',
    `**Result: ${
      counts.differ + counts.error === 0
        ? `all ${plural(counts.match, 'IG')} match`
        : [
            counts.differ && `${counts.differ} differ`,
            counts.error && `${counts.error} errored`,
            `${counts.match} match`,
          ]
            .filter(Boolean)
            .join(', ')
    }.** Object key order and YAML anchors are ignored; array order is not.`,
    '',
    '| IG | Result | Exit code (baseline → candidate) | CapabilityStatements | Differences |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const r of report.igs) {
    const cmp = r.comparison;
    const exit = cmp
      ? `${cmp.exitCode.baseline ?? '–'} → ${cmp.exitCode.candidate ?? '–'}`
      : '–';
    const css = cmp ? cmp.capabilityStatements.length : '–';
    lines.push(
      `| ${r.id} | ${STATUS[r.status]} | ${exit} | ${css} | ${summariseIg(r)} |`
    );
  }
  lines.push('', '## Details');
  for (const r of report.igs) renderIg(r, lines);
  lines.push('');
  return lines.join('\n');
};

/** JSON summary: everything except raw logs, with per-file diffs capped. */
export const toJson = (report) =>
  JSON.stringify(
    report,
    (key, value) => (key === 'signature' ? undefined : value),
    2
  );
