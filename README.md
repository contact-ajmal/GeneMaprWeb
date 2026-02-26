# GeneMapr

Genomic Variant Interpretation Platform

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd GeneMapr
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start the services:
```bash
docker-compose up --build
```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Test the Upload Endpoint

Upload the sample VCF file:
```bash
curl -X POST "http://localhost:8000/variants/upload" \
  -F "file=@test_data/sample.vcf"
```

Or use the web interface at http://localhost:5173

### View Uploaded Variants

Get paginated variants:
```bash
curl "http://localhost:8000/variants?page=1&page_size=20"
```

## Project Structure

```
GeneMapr/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utilities
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   └── main.tsx      # Entry point
│   ├── Dockerfile
│   └── package.json
├── test_data/
│   └── sample.vcf        # Sample VCF file
├── docker-compose.yml
└── .env.example
```

## Tech Stack

### Backend
- FastAPI (Python 3.11)
- SQLAlchemy 2.0 (async)
- PostgreSQL
- Redis
- pysam (VCF parsing)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS

## Development

### Backend Development

Run tests:
```bash
cd backend
pytest
```

Format code:
```bash
black app/
ruff check app/
```

### Frontend Development

Install dependencies:
```bash
cd frontend
npm install
```

Run dev server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## API Endpoints

### POST /variants/upload
Upload and parse a VCF file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: VCF file

**Response:**
```json
{
  "status": "success",
  "variant_count": 5,
  "upload_id": "uuid",
  "message": "Successfully parsed and stored 5 variants"
}
```

### GET /variants
Get paginated list of variants.

**Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "variants": [...],
  "total": 5,
  "page": 1,
  "page_size": 20
}
```

## License

MIT
