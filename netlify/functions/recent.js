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
        'select exhibit_slug, last_viewed from recent_views where user_key = $1 order by last_viewed desc limit 200',
        [userKey]
      );
      return json(200, { items: rows });
    }

    const body = JSON.parse(event.body || '{}');
    const exhibitSlug = body.exhibitSlug;
    if (!exhibitSlug) return json(400, { error: 'exhibitSlug required' });
    if (!allowedSet.has(exhibitSlug)) return json(400, { error: 'unknown exhibitSlug' });

    if (method === 'POST') {
      await client.query(
        'insert into recent_views (user_key, exhibit_slug, last_viewed) values ($1, $2, now()) on conflict (user_key, exhibit_slug) do update set last_viewed = now()',
        [userKey, exhibitSlug]
      );
      await client.query(
        'delete from recent_views where user_key = $1 and exhibit_slug in (select exhibit_slug from recent_views where user_key = $1 order by last_viewed desc offset 200)',
        [userKey]
      );
      return json(200, { ok: true });
    }

    return json(405, { error: 'method not allowed' });
  } finally {
    await client.end();
  }
};
