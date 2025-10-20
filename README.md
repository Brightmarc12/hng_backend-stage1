# Backend Wizards - Stage 1: String Analyzer Service

This project is a RESTful API service built with Node.js and Express that analyzes strings, computes their properties, and provides several endpoints for creating, retrieving, and deleting them. The service is containerized with Docker for consistent deployment.

**Live API Base URL:** `http://13.62.102.112:3000`

---

## Features

*   **String Analysis:** Computes length, palindrome status, unique characters, word count, SHA256 hash, and a character frequency map.
*   **CRUD Operations:** Full support for creating, retrieving, and deleting analyzed strings.
*   **Advanced Filtering:** Allows for fetching collections of strings based on specific property filters.
*   **Natural Language Queries:** A dedicated endpoint to interpret simple, human-like queries for filtering.
*   **In-Memory Storage:** Uses efficient in-memory maps for fast data access (data is ephemeral and resets on server restart).

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Hashing:** Node.js Crypto Module
*   **Containerization:** Docker
*   **Deployment:** AWS EC2

---

## How to Run Locally

This project is containerized, so the only prerequisite is having **Docker** installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Brightmarc12/hng_backend-stage1
    cd hng_backend-stage1
    ```

2.  **Build the Docker image:**
    ```bash
    docker build -t string-analyzer-app .
    ```

3.  **Run the Docker container:**
    ```bash
    docker run -p 3000:3000 --name analyzer-container string-analyzer-app
    ```

4.  The API will now be available at `http://localhost:3000`.

---

## API Documentation

### 1. Create/Analyze a String

*   **Endpoint:** `POST /strings`
*   **Description:** Analyzes a new string, stores its properties, and returns the full object.
*   **Request Body:**
    ```json
    {
      "value": "your string here"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": "sha256_hash_value",
      "value": "your string here",
      "properties": {
        "length": 16,
        "is_palindrome": false,
        "unique_characters": 12,
        "word_count": 3,
        "sha256_hash": "...",
        "character_frequency_map": { /* ... */ }
      },
      "created_at": "2025-10-18T12:00:00.000Z"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing or empty `value` field.
    *   `409 Conflict`: The string already exists.
    *   `422 Unprocessable Entity`: `value` is not a string.

### 2. Get a Specific String

*   **Endpoint:** `GET /strings/{string_value}`
*   **Description:** Retrieves the properties of a previously analyzed string.
*   **URL Parameter:** `string_value` (URL-encoded)
*   **Success Response (200 OK):** Returns the same object as the create endpoint.
*   **Error Response:**
    *   `404 Not Found`: The string does not exist.

### 3. Delete a String

*   **Endpoint:** `DELETE /strings/{string_value}`
*   **Description:** Deletes a string from the system.
*   **URL Parameter:** `string_value` (URL-encoded)
*   **Success Response (204 No Content):** An empty response body.
*   **Error Response:**
    *   `404 Not Found`: The string does not exist.

### 4. Get All Strings with Filtering

*   **Endpoint:** `GET /strings`
*   **Description:** Returns a collection of all strings, with optional filters applied.
*   **Query Parameters:**
    *   `is_palindrome` (boolean): `true` or `false`
    *   `min_length` (integer)
    *   `max_length` (integer)
    *   `word_count` (integer)
    *   `contains_character` (string)
*   **Example Query:** `/strings?is_palindrome=true&min_length=5`
*   **Success Response (200 OK):**
    ```json
    {
      "data": [ /* array of string objects */ ],
      "count": 1,
      "filters_applied": {
        "is_palindrome": true,
        "min_length": 5
      }
    }
    ```

### 5. Filter by Natural Language

*   **Endpoint:** `GET /strings/filter-by-natural-language`
*   **Description:** Interprets a simple natural language query to filter strings.
*   **Query Parameter:** `query` (URL-encoded string)
*   **Example Query:** `/filter-by-natural-language?query=single%20word%20palindromes`
*   **Success Response (200 OK):**
    ```json
    {
      "data": [ /* array of string objects */ ],
      "count": 1,
      "interpreted_query": {
        "original": "single word palindromes",
        "parsed_filters": {
          "word_count": 1,
          "is_palindrome": true
        }
      }
    }
    ```
*   **Error Response:**
    *   `400 Bad Request`: Missing `query` or unable to parse it.