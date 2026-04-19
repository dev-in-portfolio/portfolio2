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

const MAX_BODY = 2e4;
const _cardId__patch = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f;
  const cardId = (_a = event.context.params) == null ? void 0 : _a.cardId;
  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId is required" });
  }
  const body = await readBody(event);
  const title = (_b = body == null ? void 0 : body.title) != null ? _b : null;
  const content = (_c = body == null ? void 0 : body.body) != null ? _c : null;
  const imageUrl = (_d = body == null ? void 0 : body.image_url) != null ? _d : null;
  const embedUrl = (_e = body == null ? void 0 : body.embed_url) != null ? _e : null;
  const ord = (_f = body == null ? void 0 : body.ord) != null ? _f : null;
  if (content && content.length > MAX_BODY) {
    throw createError({ statusCode: 400, statusMessage: "body too long" });
  }
  const { rows } = await pool.query(
    `update ncp_cards
     set title = coalesce($1, title),
         body = coalesce($2, body),
         image_url = coalesce($3, image_url),
         embed_url = coalesce($4, embed_url),
         ord = coalesce($5, ord)
     where id = $6
     returning id, type, ord, title, body, image_url, embed_url`,
    [title, content, imageUrl, embedUrl, ord, cardId]
  );
  return { card: rows[0] };
});

export { _cardId__patch as default };
//# sourceMappingURL=_cardId_.patch.mjs.map
