const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const slugsPath = path.join(__dirname, '../../public/exhibit-slugs.json');
let allowedSlugs = [];
try {
  allowedSlugs = JSON.parse(fs.readFileSync(slugsPath, 'utf8'));
} catch {
  allowedSlugs = [];
}
const allowedSet = new Set(allowedSlugs);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const userKey = event.queryStringParameters?.userKey || null;
  if (!userKey) return json(400, { error: 'userKey required' });

  const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED });
  await client.connect();

  try {
    if (method === 'GET') {
      const { rows } = await client.query(
        'select exhibit_slug from favorites where user_key = $1 order by created_at desc',
        [userKey]
      );
      return json(200, { exhibitSlugs: rows.map(r => r.exhibit_slug) });
    }

    const body = JSON.parse(event.body || '{}');
    const exhibitSlug = body.exhibitSlug;
    if (!exhibitSlug) return json(400, { error: 'exhibitSlug required' });
    if (!allowedSet.has(exhibitSlug)) return json(400, { error: 'unknown exhibitSlug' });

    if (method === 'POST') {
      const countRes = await client.query('select count(*)::int as c from favorites where user_key = $1', [userKey]);
      if (countRes.rows[0].c >= 1000) return json(400, { error: 'favorites limit reached' });
      await client.query(
        'insert into favorites (user_key, exhibit_slug) values ($1, $2) on conflict do nothing',
        [userKey, exhibitSlug]
      );
      return json(200, { ok: true });
    }

    if (method === 'DELETE') {
      await client.query(
        'delete from favorites where user_key = $1 and exhibit_slug = $2',
        [userKey, exhibitSlug]
      );
      return json(200, { ok: true });
    }

    return json(405, { error: 'method not allowed' });
  } finally {
    await client.end();
  }
};
