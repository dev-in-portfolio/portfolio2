# RecalGrid - Knowledge Retrieval Workbench

RecalGrid is an Express + Postgres knowledge retrieval workbench for storing, organizing, and retrieving knowledge chunks with advanced search capabilities, relationships, collections, and explainable matching.

## Quick Start

1. Create a `.env` file from `.env.example` and set `DATABASE_URL`
2. Apply `sql/001_recallgrid.sql` to your PostgreSQL/Neon database
3. Install dependencies: `npm install`
4. Run the server: `node src/server.js`
5. Open `public/index.html` in your browser

## Features

### Core Knowledge Management
- **Chunk Storage**: Store knowledge chunks with title, source, tags, body content
- **Rich Metadata**: Add notes, confidence scores, and pin important chunks
- **Large Content Support**: Handle content up to 200KB per chunk
- **Version Tracking**: Automatic timestamps for creation and updates

### Advanced Search & Retrieval
- **Full-Text Search**: Powerful PostgreSQL full-text search with ranking
- **Fuzzy Matching**: Typo-tolerant title search using trigram matching
- **Tag Filtering**: Filter by multiple tags using array operations
- **Explainable Search**: Understand why results matched with detailed explanations
- **Search Modes**: Title-first, body-first, or combined search strategies

### Knowledge Organization
- **Collections**: Group related chunks into named collections
- **Relationships**: Create typed relationships between chunks (e.g., "related-to", "extends", "contradicts")
- **Saved Searches**: Save and re-run complex search queries
- **Pinned Chunks**: Mark important chunks for quick access

### Retrieval Intelligence
- **Confidence Scoring**: Assign confidence levels to chunks
- **Match Explanation**: See exactly why each result matched your query
- **Tag Match Analysis**: Understand which tags contributed to matches
- **Query Analysis**: See if query was found in title, body, or both

### Import/Export
- **JSON Export**: Export all chunks with full metadata
- **CSV Export**: Export in spreadsheet-friendly format
- **Collection Export**: Export specific collections
- **Batch Operations**: Import/export multiple chunks at once

## Architecture

- **Backend**: Express.js with PostgreSQL
- **Frontend**: Vanilla JavaScript with responsive CSS Grid layout
- **Database**: PostgreSQL with full-text search, trigram matching, and comprehensive indexing
- **Search Engine**: Native PostgreSQL full-text search with ranking
- **Security**: Device-key based authentication

## API Endpoints

### Chunks
- `GET /api/recalgrid/chunks/:id` - Get chunk details
- `POST /api/recalgrid/chunks` - Create new chunk
- `PUT /api/recalgrid/chunks/:id` - Update chunk
- `DELETE /api/recalgrid/chunks/:id` - Delete chunk

### Search
- `POST /api/recalgrid/search` - Basic search
- `POST /api/recalgrid/search/explain` - Explainable search with match details
- `GET /api/recalgrid/tags` - Get all tags

### Relationships
- `GET /api/recalgrid/chunks/:id/relationships` - Get chunk relationships
- `POST /api/recalgrid/chunks/:fromId/relationships` - Create relationship
- `DELETE /api/recalgrid/relationships/:id` - Delete relationship

### Collections
- `GET /api/recalgrid/collections` - List collections
- `POST /api/recalgrid/collections` - Create collection
- `GET /api/recalgrid/collections/:id` - Get collection with items
- `POST /api/recalgrid/collections/:id/items` - Add item to collection
- `DELETE /api/recalgrid/collections/:collectionId/items/:chunkId` - Remove item from collection

### Saved Searches
- `GET /api/recalgrid/saved-searches` - List saved searches
- `POST /api/recalgrid/saved-searches` - Create saved search
- `POST /api/recalgrid/saved-searches/:id/run` - Run saved search
- `DELETE /api/recalgrid/saved-searches/:id` - Delete saved search

### Export
- `GET /api/recalgrid/export?format=json` - Export as JSON
- `GET /api/recalgrid/export?format=csv` - Export as CSV

## Database Schema

The database includes tables for:
- **Users**: Device-key based authentication
- **Chunks**: Knowledge chunks with full-text search vectors
- **Relationships**: Typed relationships between chunks
- **Collections**: Named groups of chunks
- **Collection Items**: Chunk membership in collections
- **Saved Searches**: Reusable search queries

## Search Capabilities

### Match Types
1. **Full-Text Match**: Query matches in title or body using PostgreSQL FTS
2. **Fuzzy Title Match**: Typo-tolerant title matching using trigram similarity
3. **Title ILIKE Match**: Case-insensitive substring matching
4. **Tag Matching**: Exact tag matching with array operations

### Explanation Features
- Shows match type (full-text, fuzzy, ilike)
- Indicates which tags matched
- Highlights exact query matches in titles
- Provides confidence scores for ranking

## Usage Workflow

1. **Add Knowledge**: Create chunks with rich metadata
2. **Organize**: Add to collections, create relationships
3. **Search**: Use full-text, fuzzy, or tag-based search
4. **Analyze**: Review match explanations and confidence
5. **Refine**: Save successful searches for reuse
6. **Export**: Generate reports and backups

## Production Deployment

- **Netlify Functions**: Compatible with Netlify serverless functions
- **Environment Variables**: Configure via `.env` file
- **Database**: Works with Neon, Supabase, or any PostgreSQL
- **Scaling**: Optimized for thousands of chunks

## Development

- **Testing**: Comprehensive error handling and validation
- **Logging**: API status and error reporting
- **Responsive Design**: Works on desktop and tablet devices
- **Performance**: Indexed for fast search and retrieval

## Advanced Features

### Relationship Types
Create custom relationship types like:
- `related-to`
- `extends`
- `contradicts`
- `example-of`
- `part-of`

### Confidence Scoring
Use confidence scores (0-1) to indicate:
- Source reliability
- Information accuracy
- Personal familiarity
- Verification status

### Search Strategies
1. **Precision Search**: Use exact tags and specific queries
2. **Exploratory Search**: Use fuzzy matching to find related concepts
3. **Comprehensive Search**: Combine multiple match types
4. **Saved Searches**: Reuse successful query patterns

## Examples

### Basic Search
```json
{
  "query": "machine learning",
  "tags": ["ai", "tutorial"],
  "limit": 10
}
```

### Explainable Search
```json
{
  "query": "neural network",
  "tags": ["deep-learning"],
  "limit": 5
}
```

Returns results with detailed match explanations.

### Create Relationship
```json
{
  "to_chunk_id": "chunk-id-here",
  "relationship_type": "extends",
  "description": "This paper extends the previous work with new experiments"
}
```

## Performance Considerations

- **Indexing**: Comprehensive GIN indexes for fast search
- **Caching**: Consider adding Redis for frequent queries
- **Pagination**: Use limit/offset for large result sets
- **Batch Operations**: Use bulk endpoints for imports

## Security

- Device-key authentication for all API calls
- Input validation and sanitization
- SQL injection protection via parameterized queries
- Rate limiting recommended for public deployments
