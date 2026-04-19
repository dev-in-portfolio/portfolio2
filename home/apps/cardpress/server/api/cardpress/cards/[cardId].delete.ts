import { pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const cardId = event.context.params?.cardId;
  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: 'cardId is required' });
  }
  await pool.query('delete from ncp_cards where id = $1', [cardId]);
  return { ok: true };
});
