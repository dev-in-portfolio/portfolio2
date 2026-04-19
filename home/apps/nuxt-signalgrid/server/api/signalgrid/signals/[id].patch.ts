import { getUserId, pool } from '~/server/utils/db';

const MAX_NOTE = 2000;

function evaluateStatus(valueNum: number | null, rule: any, manualStatus?: string) {
  if (valueNum == null || !rule) return manualStatus || 'ok';
  const value = Number(valueNum);
  if (rule.bad_if_gt != null && value > Number(rule.bad_if_gt)) return 'bad';
  if (rule.bad_if_lt != null && value < Number(rule.bad_if_lt)) return 'bad';
  if (rule.warn_if_gt != null && value > Number(rule.warn_if_gt)) return 'warn';
  if (rule.warn_if_lt != null && value < Number(rule.warn_if_lt)) return 'warn';
  return 'ok';
}

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
  const note = typeof body?.note === 'string' ? body.note : null;
  const valueNum = body?.valueNum ?? null;
  const valueUnit = typeof body?.valueUnit === 'string' ? body.valueUnit : null;
  const status = typeof body?.status === 'string' ? body.status : null;
  if (note && note.length > MAX_NOTE) {
    throw createError({ statusCode: 400, statusMessage: 'note too long' });
  }
  const userId = await getUserId(deviceKey);
  const { rows: ruleRows } = await pool.query(
    'select warn_if_gt, warn_if_lt, bad_if_gt, bad_if_lt from nsg_rules where user_id = $1 and signal_id = $2',
    [userId, id]
  );
  const computedStatus = evaluateStatus(valueNum, ruleRows[0], status || undefined);
  const { rows } = await pool.query(
    `update nsg_signals
     set note = coalesce($1, note),
         value_num = coalesce($2, value_num),
         value_unit = coalesce($3, value_unit),
         status = $4,
         updated_at = now()
     where id = $5 and user_id = $6
     returning id, name, kind, status, note, value_num, value_unit, updated_at, created_at`,
    [note, valueNum, valueUnit, computedStatus, id, userId]
  );
  return { signal: rows[0] };
});
