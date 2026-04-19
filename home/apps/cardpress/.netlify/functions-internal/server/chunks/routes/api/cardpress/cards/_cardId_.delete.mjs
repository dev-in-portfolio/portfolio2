import { d as defineEventHandler, c as createError } from '../../../../nitro/nitro.mjs';
import { p as pool } from '../../../../_/db.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'pg';

const _cardId__delete = defineEventHandler(async (event) => {
  var _a;
  const cardId = (_a = event.context.params) == null ? void 0 : _a.cardId;
  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId is required" });
  }
  await pool.query("delete from ncp_cards where id = $1", [cardId]);
  return { ok: true };
});

export { _cardId__delete as default };
//# sourceMappingURL=_cardId_.delete.mjs.map
