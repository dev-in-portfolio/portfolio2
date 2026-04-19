import { getUserId, pool } from '~/server/utils/db';

const MAX_PAGES = 10000;

export default defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, 'x-device-key');
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing X-Device-Key header' });
  }
  const body = await readBody(event);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
  if (!title || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'title and slug are required' });
  }
  const userId = await getUserId(deviceKey);
  const { rows: countRows } = await pool.query(
    'select count(*)::int as count from ncp_pages where user_id = $1',
    [userId]
  );
  if (countRows[0].count >= MAX_PAGES) {
    throw createError({ statusCode: 400, statusMessage: 'page limit reached' });
  }
  const { rows } = await pool.query(
    `insert into ncp_pages (user_id, title, slug)
     values ($1, $2, $3)
     returning id, title, slug, status, published_slug, updated_at`,
    [userId, title, slug]
  );
  return { page: rows[0] };
});
