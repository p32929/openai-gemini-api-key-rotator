# 🔄 OpenAI Gemini API Key Rotator

A robust Node.js proxy server that automatically rotates API keys for **Gemini** and **OpenAI** APIs when rate limits (429 errors) are encountered. Built with zero dependencies and comprehensive logging.

## ✨ Features

- 🔄 **Automatic Key Rotation**: Seamlessly switches to the next API key on 429 errors
- 🎯 **Multi-API Support**: Works with both Gemini and OpenAI APIs simultaneously
- 🔧 **Flexible Base URLs**: Use custom endpoints or default API servers
- 📝 **Detailed Logging**: Track every request, rotation, and error with masked API keys
- 🚀 **Zero Dependencies**: Pure Node.js with no external packages
- 📁 **File Upload Support**: Handles multipart/form-data and binary uploads
- 🛡️ **Error Handling**: Proper error responses and graceful failures
- 🎛️ **Admin Panel**: Web-based management interface with dark/light themes
- 🔑 **Dynamic Key Management**: Add, remove, and test API keys through the admin panel
- 📊 **Real-time Monitoring**: View API request logs and manage logging settings
- 🔒 **Secure Authentication**: Password-protected admin access with session management

## 🚀 Quick Start

### 1. Installation

```bash
git clone https://github.com/p32929/openai-gemini-api-key-rotator.git
cd openai-gemini-api-key-rotator
```

### 2. Configuration

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
PORT=8990

# At least one of these is required
GEMINI_API_KEYS=AIzaSyABC123...,AIzaSyDEF456...,AIzaSyGHI789...
OPENAI_API_KEYS=sk-proj-abc123...,sk-proj-def456...,sk-proj-ghi789...

# Optional - Custom base URL for all API calls (overrides OPENAI_BASE_URL)
# BASE_URL=https://your-custom-server.com

# Optional - Custom base URL specifically for OpenAI-compatible APIs
# OPENAI_BASE_URL=https://api.groq.com/openai

# Optional - Admin panel password (enables web management interface)
ADMIN_PASSWORD=your-secure-admin-password

