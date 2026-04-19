import { getUserId, pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, 'x-device-key');
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing X-Device-Key header' });
  }
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' });
  }
  const userId = await getUserId(deviceKey);
  await pool.query('delete from nsg_rules where user_id = $1 and signal_id = $2', [userId, id]);
  return { ok: true };
});
