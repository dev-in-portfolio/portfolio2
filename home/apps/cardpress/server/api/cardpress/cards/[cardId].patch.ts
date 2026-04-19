import { pool } from '~/server/utils/db';

const MAX_BODY = 20000;

export default defineEventHandler(async (event) => {
  const cardId = event.context.params?.cardId;
  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: 'cardId is required' });
  }
  const body = await readBody(event);
  const title = body?.title ?? null;
  const content = body?.body ?? null;
  const imageUrl = body?.image_url ?? null;
  const embedUrl = body?.embed_url ?? null;
  const ord = body?.ord ?? null;
  if (content && content.length > MAX_BODY) {
    throw createError({ statusCode: 400, statusMessage: 'body too long' });
  }
  const { rows } = await pool.query(
    `update ncp_cards
     set title = coalesce($1, title),
         body = coalesce($2, body),
         image_url = coalesce($3, image_url),
         embed_url = coalesce($4, embed_url),
         ord = coalesce($5, ord)
     where id = $6
     returning id, type, ord, title, body, image_url, embed_url`,
    [title, content, imageUrl, embedUrl, ord, cardId]
  );
  return { card: rows[0] };
});
