import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  prepareDistFolder,
  DIST_PATH,
  getCurrentDay,
  getSpecs,
} from '../helpers.js';

(async () => {
  prepareDistFolder();

  const today = getCurrentDay();

  const dbPath = path.join(DIST_PATH, `trackerdb_${today}.db`);

  if (existsSync(dbPath)) {
    rmSync(dbPath);
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.migrate({
    migrationsPath: path.join(
      process.cwd(),
      'scripts',
      'export-sql',
      'migrations',
    ),
  });

  for (const [, spec] of getSpecs('categories')) {
    await db.run(
      'INSERT INTO categories (name) VALUES (?)',
      spec.field('name').requiredStringValue(),
    );
  }
  const categories = await db.all('SELECT * FROM categories');
  const categoryIds = new Map(categories.map((c) => [c.name, c.id]));

  for (const [id, spec] of getSpecs('organizations')) {
    await db.run(
      'INSERT INTO companies (id, name, description, privacy_url, website_url, country, privacy_contact, notes, ghostery_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      spec.field('name').requiredStringValue(),
      spec.field('description').optionalStringValue(),
      spec.field('privacy_policy_url').optionalStringValue(),
      spec.field('website_url').optionalStringValue(),
      spec.field('country').optionalStringValue(),
      spec.field('privacy_contact').optionalStringValue(),
      spec.field('notes').optionalStringValue(),
      spec.field('ghostery_id').optionalStringValue() || '',
    );
  }

  const companies = await db.all('SELECT * FROM companies');
  const companyIds = new Map(companies.map((c) => [c.name, c.id]));

  for (const [id, spec] of getSpecs('patterns')) {
    await db.run(
      'INSERT INTO trackers (id, name, category_id, website_url, company_id, notes, alias, ghostery_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      spec.field('name').requiredStringValue(),
      categoryIds.get(spec.field('category').requiredStringValue()),
      spec.field('website_url').optionalStringValue(),
      companyIds.get(spec.field('organization').optionalStringValue()) || null,
      spec.field('notes').optionalStringValue(),
      spec.field('alias').optionalStringValue(),
      spec.field('ghostery_id').optionalStringValue() || '',
    );
    const domains = (spec.field('domains').optionalStringValue() || '')
      .trim()
      .split(/\n+/g)
      .filter((d) => d !== '');

    for (const domain of domains) {
      await db.run(
        'INSERT INTO tracker_domains (tracker, domain) VALUES (?, ?)',
        id,
        domain,
      );
    }
  }

  console.log(
    'Exported categories:',
    (await db.get('SELECT count(*) as count FROM categories')).count,
  );
  console.log(
    'Exported companies:',
    (await db.get('SELECT count(*) as count FROM companies')).count,
  );
  console.log(
    'Exported trackers:',
    (await db.get('SELECT count(*) as count FROM trackers')).count,
  );
  console.log(
    'Exported tracker domains:',
    (await db.get('SELECT count(*) as count FROM tracker_domains')).count,
  );

  await db.close();
})();
