/**
 * Regression: issue #2914 — `gsd-sdk query agent-skills <type>` must emit the
 * raw `<agent_skills>` XML block on stdout, not a JSON-stringified string.
 *
 * Workflows interpolate the CLI output directly into Task() spawn prompts via
 * `$(gsd-sdk query agent-skills <type>)`. JSON.stringify wraps the block in
 * double quotes and escapes newlines (`\n`), corrupting the prompt.
 *
 * This test spawns the CLI binary so it covers the cli.ts wrapper layer where
 * the regression actually lives — a unit test on `agentSkills` alone won't
 * catch it.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SDK_ROOT = resolve(__dirname, '..', '..');
const CLI_PATH = join(SDK_ROOT, 'dist', 'cli.js');

describe('issue #2914 — CLI agent-skills output is raw XML, not JSON-stringified', () => {
  let tmpDir: string;

  beforeAll(() => {
    if (!existsSync(CLI_PATH)) {
      execFileSync('npm', ['run', 'build'], { cwd: SDK_ROOT, stdio: 'inherit' });
    }
  }, 120_000);

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gsd-2914-'));
    // Deterministic fixture: one configured skill with a real SKILL.md.
    const skillDir = join(tmpDir, 'skills', 'dynamic', 'gsd-planner');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: gsd-planner\ndescription: planner skill\n---\n\n# gsd-planner\n',
    );
    await mkdir(join(tmpDir, '.planning'), { recursive: true });
    await writeFile(
      join(tmpDir, '.planning', 'config.json'),
      JSON.stringify({ agent_skills: { 'gsd-planner': ['skills/dynamic/gsd-planner'] } }, null, 2),
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes the raw <agent_skills> block (no JSON quoting / no escaped \\n) on stdout', () => {
    const stdout = execFileSync('node', [CLI_PATH, 'query', 'agent-skills', 'gsd-planner'], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    const expected =
      '<agent_skills>\n' +
      'Read these user-configured skills:\n' +
      '- @skills/dynamic/gsd-planner/SKILL.md\n' +
      '</agent_skills>';

    // Strict byte-match — no leading `"`, no escaped `\n`, no JSON.stringify pretty-print.
    expect(stdout).toBe(expected);
    expect(stdout.startsWith('<agent_skills>')).toBe(true);
    expect(stdout.includes('\\n')).toBe(false);
  });
});
