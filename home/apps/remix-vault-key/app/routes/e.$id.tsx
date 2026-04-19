import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { pool } from "~/utils/db.server";

export async function loader({ params }: LoaderFunctionArgs) {
  const { rows } = await pool.query(
    `select id, title, tags, encode(salt, 'base64') as salt, encode(iv, 'base64') as iv,
            encode(ciphertext, 'base64') as ciphertext, created_at
     from sealed_entries where id = $1`,
    [params.id]
  );
  if (!rows[0]) throw new Response("Not Found", { status: 404 });
  return json({ entry: rows[0] });
}

export default function ViewEntry() {
  const { entry } = useLoaderData<typeof loader>();
  return (
    <div className="shell">
      <h1>{entry.title}</h1>
      <p className="muted">{(entry.tags || []).join(", ")}</p>
      <section className="panel">
        <button
          onClick={async () => {
            const passphrase = prompt("Passphrase?");
            if (!passphrase) return;
            const module = await import("/build/crypto-client.mjs").catch(() => null);
            if (!module) return alert("Crypto module not loaded");
            const plaintext = await module.decrypt(passphrase, {
              salt: entry.salt,
              iv: entry.iv,
              ciphertext: entry.ciphertext
            });
            const target = document.getElementById("plaintext");
            if (target) target.textContent = plaintext;
          }}
        >
          Unlock & Decrypt
        </button>
        <pre id="plaintext" className="muted">
          Locked. Provide passphrase to decrypt.
        </pre>
      </section>
    </div>
  );
}
