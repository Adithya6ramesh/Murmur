# 🎙️ Murmur - AI Voice Journaling Backend

A clean, production-ready Flask backend for an AI-powered voice journaling application. Murmur converts voice recordings into text and provides thoughtful, encouraging analysis using Google Gemini AI.

## ✨ Features

- **🎵 Audio Processing**: Support for multiple audio formats (WAV, MP3, FLAC, M4A, OGG, WebM)
- **🗣️ Speech-to-Text**: High-quality transcription using Whisper.cpp
- **🤖 AI Analysis**: Emotional insights and encouraging feedback via Google Gemini
- **💙 Supportive Tone**: Warm, friendly responses that encourage and support users
- **🛡️ Production Ready**: Comprehensive error handling, validation, and logging
- **🐳 Docker Support**: Easy deployment with Docker and Docker Compose
- **📊 Health Monitoring**: Built-in health checks and service monitoring

## 🏗️ Architecture

```
murmur/
├── app/                    # Flask application
│   ├── __init__.py        # App factory
│   └── routes.py          # API endpoints
├── config/                 # Configuration management
│   └── settings.py        # Environment-based config
├── services/              # Business logic services
│   ├── audio_service.py   # Whisper.cpp integration
│   └── gemini_service.py  # Google Gemini AI integration
├── utils/                 # Utility functions
│   ├── validators.py      # File validation
│   └── responses.py       # Standardized API responses
├── uploads/               # Temporary audio file storage
├── requirements.txt       # Python dependencies
├── run.py                # Application entry point
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Google Gemini API key
- Whisper.cpp compiled binary and model

### 1. Clone and Setup

```bash
git clone <repository-url>
cd murmur
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Whisper.cpp Configuration
WHISPER_MODEL_PATH=./models/ggml-base.bin
WHISPER_EXECUTABLE_PATH=./whisper.cpp/main

# Optional: Server Configuration
HOST=0.0.0.0
PORT=5000
SECRET_KEY=your_secret_key_here
```

### 3. Setup Whisper.cpp

Download and compile Whisper.cpp:

```bash
# Clone Whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Compile (requires make and gcc/clang)
make

# Download a model (base model recommended for balance of speed/accuracy)
bash ./models/download-ggml-model.sh base

# Move model to your models directory
mkdir -p ../models
cp models/ggml-base.bin ../models/
cd ..
```

### 4. Run the Application

```bash
python run.py
```

The API will be available at `http://localhost:5000`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using Docker directly

```bash
# Build the image
docker build -t murmur-api .

# Run the container
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/whisper.cpp:/app/whisper.cpp \
  murmur-api
```

## 📡 API Endpoints

### Health Check
```http
GET /api/v1/health
```

Returns service health status and Gemini connectivity.

### API Information
```http
GET /api/v1/info
```

Returns API information, supported formats, and available endpoints.

### Full Journal Analysis
```http
POST /api/v1/journal/analyze
Content-Type: multipart/form-data

audio: <audio_file>
```

**Response Example:**
```json
{
  "success": true,
  "message": "Journal entry analyzed successfully",
  "data": {
    "transcript": "Today I felt really overwhelmed with work...",
    "analysis": {
      "summary": {
        "key_points": [
          "• Feeling overwhelmed with current workload",
          "• Seeking better work-life balance",
          "• Recognizing need for self-care"
        ]
      },
      "emotional_feedback": {
        "feelings_detected": ["Overwhelmed", "Stressed"],
        "key_thoughts": [
          "Awareness of work-life balance needs",
          "Self-reflection on current situation"
        ],
        "encouragement": "It's completely understandable to feel overwhelmed sometimes - it shows you care deeply about your work! Recognizing these feelings is actually a huge step forward. You're being so thoughtful about your well-being, and that's something to be proud of. 💙",
        "suggestions": [
          "Consider setting small, manageable daily goals",
          "Try taking short breaks throughout your day"
        ]
      }
    },
    "metadata": {
      "original_filename": "journal_entry.wav",
      "file_size_bytes": 1024000
    }
  }
}
```

### Transcription Only
```http
POST /api/v1/journal/transcript-only
Content-Type: multipart/form-data

audio: <audio_file>
```

Returns only the transcription without AI analysis.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes |
| `WHISPER_MODEL_PATH` | Path to Whisper model file | `./models/ggml-base.bin` | Yes |
| `WHISPER_EXECUTABLE_PATH` | Path to Whisper executable | `./whisper.cpp/main` | Yes |
| `FLASK_ENV` | Flask environment | `development` | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `PORT` | Server port | `5000` | No |
| `SECRET_KEY` | Flask secret key | Auto-generated | No |
| `MAX_CONTENT_LENGTH` | Max upload size in bytes | `16777216` (16MB) | No |

### Supported Audio Formats

- WAV (`.wav`)
- MP3 (`.mp3`)
- FLAC (`.flac`)
- M4A (`.m4a`)
- OGG (`.ogg`)
- WebM (`.webm`)

Maximum file size: **16MB**

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Upload and analyze audio
curl -X POST \
  -F "audio=@path/to/your/audio.wav" \
  http://localhost:5000/api/v1/journal/analyze

# Transcription only
curl -X POST \
  -F "audio=@path/to/your/audio.wav" \
  http://localhost:5000/api/v1/journal/transcript-only
```

### Testing with Python

```python
import requests

# Test file upload
with open('test_audio.wav', 'rb') as f:
    files = {'audio': f}
    response = requests.post('http://localhost:5000/api/v1/journal/analyze', files=files)
    print(response.json())
```

## 🛠️ Development

### Project Structure

- **Modular Design**: Services are separated into dedicated modules
- **Configuration Management**: Environment-based configuration with sensible defaults
- **Error Handling**: Comprehensive error handling with standardized responses
- **Logging**: Structured logging for debugging and monitoring
- **Validation**: Input validation for security and reliability

### Code Quality Standards

- **Clean Naming**: Descriptive variable and function names
- **Documentation**: Comprehensive docstrings and comments
- **Error Handling**: Graceful error handling with user-friendly messages
- **Reusability**: Modular, reusable components
- **Security**: Input validation and secure file handling

### Adding New Features

1. **Services**: Add new business logic to the `services/` directory
2. **Routes**: Add new endpoints to `app/routes.py`
3. **Utilities**: Add helper functions to `utils/`
4. **Configuration**: Add new config options to `config/settings.py`

## 🚨 Troubleshooting

### Common Issues

**1. Whisper.cpp not found**
```
Error: Whisper executable not found
```
- Ensure Whisper.cpp is compiled and the path in `.env` is correct
- Check that the executable has proper permissions

**2. Gemini API errors**
```
Error: Gemini service not properly initialized
```
- Verify your `GEMINI_API_KEY` is valid and has proper permissions
- Check your internet connection

**3. Audio upload fails**
```
Error: File type not allowed
```
- Ensure your audio file is in a supported format
- Check that the file size is under 16MB

**4. Transcription timeout**
```
Error: Transcription timed out
```
- Audio file may be too long (5-minute timeout)
- Try with a shorter audio file

### Logs and Debugging

- **Development**: Logs are printed to console with DEBUG level
- **Production**: Logs are written with INFO level
- **Docker**: Use `docker-compose logs -f` to view logs

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for meaningful voice journaling experiences**