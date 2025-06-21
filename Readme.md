# Teachable Course Timer Extension

A Microsoft Edge extension that analyzes Teachable course pages to extract course structure and calculate total estimated course time.

## Features

- **Course Analysis**: Extracts all sections and lessons from Teachable course pages
- **Time Estimation**: Calculates total estimated course duration (10 minutes per lesson average)
- **Section Breakdown**: Shows detailed information for each course section
- **Export Functionality**: Copy course data to clipboard for external use
- **Modern UI**: Beautiful gradient interface with glassmorphism effects
- **Real-time Detection**: Automatically detects course pages and shows a floating widget

## Installation

1. Download all the extension files:
2. Load the extension in Microsoft Edge:
   - Open Edge and go to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the folder containing your extension files

## Usage

1. Navigate to any Programming Advices course page where you're enrolled
2. Click the Teachable Course Timer extension icon in your toolbar
3. Click "🔍 Analyze Course" to extract course data
4. View the results:
   - Total number of sections
   - Total number of lessons
   - Estimated total time
   - Detailed section breakdown
5. Click "📋 Copy Course Data" to export the information

## How It Works

The extension analyzes the HTML structure of Teachable course pages, specifically looking for:

- `.course-section` containers that hold course sections
- `.section-title` elements for section names
- `.section-item` elements for individual lessons
- `.lecture-name` elements for lesson titles

### Time Estimation

The extension estimates course duration using an average of 10 minutes per lesson. This is a reasonable estimate for most online courses, but actual times may vary based on:

- Lesson complexity
- Video length
- Reading materials
- Assignments and quizzes

## Technical Details

### Manifest V3
The extension uses Manifest V3 for better security and performance.

### Permissions
- `activeTab`: Access to the current tab for course analysis
- `scripting`: Ability to inject content scripts
- Host permissions for Teachable and Thinkific platforms

### Files Structure
```
teachable-course-timer/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic and UI interactions
├── content.js            # Content script for page analysis
├── icon16.png            # Small icon (optional)
├── icon48.png            # Medium icon (optional)
├── icon128.png           # Large icon (optional)
└── README.md             # This file
```

## Browser Support

- Microsoft Edge (Chromium-based)
- Google Chrome (with minimal modifications)
- Other Chromium-based browsers

## Supported Platforms

- ProgrammingAdvices.com courses

## Troubleshooting

### Extension doesn't detect course content
- Make sure you're on an enrolled course page
- Try refreshing the page
- Check that the course page has loaded completely

### No time calculation showing
- The extension estimates 10 minutes per lesson by default
- Some courses may not have standard lesson structures

### Export function not working
- Ensure your browser supports the Clipboard API
- Try copying manually from the popup display

## Privacy

This extension:
- Only analyzes course pages you're currently viewing
- Does not collect or store personal data
- Does not send data to external servers
- Works entirely locally in your browser

## Development

To modify or enhance the extension:

1. Edit the appropriate files
2. Reload the extension in `edge://extensions/`
3. Test on various Teachable course pages

### Adding New Platforms

To support additional educational platforms, modify the:
- `host_permissions` in `manifest.json`
- Course detection logic in `content.js`
- HTML parsing logic in `popup.js`

## License

This extension is provided as-is for educational purposes. Feel free to modify and improve it for your needs.

## Version History

- **v1.0**: Initial release with basic course analysis and time estimation