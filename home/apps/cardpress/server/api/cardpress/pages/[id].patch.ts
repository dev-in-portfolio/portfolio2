import { pool } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' });
  }
  const body = await readBody(event);
  const title = typeof body?.title === 'string' ? body.title.trim() : null;
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : null;
  const status = typeof body?.status === 'string' ? body.status : null;

  let publishedSlug = body?.published_slug ?? null;
  if (status === 'published' && !publishedSlug) {
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
