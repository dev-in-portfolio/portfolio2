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

const _id__get = defineEventHandler(async (event) => {
  var _a;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id is required" });
  }
  const { rows: pageRows } = await pool.query(
    "select id, title, slug, status, published_slug from ncp_pages where id = $1",
    [id]
  );
  if (!pageRows[0]) {
    throw createError({ statusCode: 404, statusMessage: "page not found" });
  }
  const { rows: cards } = await pool.query(
    `select id, type, ord, title, body, image_url, embed_url
     from ncp_cards
     where page_id = $1
     order by ord asc`,
    [id]
  );
  return { page: pageRows[0], cards };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
