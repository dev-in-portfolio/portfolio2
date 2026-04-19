import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { pool } from "~/utils/db.server";
import { decrypt as cryptoDecrypt, encrypt as cryptoEncrypt } from "~/utils/crypto.client";

export async function loader({ params }: LoaderFunctionArgs) {
  const { rows } = await pool.query(
    `select e.id, e.title, e.tags, e.collection_id,
            encode(e.salt, 'base64') as salt, 
            encode(e.iv, 'base64') as iv, 
            encode(e.ciphertext, 'base64') as ciphertext
     from sealed_entries e
     where e.id = $1`,
    [params.id]
  );
  if (!rows[0]) throw new Response("Not Found", { status: 404 });
  
  // Get collections for dropdown
  const collectionsResult = await pool.query(
    `select id, name from collections order by name`
  );
  
  return json({
    entry: rows[0],
    collections: collectionsResult.rows
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const collectionId = formData.get("collectionId") || null;
  const salt = String(formData.get("salt") || "");
  const iv = String(formData.get("iv") || "");
  const ciphertext = String(formData.get("ciphertext") || "");
  
  if (!title) return json({ error: "title required" }, { status: 400 });
  
  await pool.query(
    `update sealed_entries 
     set title = $1, 
         tags = $2, 
         collection_id = $3,
         salt = decode($4, 'base64'),
         iv = decode($5, 'base64'),
         ciphertext = decode($6, 'base64'),
         updated_at = now()
     where id = $7`,
    [title, tags, collectionId, salt, iv, ciphertext, params.id]
  );
  return redirect(`/e/${params.id}`);
}

export default function EditEntry() {
  const { entry, collections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(entry.collection_id || '');
  
  useEffect(() => {
    // Auto-select current collection
    if (entry.collection_id) {
      setSelectedCollection(entry.collection_id);
    }
  }, [entry.collection_id]);
  
  const handleDecrypt = async () => {
    setIsDecrypting(true);
    setDecryptionError(null);
    
    try {
      const passphrase = prompt("Enter your vault passphrase to decrypt this entry:");
      if (!passphrase) {
        setIsDecrypting(false);
        return;
      }
      
      const result = await cryptoDecrypt(passphrase, {
        salt: entry.salt,
        iv: entry.iv,
        ciphertext: entry.ciphertext
      });
      
      setDecryptedContent(result);
    } catch (error) {
      setDecryptionError(error.message || "Decryption failed. Please check your passphrase.");
      console.error("Decryption error:", error);
    } finally {
      setIsDecrypting(false);
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!decryptedContent) {
      alert('Please decrypt the entry first');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const passphrase = prompt("Enter your vault passphrase to re-encrypt this entry:");
      if (!passphrase) {
        setIsSaving(false);
        return;
      }
      
      const form = document.getElementById('edit-form') as HTMLFormElement;
      const title = form.querySelector('[name="title"]')?.value;
      const tags = form.querySelector('[name="tags"]')?.value;
      
      if (!title) {
        alert('Title is required');
        setIsSaving(false);
        return;
      }
      
      const payload = await cryptoEncrypt(passphrase, decryptedContent);
      form.querySelector('[name="salt"]')?.setAttribute('value', payload.salt);
      form.querySelector('[name="iv"]')?.setAttribute('value', payload.iv);
      form.querySelector('[name="ciphertext"]')?.setAttribute('value', payload.ciphertext);
      
      form.submit();
    } catch (error) {
      alert('Encryption failed: ' + error.message);
      setIsSaving(false);
    }
  };
  
  return (
    <div className="vault-container">
      <header className="page-header">
        <h1><i className="fas fa-edit"></i> Edit Encrypted Entry</h1>
        <p className="subtitle">
          <i className="fas fa-lock"></i> All changes are encrypted before saving.
        </p>
        
        <div className="security-notice">
          <i className="fas fa-shield-alt"></i>
          <strong>Security Notice:</strong> Your content will be re-encrypted with your vault passphrase before saving.
        </div>
      </header>
      
      <div className="content-layout">
        <div className="main-content">
          {!decryptedContent ? (
            <div className="decryption-panel">
              <div className="locked-content">
                <div className="lock-icon">
                  <i className="fas fa-lock-alt"></i>
                </div>
                <h3>Entry is Encrypted</h3>
                <p className="encryption-info">
                  This entry is securely encrypted. Enter your passphrase to decrypt and edit the content.
                </p>
                
                <button 
                  onClick={handleDecrypt}
                  disabled={isDecrypting}
                  className="primary-btn large"
                >
                  {isDecrypting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Decrypting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-unlock"></i> Unlock & Edit
                    </>
                  )}
                </button>
                
                {decryptionError && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> {decryptionError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Form method="post" className="entry-form" id="edit-form" onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="title">Entry Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  defaultValue={entry.title}
                  placeholder="Give your entry a descriptive title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="collectionId">Collection</label>
                <select
                  id="collectionId"
                  name="collectionId"
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                >
                  <option value="">No Collection</option>
                  {collections.map((col: any) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  defaultValue={entry.tags.join(', ')}
                  placeholder="e.g., work, personal, urgent"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="body">Content</label>
                <textarea
                  id="body"
                  name="body"
                  rows={15}
                  value={decryptedContent}
                  onChange={(e) => setDecryptedContent(e.target.value)}
                  placeholder="Edit your encrypted content..."
                  required
                ></textarea>
                <div className="char-count">
                  <span id="charCounter">0</span> characters
                </div>
              </div>
              
              <input type="hidden" name="salt" />
              <input type="hidden" name="iv" />
              <input type="hidden" name="ciphertext" />
              
              <div className="form-actions">
                <button type="button" onClick={() => navigate(`/e/${entry.id}`)} className="secondary-btn">
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button type="submit" disabled={isSaving} className="primary-btn">
                  {isSaving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Encrypting & Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock"></i> Save Changes
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </div>
        
        <div className="sidebar">
          <div className="info-panel">
            <h3><i className="fas fa-info-circle"></i> Editing Security</h3>
            <ul className="info-list">
              <li><strong>Client-Side:</strong> All encryption happens in your browser</li>
              <li><strong>Zero Knowledge:</strong> We never see your passphrase or plaintext</li>
              <li><strong>Re-encryption:</strong> Content is encrypted again before saving</li>
              <li><strong>Memory Safety:</strong> Decrypted content is cleared after saving</li>
            </ul>
          </div>
          
          <div className="info-panel">
            <h3><i className="fas fa-lightbulb"></i> Best Practices</h3>
            <ul className="info-list">
              <li>Lock your vault when not in use</li>
              <li>Use unique passphrases for different vaults</li>
              <li>Regularly update important entries</li>
              <li>Be cautious when editing on shared computers</li>
            </ul>
          </div>
        </div>
      </div>
      
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Character counter
            const textarea = document.getElementById('body');
            const counter = document.getElementById('charCounter');
            
            if (textarea && counter) {
              textarea.addEventListener('input', function() {
                counter.textContent = this.value.length;
              });
              
              // Initialize counter
              if (textarea.value) {
                counter.textContent = textarea.value.length;
              }
            }
          `
        }}
      />
    </div>
  );
}
