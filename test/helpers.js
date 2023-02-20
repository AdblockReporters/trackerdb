import path from 'node:path';
import { readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'tldts-experimental';

export const SPEC_FILE_EXTENSION = '.eno';

export const CATEGORIES = readdirSync('./db/categories')
  .filter((file) => path.extname(file) === SPEC_FILE_EXTENSION)
  .map((file) => path.basename(file, SPEC_FILE_EXTENSION));

export const ORGANIZATIONS = readdirSync('./db/organizations')
  .filter((file) => path.extname(file) === SPEC_FILE_EXTENSION)
  .map((file) => path.basename(file, SPEC_FILE_EXTENSION));

export const assertUrl = (url) => {
  const parsed = parse(url);
  assert(
    !!parsed.domain && !!parsed.publicSuffix && !parsed.isPrivate,
    `${url} is not a valid url or is website is not public`,
  );
  assert(url.startsWith('http'), `${url} does not start with http`);
};
