# 🎙️ Murmur Frontend

A beautiful, liquid glass UI frontend for the Murmur AI Voice Journaling application.

## ✨ Features

- **Liquid Glass Design**: Modern, translucent UI with backdrop blur effects
- **Voice Recording**: Real-time audio recording with visual feedback
- **AI Analysis**: Integration with Murmur backend for voice analysis
- **Mood Tracking**: Visual mood dashboard with trends and insights
- **Calendar View**: Beautiful calendar interface to track journal entries
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🎨 Design System

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Fallback**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI')

### Color Palette
- **Primary**: Linear gradients with blues and purples
- **Accent Colors**: Green (#00ff88), Blue (#00d4ff), Purple (#8b5cf6)
- **Glass Effects**: Semi-transparent whites with backdrop blur

### Components
- **Splash Screen**: 3-second branded intro with MURMUR title
- **Calendar**: Interactive monthly view with mood indicators
- **Recording Interface**: Circular record button with audio visualization
- **Analysis Display**: Transcript and AI insights presentation
- **Mood Dashboard**: Cards and graphs for emotional tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for Vite)
- Modern browser with Web Audio API and `MediaRecorder`
- Murmur backend on `http://127.0.0.1:5000` (default API base)

### Installation

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Production build: `npm run build`, then serve the `dist/` folder with any static file server.

Optional: set `VITE_API_BASE` (e.g. in `.env`) to override the default `http://127.0.0.1:5000/api/v1` used by `src/lib/journalApi.js`.

## 📱 User Flow

1. **Splash Screen** (3 seconds)
   - Shows MURMUR branding with animated diamond icon
   - Tagline: "YOUR VOICE, YOUR STORY, YOUR PACE."

2. **Home - Calendar View**
   - Aesthetic liquid glass calendar
   - Today highlighted with green dot
   - Previous entries marked with indicators

3. **Recording Interface**
   - "Talk to me" prompt in muted gray
   - Large circular record button
   - Real-time audio visualization during recording

4. **Analysis Results**
   - Full transcript display
   - Send button to trigger AI analysis
   - Summary bullets and emotional insights
   - Key thoughts, feelings, and next steps

5. **Mood Dashboard**
   - Today's mood card with emoji and description
   - Mood trends graph (week/month filters)
   - Visual scale: High (happy) → Mid (neutral) → Low (challenging)

## 🎯 API Integration

The frontend integrates with the Murmur backend API:

- **Health Check**: `GET /api/v1/health`
- **Transcription**: `POST /api/v1/journal/transcript-only`
- **Full Analysis**: `POST /api/v1/journal/analyze`

## 🔧 Configuration

### Backend URL
Default: `http://127.0.0.1:5000/api/v1` in `src/lib/journalApi.js`. Override with env `VITE_API_BASE` if needed.

### Audio
Recording options live in `src/lib/audioRecorder.js` (`getUserMedia` / `MediaRecorder`).

## 📁 Project structure (high level)

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/     # React UI
│   ├── lib/            # storage, journalApi, audioRecorder
│   └── utils/          # calendar grid, mood helpers
```

## 🎨 Customization

### Adding Background Images
Place your background images in `assets/images/` and update the CSS:

```css
/* For splash screen */
.splash-screen {
  background: url('../../assets/images/your-image.png') center/cover no-repeat;
}

/* For other pages */
#recording-page {
  background: url('../../assets/images/recording-bg.png') center/cover no-repeat;
}
```

### Modifying Colors
Update CSS variables in `src/styles/main.css`:

```css
:root {
  --primary-bg: linear-gradient(135deg, #your-color 0%, #your-color-2 100%);
  --accent-blue: #your-blue;
  --accent-green: #your-green;
}
```

## 🔊 Audio Requirements

### Supported Formats
- WAV, MP3, FLAC, M4A, OGG, WebM
- Maximum file size: 16MB
- Automatic format detection and conversion

### Browser Compatibility
- Chrome/Chromium: Full support
- Firefox: Full support
- Safari: Full support
- Edge: Full support

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Check browser permissions
   - Ensure HTTPS or localhost
   - Try refreshing the page

2. **Backend Connection Failed**
   - Verify backend is running on port 5000
   - Check CORS settings
   - Confirm API endpoints are accessible

3. **Audio Recording Not Working**
   - Check microphone hardware
   - Verify Web Audio API support
   - Try different browser

4. **Styles Not Loading**
   - Clear browser cache
   - Check file paths in HTML
   - Verify CSS files exist

## 📱 Mobile Considerations

- Touch-friendly interface
- Responsive breakpoints at 768px and 480px
- Optimized for portrait orientation
- Gesture-based interactions

## 🔒 Privacy & Security

- All audio processing happens locally or on your backend
- No data sent to third-party services (except configured AI APIs)
- Local storage for journal entries and mood data
- No persistent audio storage in browser

## 🚀 Performance

- Lazy loading for components
- Optimized animations with CSS transforms
- Efficient audio processing
- Minimal JavaScript bundle size

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for meaningful voice journaling experiences**