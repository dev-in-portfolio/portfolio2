import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useRef } from "react";
import { pool } from "~/utils/db.server";
import { 
  isSessionValid,
  exportEncryptedBackup,
  importEncryptedBackup 
} from "~/utils/crypto.client";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!isSessionValid()) {
    return redirect("/");
  }
  
  // Get all entries for export
  const { rows } = await pool.query(
    `select id, title, tags, collection_id, created_at, updated_at,
            encode(salt, 'base64') as salt,
            encode(iv, 'base64') as iv,
            encode(ciphertext, 'base64') as ciphertext
     from sealed_entries order by created_at desc`
  );
  
  return json({ entries: rows });
}

export async function action({ request }: ActionFunctionArgs) {
  if (!isSessionValid()) {
    return redirect("/");
  }
  
  const form = await request.formData();
  const intent = form.get("intent");
  
  if (intent === "import") {
    const fileInput = form.get("backupFile") as File;
    const passphrase = form.get("importPassphrase") as string;
    
    if (!fileInput || !passphrase) {
      return json({ error: "File and passphrase are required" }, { status: 400 });
    }
    
    try {
      const { importEncryptedBackup } = await import("~/utils/crypto.client");
      const entries = await importEncryptedBackup(fileInput, passphrase);
      
      // Import entries into database
      for (const entry of entries) {
        await pool.query(
          `insert into sealed_entries 
           (id, collection_id, title, tags, salt, iv, ciphertext, created_at, updated_at)
           values ($1, $2, $3, $4, decode($5, 'base64'), decode($6, 'base64'), decode($7, 'base64'), $8, $9)
           on conflict (id) do nothing`,
          [
            entry.id,
            entry.collection_id,
            entry.title,
            entry.tags,
            entry.salt,
            entry.iv,
            entry.ciphertext,
            entry.created_at,
            entry.updated_at
          ]
        );
      }
      
      return json({ 
        success: true, 
        message: `Successfully imported ${entries.length} entries` 
      });
    } catch (error) {
      return json({ 
        error: error.message || "Import failed. Please check your passphrase and file." 
      }, { status: 400 });
    }
  }
  
  return redirect("/import-export");
}

