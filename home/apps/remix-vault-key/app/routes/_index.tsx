import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { pool } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { rows } = await pool.query(
    `select id, title, tags, created_at from sealed_entries order by created_at desc limit 100`
  );
  return json({ entries: rows });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "lock") {
    return redirect("/");
  }
  return redirect("/");
}

export default function VaultIndex() {
  const { entries } = useLoaderData<typeof loader>();
  return (
    <div className="shell">
      <header>
        <h1>VaultKey</h1>
        <p className="muted">Sealed entries stored encrypted. Unlock in-browser to read.</p>
      </header>
      <section className="row">
        <Link className="pill" to="/new">New Entry</Link>
      </section>
      <section className="grid">
        {entries.map((entry: any) => (
          <div className="panel" key={entry.id}>
            <h3>{entry.title}</h3>
            <p className="muted">{(entry.tags || []).join(", ")}</p>
            <p className="muted">{new Date(entry.created_at).toLocaleString()}</p>
            <Link to={`/e/${entry.id}`}>Open</Link>
          </div>
        ))}
      </section>
    </div>
  );
}
