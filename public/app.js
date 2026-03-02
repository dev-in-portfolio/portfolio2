const API_BASE = "/api/forms";
const PUBLIC_BASE = "/api/public/forms";

const formsPanel = document.getElementById("forms-panel");
const builderPanel = document.getElementById("builder-panel");
const inboxPanel = document.getElementById("inbox-panel");
const publicPanel = document.getElementById("public-panel");

const state = {
  forms: [],
  activeForm: null,
  activeSchema: null,
  responses: [],
};

const sampleSchema = {
  title: "Contact Form",
  sections: [
    {
      title: "Basics",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "reason", label: "Reason", type: "select", options: ["quote", "support", "other"] },
      ],
    },
  ],
};

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

function renderForms() {
  formsPanel.innerHTML = `
    <h2>Forms</h2>
    <label>Form name</label>
    <input id="form-name" placeholder="Customer Intake" />
    <label>Schema JSON</label>
    <textarea id="form-schema"></textarea>
    <button id="create-form">Create Form</button>
    <div class="status" id="form-status"></div>
    <hr />
    <div id="form-list"></div>
  `;

  const schemaInput = document.getElementById("form-schema");
  schemaInput.value = JSON.stringify(sampleSchema, null, 2);

  const list = document.getElementById("form-list");
  if (!state.forms.length) {
    list.innerHTML = `<p class="status">No forms yet.</p>`;
  } else {
    list.innerHTML = state.forms
      .map(
        (form) => `
        <div style="margin-bottom: 12px;">
          <strong>${form.name}</strong>
          <div class="badge">${form.status}</div>
          <div>
            <button data-action="builder" data-id="${form.id}">Builder</button>
            <button data-action="inbox" data-id="${form.id}">Inbox</button>
            <button data-action="publish" data-id="${form.id}">Publish</button>
          </div>
          <small>${form.public_slug ? `Public: /f/${form.public_slug}` : "Not published"}</small>
        </div>
      `
      )
      .join("");
  }

  document.getElementById("create-form").onclick = async () => {
    const name = document.getElementById("form-name").value.trim();
    const schemaText = schemaInput.value;
    const status = document.getElementById("form-status");
    try {
      if (!name) throw new Error("Form name required");
      const schema = JSON.parse(schemaText || "{}");
      await apiFetch(API_BASE, {
        method: "POST",
        body: JSON.stringify({ name, schema }),
      });
      status.textContent = "Form created.";
      await loadForms();
    } catch (err) {
      status.textContent = err.message;
    }
  };

  list.querySelectorAll("button").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "builder") {
        await loadForm(id);
        renderBuilder();
      }
      if (action === "inbox") {
        await loadForm(id);
        await loadResponses();
        renderInbox();
      }
      if (action === "publish") {
        await publishForm(id);
      }
    };
  });
}

