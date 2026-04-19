import { getUserId, pool } from '~/server/utils/db';

const MAX_SIGNALS = 5000;
const MAX_NOTE = 2000;

export default defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, 'x-device-key');
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: 'Missing X-Device-Key header' });
  }
  const body = await readBody(event);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const kind = typeof body?.kind === 'string' ? body.kind.trim() : 'generic';
  const note = typeof body?.note === 'string' ? body.note : '';
  const valueNum = body?.valueNum ?? null;
  const valueUnit = typeof body?.valueUnit === 'string' ? body.valueUnit : '';
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' });
  }
  if (note.length > MAX_NOTE) {
    throw createError({ statusCode: 400, statusMessage: 'note too long' });
  }
  const userId = await getUserId(deviceKey);
  const { rows: countRows } = await pool.query(
    'select count(*)::int as count from nsg_signals where user_id = $1',
    [userId]
  );
  if (countRows[0].count >= MAX_SIGNALS) {
    throw createError({ statusCode: 400, statusMessage: 'signal limit reached' });
  }
  const { rows } = await pool.query(
    `insert into nsg_signals (user_id, name, kind, note, value_num, value_unit)
     values ($1, $2, $3, $4, $5, $6)
     returning id, name, kind, status, note, value_num, value_unit, updated_at, created_at`,
    [userId, name, kind, note, valueNum, valueUnit]
  );
  return { signal: rows[0] };
});