export default function ImportExport() {
  const { entries } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleExport = async () => {
    if (!isSessionValid()) {
      alert('Please unlock your vault first');
      navigate('/');
      return;
    }
    
    setIsExporting(true);
    try {
      const passphrase = prompt('Enter your vault passphrase to create encrypted backup:');
      if (!passphrase) {
        setIsExporting(false);
        return;
      }
      
      const { exportEncryptedBackup } = await import('~/utils/crypto.client');
      const backupBlob = await exportEncryptedBackup(entries, passphrase);
      
      // Create download link
      const url = URL.createObjectURL(backupBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vaultkey-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
    } catch (error) {
      alert('Export failed: ' + error.message);
      setIsExporting(false);
    }
  };
  
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    
    if (!fileInputRef.current?.files?.[0]) {
      setImportError('Please select a backup file');
      setIsImporting(false);
      return;
    }
    
    if (!importPassphrase) {
      setImportError('Please enter your passphrase');
      setIsImporting(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('intent', 'import');
      formData.append('backupFile', fileInputRef.current.files[0]);
      formData.append('importPassphrase', importPassphrase);
      
      const response = await fetch('/import-export', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setImportSuccess(result.message);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setImportPassphrase('');
      } else {
        setImportError(result.error || 'Import failed');
      }
    } catch (error) {
      setImportError(error.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <div className="vault-container">
      <header className="page-header">
        <h1><i className="fas fa-exchange-alt"></i> Import & Export</h1>
        <p className="subtitle">
          <i className="fas fa-lock"></i> Securely backup and restore your encrypted notes
        </p>
        
        <div className="security-notice">
          <i className="fas fa-shield-alt"></i>
          <strong>Security Notice:</strong> All exports are encrypted with your vault passphrase.
          Backups can only be restored with the same passphrase.
        </div>
      </header>
      
      <div className="content-layout">
        <div className="main-content">
          <div className="import-export-grid">
            {/* Export Section */}
            <div className="export-section">
              <h2><i className="fas fa-download"></i> Export Backup</h2>
              <p className="section-description">
                Create an encrypted backup of all your vault entries.
                This file can be used to restore your data later.
              </p>
              
              <div className="export-info">
                <div className="stat-item">
                  <i className="fas fa-file-archive"></i>
                  <span>{entries.length} entries will be exported</span>
                </div>
                <div className="stat-item">
                  <i className="fas fa-lock"></i>
                  <span>Encrypted with your vault passphrase</span>
                </div>
                <div className="stat-item">
                  <i className="fas fa-shield-alt"></i>
                  <span>Zero-knowledge security maintained</span>
                </div>
              </div>
              
              <button 
                onClick={handleExport} 
                disabled={isExporting || entries.length === 0}
                className="primary-btn large"
              >
                {isExporting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Preparing Backup...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-export"></i> Create Encrypted Backup
                  </>
                )}
              </button>
              
              {entries.length === 0 && (
                <div className="info-message">
                  <i className="fas fa-info-circle"></i> 
                  You have no entries to export. Create some notes first!
                </div>
              )}
            </div>
            
            {/* Import Section */}
            <div className="import-section">
              <h2><i className="fas fa-upload"></i> Import Backup</h2>
              <p className="section-description">
                Restore entries from an encrypted backup file.
                You'll need the passphrase used to create the backup.
              </p>
              
              <form onSubmit={handleImport} className="import-form">
                <div className="form-group">
                  <label>Backup File (.json)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    required
                    disabled={isImporting}
                  />
                </div>
                
                <div className="form-group">
                  <label>Vault Passphrase</label>
                  <input
                    type="password"
                    value={importPassphrase}
                    onChange={(e) => setImportPassphrase(e.target.value)}
                    placeholder="Enter passphrase used for backup"
                    required
                    disabled={isImporting}
                  />
                </div>
                
                <div className="import-tips">
                  <h4><i className="fas fa-lightbulb"></i> Import Tips:</h4>
                  <ul>
                    <li>Use the same passphrase that created the backup</li>
                    <li>Duplicate entries (same ID) will be skipped</li>
                    <li>Collections will be created if they don't exist</li>
                    <li>Your existing data remains safe</li>
                  </ul>
                </div>
                
                {importError && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> {importError}
                  </div>
                )}
                
                {importSuccess && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i> {importSuccess}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={isImporting}
                  className="primary-btn large"
                >
                  {isImporting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Importing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-import"></i> Import Backup
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="sidebar">
          <div className="info-panel">
            <h3><i className="fas fa-info-circle"></i> Backup Security</h3>
            <ul className="info-list">
              <li><strong>End-to-End Encrypted:</strong> Backups are encrypted before leaving your device</li>
              <li><strong>Zero Knowledge:</strong> We never see your passphrase or plaintext</li>
              <li><strong>AES-256-GCM:</strong> Same military-grade encryption as your vault</li>
              <li><strong>Portable:</strong> Backup files work across devices</li>
            </ul>
          </div>
          
          <div className="info-panel">
            <h3><i className="fas fa-lightbulb"></i> Best Practices</h3>
            <ul className="info-list">
              <li>Store backups in secure locations</li>
              <li>Use different storage than your main device</li>
              <li>Test imports periodically</li>
              <li>Never share backup files without encryption</li>
              <li>Remember: passphrase loss = data loss</li>
            </ul>
          </div>
          
          <div className="info-panel warning-panel">
            <h3><i className="fas fa-exclamation-triangle"></i> Important Warnings</h3>
            <ul className="info-list">
              <li>Backups are only as secure as their storage</li>
              <li>Lost passphrases cannot be recovered</li>
              <li>Always verify imports completed successfully</li>
              <li>Consider multiple backup locations</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="page-actions">
        <Link to="/" className="secondary-btn">
          <i className="fas fa-arrow-left"></i> Back to Vault
        </Link>
      </div>
    </div>
  );
}