function renderBuilder() {
  if (!state.activeForm) {
    builderPanel.innerHTML = `<h2>Builder</h2><p class="status">Select a form.</p>`;
    return;
  }
  builderPanel.innerHTML = `
    <h2>Builder</h2>
    <label>Form name</label>
    <input id="builder-name" value="${state.activeForm.name}" />
    <label>Schema JSON</label>
    <textarea id="builder-schema"></textarea>
    <button id="save-form">Save</button>
    <div class="status" id="builder-status"></div>
    <div id="preview"></div>
  `;
  const schemaInput = document.getElementById("builder-schema");
  schemaInput.value = JSON.stringify(state.activeForm.schema, null, 2);

  document.getElementById("save-form").onclick = async () => {
    const status = document.getElementById("builder-status");
    try {
      const name = document.getElementById("builder-name").value.trim();
      const schema = JSON.parse(schemaInput.value || "{}");
      const updated = await apiFetch(`${API_BASE}/${state.activeForm.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, schema }),
      });
      state.activeForm = updated;
      status.textContent = "Saved.";
      renderPreview(schema);
      await loadForms();
    } catch (err) {
      status.textContent = err.message;
    }
  };

  renderPreview(state.activeForm.schema);
}

function renderPreview(schema) {
  const preview = document.getElementById("preview");
  if (!preview) return;
  preview.innerHTML = `<h3>Live preview</h3>`;
  schema.sections.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.innerHTML = `<h4>${section.title}</h4>`;
    section.fields.forEach((field) => {
      const input = document.createElement("input");
      input.placeholder = field.label;
      sectionEl.appendChild(input);
    });
    preview.appendChild(sectionEl);
  });
}

async function publishForm(id) {
  try {
    await apiFetch(`${API_BASE}/${id}/publish`, { method: "POST" });
    await loadForms();
  } catch (err) {
    alert(err.message);
  }
}

async function loadResponses() {
  if (!state.activeForm) return;
  const data = await apiFetch(`${API_BASE}/${state.activeForm.id}/responses`);
  state.responses = data.responses || [];
}

function renderInbox() {
  if (!state.activeForm) {
    inboxPanel.innerHTML = `<h2>Inbox</h2><p class="status">Select a form.</p>`;
    return;
  }
  inboxPanel.innerHTML = `
    <h2>Inbox</h2>
    <button id="export-csv">Export CSV</button>
    <div id="response-list"></div>
  `;
  const list = document.getElementById("response-list");
  if (!state.responses.length) {
    list.innerHTML = `<p class="status">No responses yet.</p>`;
  } else {
    list.innerHTML = `
      <table class="table">
        <thead>
          <tr><th>Submitted</th><th>Payload</th></tr>
        </thead>
        <tbody>
          ${state.responses
            .map(
              (resp) => `
              <tr>
                <td>${new Date(resp.submitted_at).toLocaleString()}</td>
                <td><pre>${JSON.stringify(resp.response, null, 2)}</pre></td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  document.getElementById("export-csv").onclick = async () => {
    const res = await fetch(
      `${API_BASE}/${state.activeForm.id}/responses?format=csv`,
      { headers: { "X-Device-Key": deviceKey() } }
    );
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "responses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
}

function renderPublic(form) {
  publicPanel.innerHTML = `
    <h2>Public Form</h2>
    <p>${form.name}</p>
    <form id="public-form"></form>
    <div class="status" id="public-status"></div>
  `;
  const formEl = document.getElementById("public-form");
  form.schema.sections.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.innerHTML = `<h3>${section.title}</h3>`;
    section.fields.forEach((field) => {
      const label = document.createElement("label");
      label.textContent = field.label;
      const input = field.type === "select" ? document.createElement("select") : document.createElement("input");
      input.name = field.key;
      input.required = Boolean(field.required);
      if (field.type === "select") {
        field.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      } else {
        input.type = field.type === "email" ? "email" : "text";
      }
      sectionEl.appendChild(label);
      sectionEl.appendChild(input);
    });
    formEl.appendChild(sectionEl);
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";
  formEl.appendChild(submit);

  formEl.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(formEl).entries());
    const status = document.getElementById("public-status");
    try {
      await publicFetch(`${PUBLIC_BASE}/${form.public_slug}/submit`, {
        method: "POST",
        body: JSON.stringify({ response: data }),
      });
      status.textContent = "Submitted.";
      formEl.reset();
    } catch (err) {
      status.textContent = err.message;
    }
  };
}

async function loadForms() {
  const data = await apiFetch(API_BASE);
  state.forms = data.forms || [];
  renderForms();
}

async function loadForm(id) {
  const form = await apiFetch(`${API_BASE}/${id}`);
  state.activeForm = form;
}

async function init() {
  try {
    await loadForms();
    renderBuilder();
    renderInbox();
  } catch (err) {
    formsPanel.innerHTML = `<h2>Forms</h2><p class="status">Backend unavailable in static preview.</p>`;
    builderPanel.innerHTML = `<h2>Builder</h2><p class="status">Connect API runtime to enable editing.</p>`;
    inboxPanel.innerHTML = `<h2>Inbox</h2><p class="status">Responses appear when API is available.</p>`;
  }
  const path = window.location.pathname;
  if (path.startsWith("/f/")) {
    const slug = path.split("/f/")[1];
    try {
      const form = await publicFetch(`${PUBLIC_BASE}/${slug}`);
      renderPublic({ ...form, public_slug: slug });
    } catch (err) {
      publicPanel.innerHTML = `<p class="status">${err.message}</p>`;
    }
  } else {
    publicPanel.innerHTML = `<p class="status">Publish a form to view the public link.</p>`;
  }
}

init();
