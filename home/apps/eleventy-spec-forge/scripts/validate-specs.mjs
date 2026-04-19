import fs from "fs/promises";
import path from "path";

const specsPath = path.join("src", "_data", "specs.json");
const raw = await fs.readFile(specsPath, "utf-8");
const specs = JSON.parse(raw);

const errors = [];
const seen = new Set();
const seenRoutes = new Set();
const seenEntities = new Set();
let entitiesCount = 0;
let routesCount = 0;

const validStatuses = new Set(["draft", "review", "approved", "deprecated", "active"]);
const validOwners = new Set(["platform", "security", "operations", "logistics"]);

for (const spec of specs) {
  if (!spec.id || !spec.title || !spec.overview) {
    errors.push(`Missing required fields for ${spec.id || "unknown"}`);
  }
  if (!spec.constraints || spec.constraints.length === 0) {
    errors.push(`Missing constraints for ${spec.id}`);
  }
  if (!spec.acceptance || spec.acceptance.length === 0) {
    errors.push(`Missing acceptance for ${spec.id}`);
  }
  if (!spec.entities && !spec.routes) {
    errors.push(`Missing entities/routes for ${spec.id}`);
  }
  
  if (!spec.status) {
    errors.push(`Missing status for ${spec.id}`);
  } else if (!validStatuses.has(spec.status)) {
    errors.push(`Invalid status for ${spec.id}: ${spec.status} (must be one of ${[...validStatuses].join(', ')})`);
  }
  
  if (!spec.owner || !validOwners.has(spec.owner)) {
    errors.push(`Invalid or missing owner for ${spec.id}`);
  }
  
  if (spec.routes) {
    spec.routes.forEach((route) => {
      if (!route.method || !route.path) {
        errors.push(`Invalid route in ${spec.id}`);
      }
      const routeKey = `${route.method}:${route.path}`;
      if (seenRoutes.has(routeKey)) {
        errors.push(`Duplicate route ${routeKey} in ${spec.id}`);
      }
      seenRoutes.add(routeKey);
    });
  }
  
  if (spec.entities) {
    spec.entities.forEach((entity) => {
      if (!entity.name || !entity.fields) {
        errors.push(`Invalid entity in ${spec.id}`);
      }
      if (seenEntities.has(entity.name)) {
        errors.push(`Duplicate entity ${entity.name} in ${spec.id}`);
      }
      seenEntities.add(entity.name);
      
      entity.fields.forEach((field) => {
        if (!field.name || !field.type) {
          errors.push(`Invalid field in ${spec.id}/${entity.name}`);
        }
        if (field.required !== undefined && typeof field.required !== "boolean") {
          errors.push(`Invalid required flag in ${spec.id}/${entity.name}/${field.name}`);
        }
      });
    });
  }
  
  if (spec.related) {
    spec.related.forEach((ref) => {
      if (!specs.some(s => s.id === ref)) {
        errors.push(`Missing referenced spec ${ref} from ${spec.id}`);
      }
    });
  }

  if (seen.has(spec.id)) errors.push(`Duplicate id ${spec.id}`);
  seen.add(spec.id);

  entitiesCount += spec.entities ? spec.entities.length : 0;
  routesCount += spec.routes ? spec.routes.length : 0;
}

const report = {
  specs: specs.length,
  entities: entitiesCount,
  routes: routesCount,
  errors,
  warnings: [],
};

await fs.mkdir("_site", { recursive: true });
await fs.writeFile("_site/spec-report.json", JSON.stringify(report, null, 2));

if (errors.length) {
  console.error("Validation failed:\n" + errors.join("\n"));
  process.exit(1);
}

console.log("Spec validation passed.");
