# openai-gemini-api-key-rotator

Node.js proxy server for automatic API key rotation across multiple LLM providers (OpenAI, Gemini, Groq, OpenRouter, etc.). ***Zero external dependencies***.

## Features

- **Automatic Key Rotation**: Rotates keys on configurable status codes (default: 429)
- **Universal API Compatibility**: Works with any OpenAI or Gemini-compatible API
- **Streaming Support**: Full pass-through for SSE/streaming responses (`"stream": true`)
- **Smart Key Shuffling**: Avoids recently failed keys using intelligent rotation
- **Key Management**: Reorder keys, disable/enable individual keys or entire providers
- **Key Usage Tracking**: See how many times each key has been used (in-memory)
- **Live Key Validation**: API keys automatically tested before saving
- **Hot Configuration**: Add, edit, rename, or delete providers without restart
- **Custom Status Codes**: Configure which HTTP codes trigger rotation per request
- **Optional Access Control**: Secure providers with access keys requiring authorization
- **Default Models**: Pre-save models for easy curl command generation
- **Modern Admin Panel**: Dark/light theme support for comfortable management
- **Request Monitoring**: Last 100 requests logged with key usage details (which key succeeded/failed)

## Quick Start

```bash
git clone https://github.com/p32929/openai-gemini-api-key-rotator.git
cd openai-gemini-api-key-rotator
cp .env.example .env
# Edit .env: Set PORT and ADMIN_PASSWORD
npm start
```

Access admin panel: `http://localhost:8990/admin`

## Configuration

```env
PORT=8990
ADMIN_PASSWORD=your-secure-password
```

Visit http://localhost:8990/admin to configure your providers and start using the API.

## API Usage Examples

### OpenAI-Compatible APIs
```bash
curl -X POST "http://localhost:8990/groq/chat/completions" \
  -H "Authorization: Bearer [STATUS_CODES:429][ACCESS_KEY:your-access-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-120b",
    "messages": [
      {
        "role": "user",
        "content": "Hello! Please say hello back."
      }
    ]
  }'
```

### Gemini-Compatible APIs
```bash
curl -X POST "http://localhost:8990/gemini/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: [STATUS_CODES:429][ACCESS_KEY:your-access-key]" \
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
    ]
  }'
```

**Note**: Replace `your-access-key` with your provider's ACCESS_KEY if configured. If no ACCESS_KEY is set for the provider, you can omit the `[ACCESS_KEY:...]` parameter entirely.

## Changelog

### Version 5.x.x
- Streaming support — SSE responses piped through without buffering
- Disable/enable individual API keys (persisted via `~` prefix in `.env`)
- Disable/enable entire providers (`_DISABLED=true` in `.env`)
- Reorder API keys to control rotation priority
- Per-key usage tracking displayed in admin panel
- Logs now show which key was used and which keys failed per request

### Version 4.x.x
- Dynamic status code configuration via headers
- Optional ACCESS_KEY for provider-level security
- Enhanced admin panel with improved UX
- Auto-generated curl commands reflect the new API format

**Breaking Changes**:
- API endpoints changed from `/provider/v1/*` to `/provider/*`
- Version suffix (`/v1`) now derived from provider's base URL configuration
- **Migration**: Simply copy the curl command from admin panel to see the new format in action

### Version 3.x.x
- Enhanced admin panel with better UI/UX
- No breaking changes

### Version 2.x.x
- Added admin panel for dynamic provider management
- No breaking changes

### Version 1.x.x
- Basic API key rotation
- OpenAI and Gemini-compatible API support

### Screenshot

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/f265cc8f-941e-43e4-998e-c713dacfd248" />

<img width="3600" height="6418" alt="Image" src="https://github.com/user-attachments/assets/fc8f464b-bd06-4bfd-be9a-10844e25f3ed" />

<img width="3600" height="2110" alt="Image" src="https://github.com/user-attachments/assets/39833f4f-c4eb-4c77-9a3a-91aeab7ef92c" />

## Contributing

Contributions are warmly welcomed and greatly appreciated! Whether it's a bug fix, new feature, or improvement, your input helps make this project better for everyone.

**Before submitting a pull request**, please:
1. Create an issue describing the feature or bug fix you'd like to work on
2. Wait for discussion and approval to ensure alignment with project goals
3. Fork the repository and create your feature branch
4. Submit your pull request with a clear description of changes

This approach helps avoid duplicate efforts and ensures smooth collaboration. Thank you for considering contributing!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
