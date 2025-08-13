#!/usr/bin/env node
/*
 * Run media matrix incrementally per URL, sequentially, and report pass/fail.
 * Uses environment flags supported by tests/extension/playwright-e2e.spec.js:
 * - EVD_MEDIA_URL (exact URL)
 * - EVD_MEDIA_SITES_WIDE=true (enable full list logic)
 * Parses [MATRIX] logs to determine detection outcomes.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const mediaSitesPath = path.resolve(__dirname, '../tests/extension/media-sites.json');

/** @returns {{present: string[], absent: string[]}} */
function loadMatrix() {
  const raw = fs.readFileSync(mediaSitesPath, 'utf8');
  const data = JSON.parse(raw);
  return {
    present: Array.isArray(data.media_present) ? data.media_present.slice() : [],
    absent: Array.isArray(data.no_media) ? data.no_media.slice() : [],
  };
}

/**
 * Run playwright headed for a single URL and capture outcomes
 * @param {string} url
 * @param {boolean} isPresent
 * @returns {Promise<{url:string, detected:boolean|null, passed:boolean, stderr?:string, error?:string}>>}
 */
function runOne(url, isPresent) {
  return new Promise(resolve => {
    const env = { ...process.env, EVD_MEDIA_SITES_WIDE: 'true', EVD_MEDIA_URL: url };
    // Serialize to reduce flake; headed as requested; keep --silent for clean output
    const proc = spawn('npm', ['run', 'test:playwright:headed', '--silent'], {
      env,
      cwd: path.resolve(__dirname, '..'),
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => (stdout += d.toString()));
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => {
      // Parse [MATRIX] log lines
      const lines = stdout.split(/\r?\n/);
      let detected = null;
      for (const line of lines) {
        const m1 = line.match(/\[MATRIX\] present URL=(.+?) detected=(true|false)/);
        if (m1) {
          const u = m1[1];
          if (u === url) detected = m1[2] === 'true';
        }
        const m2 = line.match(/\[MATRIX\] absent URL=(.+?) detected=(true|false)/);
        if (m2) {
          const u = m2[1];
          if (u === url) detected = m2[2] === 'true';
        }
      }
      let passed;
      if (detected === null) {
        // Fallback: infer from exit code only if no matrix line found
        passed = code === 0;
      } else if (isPresent) {
        passed = detected === true;
      } else {
        passed = detected === false; // absent should not detect
      }
      resolve({ url, detected, passed, stderr: stderr.trim() || undefined, error: code === 0 ? undefined : `exit ${code}` });
    });
  });
}

(async () => {
  const matrix = loadMatrix();
  // Prefer only present set for domain tuning
  const targets = matrix.present;
  /** @type {Array<{url:string, detected:boolean|null, passed:boolean, stderr?:string, error?:string}>} */
  const results = [];
  for (const url of targets) {
    // Normalize relative URLs (served locally in matrix server) are not useful for real-site checks
    if (!/^https?:\/\//i.test(url)) continue;
    // eslint-disable-next-line no-console
    console.log(`\n[RUN] ${url}`);
    const r = await runOne(url, true);
    results.push(r);
    const status = r.passed ? 'PASS' : 'FAIL';
    // eslint-disable-next-line no-console
    console.log(`[RESULT] ${status} url=${r.url} detected=${r.detected}`);
    if (!r.passed) {
      if (r.error) console.log(`[ERROR] ${r.error}`);
      if (r.stderr) console.log(`[STDERR]\n${r.stderr}`);
    }
  }

  // Summary
  const passCount = results.filter(r => r.passed).length;
  const fail = results.filter(r => !r.passed);
  // eslint-disable-next-line no-console
  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length}, Passed: ${passCount}, Failed: ${fail.length}`);
  if (fail.length) {
    console.log(`Failed URLs:`);
    fail.forEach(r => console.log(`- ${r.url} (detected=${r.detected})`));
  }
})();


