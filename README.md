# 🔄 Multi-Provider API Key Rotator

A powerful Node.js proxy server that automatically rotates API keys across **multiple API providers** (OpenAI, Gemini, Groq, OpenRouter, and more) when rate limits are encountered. Features a modern admin interface, toast notifications, and support for unlimited providers with custom configurations.

## ✨ Features

### 🚀 **Core Functionality**
- 🔄 **Automatic Key Rotation**: Seamlessly switches to the next API key on 429 errors
- 🏗️ **Multi-Provider Support**: Create unlimited providers (Groq, OpenRouter, Together AI, etc.)
- 🎯 **Legacy API Support**: Backward compatible with Gemini and OpenAI endpoints
- 🔧 **Flexible Base URLs**: Each provider can have custom endpoints
- 📁 **File Upload Support**: Handles multipart/form-data and binary uploads
- 🛡️ **Error Handling**: Proper error responses and graceful failures
- 🚀 **Zero Dependencies**: Pure Node.js with no external packages

### 🎛️ **Modern Admin Interface**
- 🌙 **Dark/Light Themes**: Toggle between beautiful theme modes
- 🍞 **Toast Notifications**: Professional slide-in notifications for all actions
- 🔑 **Multiple API Key Management**: Add, test, and delete multiple keys per provider
- ✅ **Individual Key Testing**: Test each API key independently with real-time results
- 🏭 **Provider Management**: Create, configure, and delete providers dynamically
- 📊 **Real-time Monitoring**: View API request logs and response details
- 🔒 **Secure Authentication**: Password-protected access with session management
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices

### ⚡ **Advanced Features**
- 🔗 **Smart Provider Creation**: Add any OpenAI-compatible API provider with intelligent validation
- 🎮 **Interactive UI**: No more popup alerts - everything uses modern UI components
- 📝 **Detailed Logging**: Track every request, rotation, and error with masked API keys
- 🔄 **Hot Configuration**: Add/remove API keys without server restart
- 🎯 **Load Balancing**: Automatic rotation across multiple keys per provider
- 📋 **cURL Generation**: Auto-generate test commands with proper URLs and payloads
- 🛡️ **Pre-validation**: All API keys tested before saving to prevent invalid configurations

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

Edit `.env` with your configuration:

### **🎯 Modern Provider Format (Recommended)**
```env
# Required
PORT=8990
ADMIN_PASSWORD=your-secure-admin-password

# Create multiple providers with different APIs
# Format: {API_TYPE}_{PROVIDER_NAME}_API_KEYS and {API_TYPE}_{PROVIDER_NAME}_BASE_URL

# Groq Provider (OpenAI-compatible)
OPENAI_GROQ_API_KEYS=gsk_key1...,gsk_key2...,gsk_key3...
OPENAI_GROQ_BASE_URL=https://api.groq.com/openai/v1

# OpenRouter Provider (OpenAI-compatible)  
OPENAI_OPENROUTER_API_KEYS=sk-or-v1-key1...,sk-or-v1-key2...
OPENAI_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Together AI Provider (OpenAI-compatible)
OPENAI_TOGETHER_API_KEYS=together_key1...,together_key2...
OPENAI_TOGETHER_BASE_URL=https://api.together.xyz/v1

# Official OpenAI Provider  
OPENAI_API_KEYS=sk-proj-key1...,sk-proj-key2...
OPENAI_BASE_URL=https://api.openai.com/v1

# Official Gemini Provider
GEMINI_API_KEYS=AIza_key1...,AIza_key2...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1

# Optional - Enable file logging for API requests
FILE_LOGGING=true
```

### **🔄 Legacy Format (Still Supported)**
```env
# Required
PORT=8990

# Legacy single-provider format (still works)
GEMINI_API_KEYS=AIzaSyABC123...,AIzaSyDEF456...,AIzaSyGHI789...
OPENAI_API_KEYS=sk-proj-abc123...,sk-proj-def456...,sk-proj-ghi789...

# Optional - Admin panel password (highly recommended)
ADMIN_PASSWORD=your-secure-admin-password

# Optional - Enable file logging
FILE_LOGGING=true
```

### 3. Start the Server

```bash
npm start
```

