
const express = require('express');
// Import the built-in Node.js crypto library for hashing
const crypto = require('crypto');


const app = express();

// crucial middleware that tells Express to automatically parse JSON request bodies
app.use(express.json());

// Error handling middleware - this should be added after all routes
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});


// --- The Core "Analyzer" Engine ---

function analyzeString(value) {
    // 1. Calculate the SHA-256 hash of the string. This will be its unique ID.
    const sha256_hash = crypto.createHash('sha256').update(value).digest('hex');
  
    // 2. Check if the string is a palindrome (reads the same forwards and backwards).
    // We convert to lowercase to make the comparison case-insensitive.
    const lowerCaseValue = value.toLowerCase();
    const reversedValue = lowerCaseValue.split('').reverse().join('');
    const is_palindrome = lowerCaseValue === reversedValue;
  
    // 3. Count the number of words. We trim whitespace from the ends,
    // split by one or more whitespace characters, and filter out any empty strings.
    const word_count = value.trim().split(/\s+/).filter(Boolean).length;
  
    // 4. Create a frequency map of each character in the string.
    const character_frequency_map = {};
    for (const char of value) {
      // For each character, increment its count in the map.
      // If the character isn't in the map yet, initialize it with 0 before adding 1.
      character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
    }
  
    // 5. The number of unique characters is simply the number of keys in our frequency map.
    const unique_characters = Object.keys(character_frequency_map).length;
  
    // 6. Return a final object containing all the calculated properties.
    return {
      length: value.length,
      is_palindrome,
      unique_characters,
      word_count,
      sha256_hash,
      character_frequency_map,
    };
  }

// --- Natural Language Parsing Helper ---

function parseNaturalLanguageQuery(query) {
    // Create an empty object to store the filters we find.
    const filters = {};
    const lowerQuery = query.toLowerCase();
  
    // Rule 1: Look for the word "palindrome" or "palindromic".
    if (lowerQuery.includes('palindromic') || lowerQuery.includes('palindrome')) {
      filters.is_palindrome = true;
    }
  
    // Rule 2: Look for patterns indicating a single word.
    if (lowerQuery.includes('single word') || lowerQuery.includes('one word')) {
      filters.word_count = 1;
    }
  
    // Rule 3: Look for patterns like "longer than 10 characters".
    // We use a regular expression to find a number after "longer than".
    const minLengthMatch = lowerQuery.match(/longer than (\d+)/);
    if (minLengthMatch && minLengthMatch[1]) {
      // The result of the match is a string, so we convert it to an integer.
      // The query says "longer than 10", which means the minimum length is 11.
      filters.min_length = parseInt(minLengthMatch[1], 10) + 1;
    }
  
    // Rule 4: Look for patterns like "containing the letter z".
    const containsMatch = lowerQuery.match(/contain(?:ing|s) the (?:letter|character) (\w)/);
    if (containsMatch && containsMatch[1]) {
      // The result of the match is the single character.
      filters.contains_character = containsMatch[1];
    }
  
    // Rule 5: A special heuristic for a specific phrase.
    if (lowerQuery.includes('first vowel')) {
      filters.contains_character = 'a';
    }
    
    return filters;
  }
// --- We will add our data storage and logic here ---
// --- In-Memory Storage ---

// This Map stores the full data object using the SHA256 hash as the key.
// Example: 'hash123' -> { id: 'hash123', value: 'hello world', ... }
const stringsByHash = new Map();

// This Map provides a quick way to look up a hash using the original string value.
// This is essential for quickly checking if a string already exists.
// Example: 'hello world' -> 'hash123'
const hashByValue = new Map();


// --- API Endpoints ---

// 1. Create/Analyze a String
app.post('/strings', (req, res) => {
    // Step 1: Extract the 'value' field from the JSON request body.
    const { value } = req.body;
  
    // Step 2: Validate the input.
    // If 'value' is missing, return a 400 Bad Request error.
    if (!value) {
      return res.status(400).json({ error: 'Missing "value" field in request body' });
    }
    // If 'value' is not a string, return a 422 Unprocessable Entity error.
    if (typeof value !== 'string') {
      return res.status(422).json({ error: 'Invalid data type for "value", must be a string' });
    }
    // If this string value already exists in our system, return a 409 Conflict error.
    if (hashByValue.has(value)) {
      return res.status(409).json({ error: 'String already exists in the system' });
    }
  
    // Step 3: If validation passes, analyze the string using our engine.
    const properties = analyzeString(value);
    const id = properties.sha256_hash;
  
    // Step 4: Create the final data object to be stored.
    const newStringData = {
      id,
      value,
      properties,
      created_at: new Date().toISOString(),
    };
  
    // Step 5: Store the new data in our in-memory maps.
    stringsByHash.set(id, newStringData);
    hashByValue.set(value, id);
  
    // Step 6: Send a 201 Created success response with the newly created data.
    return res.status(201).json(newStringData);
  });

