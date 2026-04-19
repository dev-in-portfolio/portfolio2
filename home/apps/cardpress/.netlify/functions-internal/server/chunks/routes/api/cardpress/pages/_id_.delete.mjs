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

const _id__delete = defineEventHandler(async (event) => {
  var _a;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id is required" });
  }
  await pool.query("delete from ncp_pages where id = $1", [id]);
  return { ok: true };
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
