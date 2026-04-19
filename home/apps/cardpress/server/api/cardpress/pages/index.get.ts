import { getUserId, pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, 'x-device-key');
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing X-Device-Key header' });
  }
  const userId = await getUserId(deviceKey);
  const { rows } = await pool.query(
    `select id, title, slug, status, published_slug, updated_at
     from ncp_pages
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );
  return { pages: rows };
});
