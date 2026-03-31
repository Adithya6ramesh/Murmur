# 🎨 Adding NEUE Machina Font

If you have the actual NEUE Machina font files, follow these steps to use them in your Murmur app:

## 📁 Step 1: Create Fonts Folder (if not exists)
```bash
mkdir assets/fonts
```

## 📄 Step 2: Add NEUE Machina Font Files
Place your NEUE Machina font files in `assets/fonts/`:
- `NeueMachina-Regular.woff2`
- `NeueMachina-Regular.woff`
- `NeueMachina-Medium.woff2` (optional)
- `NeueMachina-Medium.woff` (optional)
- `NeueMachina-Bold.woff2` (optional)
- `NeueMachina-Bold.woff` (optional)

## ⚙️ Step 3: Update fonts.css
Add these @font-face declarations to `src/styles/fonts.css`:

```css
/* NEUE Machina Font */
@font-face {
  font-family: 'NEUE Machina';
  src: url('../../assets/fonts/NeueMachina-Regular.woff2') format('woff2'),
       url('../../assets/fonts/NeueMachina-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'NEUE Machina';
  src: url('../../assets/fonts/NeueMachina-Medium.woff2') format('woff2'),
       url('../../assets/fonts/NeueMachina-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'NEUE Machina';
  src: url('../../assets/fonts/NeueMachina-Bold.woff2') format('woff2'),
       url('../../assets/fonts/NeueMachina-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

## 🔄 Step 4: Update Font Variable
Change the --font-title variable in `src/styles/fonts.css`:

```css
:root {
  --font-primary: 'Crimson Text', 'Times New Roman', 'Georgia', serif;
  --font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-title: 'NEUE Machina', 'Space Grotesk', 'Inter', sans-serif;
}
```

## 🎯 Current Setup
Right now, the splash screen uses **Space Grotesk** as a substitute for NEUE Machina. Space Grotesk is a modern, geometric sans-serif font that has similar characteristics to NEUE Machina.

## 📝 Font Usage
The title font (NEUE Machina/Space Grotesk) is applied to:
- ✅ Splash screen "MURMUR" title
- ✅ Splash screen tagline "YOUR VOICE, YOUR STORY, YOUR PACE."

The rest of the app uses:
- **Body text**: Crimson Text (serif, similar to Tiempos Text)
- **UI elements**: Inter (clean, readable sans-serif)

## 🔍 How to Get NEUE Machina Font
NEUE Machina is a commercial font. You can purchase it from:
- **Pangram Pangram Foundry** (original foundry)
- **MyFonts**
- **Adobe Fonts** (if you have Creative Cloud subscription)
- **Google Fonts** (check if available)

## 🎨 Alternative Fonts
If you don't have NEUE Machina, these fonts provide similar aesthetics:
- **Space Grotesk** (currently used) - Free on Google Fonts
- **Inter** - Free on Google Fonts
- **Poppins** - Free on Google Fonts
- **Montserrat** - Free on Google Fonts

The current Space Grotesk setup provides a modern, clean look that works beautifully with your liquid glass design! 🚀