import { pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' });
  }
  await pool.query('delete from ncp_pages where id = $1', [id]);
  return { ok: true };
});
