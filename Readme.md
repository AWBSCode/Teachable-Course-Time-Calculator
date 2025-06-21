# 📚 Course Timer - Programming Advices Course Analyzer

A Microsoft Edge extension that analyzes Programming Advices courses to provide detailed insights about your learning progress, time investment, and completion estimates.

## ✨ Features

### 📊 Comprehensive Course Analysis
- **Section & Lesson Count**: Get a complete overview of course structure
- **Time Analysis**: Extract lesson durations from course titles (MM:SS format)
- **Progress Tracking**: Track completed vs remaining lessons
- **Smart Duration Parsing**: Automatically extracts timing from lesson titles like "Introduction (05:30)"

### 🎯 Daily Target Planning
- Set custom daily study targets (1-1440 minutes)
- Calculate days needed to complete the course
- Estimate completion dates
- Weekly time commitment calculations
- Persistent settings storage

### 📈 Progress Visualization
- Visual progress bar showing course completion
- Color-coded time statistics (total, completed, remaining)
- Section-by-section breakdown with individual progress
- Completion status indicators for each lesson

### 📋 Data Export & Organization
- **Full Course Report**: Export complete analysis with all details
- **Section-specific Data**: Copy individual section details
- **Lesson Titles Only**: Quick copy of lesson names for note-taking
- Formatted text ready for sharing or documentation

### 🔍 Detailed Section Views
- Expandable section details with lesson lists
- Individual lesson completion status
- Per-section time breakdowns and progress
- Quick access to section-specific data

## 🚀 Installation

### From Source (Developer Mode)
1. Download or clone this repository
2. Open Microsoft Edge and navigate to `edge://extensions/`
3. Enable "Developer mode" in the left sidebar
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Edge toolbar

### Required Files
```
course-timer-extension/
├── manifest.json
├── popup.html
├── popup.js
└── README.md
```

## 📖 How to Use

### 1. Navigate to a Programming Advices Course
- Go to any Programming Advices course page (e.g., `programmingadvices.com/courses`)
- Make sure you're viewing the course curriculum/content page

### 2. Analyze the Course
- Click the extension icon in your Edge toolbar
- Click "🔍 Analyze Course" button
- Wait for the analysis to complete

### 3. View Results
The extension will display:
- **Course Statistics**: Sections, lessons, timing, and progress
- **Daily Target Calculator**: Set your study goals and see completion estimates
- **Section Details**: Expandable view of each course section
- **Export Options**: Copy data in various formats

### 4. Set Daily Targets
- Click "⚙️ Settings" in the Daily Target card
- Enter your preferred daily study time (in minutes)
- View updated completion estimates and dates

### 5. Export Data
- **Full Report**: Click "📋 Copy Course Data" for complete analysis
- **Section Data**: Click "📋 Data" next to any section for detailed breakdown
- **Lesson Titles**: Click "📝 Titles" for just the lesson names

## 🎨 Interface Overview

### Main Statistics Card
- **Sections**: Total number of course sections
- **Total Lessons**: All lessons in the course
- **Completed Lessons**: Lessons you've finished
- **Timed Lessons**: Lessons with duration information
- **Time Breakdown**: Total, completed, and remaining time
- **Progress Bar**: Visual completion percentage

### Daily Target Card
- **Settings Toggle**: Expand to set daily study time
- **Completion Metrics**: Days to complete, daily needed time
- **Schedule Info**: Weekly hours and estimated completion date

### Section Details
- **Expandable Sections**: Click to view individual lessons
- **Progress Indicators**: Green dots for completed, gray for pending
- **Time Information**: Duration shown for each timed lesson
- **Quick Actions**: Copy section data or titles only

## 🔧 Technical Details

### Supported Platforms
- **Programming Advices Platform**: Specifically designed for Programming Advices courses
- **Microsoft Edge Extension**: Requires Microsoft Edge browser
- **Course Format**: Works with courses that include timing in lesson titles

### Data Extraction Method
- Scans for `.course-section` elements
- Extracts lesson titles and timing from `.lecture-name` elements
- Parses time format: `(MM:SS)` from lesson titles
- Detects completion status from CSS classes and check icons

### Storage
- Uses Edge's local storage for daily target settings
- No external data transmission
- All analysis performed locally in browser

## 🛠️ Troubleshooting

### Common Issues

**"No course sections found" Error**
- Ensure you're on a Programming Advices course curriculum page
- Some courses may use different HTML structures
- Try refreshing the page and analyzing again

**Extension Not Working**
- Check that you're on the Programming Advices platform (programmingadvices.com)
- Verify extension permissions in Edge settings
- Reload the extension in `edge://extensions/`

**Missing Time Information**
- Extension relies on lesson titles containing `(MM:SS)` format
- Lessons without this format will show as "No timing info"
- Manual estimation may be needed for untimed lessons

**Data Not Copying**
- Ensure clipboard permissions are granted
- Try clicking the copy button again
- Check if browser clipboard access is blocked

## 🔒 Privacy & Security

- **No Data Collection**: Extension doesn't collect or transmit personal data
- **Local Processing**: All analysis performed locally in your browser
- **Minimal Permissions**: Only requires access to active tab for analysis
- **No External Requests**: No communication with external servers

## 🚧 Development

### File Structure
- `popup.html`: Extension interface and styling
- `popup.js`: Main functionality and course analysis logic
- `manifest.json`: Extension configuration and permissions

### Key Functions
- `extractCourseData()`: Injected script that analyzes course structure
- `analyzeCourse()`: Main analysis orchestration
- `displayResults()`: UI updates and result presentation
- `exportCourseData()`: Data formatting and clipboard operations

## 📝 License

This project is open source. Feel free to modify and distribute according to your needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📞 Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Verify you're using a Programming Advices course with the supported format
3. Create an issue with course URL and error details (remove sensitive info)

---

**Happy Learning! 🎓**