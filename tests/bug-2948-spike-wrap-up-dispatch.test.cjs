/**
 * Regression test for bug #2948
 *
 * `/gsd-spike --wrap-up` was silently no-oping because:
 * 1. `commands/gsd/spike.md` listed `--wrap-up` as a flag but had no dispatch block.
 * 2. `workflows/spike.md` still referenced the deleted `/gsd-spike-wrap-up` entry-point
 *    instead of the correct `/gsd-spike --wrap-up` form.
 *
 * Fix:
 * - `commands/gsd/spike.md` now has a `Parse the first token of $ARGUMENTS` dispatch block
 *   that routes `--wrap-up` to spike-wrap-up.md, and `spike-wrap-up.md` is listed in
 *   the execution_context so the runtime can find it.
 * - `workflows/spike.md` companion references updated from `/gsd-spike-wrap-up` to
 *   `/gsd-spike --wrap-up`.
 */

'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SPIKE_CMD_PATH = path.join(__dirname, '..', 'commands', 'gsd', 'spike.md');
const SPIKE_WORKFLOW_PATH = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'spike.md');

describe('bug-2948: /gsd-spike --wrap-up dispatch wiring', () => {
  describe('commands/gsd/spike.md', () => {
    let content;

    test('spike.md command file exists', () => {
      assert.ok(fs.existsSync(SPIKE_CMD_PATH), 'commands/gsd/spike.md should exist');
      content = fs.readFileSync(SPIKE_CMD_PATH, 'utf-8');
    });

    test('contains --wrap-up dispatch logic', () => {
      const text = fs.readFileSync(SPIKE_CMD_PATH, 'utf-8');
      assert.ok(
        text.includes('--wrap-up'),
        'commands/gsd/spike.md must contain --wrap-up dispatch logic'
      );
    });

    test('references spike-wrap-up workflow in execution_context', () => {
      const text = fs.readFileSync(SPIKE_CMD_PATH, 'utf-8');
      // Extract the execution_context block
      const execContextMatch = text.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
      assert.ok(execContextMatch, 'spike.md must have an <execution_context> block');
      const execContext = execContextMatch[1];
      assert.ok(
        execContext.includes('spike-wrap-up'),
        'execution_context must reference spike-wrap-up.md so the runtime can find it when --wrap-up is set'
      );
    });

    test('has a parse/dispatch block for first token of $ARGUMENTS', () => {
      const text = fs.readFileSync(SPIKE_CMD_PATH, 'utf-8');
      assert.ok(
        text.includes('Parse the first token of $ARGUMENTS'),
        'commands/gsd/spike.md must have a "Parse the first token of $ARGUMENTS" dispatch block'
      );
    });
  });

  describe('get-shit-done/workflows/spike.md', () => {
    let content;

    test('spike workflow file exists', () => {
      assert.ok(fs.existsSync(SPIKE_WORKFLOW_PATH), 'get-shit-done/workflows/spike.md should exist');
      content = fs.readFileSync(SPIKE_WORKFLOW_PATH, 'utf-8');
    });

    test('does NOT reference the old deleted /gsd-spike-wrap-up entry-point', () => {
      const text = fs.readFileSync(SPIKE_WORKFLOW_PATH, 'utf-8');
      assert.ok(
        !text.includes('/gsd-spike-wrap-up'),
        'workflows/spike.md must not reference the deleted /gsd-spike-wrap-up command; use /gsd-spike --wrap-up instead'
      );
    });

    test('references /gsd-spike --wrap-up as the canonical wrap-up invocation', () => {
      const text = fs.readFileSync(SPIKE_WORKFLOW_PATH, 'utf-8');
      assert.ok(
        text.includes('/gsd-spike --wrap-up'),
        'workflows/spike.md must reference /gsd-spike --wrap-up as the wrap-up command'
      );
    });
  });
});