// 1b. Filter by natural language (must be defined before param route)
app.get('/strings/filter-by-natural-language', (req, res) => {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "query" parameter' });
    }

    const filters = parseNaturalLanguageQuery(query);

    let results = Array.from(stringsByHash.values());

  // If no filters were parsed, return an error as the query is unparsable
  if (!filters || Object.keys(filters).length === 0) {
    return res.status(400).json({ error: 'Unable to parse natural language query' });
  }

    if (typeof filters.is_palindrome === 'boolean') {
      results = results.filter(s => s.properties.is_palindrome === filters.is_palindrome);
    }

    if (typeof filters.word_count === 'number') {
      results = results.filter(s => s.properties.word_count === filters.word_count);
    }

    if (typeof filters.min_length === 'number') {
      results = results.filter(s => s.properties.length >= filters.min_length);
    }

    if (typeof filters.contains_character === 'string' && filters.contains_character.length > 0) {
      results = results.filter(s => s.value.toLowerCase().includes(filters.contains_character.toLowerCase()));
    }

    return res.status(200).json({
      data: results,
      count: results.length,
      parsed_filters: filters,
    });
  });

// 2. Get a Specific String by its value
app.get('/strings/:string_value', (req, res) => {
    // Step 1: Extract the string value from the URL parameter.
    // Express makes this available in the `req.params` object.
    const { string_value } = req.params;
  
    // Step 2: Look up the hash for the given string value.
    // We use our `hashByValue` map for this, as it's a very fast lookup.
    const hash = hashByValue.get(string_value);
  
    // Step 3: Handle the "Not Found" case.
    // If `hash` is undefined (the string value isn't in our map) OR
    // if for some reason that hash doesn't exist in our main data map,
    // we return a 404 Not Found error.
    if (!hash || !stringsByHash.has(hash)) {
      return res.status(404).json({ error: 'String does not exist in the system' });
    }
  
    // Step 4: If found, retrieve the full data object using the hash.
    const stringData = stringsByHash.get(hash);
  
    // Step 5: Send a 200 OK success response with the retrieved data.
    return res.status(200).json(stringData);
  });

// 3. Delete a Specific String by its value
app.delete('/strings/:string_value', (req, res) => {
    // Step 1: Extract the string value from the URL parameter.
    const { string_value } = req.params;
  
    // Step 2: Look up the hash for the given string value.
    const hash = hashByValue.get(string_value);
  
    // Step 3: Handle the "Not Found" case. If the string doesn't exist,
    // we can't delete it, so we return a 404 Not Found error.
    if (!hash || !stringsByHash.has(hash)) {
      return res.status(404).json({ error: 'String does not exist in the system' });
    }
  
    // Step 4: If the string is found, delete it from BOTH of our maps
    // to ensure our data stays consistent.
    stringsByHash.delete(hash);
    hashByValue.delete(string_value);
  
    // Step 5: Send a 204 No Content success response.
    // The .send() method with a 204 status sends an empty response body.
    return res.status(204).send();
  });

// 4. Get All Strings, with optional filtering
app.get('/strings', (req, res) => {
    // Step 1: Start with a complete list of all strings.
    // We get the values from our `stringsByHash` map and convert them to an array.
    let results = Array.from(stringsByHash.values());
    const filters_applied = {};
  
    // Step 2: Apply filters one by one, only if the query parameter exists.
  
    // Filter by `is_palindrome`
    if (req.query.is_palindrome) {
      // Convert the query param string ('true' or 'false') to a real boolean
      const isPalindrome = req.query.is_palindrome === 'true';
      results = results.filter(s => s.properties.is_palindrome === isPalindrome);
      filters_applied.is_palindrome = isPalindrome;
    }
  
    // Filter by `min_length`
    if (req.query.min_length) {
      // Convert the query param string to a number
      const minLength = parseInt(req.query.min_length, 10);
      // We must check if the conversion was successful (is not NaN)
      if (!isNaN(minLength)) {
        results = results.filter(s => s.properties.length >= minLength);
        filters_applied.min_length = minLength;
      }
    }
  
    // Filter by `max_length`
    if (req.query.max_length) {
      const maxLength = parseInt(req.query.max_length, 10);
      if (!isNaN(maxLength)) {
        results = results.filter(s => s.properties.length <= maxLength);
        filters_applied.max_length = maxLength;
      }
    }
  
    // Filter by `word_count`
    if (req.query.word_count) {
      const wordCount = parseInt(req.query.word_count, 10);
      if (!isNaN(wordCount)) {
        results = results.filter(s => s.properties.word_count === wordCount);
        filters_applied.word_count = wordCount;
      }
    }
  
    // Filter by `contains_character`
    if (req.query.contains_character) {
      const char = req.query.contains_character;
      // We simply check if the original string value includes the character.
      results = results.filter(s => s.value.includes(char));
      filters_applied.contains_character = char;
    }
  
    // Step 3: Format the final response according to the specification.
    const response = {
      data: results,
      count: results.length,
      filters_applied,
    };
  
    // Step 4: Send the successful 200 OK response.
    return res.status(200).json(response);
  });

// Define the port the server will run on.
// Use the PORT environment variable if it's set, otherwise default to 3000
const PORT = process.env.PORT || 3000;

// Start the server and listen for incoming connections on the specified port
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});