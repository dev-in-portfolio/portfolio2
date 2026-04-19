import { d as defineEventHandler, g as getHeader, c as createError } from '../../../nitro/nitro.mjs';
import { g as getUserId, p as pool } from '../../../_/db.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'pg';

const index_get = defineEventHandler(async (event) => {
  const deviceKey = getHeader(event, "x-device-key");
  if (!deviceKey) {
    throw createError({ statusCode: 400, statusMessage: "Missing X-Device-Key header" });
  }
  const userId = await getUserId(deviceKey);
  const { rows } = await pool.query(
    `select id, title, slug, status, published_slug, updated_at
     from ncp_pages
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );
  return { pages: rows };
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
