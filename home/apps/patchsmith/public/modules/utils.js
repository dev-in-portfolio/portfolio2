// Utility Functions Module
function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function validateSchema(schema) {
  const errors = [];
  
  if (!schema?.sections || !Array.isArray(schema.sections)) {
    errors.push("Schema must include sections array");
  }
  
  if (schema.sections) {
    let totalFields = 0;
    schema.sections.forEach((section, sectionIndex) => {
      if (!section.title) {
        errors.push(`Section ${sectionIndex + 1} missing title`);
      }
      if (!section.fields || !Array.isArray(section.fields)) {
        errors.push(`Section ${sectionIndex + 1} missing fields array`);
      }
      if (section.fields) {
        totalFields += section.fields.length;
        section.fields.forEach((field, fieldIndex) => {
          if (!field.key) {
            errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1} missing key`);
          }
          if (!field.label) {
            errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1} missing label`);
          }
          if (!field.type) {
            errors.push(`Section ${sectionIndex + 1}, Field ${fieldIndex + 1} missing type`);
          }
        });
      }
    });
    
    if (totalFields > 200) {
      errors.push("Maximum 200 fields per form");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function countFields(schema) {
  if (!schema?.sections) return 0;
  return schema.sections.reduce(
    (acc, section) => acc + (section.fields ? section.fields.length : 0),
    0
  );
}

function generateSampleSchema() {
  return {
    title: "Contact Form",
    description: "A simple contact form with validation",
    sections: [
      {
        title: "Contact Information",
        fields: [
          { key: "name", label: "Full Name", type: "text", required: true, placeholder: "John Doe" },
          { key: "email", label: "Email Address", type: "email", required: true, placeholder: "john@example.com" },
          { key: "phone", label: "Phone Number", type: "tel", required: false, placeholder: "(123) 456-7890" },
        ],
      },
      {
        title: "Reason for Contact",
        fields: [
          {
            key: "reason",
            label: "How can we help?",
            type: "select",
            required: true,
            options: [
              { value: "support", label: "Technical Support" },
              { value: "sales", label: "Sales Inquiry" },
              { value: "feedback", label: "Product Feedback" },
              { value: "other", label: "Other" },
            ],
          },
          {
            key: "message",
            label: "Your Message",
            type: "textarea",
            required: true,
            placeholder: "Please describe your request...",
            rows: 4,
          },
        ],
      },
    ],
  };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function truncateText(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export {
  slugify,
  validateSchema,
  countFields,
  generateSampleSchema,
  formatDate,
  truncateText,
  downloadFile,
  showToast,
};