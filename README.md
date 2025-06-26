# Time Tracker Pro - Chrome Extension

A modern time tracking Chrome extension with Pomodoro features and Google Sheets integration.

## Features

- ⏱️ Large retro-style timer display
- 🍅 Pomodoro timer (25min work / 5min break)
- 📝 Task management with dropdown selection
- 📊 Automatic Google Sheets integration
- 🎨 Modern dark theme with hover effects
- 💾 Local storage for tasks

## Setup Instructions

### 1. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The extension should now appear in your toolbar

### 2. Google Sheets Integration (Easiest Method)

#### Option A: Google Apps Script (Recommended)

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project
3. Copy the contents of `google-apps-script.gs` into the editor
4. Create a new Google Sheet for your time tracking data
5. In the Apps Script editor, go to "Deploy" → "New deployment"
6. Choose "Web app" as the type
7. Set access to "Anyone" (for simplicity)
8. Deploy and copy the web app URL
9. Replace `YOUR_GOOGLE_APPS_SCRIPT_URL` in `popup.js` with your web app URL

#### Option B: Manual Google Sheet

If you prefer to manually create the Google Sheet:

1. Create a new Google Sheet
2. Add these headers in row 1: `Date | Time | Task | Duration | Timestamp`
3. Share the sheet with edit permissions
4. Use the Google Sheets API (more complex setup required)

### 3. Usage

1. Click the extension icon in your Chrome toolbar
2. Select a task from the dropdown or add a new one
3. Click "Start" to begin tracking
4. Click "Stop" to end the session and save to Google Sheets
5. Your time data will automatically appear in your Google Sheet

## File Structure

```
TimerPlugin/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── styles.css            # Modern dark theme styling
├── popup.js              # Timer and integration logic
├── google-apps-script.gs # Google Apps Script for Sheets
└── README.md             # This file
```

## Customization

### Pomodoro Settings
You can modify the Pomodoro times in `popup.js`:
```javascript
this.settings = {
    work: 25,        // Work session (minutes)
    break: 5,        // Short break (minutes)
    longBreak: 15,   // Long break (minutes)
    longBreakInterval: 4  // Long break every 4 sessions
};
```

### Styling
The extension uses a modern dark theme with:
- Retro Orbitron font for the timer
- Green start button with hover effects
- Red stop button
- Smooth animations and transitions

## Troubleshooting

1. **Extension not loading**: Make sure all files are in the same folder
2. **Google Sheets not updating**: Check the web app URL in `popup.js`
3. **Tasks not saving**: Check Chrome's storage permissions

## Security Notes

- The Google Apps Script web app URL should be kept private
- Consider using environment variables for production use
- The extension only requests necessary permissions (storage, identity)

## Future Enhancements

- [ ] Pomodoro notifications
- [ ] Time analytics and reports
- [ ] Multiple project support
- [ ] Export functionality
- [ ] Keyboard shortcuts 