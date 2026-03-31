# 🖼️ Setting Up Background Images

To complete your Murmur frontend setup, you'll need to add the background images you mentioned. Here's how to add them:

## 📁 Image Placement

Place your background images in the `assets/images/` folder with these names:

1. **Splash Screen** (already added): `splash-bg.png`
2. **Calendar/Home Page**: `calendar-bg.png`
3. **Recording Interface**: `recording-bg.png`
4. **Mood Dashboard**: `mood-bg.png`

## 🔧 How to Add Images

### Method 1: Copy Files Directly
```bash
# Navigate to the images folder
cd assets/images/

# Copy your images (replace paths with your actual image locations)
copy "path/to/your/second-image.png" "calendar-bg.png"
copy "path/to/your/third-image.png" "recording-bg.png"
copy "path/to/your/fourth-image.png" "mood-bg.png"
```

### Method 2: Using File Explorer
1. Open `D:\Github\Murmur\frontend\assets\images\` in File Explorer
2. Copy your background images into this folder
3. Rename them to match the expected names above

## 🎨 CSS Updates

Once you've added the images, the CSS will automatically use them. The current setup expects:

### Calendar Page Background
```css
#home-page {
  background: url('../../assets/images/calendar-bg.png') center/cover no-repeat,
              linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Recording Page Background
```css
#recording-page {
  background: url('../../assets/images/recording-bg.png') center/cover no-repeat,
              linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
}
```

### Mood Dashboard Background
```css
#mood-page {
  background: url('../../assets/images/mood-bg.png') center/cover no-repeat,
              linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
```

## 🔄 Updating CSS Files

If you want to update the CSS to use your new background images, edit these files:

### 1. Calendar Background (`src/styles/calendar.css`)
```css
#home-page {
  background: url('../../assets/images/calendar-bg.png') center/cover no-repeat;
  background-blend-mode: overlay;
}
```

### 2. Recording Background (`src/styles/recording.css`)
```css
#recording-page {
  background: url('../../assets/images/recording-bg.png') center/cover no-repeat;
  background-blend-mode: overlay;
}
```

### 3. Mood Dashboard Background (`src/styles/mood.css`)
```css
#mood-page {
  background: url('../../assets/images/mood-bg.png') center/cover no-repeat;
  background-blend-mode: overlay;
}
```

## 🎯 Image Requirements

For best results, your background images should be:

- **Format**: PNG, JPG, or WebP
- **Size**: At least 1920x1080 for desktop
- **Aspect Ratio**: 16:9 or wider
- **File Size**: Under 2MB for fast loading
- **Style**: Should work well with overlay text and glass elements

## 🔍 Testing Your Images

After adding the images:

1. **Refresh your browser** at http://localhost:8000
2. **Navigate through the pages** to see each background
3. **Check on mobile** by resizing your browser window
4. **Verify readability** of text over the backgrounds

## 🎨 Fine-tuning

If text is hard to read over your backgrounds, you can adjust the glass overlay opacity in `src/styles/main.css`:

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.15); /* Increase for more opacity */
  --glass-border: rgba(255, 255, 255, 0.3); /* Increase for more visible borders */
}
```

## 📱 Mobile Optimization

Your images will automatically scale on mobile devices. If you want mobile-specific backgrounds, you can add:

```css
@media (max-width: 768px) {
  #home-page {
    background: url('../../assets/images/calendar-bg-mobile.png') center/cover no-repeat;
  }
}
```

---

Once you've added your background images, your Murmur frontend will have the complete liquid glass aesthetic you envisioned! 🎨✨