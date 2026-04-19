# PatchSmith - Precision Patch Workbench

PatchSmith is an Express + Postgres precision patch workbench for creating, reviewing, and applying exact FIND/REPLACE patches against stored files. It features exact matching, multi-match selection, approval workflows, patch grouping, version tracking, and comprehensive export capabilities.

## Quick Start

1. Create a `.env` file from `.env.example` and set `DATABASE_URL`
2. Apply `sql/001_patchsmith.sql` to your PostgreSQL/Neon database
3. Install dependencies: `npm install`
4. Run the server: `node src/server.js`
5. Open `public/index.html` in your browser

## Features

### Core Patch Workflow
- **Exact Matching**: Precise find/replace with occurrence targeting
- **Multi-Match Selection**: Choose which occurrence to replace
- **Version Tracking**: File versions and content hashes
- **Patch Groups**: Organize related patches together
- **Confidence Scoring**: Assign confidence levels to patches

### Review & Approval
- **Status Management**: Draft → Approved → Applied → Rejected
- **Reviewer Notes**: Add comments during review process
- **Patch History**: Full audit trail of status changes
- **Version Conflict Detection**: Prevent applying patches to modified files

### Advanced Workbench
- **Side-by-Side Diff Viewer**: Visual comparison with match highlighting
- **Multi-Panel Interface**: Source editor, patch editor, diff viewer, history
- **Patch Group Filtering**: Filter patches by group
- **File Version Management**: Track and compare file versions

### Export & Integration
- **JSON Export**: Export patches in structured format
- **Status Filtering**: Export only approved/applied patches
- **Copy & Download**: Easy export options
- **REST API**: Full API for programmatic access

## Architecture

- **Backend**: Express.js with PostgreSQL
- **Frontend**: Vanilla JavaScript with responsive CSS Grid layout
- **Database**: PostgreSQL with comprehensive schema for patches, files, projects, and history
- **Security**: Device-key based authentication

## API Endpoints

### Projects
- `GET /api/patchsmith/projects` - List projects
- `POST /api/patchsmith/projects` - Create project

### Files
- `GET /api/patchsmith/projects/:projectId/files` - List files
- `POST /api/patchsmith/projects/:projectId/files` - Save file

### Patches
- `GET /api/patchsmith/projects/:projectId/patches` - List patches
- `POST /api/patchsmith/projects/:projectId/patches` - Create patch
- `POST /api/patchsmith/patches/:patchId/update` - Update patch status/notes
- `POST /api/patchsmith/patches/:patchId/approve` - Approve patch
- `POST /api/patchsmith/patches/:patchId/apply` - Apply patch
- `GET /api/patchsmith/patches/:patchId/history` - Get patch history

### Patch Groups
- `GET /api/patchsmith/projects/:projectId/patch-groups` - List patch groups
- `GET /api/patchsmith/projects/:projectId/patch-groups/:groupName` - Get patches by group

### Export
- `POST /api/patchsmith/projects/:projectId/export` - Export patches

## Database Schema

The database includes tables for:
- Users (device-key based)
- Projects
- Files (with versioning and content hashing)
- Patches (with status, confidence, groups)
- Patch History (full audit trail)

## Usage Workflow

1. **Create Project**: Start a new patch project
2. **Add Files**: Upload or create source files
3. **Create Patches**: Define find/replace patterns
4. **Review Patches**: Check matches, add notes, approve/reject
5. **Apply Patches**: Apply approved patches to files
6. **Export**: Generate patch bundles for deployment

## Production Deployment

- **Netlify Functions**: Compatible with Netlify serverless functions
- **Environment Variables**: Configure via `.env` file
- **Database**: Works with Neon, Supabase, or any PostgreSQL

## Development

- **Testing**: Comprehensive error handling and validation
- **Logging**: API status and error reporting
- **Responsive Design**: Works on desktop and tablet devices
