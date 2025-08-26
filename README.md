# Village Impact Assessment - Backend

Node.js/Express REST API server with MongoDB for processing and serving village geospatial data.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts at `http://localhost:5000`

## Project Structure

```
src/
├── config/           # Database & middleware config
├── controllers/      # HTTP request handlers
├── services/        # Business logic
├── models/          # MongoDB schemas
├── routes/          # API route definitions
├── middleware/      # Validation & error handling
└── utils/           # Helper functions & constants
```

## Tech Stack

- **Node.js + Express.js** - Web framework
- **MongoDB + Mongoose** - Database with geospatial support
- **Shapefile.js** - Process .shp files
- **Turf.js** - Geospatial calculations
- **Multer** - File upload handling

## Configuration

### Environment Variables (.env)

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI="your_mongodb_connection_string"

# File Upload
MAX_FILE_SIZE=2147483648  # 2GB in bytes
MAX_FILES=10

# Security  
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## Database Schema

### Village Collection
```javascript
{
  state_name: String,     // State name
  district_n: String,     // District name  
  subdistric: String,     // Subdistrict name
  village_na: String,     // Village name
  pc11_tv_id: String,     // Census ID
  tot_p: Number,          // Population
  geometry: {             // GeoJSON polygon
    type: "Polygon",
    coordinates: [[[lng, lat]]]
  },
  centroid: {             // Pre-calculated center
    lat: Number,
    lng: Number
  },
  bounds: {               // Bounding box
    minLat: Number, maxLat: Number,
    minLng: Number, maxLng: Number
  }
}
```

### Indexes
- `{ geometry: "2dsphere" }` - Geospatial queries
- `{ state_name: 1, district_n: 1, subdistric: 1 }` - Hierarchy filtering
- `{ tot_p: 1 }` - Population queries

## API Endpoints

### Upload Routes
```
POST /api/upload/shapefile    - Upload and process shapefile
POST /api/upload/metadata     - Get shapefile info without processing
POST /api/upload/validate     - Validate shapefile structure
```

### Village Data Routes
```
GET  /api/villages/states                     - Get all states
GET  /api/villages/districts/:state           - Get districts by state
GET  /api/villages/subdistricts/:state/:district - Get subdistricts
GET  /api/villages                            - Get villages (with filters)
GET  /api/villages/bounds                     - Get villages in viewport bounds
GET  /api/villages/search?q=term              - Search villages by name
GET  /api/villages/:id                        - Get village by ID
```

### Statistics Routes
```
GET  /api/stats                - Basic population statistics
GET  /api/stats/dashboard      - Comprehensive dashboard data
GET  /api/stats/summary        - State-level summary
POST /api/stats/comparative    - Compare multiple regions
```

## Data Processing Flow

1. **Upload** - Receive shapefile components (.shp, .dbf, .shx, .prj)
2. **Validate** - Check required files and field structure
3. **Process** - Parse geometries and extract village data
4. **Transform** - Calculate centroids, bounds, and areas
5. **Store** - Batch insert to MongoDB with indexes
6. **Respond** - Return processing results

## Performance Features

### Batch Processing
- Process villages in batches of 100
- Bulk database operations
- Progress tracking and error handling

### Geospatial Optimization  
- Pre-calculated centroids for fast rendering
- Bounding boxes for viewport queries
- Geometry simplification by zoom level

### API Optimization
- Rate limiting per endpoint type
- Request validation and sanitization  
- Efficient MongoDB queries with indexes

## Query Examples

### Get Villages in Viewport
```
GET /api/villages/bounds?minLat=20&maxLat=25&minLng=75&maxLng=80&zoom=12
```

### Filter by Location
```  
GET /api/villages?state=Maharashtra&district=Pune&zoom=10&limit=500
```

### Population Statistics
```
GET /api/stats?state=Karnataka&district=Bangalore
```

## Security Features

- **Input Validation** - Sanitize all inputs
- **Rate Limiting** - Prevent API abuse
- **File Validation** - Restrict upload types
- **Error Handling** - Sanitized error responses
- **CORS Configuration** - Controlled cross-origin access

## Error Handling

All API responses follow this format:
```javascript
{
  success: boolean,
  data: any,           // Response data
  message: string,     // Human readable message
  meta: {             // Additional metadata
    timestamp: string,
    count?: number,
    filters?: object
  }
}
```

## Development

### Available Scripts
```bash
npm start          # Production server
npm run dev        # Development with nodemon  
npm test          # Run tests (if available)
```

### Adding New Routes
1. Create controller in `src/controllers/`
2. Add business logic in `src/services/`
3. Define routes in `src/routes/`
4. Add validation in `src/middleware/`

## Dependencies

### Production
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `shapefile` - Shapefile processing
- `@turf/turf` - Geospatial operations
- `multer` - File upload handling
- `cors` - Cross-origin requests

### Development  
- `nodemon` - Auto-restart server
- `dotenv` - Environment variables

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
sudo systemctl start mongod
# Or with Docker
docker run -d -p 27017:27017 mongo
```

**File Upload Issues**
```bash
# Check uploads directory permissions
chmod 755 uploads/
```

**Memory Issues (Large Shapefiles)**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 server.js
```

### Performance Tuning
- Adjust `DB_LIMITS.BATCH_SIZE` for hardware
- Modify zoom thresholds in constants
- Configure MongoDB connection pool size