# Optional - Enable file logging for API requests
FILE_LOGGING=true
```

### 3. Start the Server

```bash
npm start
```

You'll see output like:
```
[CONFIG] Port: 8990
[CONFIG] Using default API endpoints
[CONFIG] Found 3 Gemini API keys
[CONFIG] Found 2 OpenAI API keys
[GEMINI-ROTATOR] Initialized with 3 API keys
[OPENAI-ROTATOR] Initialized with 2 API keys
Multi-API proxy server running on port 8990
Available Gemini API keys: 3
Gemini endpoints: /gemini/v1/* and /gemini/v1beta/*
Available OpenAI API keys: 2
OpenAI endpoints: /openai/v1/*
```

## 🎛️ Admin Panel

The admin panel provides a web-based interface for managing your API key rotator with the following features:

- **Dynamic Key Management**: Add, remove, and test API keys without restarting the server
- **Log Viewing**: View API request logs and response details (manual refresh)
- **Theme Support**: Toggle between dark and light modes
- **Secure Authentication**: Password-protected access with session management
- **File Logging Control**: Enable/disable file logging for API requests

### Access

1. Set `ADMIN_PASSWORD` in your `.env` file
2. Start the server
3. Visit `http://localhost:8990/admin` (replace port if different)
4. Log in with your admin password

### Screenshot

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/f265cc8f-941e-43e4-998e-c713dacfd248" />

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/25fbfa7d-8164-463b-b26e-f29a61eef575" />

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/0de6654d-eea8-49ad-9c19-7f2a799b604e" />

## 🔗 API Endpoints

| API | Endpoint Pattern | Example |
|-----|------------------|---------|
| **Gemini** | `/gemini/v1/*` | `/gemini/v1/models/gemini-pro:generateContent` |
| **Gemini Beta** | `/gemini/v1beta/*` | `/gemini/v1beta/models/gemini-pro:generateContent` |
| **OpenAI** | `/openai/v1/*` | `/openai/v1/chat/completions` |

## 📋 Copy-Paste Examples

### Gemini API Examples

#### 1. Generate Content (Text)
```bash
curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Write a short poem about API key rotation"
      }]
    }]
  }'
```

#### 2. Generate Content with System Instructions
```bash
curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "system_instruction": {
      "parts": [{
        "text": "You are a helpful coding assistant."
      }]
    },
    "contents": [{
      "parts": [{
        "text": "Explain what API rate limiting is"
      }]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 100
    }
  }'
```

#### 3. List Models
```bash
curl -X GET "http://localhost:8990/gemini/v1/models"
```

#### 4. Get Model Info
```bash
curl -X GET "http://localhost:8990/gemini/v1/models/gemini-2.5-pro"
```

#### 5. Generate Content with Image (Base64)
```bash
curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {
          "text": "What do you see in this image?"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "base64_encoded_image_data_here"
          }
        }
      ]
    }]
  }'
```

#### 6. Generate Content with Image (File Upload)
```bash
# First, encode your image to base64
IMAGE_DATA=$(base64 -i path/to/your/image.jpg)

curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {
          "text": "Describe this image in detail"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "'$IMAGE_DATA'"
          }
        }
      ]
    }]
  }'
```

#### 7. Generate Content with Multiple Images
```bash
curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {
          "text": "Compare these two images and tell me the differences"
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "base64_image1_data_here"
          }
        },
        {
          "inline_data": {
            "mime_type": "image/png",
            "data": "base64_image2_data_here"
          }
        }
      ]
    }]
  }'
```

### OpenAI API Examples

#### 1. Chat Completions
```bash
curl -X POST "http://localhost:8990/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain API key rotation in simple terms"
      }
    ],
    "max_tokens": 150,
    "temperature": 0.7
  }'
```

#### 2. Chat Completions with Streaming
```bash
curl -X POST "http://localhost:8990/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Write a haiku about programming"
      }
    ],
    "stream": true
  }'
```

#### 3. List Models
```bash
curl -X GET "http://localhost:8990/openai/v1/models"
```

#### 4. Text Completions (Legacy)
```bash
curl -X POST "http://localhost:8990/openai/v1/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "prompt": "The benefits of API key rotation are:",
    "max_tokens": 100,
    "temperature": 0.5
  }'
```

#### 5. Create Embeddings
```bash
curl -X POST "http://localhost:8990/openai/v1/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "API key rotation helps maintain service availability"
  }'
```

#### 6. Vision API - Analyze Image with GPT-4o-mini
```bash
curl -X POST "http://localhost:8990/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What do you see in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ],
    "max_tokens": 300
  }'
```

#### 7. Vision API - Analyze Local Image (Base64)
```bash
# First, encode your image to base64
IMAGE_DATA=$(base64 -i path/to/your/image.jpg)

curl -X POST "http://localhost:8990/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Describe this image in detail"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,'$IMAGE_DATA'"
            }
          }
        ]
      }
    ],
    "max_tokens": 500
  }'
```

#### 8. File Upload - Create Assistant File
```bash
curl -X POST "http://localhost:8990/openai/v1/files" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/document.pdf" \
  -F "purpose=assistants"
```

#### 9. Audio Transcription - Upload Audio File
```bash
curl -X POST "http://localhost:8990/openai/v1/audio/transcriptions" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/audio.mp3" \
  -F "model=whisper-1"
```

#### 10. Audio Translation - Upload Audio File
```bash
curl -X POST "http://localhost:8990/openai/v1/audio/translations" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/your/audio.mp3" \
  -F "model=whisper-1"
```

#### 11. Text-to-Speech - Generate Audio
```bash
curl -X POST "http://localhost:8990/openai/v1/audio/speech" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello, this is a test of the text-to-speech API",
    "voice": "alloy"
  }' \
  --output speech.mp3
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | ✅ Yes | Server port | `8990` |
| `GEMINI_API_KEYS` | 🔶 Optional* | Comma-separated Gemini API keys | `AIza...,AIza...` |
| `OPENAI_API_KEYS` | 🔶 Optional* | Comma-separated OpenAI API keys | `sk-proj-...,sk-proj-...` |
| `BASE_URL` | ❌ No | Custom base URL for all APIs (overrides OPENAI_BASE_URL) | `https://api.example.com` |
| `OPENAI_BASE_URL` | ❌ No | Custom base URL specifically for OpenAI-compatible APIs | `https://api.groq.com/openai` |
| `ADMIN_PASSWORD` | ❌ No | Password for admin panel access (enables web management) | `your-secure-password` |
| `FILE_LOGGING` | ❌ No | Enable file logging to proxy.log (true/false) | `true` |

*At least one API key type is required unless `ADMIN_PASSWORD` is set

### Popular API Provider Examples

```env
# OpenRouter (supports 100+ models including Claude, GPT-4, Llama, etc.)
OPENAI_BASE_URL=https://openrouter.ai/api
OPENAI_API_KEYS=sk-or-v1-your-key-here

# Groq (ultra-fast inference for Llama, Mixtral, Gemma models)
OPENAI_BASE_URL=https://api.groq.com/openai
OPENAI_API_KEYS=gsk_your-groq-key-here

# Together AI (open source models)
OPENAI_BASE_URL=https://api.together.xyz
OPENAI_API_KEYS=your-together-key-here

# Anthropic Claude (direct)
OPENAI_BASE_URL=https://api.anthropic.com
OPENAI_API_KEYS=sk-ant-your-key-here

# Use custom proxy or local server
OPENAI_BASE_URL=https://your-proxy-server.com
# OPENAI_BASE_URL=http://localhost:8080

# Use default endpoints (OpenAI official)
# OPENAI_BASE_URL=
```

## 📊 Logging Output

The server provides detailed logging for monitoring and debugging:

```
[CONFIG] Loading configuration from /path/to/.env
[CONFIG] Port: 8990
[CONFIG] Using default API endpoints
[CONFIG] Found 2 Gemini API keys
[CONFIG] Found 3 OpenAI API keys
[CONFIG] Gemini Key 1: [AIza...1234]
[CONFIG] Gemini Key 2: [AIza...5678]
[CONFIG] OpenAI Key 1: [sk-p...9012]
[CONFIG] OpenAI Key 2: [sk-p...3456]
[CONFIG] OpenAI Key 3: [sk-p...7890]
[GEMINI-ROTATOR] Initialized with 2 API keys
[OPENAI-ROTATOR] Initialized with 3 API keys
[INIT] Gemini client initialized
[INIT] OpenAI client initialized

[REQ-abc123def] POST /openai/v1/chat/completions from 127.0.0.1
[REQ-abc123def] Proxying to OPENAI: /v1/chat/completions
[OPENAI::sk-p...9012] Currently active API key (1/3)
[OPENAI::sk-p...9012] Attempting POST /v1/chat/completions (attempt 1)
[OPENAI::sk-p...9012] Rate limited (429) - rotating to next key
[OPENAI::sk-p...9012] Key marked as failed (1/3 failed)
[OPENAI-ROTATOR] Rotated from index 0 to 1 -> [OPENAI::sk-p...3456]
[OPENAI::sk-p...3456] Currently active API key (2/3)
[OPENAI::sk-p...3456] Attempting POST /v1/chat/completions (attempt 2)
[OPENAI::sk-p...3456] Success (200)
[REQ-abc123def] Response: 200
```

## 🛠️ How It Works

1. **Request Routing**: Incoming requests are routed based on URL patterns
2. **Key Selection**: The first available API key is selected
3. **API Call**: Request is forwarded to the appropriate API endpoint
4. **Error Handling**: 
   - **429 (Rate Limited)**: Automatically rotates to next key and retries
   - **Other Errors**: Returns the original error response
5. **Exhaustion**: When all keys are rate-limited, returns 429 with descriptive error

## 📁 Project Structure

```
openai-gemini-api-key-rotator/
├── src/
│   ├── config.js          # Environment configuration
│   ├── keyRotator.js      # API key rotation logic
│   ├── geminiClient.js    # Gemini API client
│   ├── openaiClient.js    # OpenAI API client
│   └── server.js          # HTTP proxy server
├── index.js               # Main entry point
├── package.json           # Node.js dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

---

**Made with ❤️ for developers who hate rate limits**
