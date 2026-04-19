import { d as defineEventHandler, c as createError, r as readBody } from '../../../../nitro/nitro.mjs';
import { p as pool } from '../../../../_/db.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'pg';

const _id__patch = defineEventHandler(async (event) => {
  var _a, _b;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id is required" });
  }
  const body = await readBody(event);
  const title = typeof (body == null ? void 0 : body.title) === "string" ? body.title.trim() : null;
  const slug = typeof (body == null ? void 0 : body.slug) === "string" ? body.slug.trim() : null;
  const status = typeof (body == null ? void 0 : body.status) === "string" ? body.status : null;
  let publishedSlug = (_b = body == null ? void 0 : body.published_slug) != null ? _b : null;
  if (status === "published" && !publishedSlug) {
    publishedSlug = `cp-${crypto.randomUUID().slice(0, 8)}`;
  }
  const { rows } = await pool.query(
    `update ncp_pages
     set title = coalesce($1, title),
         slug = coalesce($2, slug),
         status = coalesce($3, status),
         published_slug = coalesce($4, published_slug),
         updated_at = now()
     where id = $5
     returning id, title, slug, status, published_slug, updated_at`,
    [title, slug, status, publishedSlug, id]
  );
  return { page: rows[0] };
});

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
