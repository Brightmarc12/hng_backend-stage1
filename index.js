// Import the Express library to build our server
const express = require('express');
// Import the built-in Node.js crypto library for hashing
const crypto = require('crypto');

// Create an instance of an Express application
const app = express();

// This is a crucial middleware that tells Express to automatically parse JSON request bodies
app.use(express.json());

// --- In-Memory Storage ---

// This Map stores the full data object using the SHA256 hash as the key.
// Example: 'hash123' -> { id: 'hash123', value: 'hello world', ... }
const stringsByHash = new Map();

// This Map provides a quick way to look up a hash using the original string value.
// This is essential for quickly checking if a string already exists.
// Example: 'hello world' -> 'hash123'
const hashByValue = new Map();

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


// --- API Endpoints ---

function analyzeString(value) {
  // 1. Calculate the SHA-256 hash of the string.
  const sha256_hash = crypto.createHash('sha256').update(value).digest('hex');

  // 2. Palindrome Check (IMPROVED LOGIC)
  // Sanitize the string: convert to lowercase and remove all non-alphanumeric characters.
  const sanitizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Now, reverse the SANITIZED string.
  const reversedValue = sanitizedValue.split('').reverse().join('');
  const is_palindrome = sanitizedValue === reversedValue;

  // 3. Count the number of words. This logic remains the same.
  const word_count = value.trim().split(/\s+/).filter(Boolean).length;

  // 4. Create a frequency map. This logic remains the same.
  const character_frequency_map = {};
  for (const char of value) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  // 5. Count unique characters. This logic remains the same.
  const unique_characters = Object.keys(character_frequency_map).length;

  // 6. Return the final object.
  return {
    length: value.length,
    is_palindrome, // This will now be correct
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

// 1. Create/Analyze a String
app.post('/strings/?', (req, res) => {
  const { value } = req.body;
  if (!value) {
    return res.status(400).json({ error: 'Missing "value" field in request body' });
  }
  if (typeof value !== 'string') {
    return res.status(422).json({ error: 'Invalid data type for "value", must be a string' });
  }
  if (hashByValue.has(value)) {
    return res.status(409).json({ error: 'String already exists in the system' });
  }
  const properties = analyzeString(value);
  const id = properties.sha256_hash;
  const newStringData = {
    id,
    value,
    properties,
    created_at: new Date().toISOString(),
  };
  stringsByHash.set(id, newStringData);
  hashByValue.set(value, id);
  return res.status(201).json(newStringData);
});





// 4. Get All Strings, with optional filtering
app.get('/strings/?', (req, res) => {
  let results = Array.from(stringsByHash.values());
  const filters_applied = {};
  if (req.query.is_palindrome) {
    const isPalindrome = req.query.is_palindrome === 'true';
    results = results.filter(s => s.properties.is_palindrome === isPalindrome);
    filters_applied.is_palindrome = isPalindrome;
  }
  if (req.query.min_length) {
    const minLength = parseInt(req.query.min_length, 10);
    if (!isNaN(minLength)) {
      results = results.filter(s => s.properties.length >= minLength);
      filters_applied.min_length = minLength;
    }
  }
  if (req.query.max_length) {
    const maxLength = parseInt(req.query.max_length, 10);
    if (!isNaN(maxLength)) {
      results = results.filter(s => s.properties.length <= maxLength);
      filters_applied.max_length = maxLength;
    }
  }
  if (req.query.word_count) {
    const wordCount = parseInt(req.query.word_count, 10);
    if (!isNaN(wordCount)) {
      results = results.filter(s => s.properties.word_count === wordCount);
      filters_applied.word_count = wordCount;
    }
  }
  if (req.query.contains_character) {
    const char = req.query.contains_character;
    results = results.filter(s => s.value.includes(char));
    filters_applied.contains_character = char;
  }
  const response = {
    data: results,
    count: results.length,
    filters_applied,
  };
  return res.status(200).json(response);
});

// 5. Natural Language Filtering
app.get('/strings/filter-by-natural-language/?', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Missing "query" parameter' });
  }
  const parsed_filters = parseNaturalLanguageQuery(query);
  if (Object.keys(parsed_filters).length === 0) {
    return res.status(400).json({ error: 'Unable to parse natural language query' });
  }
  let results = Array.from(stringsByHash.values());
  if (parsed_filters.is_palindrome !== undefined) {
    results = results.filter(s => s.properties.is_palindrome === parsed_filters.is_palindrome);
  }
  if (parsed_filters.word_count !== undefined) {
    results = results.filter(s => s.properties.word_count === parsed_filters.word_count);
  }
  if (parsed_filters.min_length !== undefined) {
    results = results.filter(s => s.properties.length >= parsed_filters.min_length);
  }
  if (parsed_filters.contains_character !== undefined) {
    results = results.filter(s => s.value.includes(parsed_filters.contains_character));
  }
  const response = {
    data: results,
    count: results.length,
    interpreted_query: {
      original: query,
      parsed_filters,
    },
  };
  return res.status(200).json(response);
});

// 2. Get a Specific String by its value
app.get('/strings/:string_value', (req, res) => {
  const { string_value } = req.params;
  const hash = hashByValue.get(string_value);
  if (!hash || !stringsByHash.has(hash)) {
    return res.status(404).json({ error: 'String does not exist in the system' });
  }
  const stringData = stringsByHash.get(hash);
  return res.status(200).json(stringData);
});


// 3. Delete a Specific String by its value
app.delete('/strings/:string_value', (req, res) => {
  const { string_value } = req.params;
  const hash = hashByValue.get(string_value);
  if (!hash || !stringsByHash.has(hash)) {
    return res.status(404).json({ error: 'String does not exist in the system' });
  }
  stringsByHash.delete(hash);
  hashByValue.delete(string_value);
  return res.status(204).send();
});
// Define the port the server will run on.
const PORT = process.env.PORT || 3000;

// Start the server and listen for incoming connections on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});