You'll see output like:
```
[CONFIG] Loading configuration from /path/to/.env
[CONFIG] Port: 8990
[CONFIG] Found 4 providers configured
[CONFIG] Provider 'groq' (openai): 3 keys [gsk_...xyz] → https://api.groq.com/openai/v1
[CONFIG] Provider 'openrouter' (openai): 2 keys [sk-or...abc] → https://openrouter.ai/api/v1
[CONFIG] Provider 'together' (openai): 2 keys [together...def] → https://api.together.xyz/v1
[CONFIG] Provider 'gemini' (gemini): 3 keys [AIza...ghi] → https://generativelanguage.googleapis.com/v1
[CONFIG] Admin panel enabled - providers can be managed via admin interface

Multi-API proxy server running on port 8990
Provider 'groq' (openai): /groq/v1/* → https://api.groq.com/openai/v1
Provider 'openrouter' (openai): /openrouter/v1/* → https://openrouter.ai/api/v1  
Provider 'together' (openai): /together/v1/* → https://api.together.xyz/v1
Provider 'gemini' (gemini): /gemini/v1/* → https://generativelanguage.googleapis.com/v1
Admin panel available at: http://localhost:8990/admin
```

## 🎛️ Modern Admin Panel

The redesigned admin panel provides a beautiful, modern interface for managing your multi-provider API key rotator:

### 🎨 **User Interface**
- **🍞 Toast Notifications**: Professional slide-in notifications for all actions (no more annoying popups!)
- **🌙 Dark/Light Themes**: Toggle between beautiful theme modes
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **🎮 Interactive UI**: Modern components with smooth animations

### 🔑 **API Key Management**  
- **➕ Multiple Key Addition**: Add multiple API keys when creating providers
- **✅ Test-Before-Save**: All API keys are automatically tested before being saved
- **🔬 Individual Key Testing**: Test each API key independently with real-time results
- **🗑️ Easy Deletion**: Remove keys with confirmation dialogs (not popup alerts)
- **🔄 Hot Reload**: Add/remove keys without server restart
- **📋 Copy cURL Commands**: One-click copy of ready-to-test cURL commands for each provider

### 🏭 **Provider Management**
- **🆕 Smart Provider Creation**: Create default providers (leave fields empty) or custom providers (provide both name and URL)
- **⚙️ Real-time Validation**: Smart validation with live preview of what will be created
- **📊 Provider Overview**: See key count, status, and endpoints at a glance
- **🗑️ Provider Deletion**: Remove entire providers with all their keys
- **🎯 Default Provider Support**: Automatic configuration for OpenAI and Gemini default endpoints

### 📊 **Monitoring & Logs**
- **📝 Real-time Logs**: View API request logs and response details
- **🔍 Response Viewer**: Inspect detailed API responses
- **🎛️ File Logging Control**: Enable/disable file logging for API requests
- **🔒 Secure Authentication**: Password-protected access with session management

### 🎯 **Enhanced Provider Creation**

The admin panel now features intelligent provider creation with two modes:

#### **Default Provider Mode** (Recommended for beginners)
- Leave **Provider Name** and **Base URL** empty
- Select API type (OpenAI Compatible or Gemini Compatible)
- Add your API keys
- System automatically configures default settings

#### **Custom Provider Mode** (Advanced users)
- Provide **both** Provider Name and Base URL (both required)
- Perfect for custom API endpoints like Groq, OpenRouter, Together AI
- Real-time validation prevents incomplete configurations

#### **Smart Features**
- **📋 Copy cURL**: Click to copy ready-to-test cURL commands for any provider
- **🔬 Pre-validation**: All API keys are tested before saving
- **🎯 Live Preview**: See exactly what will be created before saving
- **⚠️ Smart Validation**: Prevents incomplete provider configurations

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

### 🎯 **Modern Provider Format**
Each provider gets its own endpoint based on the provider name:

| Provider | Endpoint Pattern | Example Usage |
|----------|------------------|---------------|
| **Groq** | `/{provider}/v1/*` | `http://localhost:8990/groq/v1/chat/completions` |
| **OpenRouter** | `/{provider}/v1/*` | `http://localhost:8990/openrouter/v1/chat/completions` |
| **Together AI** | `/{provider}/v1/*` | `http://localhost:8990/together/v1/chat/completions` |
| **Custom Provider** | `/{provider}/v1/*` | `http://localhost:8990/my_custom_api/v1/chat/completions` |

