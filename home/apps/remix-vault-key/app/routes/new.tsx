import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { pool } from "~/utils/db.server";

const MAX_BODY = 200000;

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const title = String(form.get("title") || "").trim();
  const tags = String(form.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const salt = String(form.get("salt") || "");
  const iv = String(form.get("iv") || "");
  const ciphertext = String(form.get("ciphertext") || "");
  if (!title) return json({ error: "title required" }, { status: 400 });
  if (ciphertext.length > MAX_BODY) return json({ error: "ciphertext too large" }, { status: 400 });

  await pool.query(
    `insert into sealed_entries (title, tags, salt, iv, ciphertext)
     values ($1, $2, decode($3, 'base64'), decode($4, 'base64'), decode($5, 'base64'))`,
    [title, tags, salt, iv, ciphertext]
  );
  return redirect("/");
}

export default function NewEntry() {
  const data = useActionData<typeof action>();
  return (
    <div className="shell">
      <h1>New Sealed Entry</h1>
      <p className="muted">Encryption happens in your browser. Passphrase never leaves.</p>
      {data?.error ? <p className="muted">{data.error}</p> : null}
      <Form method="post" className="panel" id="create-form">
        <input name="title" placeholder="Title" />
        <input name="tags" placeholder="Tags (comma-separated)" />
        <textarea name="body" rows={8} placeholder="Body (plaintext)" />
        <input type="hidden" name="salt" />
        <input type="hidden" name="iv" />
        <input type="hidden" name="ciphertext" />
        <button type="submit">Seal Entry</button>
      </Form>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            const form = document.getElementById('create-form');
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const passphrase = prompt('Enter passphrase for encryption');
              if (!passphrase) return;
              const body = form.querySelector('[name="body"]').value;
              const { encrypt } = await import('/build/crypto-client.js').catch(() => ({}));
              if (!encrypt) { alert('Crypto module not loaded'); return; }
              const payload = await encrypt(passphrase, body);
              form.querySelector('[name="salt"]').value = payload.salt;
              form.querySelector('[name="iv"]').value = payload.iv;
              form.querySelector('[name="ciphertext"]').value = payload.ciphertext;
              form.submit();
            });
          `
        }}
      />
    </div>
  );
}
