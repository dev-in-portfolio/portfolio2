# Capabilities evidence model

The previous role map, fit percentages, project-wide status labels, and project-to-capability mappings are obsolete.

`evidence-ledger.json` is the manifest for an internal claim-level ledger. Every public item must identify:

- one project;
- one narrow claim;
- inspectable source locations;
- separate verification dimensions;
- material limitations;
- whether the claim is eligible for public display.

The public page derives its sections from the accepted claims' `domain` values. It does not assign an entire project to a capability and it does not publish documentation-only or queued evidence.

Run `npm run validate:capabilities` before release.
