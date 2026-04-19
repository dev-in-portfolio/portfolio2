import { pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const publishedSlug = event.context.params?.publishedSlug;
  if (!publishedSlug) {
    throw createError({ statusCode: 400, statusMessage: 'publishedSlug is required' });
  }
  const { rows: pageRows } = await pool.query(
    'select id, title from ncp_pages where published_slug = $1 and status = $2',
    [publishedSlug, 'published']
  );
  if (!pageRows[0]) {
    throw createError({ statusCode: 404, statusMessage: 'page not found' });
  }
  const { rows: cards } = await pool.query(
    `select id, type, ord, title, body, image_url, embed_url
     from ncp_cards
     where page_id = $1
     order by ord asc`,
    [pageRows[0].id]
  );
  return { page: pageRows[0], cards };
});
