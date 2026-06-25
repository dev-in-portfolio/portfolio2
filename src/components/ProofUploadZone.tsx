'use client';

import React, { useState } from 'react';

type ProofUploadZoneProps = {
  onAddProof: (proof: { kind: 'note' | 'link' | 'file'; label: string; note: string; url: string }) => void;
  onCancel: () => void;
};

export default function ProofUploadZone({ onAddProof, onCancel }: ProofUploadZoneProps) {
  const [kind, setKind] = useState<'note' | 'link' | 'file'>('file');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<{ name: string; size: string; dataUrl?: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
    setLabel(file.name);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview({
          name: file.name,
          size: sizeStr,
          dataUrl: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    } else {
      setPreview({
        name: file.name,
        size: sizeStr
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!label.trim()) return;
    onAddProof({
      kind,
      label: label.trim(),
      note: note.trim(),
      url: kind === 'file' ? 'mock-storage-path/' + label : url.trim()
    });
  };

  return (
    <div className="proof-modal-backdrop">
      <div className="proof-modal-card">
        <h3>Submit Required Proof</h3>
        <p className="muted">Upload a file, note, or reference link to transition this item.</p>

        <div className="proof-kind-selector">
          <button className={`btn-tab ${kind === 'file' ? 'active' : ''}`} onClick={() => setKind('file')}>File</button>
          <button className={`btn-tab ${kind === 'note' ? 'active' : ''}`} onClick={() => setKind('note')}>Note</button>
          <button className={`btn-tab ${kind === 'link' ? 'active' : ''}`} onClick={() => setKind('link')}>Link</button>
        </div>

        <div style={{ marginTop: 16 }}>
          {kind === 'file' && (
            <div 
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input type="file" id="file-upload" className="hidden-file-input" onChange={handleFileInput} />
              <label htmlFor="file-upload" className="dropzone-label">
                {preview ? (
                  <div className="preview-container">
                    {preview.dataUrl ? (
                      <img src={preview.dataUrl} alt="Preview" className="preview-image" />
                    ) : (
                      <div className="preview-icon">📄</div>
                    )}
                    <span className="preview-name">{preview.name} ({preview.size})</span>
                  </div>
                ) : (
                  <div>
                    <span className="dropzone-icon">📥</span>
                    <p>Drag & drop your proof file here, or <strong>browse</strong></p>
                  </div>
                )}
              </label>
            </div>
          )}

          {kind === 'note' && (
            <textarea 
              className="input w-full" 
              placeholder="Enter your verification note here..."
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setLabel(e.target.value.substring(0, 30) || 'Note Proof');
              }}
            />
          )}

          {kind === 'link' && (
            <div className="grid">
              <input 
                type="text" 
                className="input" 
                placeholder="Proof Label (e.g. GitHub Pull Request)" 
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <input 
                type="text" 
                className="input" 
                placeholder="URL (https://...)" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={handleSubmit} disabled={!label.trim()}>Submit Proof</button>
        </div>
      </div>
    </div>
  );
}
