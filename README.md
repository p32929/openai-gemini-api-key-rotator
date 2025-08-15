# 🔄 Multi-Provider API Key Rotator

A Node.js proxy server that automatically rotates API keys across multiple providers (OpenAI, Gemini, Groq, OpenRouter, etc.) when rate limits are hit. Features a modern admin panel and zero external dependencies.

## ✨ Key Features

- 🔄 **Automatic Key Rotation**: Seamlessly switches API keys on 429 rate limit errors
- 🏗️ **Multi-Provider Support**: Works with OpenAI, Gemini, Groq, OpenRouter, Together AI, and any OpenAI-compatible API
- ♾️ **Unlimited Scale**: Add unlimited providers with unlimited API keys each
- 🎛️ **Modern Admin Panel**: Dark/light themes, toast notifications, real-time key testing
- ⚡ **Full API Compatibility**: Supports everything the original APIs do - tool calling, streaming, file uploads, vision, etc.
- 🔥 **Zero Dependencies**: Pure Node.js with no external packages
- 🔧 **Hot Configuration**: Add/remove keys without server restart

## 🚀 Quick Start

### 1. Setup
```bash
git clone https://github.com/p32929/openai-gemini-api-key-rotator.git
cd openai-gemini-api-key-rotator
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` with minimal setup:

```env
PORT=8990
ADMIN_PASSWORD=your-secure-password
```

**💡 Recommended**: Use the admin panel at `http://localhost:8990/admin` to add your providers and API keys through the beautiful web interface!

### 3. Start Server
```bash
npm start
```

Visit `http://localhost:8990/admin` to configure your providers and start using the API.

## 🎯 How Provider URLs Work

When you create a provider named `groq`, your API will be available at:
```
http://localhost:8990/groq/v1/*
```

When you create a provider named `openrouter`, your API will be available at:
```
http://localhost:8990/openrouter/v1/*
```

**Default Providers**: If you name your environment variables like `OPENAI_API_KEYS` or `GEMINI_API_KEYS`, they automatically become `openai` and `gemini` providers respectively.

**Need cURL Examples?** 📋 The admin panel generates ready-to-use cURL commands for each provider - just click "Copy cURL" next to any provider!

## 🎛️ Admin Panel Features

- **🏭 Provider Management**: Create unlimited providers with custom names and URLs
- **🔑 Key Management**: Add unlimited API keys per provider
- **✅ Real-time Testing**: Test each API key individually before saving
- **📊 Request Monitoring**: View live API logs and response details
- **🌙 Beautiful UI**: Dark/light themes with smooth animations
- **📱 Mobile Friendly**: Perfect experience on all devices
- **📋 Auto-Generated Tests**: One-click copy of ready-to-test cURL commands

### Screenshot

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/f265cc8f-941e-43e4-998e-c713dacfd248" />

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/c905e424-07d0-4a29-9e84-b053fa909c2f" />

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/0de6654d-eea8-49ad-9c19-7f2a799b604e" />

## 🛠️ How It Works

1. **Smart Routing**: Routes requests to the right provider based on URL (`/provider/v1/*`)
2. **Intelligent Key Selection**: Avoids recently failed keys using smart shuffling
3. **Automatic Failover**: On rate limits, instantly tries the next available key
4. **Graceful Handling**: Returns proper errors when all keys are exhausted
5. **Memory-based Logging**: Keeps last 100 API requests in memory for real-time monitoring

## 📊 Popular API Providers

| Provider | Base URL | What You Get |
|----------|----------|--------------|
| **Groq** | `https://api.groq.com/openai/v1` | Ultra-fast Llama, Mixtral models |
| **OpenRouter** | `https://openrouter.ai/api/v1` | 100+ models including Claude, GPT-4 |
| **Together AI** | `https://api.together.xyz/v1` | Open source models at scale |
| **OpenAI** | `https://api.openai.com/v1` | Official GPT models |
| **Gemini** | `https://generativelanguage.googleapis.com/v1` | Google's powerful AI models |

## 🔧 Environment Configuration

### Option 1: Use Admin Panel (Recommended) ⭐
Just set `PORT` and `ADMIN_PASSWORD`, then configure everything through the web interface!

### Option 2: Environment Variables
```env
# Named providers (creates custom endpoints)
OPENAI_GROQ_API_KEYS=key1,key2,key3
OPENAI_GROQ_BASE_URL=https://api.groq.com/openai/v1

# Default providers (standard endpoints)
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2
GEMINI_API_KEYS=AIza_key1,AIza_key2
```

## 🆕 What's New in v3.0

- **🎯 Smart Admin Panel**: Intuitive provider creation with real-time validation
- **🍞 Toast Notifications**: Professional UI instead of browser alerts  
- **📋 Auto-Generated Commands**: One-click copy of test cURL commands
- **♾️ Unlimited Everything**: No limits on providers or keys per provider
- **🔄 Zero Downtime**: Hot reload configuration changes

## 🔒 Security & Privacy

- 🔐 API keys are masked in all logs
- 🛡️ Password-protected admin access
- 🚫 No API keys stored in browser
- 🔒 Secure session management

---

**🚀 Stop worrying about rate limits. Start building amazing things.**
