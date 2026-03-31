# 📝 Adding Tiempos Text Font

If you have the actual Tiempos Text Regular font files, follow these steps:

## 📁 Step 1: Create Fonts Folder
```bash
mkdir assets/fonts
```

## 📄 Step 2: Add Font Files
Place your Tiempos Text font files in `assets/fonts/`:
- `TiemposText-Regular.woff2`
- `TiemposText-Regular.woff`
- `TiemposText-Medium.woff2` (optional)
- `TiemposText-Medium.woff` (optional)
- `TiemposText-Bold.woff2` (optional)
- `TiemposText-Bold.woff` (optional)

## ⚙️ Step 3: Update fonts.css
Uncomment the @font-face declarations in `src/styles/fonts.css` and update the --font-primary variable:

```css
:root {
  --font-primary: 'Tiempos Text', 'Crimson Text', 'Times New Roman', 'Georgia', serif;
  --font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

## 🔄 Current Setup
Right now, the app uses **Crimson Text** as a close substitute for Tiempos Text. Crimson Text is a serif font that has similar characteristics to Tiempos Text.

## 🎯 Font Usage
The font is applied to:
- ✅ Splash screen title and tagline
- ✅ All body text throughout the app
- ✅ Headers and paragraphs
- ✅ Calendar text
- ✅ Recording interface text
- ✅ Analysis results
- ✅ Mood dashboard

If you don't have Tiempos Text font files, Crimson Text provides a beautiful serif alternative that maintains the elegant, readable aesthetic you're looking for.