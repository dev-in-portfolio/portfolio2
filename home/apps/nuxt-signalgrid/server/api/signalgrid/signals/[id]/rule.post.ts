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
  const body = await readBody(event);
  const warnIfGt = body?.warnIfGt ?? null;
  const warnIfLt = body?.warnIfLt ?? null;
  const badIfGt = body?.badIfGt ?? null;
  const badIfLt = body?.badIfLt ?? null;
  const userId = await getUserId(deviceKey);
  const { rows } = await pool.query(
    `insert into nsg_rules (user_id, signal_id, warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, signal_id)
     do update set warn_if_gt = excluded.warn_if_gt,
                   warn_if_lt = excluded.warn_if_lt,
                   bad_if_gt = excluded.bad_if_gt,
                   bad_if_lt = excluded.bad_if_lt
     returning warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt`,
    [userId, id, warnIfGt, warnIfLt, badIfGt, badIfLt]
  );
  return { rule: rows[0] };
});
