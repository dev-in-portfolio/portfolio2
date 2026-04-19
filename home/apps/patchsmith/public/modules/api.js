// API Module - Handles all API communication
const API_BASE = "/api/forms";
const PUBLIC_BASE = "/api/public/forms";

function deviceKey() {
  let key = localStorage.getItem("formfoundry_device_key");
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem("formfoundry_device_key", key);
  }
  return key;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Key": deviceKey(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function publicFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function exportFormResponses(formId, format = "json") {
  const res = await fetch(
    `${API_BASE}/${formId}/responses?format=${format}`,
    { headers: { "X-Device-Key": deviceKey() } }
  );
  if (format === "csv") {
    return res.text();
  }
  return res.json();
}

async function getFormAnalytics(formId) {
  return apiFetch(`${API_BASE}/${formId}/analytics`);
}

async function duplicateForm(formId, newName) {
  return apiFetch(`${API_BASE}/${formId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ name: newName }),
  });
}

export {
  apiFetch,
  publicFetch,
  exportFormResponses,
  getFormAnalytics,
  duplicateForm,
  deviceKey,
};