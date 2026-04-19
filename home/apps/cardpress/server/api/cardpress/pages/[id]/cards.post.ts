import { pool } from '~/server/utils/db';

const MAX_CARDS = 500;
const MAX_BODY = 20000;

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'page id is required' });
  }
  const body = await readBody(event);
  const type = typeof body?.type === 'string' ? body.type : 'text';
  const title = body?.title ?? '';
  const content = body?.body ?? '';
  const imageUrl = body?.image_url ?? '';
  const embedUrl = body?.embed_url ?? '';
  if (content.length > MAX_BODY) {
    throw createError({ statusCode: 400, statusMessage: 'body too long' });
  }
  const { rows: countRows } = await pool.query(
    'select count(*)::int as count from ncp_cards where page_id = $1',
    [id]
  );
  if (countRows[0].count >= MAX_CARDS) {
    throw createError({ statusCode: 400, statusMessage: 'card limit reached' });
  }
  const ord = body?.ord ?? countRows[0].count + 1;
  const { rows } = await pool.query(
    `insert into ncp_cards (page_id, type, ord, title, body, image_url, embed_url)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, type, ord, title, body, image_url, embed_url`,
    [id, type, ord, title, content, imageUrl, embedUrl]
  );
  return { card: rows[0] };
});
