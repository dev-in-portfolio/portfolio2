import { pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' });
  }
  const { rows: pageRows } = await pool.query(
    'select id, title, slug, status, published_slug from ncp_pages where id = $1',
    [id]
  );
  if (!pageRows[0]) {
    throw createError({ statusCode: 404, statusMessage: 'page not found' });
  }
  const { rows: cards } = await pool.query(
    `select id, type, ord, title, body, image_url, embed_url
     from ncp_cards
     where page_id = $1
     order by ord asc`,
    [id]
  );
  return { page: pageRows[0], cards };
});
