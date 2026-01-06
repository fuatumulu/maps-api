# Places API Documentation

High-performance REST API for querying 3.4M+ business places with advanced filtering and streaming support.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Get Places](#get-places)
  - [Count Places](#count-places)
  - [Stream Places](#stream-places)
  - [Get Statistics](#get-statistics)
- [Filtering](#filtering)
- [Pagination](#pagination)
- [Streaming Large Datasets](#streaming-large-datasets)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Authentication

All API endpoints (except `/health`) require authentication using a Bearer token.

### Header Format

```
Authorization: Bearer YOUR_API_TOKEN
```

### Example

```bash
curl -H "Authorization: Bearer your-token-here" \
  "https://your-api-domain.com/api/v1/places?limit=10"
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authorization header is required. Use: Authorization: Bearer <token>"
}
```

---

## Base URL

```
https://your-api-domain.com
```

Replace with your actual deployed API URL.

---

## Rate Limiting

- **Window**: 1 minute
- **Max Requests**: 100 per minute per IP

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Endpoints

### Health Check

Check if the API and database are operational.

| Property | Value |
|----------|-------|
| **URL** | `/health` |
| **Method** | `GET` |
| **Auth Required** | No |

#### Response

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-06T02:40:00.000Z"
}
```

---

### Get Places

Retrieve places with filtering and pagination.

| Property | Value |
|----------|-------|
| **URL** | `/api/v1/places` |
| **Method** | `GET` |
| **Auth Required** | Yes |

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Max results (1-10000) | 100 |
| `offset` | integer | Skip N results | 0 |
| `city` | string | Filter by city name | - |
| `state` | string | Filter by state | - |
| `type` | string | Filter by business type | - |
| `country_code` | string | Filter by country code (e.g., DE, US) | - |
| `country` | string | Filter by country name | - |
| `borough` | string | Filter by borough | - |
| `place_id` | string | Filter by Google Place ID | - |
| `reviews` | integer | Exact review count | - |
| `reviews_min` | integer | Minimum reviews (>=) | - |
| `reviews_max` | integer | Maximum reviews (<=) | - |
| `rating` | decimal | Exact rating | - |
| `rating_min` | decimal | Minimum rating (>=) | - |
| `rating_max` | decimal | Maximum rating (<=) | - |
| `name_contains` | string | Name contains text | - |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "place_id": "ChIJ...",
      "name": "Business Name",
      "site": "https://example.com",
      "type": "restaurant",
      "phone": "+49123456789",
      "full_address": "Street 123, 12345 Berlin, Germany",
      "borough": "Mitte",
      "street": "Street 123",
      "city": "Berlin",
      "state": "BE",
      "country": "Berlin",
      "country_code": "DE",
      "latitude": 52.52000000,
      "longitude": 13.40500000,
      "rating": 4.50,
      "reviews": 125,
      "working_hours": "{...}",
      "about": "Description..."
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "count": 100,
    "total": 15000,
    "has_more": true
  },
  "filters_applied": {
    "country_code": "DE",
    "reviews_min": "20"
  }
}
```

---

### Count Places

Get only the count of places matching filters (faster than fetching all data).

| Property | Value |
|----------|-------|
| **URL** | `/api/v1/places/count` |
| **Method** | `GET` |
| **Auth Required** | Yes |

#### Query Parameters

Same as [Get Places](#get-places) (except `limit` and `offset`).

#### Response

```json
{
  "success": true,
  "data": {
    "count": 1523456
  },
  "filters_applied": {
    "country_code": "DE"
  }
}
```

---

### Stream Places

Stream places as NDJSON (Newline Delimited JSON). **Ideal for large datasets (millions of records).**

| Property | Value |
|----------|-------|
| **URL** | `/api/v1/places/stream` |
| **Method** | `GET` |
| **Auth Required** | Yes |
| **Content-Type** | `application/x-ndjson` |

#### Query Parameters

Same as [Get Places](#get-places).

> **Note**: When `limit` is not specified or set to 0, all matching records will be streamed.

#### Response

Each line is a separate JSON object:

```ndjson
{"id":1,"place_id":"ChIJ...","name":"Business 1",...}
{"id":2,"place_id":"ChIK...","name":"Business 2",...}
{"id":3,"place_id":"ChIL...","name":"Business 3",...}
{"_meta":{"total_streamed":3,"complete":true}}
```

---

### Get Statistics

Get database statistics and top categories.

| Property | Value |
|----------|-------|
| **URL** | `/api/v1/stats` |
| **Method** | `GET` |
| **Auth Required** | Yes |

#### Response

```json
{
  "success": true,
  "data": {
    "total_places": 3456789,
    "top_cities": [
      {"city": "Berlin", "count": 125000},
      {"city": "Munich", "count": 98000}
    ],
    "top_types": [
      {"type": "restaurant", "count": 450000},
      {"type": "cafe", "count": 230000}
    ],
    "top_country_codes": [
      {"country_code": "DE", "count": 2100000},
      {"country_code": "AT", "count": 350000}
    ]
  }
}
```

---

## Filtering

### Equality Filters

Exact match on field values:

```
?city=Berlin
?type=restaurant
?country_code=DE
```

### Range Filters

For numeric fields (reviews, rating):

```
# Exact value
?reviews=50

# Minimum (>=)
?reviews_min=20

# Maximum (<=)
?reviews_max=100

# Range (both)
?reviews_min=40&reviews_max=60
```

### Text Search

Partial match on name:

```
?name_contains=pizza
```

### Combining Filters

All filters are combined with AND logic:

```
?country_code=DE&reviews_min=20&type=restaurant&rating_min=4.0
```

---

## Pagination

Use `limit` and `offset` for pagination:

```bash
# Page 1 (first 100 results)
GET /api/v1/places?limit=100&offset=0

# Page 2 (results 101-200)
GET /api/v1/places?limit=100&offset=100

# Page 3 (results 201-300)
GET /api/v1/places?limit=100&offset=200
```

The response includes pagination info:

```json
{
  "pagination": {
    "limit": 100,
    "offset": 100,
    "count": 100,
    "total": 15000,
    "has_more": true
  }
}
```

---

## Streaming Large Datasets

For datasets with millions of records, use the streaming endpoint:

### Why Use Streaming?

- **Memory Efficient**: Data is processed line-by-line
- **Fast Start**: First records arrive immediately
- **No Timeout**: Long-running queries won't time out
- **Complete Data**: No pagination needed, get all matching records

### Client Implementation (JavaScript)

```javascript
async function streamPlaces(filters) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/v1/places/stream?${params}`, {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        const place = JSON.parse(line);
        
        if (place._meta) {
          console.log(`Completed: ${place._meta.total_streamed} records`);
        } else {
          // Process each place
          processPlace(place);
        }
      }
    }
  }
}

// Usage
streamPlaces({ country_code: 'DE', reviews_min: '20' });
```

### Client Implementation (Python)

```python
import requests
import json

def stream_places(base_url, token, filters):
    headers = {'Authorization': f'Bearer {token}'}
    params = filters
    
    with requests.get(
        f'{base_url}/api/v1/places/stream',
        headers=headers,
        params=params,
        stream=True
    ) as response:
        for line in response.iter_lines():
            if line:
                place = json.loads(line)
                
                if '_meta' in place:
                    print(f"Completed: {place['_meta']['total_streamed']} records")
                else:
                    # Process each place
                    process_place(place)

# Usage
stream_places(
    'https://your-api.com',
    'YOUR_TOKEN',
    {'country_code': 'DE', 'reviews_min': '20'}
)
```

### Client Implementation (cURL)

```bash
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/v1/places/stream?country_code=DE&reviews_min=20" \
  | while read line; do
    echo "$line" | jq .
  done
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized - Invalid or missing token |
| 404 | Not Found - Endpoint doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Database connection issue |

---

## Examples

### Get all German businesses with 20+ reviews

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/places?country_code=DE&reviews_min=20&limit=1000"
```

### Get restaurants in Berlin with 4+ rating

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/places?city=Berlin&type=restaurant&rating_min=4.0"
```

### Get businesses with 40-60 reviews

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/places?reviews_min=40&reviews_max=60&limit=500"
```

### Count all businesses in a country

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/places/count?country_code=DE"
```

### Stream millions of records

```bash
curl -N -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/places/stream?country_code=DE&reviews_min=20" \
  > all_german_businesses.ndjson
```

### Get database statistics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/stats"
```

---

## Deployment (Easypanel)

1. Create a new app in Easypanel
2. Connect your GitHub repository
3. Set environment variables:
   - `API_TOKEN`: Your secure API token
   - `DB_HOST`: MySQL host
   - `DB_PORT`: MySQL port (default: 3306)
   - `DB_USER`: MySQL username
   - `DB_PASSWORD`: MySQL password
   - `DB_NAME`: Database name
4. Deploy!

The Dockerfile is already configured for production use.
