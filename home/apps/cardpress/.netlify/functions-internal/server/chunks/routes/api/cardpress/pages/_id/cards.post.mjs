import { d as defineEventHandler, c as createError, r as readBody } from '../../../../../nitro/nitro.mjs';
import { p as pool } from '../../../../../_/db.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'pg';

const MAX_CARDS = 500;
const MAX_BODY = 2e4;
const cards_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f;
  const id = (_a = event.context.params) == null ? void 0 : _a.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "page id is required" });
  }
  const body = await readBody(event);
  const type = typeof (body == null ? void 0 : body.type) === "string" ? body.type : "text";
  const title = (_b = body == null ? void 0 : body.title) != null ? _b : "";
  const content = (_c = body == null ? void 0 : body.body) != null ? _c : "";
  const imageUrl = (_d = body == null ? void 0 : body.image_url) != null ? _d : "";
  const embedUrl = (_e = body == null ? void 0 : body.embed_url) != null ? _e : "";
  if (content.length > MAX_BODY) {
    throw createError({ statusCode: 400, statusMessage: "body too long" });
  }
  const { rows: countRows } = await pool.query(
    "select count(*)::int as count from ncp_cards where page_id = $1",
    [id]
  );
  if (countRows[0].count >= MAX_CARDS) {
    throw createError({ statusCode: 400, statusMessage: "card limit reached" });
  }
  const ord = (_f = body == null ? void 0 : body.ord) != null ? _f : countRows[0].count + 1;
  const { rows } = await pool.query(
    `insert into ncp_cards (page_id, type, ord, title, body, image_url, embed_url)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, type, ord, title, body, image_url, embed_url`,
    [id, type, ord, title, content, imageUrl, embedUrl]
  );
  return { card: rows[0] };
});

export { cards_post as default };
//# sourceMappingURL=cards.post.mjs.map
