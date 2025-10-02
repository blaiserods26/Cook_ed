# 🍪 Cook_ed - Smart Cookie Manager

Cook_ed is a browser extension that helps you manage cookies efficiently by tracking consent, monitoring cookie storage, and providing automated cleanup features.

## ✨ Features

### Core Functionality
- **Cookie Consent Tracking**: Automatically detects when you accept cookies on websites
- **Comprehensive Cookie View**: See all stored cookies organized by domain
- **Manual Cookie Management**: Delete unwanted cookies for specific sites
- **Automated Cleanup**: Remove stale cookies after a set period (default: 30 days)
- **Whitelist Protection**: Prevent trusted sites from having their cookies deleted

### User Interface
- **Clean Popup Interface**: Quick access to cookie information and management
- **Detailed Settings Page**: Comprehensive options for customization
- **Real-time Statistics**: Track total cookies and cleanup history
- **Search Functionality**: Find specific sites quickly

### Privacy & Security
- **Local Data Storage**: All data stays on your device
- **No External Servers**: Complete privacy protection
- **Smart Consent Detection**: Automatically detects cookie banners

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Cook_ed extension should now appear in your browser toolbar

## 📖 How to Use

### Popup Interface
- Click the Cook_ed icon in your browser toolbar
- View all sites with cookies and their usage statistics
- Use the search bar to find specific sites
- Adjust retention days or click "Clean Now" for immediate cleanup
- Access detailed settings via "Open Settings"

### Settings Page
- **Cookie Retention**: Set how many days cookies are kept (default: 30)
- **Auto Cleanup**: Enable/disable automatic daily cleanup
- **Notifications**: Choose whether to receive cleanup notifications
- **Whitelist Management**: Add sites you want to keep permanently
- **Statistics**: View total cookies tracked and cleanup history

### Managing Cookies
1. **View Cookies**: All cookies are categorized by domain with usage information
2. **Delete Individual Sites**: Click the trash icon next to any site
3. **Whitelist Sites**: Check the whitelist checkbox to protect sites
4. **Bulk Cleanup**: Use "Clean Now" to remove all stale cookies at once

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension API
- **Service Worker**: Handles background processing and cookie management
- **Content Script**: Detects cookie consent interactions
- **Popup Interface**: Quick access to cookie information
- **Options Page**: Comprehensive settings management

### Permissions
- `cookies`: Read and manage cookies
- `storage`: Store settings locally
- `tabs`: Access current tab information
- `scripting`: Inject content scripts
- `browsingData`: Manage browsing data
- `history`: Track site usage
- `alarms`: Schedule automatic cleanup

### Data Storage
- All data is stored locally using Chrome's storage API
- No external servers or data transmission
- Settings and site statistics persist across browser sessions

## 🛠️ Development

### File Structure
```
Cook_ed/
├── manifest.json          # Extension configuration
├── service_worker.js      # Background service worker
├── content/
│   └── consent-watcher.js # Content script for consent detection
├── popup/
│   ├── popup.html        # Popup interface
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup functionality
├── options/
│   ├── options.html      # Settings page
│   ├── options.css       # Settings styling
│   └── options.js        # Settings functionality
├── lib/
│   └── domains.js        # Domain utility functions
└── icons/               # Extension icons
```

### Key Components

#### Service Worker (`service_worker.js`)
- Handles cookie counting and deletion
- Manages automatic cleanup scheduling
- Processes consent tracking data
- Implements whitelist filtering

#### Content Script (`consent-watcher.js`)
- Detects cookie consent interactions
- Sends consent data to service worker
- Uses heuristics to identify accept/reject buttons

#### Popup (`popup.js`)
- Displays cookie statistics by domain
- Provides quick cleanup functionality
- Integrates with settings page

#### Options (`options.js`)
- Comprehensive settings management
- Whitelist administration
- Statistics and data export

## 🔍 Troubleshooting

### Common Issues

1. **Extension not loading**: Ensure all files are present and manifest.json is valid
2. **Consent not tracked**: Some sites may use unique consent mechanisms
3. **Cookies not deleted**: Check browser permissions and site restrictions
4. **Settings not saving**: Verify Chrome storage permissions are granted

### Debug Mode
1. Go to `chrome://extensions/`
2. Find Cook_ed and click "Details"
3. Click "Extension options" to open the settings page
4. Use browser developer console for debugging

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆕 Version History

### v1.0.0
- Initial release with core cookie management features
- Consent tracking and automated cleanup
- Comprehensive settings and statistics
- Modern user interface design

## 🎯 Roadmap

Future enhancements may include:
- Enhanced consent banner detection
- Site-specific cookie preferences
- Chrome DevTools integration
- Detailed cookie analysis reports
- Enhanced privacy controls