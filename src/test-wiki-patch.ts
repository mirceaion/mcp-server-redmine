#!/usr/bin/env node
/**
 * Tests for `applyWikiPatch` — the pure transformation behind `patch_wiki_page`.
 *
 * Deliberately dependency-free and offline: it needs no Redmine, no API key, and no test
 * framework, so it can be run on any checkout with `npm run test:patch`. The behaviour worth
 * protecting is the refusals — a find that matches nothing, or matches more than intended,
 * must throw rather than write.
 */
import { applyWikiPatch } from './wiki-patch.js';

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok    ${name}`);
  } catch (error: any) {
    failed++;
    console.log(`  FAIL  ${name}\n          ${error.message}`);
  }
}

function eq(actual: unknown, expected: unknown, what = 'value') {
  if (actual !== expected) {
    throw new Error(`expected ${what} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function throws(fn: () => void, contains: string) {
  let message: string | null = null;
  try {
    fn();
  } catch (error: any) {
    message = error.message;
  }
  if (message === null) throw new Error('expected a throw, got none');
  if (!message.includes(contains)) {
    throw new Error(`expected message containing ${JSON.stringify(contains)}, got ${JSON.stringify(message)}`);
  }
}

console.log('\napplyWikiPatch\n');

check('append adds one blank line, not more', () => {
  const { after } = applyWikiPatch('Body.\n\n\n', { mode: 'append', text: 'Added.' });
  eq(after, 'Body.\n\nAdded.\n');
});

check('append to an empty page does not lead with blank lines', () => {
  const { after } = applyWikiPatch('', { mode: 'append', text: 'First.' });
  eq(after, '\n\nFirst.\n');
});

check('prepend puts text first and keeps the body', () => {
  const { after } = applyWikiPatch('\n\nBody.', { mode: 'prepend', text: 'Notice.\n' });
  eq(after, 'Notice.\n\nBody.');
});

check('append refuses empty text', () => {
  throws(() => applyWikiPatch('Body.', { mode: 'append' }), 'needs `text`');
});

check('replace substitutes a single match', () => {
  const { after, summary } = applyWikiPatch('status: paused', {
    mode: 'replace',
    find: 'paused',
    text: 'active',
  });
  eq(after, 'status: active');
  eq(summary.includes('replaced 1 occurrence'), true, 'summary');
});

check('replace with empty text deletes the match', () => {
  const { after, summary } = applyWikiPatch('keep DROPME keep', {
    mode: 'replace',
    find: ' DROPME',
    text: '',
  });
  eq(after, 'keep keep');
  eq(summary.includes('deleted 1 occurrence'), true, 'summary');
});

check('replace REFUSES when find matches nothing', () => {
  throws(
    () => applyWikiPatch('hello', { mode: 'replace', find: 'absent', text: 'x' }),
    'matched 0 time(s)'
  );
});

check('replace REFUSES an accidental mass edit', () => {
  throws(
    () => applyWikiPatch('a a a', { mode: 'replace', find: 'a', text: 'b' }),
    'matched 3 time(s) but expect_count is 1'
  );
});

check('replace allows a mass edit when expect_count says so', () => {
  const { after } = applyWikiPatch('a a a', { mode: 'replace', find: 'a', text: 'b', expect_count: 3 });
  eq(after, 'b b b');
});

check('replace is literal, not regex', () => {
  const { after } = applyWikiPatch('cost is $5.00 (approx)', {
    mode: 'replace',
    find: '$5.00 (approx)',
    text: '$6.00',
  });
  eq(after, 'cost is $6.00');
});

check('replace refuses an empty find', () => {
  throws(() => applyWikiPatch('x', { mode: 'replace', text: 'y' }), 'non-empty `find`');
});

check('a no-op replace is detectable by the caller', () => {
  const before = 'same';
  const { after } = applyWikiPatch(before, { mode: 'replace', find: 'same', text: 'same' });
  eq(after, before);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
