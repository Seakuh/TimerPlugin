# Time Tracker Pro - Chrome Extension

A modern time tracking Chrome extension with Pomodoro features and CSV export.

## Features

- ⏱️ Large retro-style timer display
- 🍅 Pomodoro timer (25min work / 5min break)
- 📝 Task management with dropdown selection
- 💾 Local storage for tasks and time entries
- 📊 CSV export functionality
- 🎨 Modern dark theme with hover effects
- 🔄 Background timer (continues when popup is closed)

## Setup Instructions

### 1. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The extension should now appear in your toolbar

### 2. Usage

1. Click the extension icon in your Chrome toolbar
2. Select a task from the dropdown or add a new one
3. Click "Start" to begin tracking
4. Click "Stop" to end the session and save locally
5. Use "Export CSV" to download your time data

## File Structure

```
TimerPlugin/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── styles.css            # Modern dark theme styling
├── popup.js              # Timer and local storage logic
├── background.js         # Background timer service
└── README.md             # This file
```

## How It Works

### Local Storage
- **Tasks**: Stored locally in Chrome storage
- **Time Entries**: All tracking sessions saved locally
- **Timer State**: Continues running in background

### CSV Export
The exported CSV contains:
- **Date**: Date of the session
- **Time**: Time when session ended
- **Task**: Task name
- **Duration**: Session duration (MM:SS format)
- **Timestamp**: Full ISO timestamp

Example CSV:
```csv
Date,Time,Task,Duration,Timestamp
15.12.2023,14:30:25,Programmierung,0:45,2023-12-15T13:30:25.123Z
15.12.2023,15:20:10,Meeting,0:30,2023-12-15T14:20:10.456Z
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
- Blue export button
- Smooth animations and transitions

## Features

### Background Timer
- Timer continues running when popup is closed
- State is preserved across browser sessions
- No data loss when switching tabs

### Task Management
- Add new tasks with the "+" button
- Tasks are saved locally
- Dropdown selection for quick access

### CSV Export
- Export all time entries at once
- Automatic filename with current date
- Compatible with Excel, Google Sheets, etc.

## Troubleshooting

1. **Extension not loading**: Make sure all files are in the same folder
2. **Timer not running**: Check if background script is enabled
3. **No export**: Make sure you have time entries saved

## Data Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- CSV export is generated locally
- You have full control over your data

## Future Enhancements

- [ ] Pomodoro notifications
- [ ] Time analytics and reports
- [ ] Multiple project support
- [ ] Data backup/restore
- [ ] Keyboard shortcuts 