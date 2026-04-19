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

const _publishedSlug__get = defineEventHandler(async (event) => {
  var _a;
  const publishedSlug = (_a = event.context.params) == null ? void 0 : _a.publishedSlug;
  if (!publishedSlug) {
    throw createError({ statusCode: 400, statusMessage: "publishedSlug is required" });
  }
  const { rows: pageRows } = await pool.query(
    "select id, title from ncp_pages where published_slug = $1 and status = $2",
    [publishedSlug, "published"]
  );
  if (!pageRows[0]) {
    throw createError({ statusCode: 404, statusMessage: "page not found" });
  }
  const { rows: cards } = await pool.query(
    `select id, type, ord, title, body, image_url, embed_url
     from ncp_cards
     where page_id = $1
     order by ord asc`,
    [pageRows[0].id]
  );
  return { page: pageRows[0], cards };
});

export { _publishedSlug__get as default };
//# sourceMappingURL=_publishedSlug_.get.mjs.map
