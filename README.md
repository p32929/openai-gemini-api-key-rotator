# openai-gemini-api-key-rotator

Node.js proxy server for automatic API key rotation across multiple LLM providers (OpenAI, Gemini, Groq, OpenRouter, etc.). ***Zero external dependencies***.

## Features

- **Automatic Key Rotation**: Rotates keys on configurable status codes (default: 429)
- **Universal API Compatibility**: Works with any OpenAI or Gemini-compatible API
- **Smart Key Shuffling**: Avoids recently failed keys using intelligent rotation
- **Live Key Validation**: API keys automatically tested before saving
- **Hot Configuration**: Add, edit, rename, or delete providers without restart
- **Custom Status Codes**: Configure which HTTP codes trigger rotation per request
- **Optional Access Control**: Secure providers with access keys requiring authorization
- **Default Models**: Pre-save models for easy curl command generation
- **Modern Admin Panel**: Dark/light theme support for comfortable management
- **Request Monitoring**: Last 100 requests logged in memory with details

## Quick Start

```bash
git https://github.com/rpfilomeno/openai-gemini-api-key-rotator
cd openai-gemini-api-key-rotator/app
cp .env.example .env
# Edit .env: Set PORT and ADMIN_PASSWORD
cd ..
docker-compose up -d
```
## Docker Run

```bash
docker run -d \
  --name openai-gemini-api-key-rotator \
  -p 8990:8990 \
  -e TERM=xterm-256color \
  -e TZ=Asia/Manila \
  --restart unless-stopped \
  rpfilomeno/openai-gemini-api-key-rotator
```

## Configuration

```env
PORT=8990
ADMIN_PASSWORD=your-secure-password
```


## Web Interface

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

<img width="3024" height="3652" alt="Image" src="https://github.com/user-attachments/assets/21bd17c3-763c-482a-97c0-115d8b395d65" />

<img width="3024" height="1714" alt="Image" src="https://github.com/user-attachments/assets/0de6654d-eea8-49ad-9c19-7f2a799b604e" />

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