### 🔄 **Legacy Endpoints (Still Supported)**
| API | Endpoint Pattern | Example |
|-----|------------------|---------|
| **Gemini** | `/gemini/v1/*` | `/gemini/v1/models/gemini-pro:generateContent` |
| **Gemini Beta** | `/gemini/v1beta/*` | `/gemini/v1beta/models/gemini-pro:generateContent` |
| **OpenAI** | `/openai/v1/*` | `/openai/v1/chat/completions` |

## 🧪 Easy Testing with Admin Panel

### 📋 **Auto-Generated cURL Commands** (NEW!)

The easiest way to test your providers is using the admin panel's **Copy cURL** feature:

1. **Go to Admin Panel**: `http://localhost:8990/admin`
2. **Find Your Provider**: In the "Configured Providers" section
3. **Click "📋 Copy cURL"**: Next to any provider
4. **Paste in Terminal**: Ready-to-run test command with proper URLs

**Example Generated Commands:**

#### For OpenAI-Compatible Providers (Groq, OpenRouter, etc.):
```bash
curl -X POST "http://localhost:8990/groq/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Hello! Please say hello back."
      }
    ],
    "max_tokens": 50,
    "temperature": 0.7
  }'
```

#### For Gemini Providers:
```bash
curl -X POST "http://localhost:8990/gemini/v1/models/gemini-2.5-pro:generateContent" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Hello! Please say hello back."
          }
        ]
      }
    ],
    "generationConfig": {
      "maxOutputTokens": 50,
      "temperature": 0.7
    }
  }'
```

✨ **Features:**
- **Smart URL Detection**: Automatically uses your current server URL
- **Provider-Specific**: Correct endpoints and payloads for each API type
- **Ready-to-Test**: Uses working models with simple "hello" test
- **One-Click Copy**: Copies to clipboard with success notification

## 📋 Manual Copy-Paste Examples

### 🚀 **Modern Multi-Provider Examples**

#### 1. Groq API (Ultra-fast Llama, Mixtral models)
```bash
# Using your Groq provider
curl -X POST "http://localhost:8990/groq/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mixtral-8x7b-32768",
    "messages": [
      {
        "role": "user", 
        "content": "Explain quantum computing in simple terms"
      }
    ],
    "max_tokens": 150,
    "temperature": 0.7
  }'
```

#### 2. OpenRouter API (100+ models including Claude, GPT-4)
```bash
# Using your OpenRouter provider  
curl -X POST "http://localhost:8990/openrouter/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-3-haiku",
    "messages": [
      {
        "role": "user",
        "content": "Write a haiku about API key rotation"
      }
    ]
  }'
```

#### 3. Together AI (Open source models)
```bash
# Using your Together AI provider
curl -X POST "http://localhost:8990/together/v1/chat/completions" \
  -H "Content-Type: application/json" \  
  -d '{
    "model": "meta-llama/Llama-2-70b-chat-hf",
    "messages": [
      {
        "role": "user",
        "content": "What are the benefits of load balancing API keys?"
      }
    ],
    "max_tokens": 200
  }'
```

#### 4. Multiple Provider Load Balancing
```bash
# The same request can hit different providers based on availability
# Request 1 might go to Groq (if keys available)
curl -X POST "http://localhost:8990/groq/v1/chat/completions" -H "Content-Type: application/json" -d '{"model":"mixtral-8x7b-32768","messages":[{"role":"user","content":"Hello"}]}'

# Request 2 might go to OpenRouter (if Groq is rate limited)  
curl -X POST "http://localhost:8990/openrouter/v1/chat/completions" -H "Content-Type: application/json" -d '{"model":"anthropic/claude-3-haiku","messages":[{"role":"user","content":"Hello"}]}'

# Request 3 might go to Together AI (as backup)
curl -X POST "http://localhost:8990/together/v1/chat/completions" -H "Content-Type: application/json" -d '{"model":"meta-llama/Llama-2-70b-chat-hf","messages":[{"role":"user","content":"Hello"}]}'
```

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
| `ADMIN_PASSWORD` | 🎯 Highly Recommended | Password for admin panel (enables web management) | `your-secure-password` |
| `FILE_LOGGING` | ❌ No | Enable file logging to proxy.log (true/false) | `true` |

