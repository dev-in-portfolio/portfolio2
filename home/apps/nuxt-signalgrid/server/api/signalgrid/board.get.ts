import { getUserId, pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, 'x-device-key');
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing X-Device-Key header' });
  }
  const userId = await getUserId(deviceKey);
  const { rows } = await pool.query(
    `select id, name, kind, status, note, value_num, value_unit, updated_at, created_at
     from nsg_signals
     where user_id = $1
     order by case status when 'bad' then 1 when 'warn' then 2 else 3 end,
              updated_at desc`,
    [userId]
  );
  return { signals: rows };
});
