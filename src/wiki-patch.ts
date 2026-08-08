/**
 * The pure transformation behind the `patch_wiki_page` tool.
 *
 * Kept in its own module, separate from the server, for two reasons: it has no dependency on
 * transport or configuration, and `index.ts` starts a server on import — so anything importing
 * it for a test would need Redmine credentials just to exercise string handling.
 */

export type WikiPatchMode = 'append' | 'prepend' | 'replace';

export interface WikiPatchArgs {
  mode: WikiPatchMode;
  /** Text to append, prepend, or substitute in. Empty in replace mode means delete. */
  text?: string;
  /** replace mode: the exact literal string to find. Not a regex. */
  find?: string;
  /** replace mode: how many matches are expected (default 1). A mismatch refuses the write. */
  expect_count?: number;
}

export interface WikiPatchResult {
  after: string;
  summary: string;
}

/**
 * Applies a wiki patch to a page body and reports what it did.
 *
 * Throws rather than returning a partial result on any refusable condition. That is the whole
 * design intent: a wiki write that quietly does the wrong thing is worse than one that fails,
 * because nobody notices content that silently stopped being there.
 *
 * @param before The current page body.
 * @param args   The requested change.
 * @throws If the mode is unknown, required text is missing, `find` is empty, or the match
 *         count differs from `expect_count`.
 */
export function applyWikiPatch(before: string, args: WikiPatchArgs): WikiPatchResult {
  const insert = typeof args.text === 'string' ? args.text : '';

  if (args.mode === 'append') {
    if (!insert) throw new Error('append mode needs `text` to append.');
    // Guarantee exactly one blank line between existing content and the addition, without
    // stacking extra newlines when the page already ends with some.
    return {
      after: `${before.replace(/\s+$/, '')}\n\n${insert}\n`,
      summary: `appended ${insert.length} chars`,
    };
  }

  if (args.mode === 'prepend') {
    if (!insert) throw new Error('prepend mode needs `text` to prepend.');
    return {
      after: `${insert.replace(/\s+$/, '')}\n\n${before.replace(/^\s+/, '')}`,
      summary: `prepended ${insert.length} chars`,
    };
  }

  if (args.mode !== 'replace') {
    throw new Error(`Unknown mode "${args.mode}" — expected append, prepend or replace.`);
  }

  const find = args.find;
  if (typeof find !== 'string' || find.length === 0) {
    throw new Error('replace mode needs a non-empty `find` string.');
  }

  const expected = args.expect_count === undefined ? 1 : Number(args.expect_count);
  const actual = before.split(find).length - 1;

  if (actual !== expected) {
    throw new Error(
      `Refusing to write: \`find\` matched ${actual} time(s) but expect_count is ${expected}. ` +
        (actual === 0
          ? 'Nothing was changed. Check whitespace and exact casing — `find` is a literal string, not a regex.'
          : 'Pass expect_count to confirm the real number if a multi-match edit is intended.')
    );
  }

  return {
    after: before.split(find).join(insert),
    summary:
      insert.length === 0
        ? `deleted ${actual} occurrence(s) of a ${find.length}-char string`
        : `replaced ${actual} occurrence(s), ${find.length} chars -> ${insert.length} chars`,
  };
}