### 🎯 **Modern Provider Format**
| Variable Pattern | Description | Example |
|------------------|-------------|---------|
| `{API_TYPE}_{PROVIDER}_API_KEYS` | Comma-separated API keys for custom provider | `OPENAI_GROQ_API_KEYS=gsk_key1,gsk_key2` |
| `{API_TYPE}_{PROVIDER}_BASE_URL` | Custom base URL for custom provider | `OPENAI_GROQ_BASE_URL=https://api.groq.com/openai/v1` |
| `{API_TYPE}_API_KEYS` | Comma-separated API keys for default provider | `OPENAI_API_KEYS=sk_key1,sk_key2` |
| `{API_TYPE}_BASE_URL` | Custom base URL for default provider | `OPENAI_BASE_URL=https://api.openai.com/v1` |

**Supported API Types:**
- `OPENAI` - For OpenAI-compatible APIs (most modern APIs)
- `GEMINI` - For Google Gemini API

**How it works:**
- `OPENAI_GROQ_API_KEYS` → Creates "groq" provider  
- `OPENAI_API_KEYS` → Creates "openai" provider (default)
- `GEMINI_API_KEYS` → Creates "gemini" provider (default)

### 🔄 **Legacy Variables (Still Supported)**
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEYS` | 🔶 Optional* | Comma-separated Gemini API keys | `AIza...,AIza...` |
| `OPENAI_API_KEYS` | 🔶 Optional* | Comma-separated OpenAI API keys | `sk-proj-...,sk-proj-...` |
| `BASE_URL` | ❌ No | Custom base URL for all APIs (legacy, overrides default endpoints) | `https://api.example.com` |

*At least one API key type is required unless `ADMIN_PASSWORD` is set (to use admin panel for configuration)

### 🚀 **Popular API Provider Examples**

#### **Modern Multi-Provider Setup (Recommended)**
```env
PORT=8990
ADMIN_PASSWORD=secure-password-123

# Multiple providers for better reliability and load balancing

# Groq - Ultra-fast inference (Llama, Mixtral, Gemma)
OPENAI_GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
OPENAI_GROQ_BASE_URL=https://api.groq.com/openai/v1

# OpenRouter - 100+ models (Claude, GPT-4, Llama, etc.)
OPENAI_OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2
OPENAI_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Together AI - Open source models
OPENAI_TOGETHER_API_KEYS=together_key1,together_key2
OPENAI_TOGETHER_BASE_URL=https://api.together.xyz/v1

# Official OpenAI - GPT models
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2
OPENAI_BASE_URL=https://api.openai.com/v1

# Official Gemini - Google AI models  
GEMINI_API_KEYS=AIza_key1,AIza_key2
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1

FILE_LOGGING=true
```

#### **Legacy Single-Provider Setup (Still Supported)**
```env
# OpenRouter example (legacy format)
BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3
ADMIN_PASSWORD=your-password

# Groq example (legacy format)
BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEYS=gsk_key1,gsk_key2,gsk_key3
ADMIN_PASSWORD=your-password

# Use default endpoints (OpenAI official, Google Gemini)
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2
GEMINI_API_KEYS=AIza_key1,AIza_key2
ADMIN_PASSWORD=your-password
# BASE_URL= (leave empty for defaults)
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

## 🆕 What's New in v3.0

### **Enhanced Admin Panel**
- **🎯 Smart Provider Creation**: Default and custom provider modes with intelligent validation
- **📋 Auto-Generated cURL**: One-click copy of ready-to-test commands  
- **🔬 Test-Before-Save**: All API keys validated before saving
- **⚡ Real-time Preview**: Live preview of provider configuration
- **🛡️ Smart Validation**: Prevents incomplete configurations

### **Improved User Experience**  
- **🍞 Better Notifications**: Professional toast notifications instead of alerts
- **🎮 Interactive UI**: Modern components with smooth animations
- **📱 Mobile Optimized**: Perfect experience on all devices
- **🔄 Hot Reload**: No server restart needed for configuration changes

---

**Made with ❤️ for developers who hate rate limits**
