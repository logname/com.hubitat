# Hubitat Elevation for Homey

This app integrates your Hubitat Elevation hub with Homey, allowing you to control and monitor your Hubitat devices directly from Homey.

## Features

- **Broad Device Support**: Supports switches, dimmers, color lights, locks, thermostats, sensors, buttons, window coverings, and fans
- **Real-time Updates**: Receive instant device state updates via webhooks
- **Two-way Control**: Control devices from both Hubitat and Homey
- **Easy Setup**: Simple configuration using Hubitat's Maker API

## Compatible Device Types

### Controllable Devices
- **Switches**: On/off control for switches and outlets
- **Dimmers**: Brightness control for dimmable lights
- **Color Lights**: Full RGB color control
- **Color Temperature Lights**: Adjustable white color temperature (warm to cool)
- **Locks**: Lock and unlock smart locks
- **Thermostats**: Temperature control and mode selection
- **Valves**: Control water valves and similar devices
- **Window Coverings**: Position control for blinds, shades, and curtains
- **Fans**: Variable speed control with named speeds (low, medium-low, medium, medium-high, high)

### Sensors
- **Contact Sensors**: Door/window open/close detection
- **Motion Sensors**: Motion detection
- **Temperature Sensors**: Temperature and humidity monitoring
- **Presence Sensors**: Presence detection
- **Leak Sensors**: Water leak detection

### Buttons
- **Push Buttons**: Trigger Flows based on button events
  - **Pushed**: Single press/tap
  - **Held**: Long press
  - **Released**: Button release after hold
  - **Double-tapped**: Quick double press

## Installation

### Prerequisites
1. Hubitat Elevation hub on your local network
2. Homey (firmware 12.2.0 or higher)

### Setup Instructions

#### 1. Configure Hubitat Maker API

1. Open your Hubitat Elevation web interface
2. Navigate to **Apps** → **Add Built-In App**
3. Select **Maker API**
4. Choose which devices you want to make available to Homey
5. Note down the following information from the Maker API page:
   - **App ID** (found in the URL)
   - **Access Token** (displayed on the page)

#### 2. Install the Homey App

1. Install this app from the Homey App Store (or sideload if developing)
2. Open the app settings in Homey
3. Enter your configuration:
   - **Hubitat IP Address**: Your hub's local IP (e.g., 192.168.1.100)
   - **App ID**: From Maker API
   - **Access Token**: From Maker API
4. Click **Test Connection** to verify
5. Click **Save Settings**

#### 3. Add Devices

1. Go to **Devices** in Homey
2. Click **Add Device**
3. Select **Hubitat Elevation**
4. Choose the device type you want to add
5. Select devices from the list
6. Click **Add Devices**

## Device Mapping

The app automatically maps Hubitat devices to appropriate Homey device types based on their capabilities:

| Hubitat Capability | Homey Driver | Notes |
|-------------------|--------------|-------|
| Lock | Lock | Lock/unlock control |
| ColorControl | Color Light | RGB color control |
| ColorTemperature | Color Temperature Light | Adjustable white temperature |
| SwitchLevel | Dimmer | Brightness control |
| Switch | Switch/Valve | On/off control |
| ContactSensor | Contact Sensor | Open/close detection |
| MotionSensor | Motion Sensor | Motion detection |
| PresenceSensor | Presence Sensor | Presence detection |
| TemperatureMeasurement | Temperature Sensor | Temperature/humidity |
| Thermostat | Thermostat | Climate control |
| WaterSensor | Leak Sensor | Water leak detection |
| PushableButton | Button | Button events (push, hold, release, double-tap) |
| WindowShade | Window Covering | Position control for blinds/shades |
| FanControl | Fan | Variable speed control |

## API Reference

### Maker API Endpoints Used

The app uses the following Hubitat Maker API endpoints:

- `GET /apps/api/{appId}/devices/all` - List all devices
- `GET /apps/api/{appId}/devices/{deviceId}` - Get device details
- `GET /apps/api/{appId}/devices/{deviceId}/{command}` - Send device command

### Compatible Commands

#### Switches
- `on` - Turn on
- `off` - Turn off

#### Dimmers
- `on` - Turn on
- `off` - Turn off
- `setLevel(level)` - Set brightness (0-100)

#### Color Lights
- `on` - Turn on
- `off` - Turn off
- `setLevel(level)` - Set brightness (0-100)
- `setColor(json)` - Set color (hue, saturation, level)
- `setColorTemperature(kelvin)` - Set color temperature (2200-6500K)

#### Color Temperature Lights
- `on` - Turn on
- `off` - Turn off
- `setLevel(level)` - Set brightness (0-100)
- `setColorTemperature(kelvin)` - Set color temperature (2200-6500K)

#### Locks
- `lock` - Lock
- `unlock` - Unlock

#### Thermostats
- `setThermostatMode(mode)` - Set mode (heat, cool, auto, off)
- `setHeatingSetpoint(temp)` - Set heating temperature
- `setCoolingSetpoint(temp)` - Set cooling temperature

#### Valves
- `open` - Open valve
- `close` - Close valve

#### Window Coverings
- `open` - Fully open
- `close` - Fully close
- `setPosition(position)` - Set position (0-100)
- `stopPositionChange` - Stop movement

#### Fans
- `setSpeed(speed)` - Set fan speed using named speeds:
  - `low` - Low speed (20%)
  - `medium-low` - Medium-low speed (40%)
  - `medium` - Medium speed (60%)
  - `medium-high` - Medium-high speed (80%)
  - `high` - High speed (100%)
  - `off` - Turn off
  - `on` - Turn on (restores previous speed)
  - `auto` - Automatic mode

#### Buttons
Buttons don't accept commands but trigger Flow events:
- **Pushed** - Single press event
- **Held** - Long press event
- **Released** - Button release event
- **Double-tapped** - Double press event

#### Sensors
Sensors are read-only and report their current state:
- **Contact Sensors**: `open` or `closed`
- **Motion Sensors**: `active` or `inactive`
- **Temperature Sensors**: Temperature value and humidity (if supported)
- **Presence Sensors**: `present` or `not present`
- **Leak Sensors**: `dry` or `wet`

## Webhooks (Optional)

For real-time device updates, you can configure webhooks in Hubitat:

1. In Maker API settings, find the "URL to send device events to"
2. Use the following format:
   ```
   https://webhooks.athom.com/webhook/{WEBHOOK_ID}?homey={HOMEY_ID}
   ```
3. Replace `{WEBHOOK_ID}` and `{HOMEY_ID}` with your specific values

Note: Without webhooks, the app polls device states every 30 seconds.

## Troubleshooting

### Connection Issues

**Problem**: "Failed to get devices from Hubitat"

**Solutions**:
- Verify your Hubitat hub is powered on and connected to your network
- Check that the IP address is correct
- Ensure the App ID and Access Token are correct
- Make sure Homey can reach your Hubitat hub (same network/VLAN)
- Try accessing the Maker API URL directly in a browser:
  ```
  http://{IP}/apps/api/{appId}/devices/all?access_token={token}
  ```

### Device Not Responding

**Problem**: Device doesn't respond to commands

**Solutions**:
- Check that the device is selected in Maker API settings
- Verify the device works in Hubitat's interface
- Remove and re-add the device in Homey
- Check Homey app logs for error messages

### State Not Updating

**Problem**: Device state in Homey doesn't match actual state

**Solutions**:
- Wait up to 30 seconds for polling interval
- Configure webhooks for instant updates
- Check network connectivity between Hubitat and Homey
- Restart the Homey app

## Advanced Configuration

### Polling Interval

By default, devices are polled every 30 seconds. You can modify this in the device files by changing the `pollInterval` value:

```javascript
this.pollInterval = setInterval(() => {
  this.pollDeviceState();
}, 30000); // 30 seconds in milliseconds
```

### Adding Custom Device Types

To add support for additional device types:

1. Create a new driver in `/drivers/{device-type}/`
2. Add driver definition to `app.json`
3. Implement capability mapping in `app.js`
4. Create device and driver files following existing patterns

## Development

### Project Structure

```
hubitat-integration/
├── app.js                 # Main app file
├── app.json              # App manifest
├── package.json          # Dependencies
├── api.js                # API for settings page
├── settings/
│   └── index.html        # Settings interface
└── drivers/
    ├── switch/
    │   ├── driver.js
    │   └── device.js
    ├── dimmer/
    │   ├── driver.js
    │   └── device.js
    ├── color-light/
    │   ├── driver.js
    │   └── device.js
    └── ... (other drivers)
```

### Building and Testing

```bash
# Install dependencies
npm install

# Run locally (requires Homey CLI)
homey app run

# Build for production
homey app build

# Validate app
homey app validate
```

## Development Methodology

This application was developed through **AI-assisted collaborative development**:

### Development Process
1. **User Requirements**: User provided requirements, bug reports, and feature requests
2. **AI Implementation**: Claude (Anthropic AI Assistant) designed architecture and implemented features
3. **User Testing**: User tested implementations and provided detailed feedback
4. **Iterative Refinement**: Claude debugged and refined based on user feedback
5. **Continuous Improvement**: Process repeated across multiple versions

### Development Tools
- **Primary Developer**: Claude (Anthropic AI Assistant)
- **Testing & Feedback**: User collaboration
- **Version Control**: Iterative development with comprehensive changelog
- **Quality Assurance**: User testing with real Hubitat and Homey hardware

### Key Achievements
- **v1.0.0**: Complete integration architecture from scratch
- **v1.4.1-v1.4.5**: Bug fixes and stability improvements
- **v1.4.6**: Critical breakthrough in fan control (named speed support)
- **v1.4.7-v1.4.9**: UX refinements matching Home Assistant behavior

This development approach combines:
- AI's ability to rapidly prototype and implement complex features
- User's real-world testing and domain knowledge
- Iterative refinement based on actual use cases

**Result**: A robust, fully-functional Hubitat integration that works seamlessly with Homey Pro.

### Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Changelog

### Version 1.4.9 (2026-02-11)
**Bug Fixes & Improvements**
- Fixed polling default value bug causing slider to snap to 50% when OFF (`0 || 0.5` defaulting to 50%)
- Improved version logging - now always visible at top of logs, doesn't disappear when cleared
- Added comprehensive fan_speed change tracking with stack traces for debugging
- Simplified version banner format

### Version 1.4.8 (2026-02-10)
**Bug Fixes**
- Fixed slider position on OFF/ON toggle
- Slider now correctly moves to 0% when OFF pressed
- Slider properly restores saved position when ON pressed
- Fixed fan_speed capability not being updated during toggle operations

### Version 1.4.7 (2026-02-10)
**Bug Fixes & Features**
- Fixed fan ON/OFF speed restoration to save actual Hubitat speed names (not calculated values)
- Implemented slider auto-turn-on when moved while OFF (matches Home Assistant behavior)
- Enhanced version logging to settings page logs
- Improved speed name tracking from webhook updates

### Version 1.4.6 (2026-02-10)
**CRITICAL FAN FIX**
- Implemented named speed support (low, medium-low, medium, medium-high, high) for Hubitat fan controllers
- Fixed fan commands being rejected - now sends string speed names instead of percentages
- Added version logging to app initialization
- Fan control now fully functional with Hubitat devices that require named speeds

**Why This Was Critical**: Many Hubitat fan controllers only accept named speeds (e.g., "medium-high") and reject numeric percentages (e.g., 75). Previous versions sent percentages which were silently rejected by Hubitat, causing the fan to appear unresponsive.

### Version 1.4.5 (2026-02-10)
**Bug Fixes**
- Fixed Homey app validation errors (changed driver image paths from relative to absolute format)
- Added comprehensive fan logging with [FAN ONOFF], [FAN SPEED], and [FAN WEBHOOK] prefixes
- Improved debugging capabilities for fan control issues

### Version 1.4.4 (2026-02-10)
**Bug Fixes**
- Fixed fan control snap-back issue with cooldown system (2 second cooldown on speed commands)
- Implemented 5% tolerance for speed changes to prevent webhook echo loops
- Better handling of named speeds from Hubitat (low, medium-low, medium, medium-high, high)
- Fixed fan speed not being set correctly before sending commands

### Version 1.4.3 (2026-02-10)
**Bug Fixes**
- Fixed fan ON command with speed restoration (restores previous speed or defaults to 50%)
- Fixed button condition state object for Flow card matching
- Added .homeybuild to .homeyignore to prevent validation errors

### Version 1.4.2 (2026-02-10)
**Bug Fixes**
- Fixed fan OFF command (404 error) - now uses setSpeed(0) instead of off command
- Fixed window covering stop command - now uses stopPositionChange
- Added button number condition card for Flow
- Fixed button state object for condition card filtering
- Removed Export Logs button from settings page

### Version 1.4.1 (2026-02-10)
**Bug Fixes**
- Fixed color temperature inversion (was setting warmest when requesting coldest)
- Fixed button Flow triggers not firing
- Fixed fan driver detection (added FanControl capability check)
- Fixed window covering driver detection (added WindowShade capability check)

### Version 1.4.0 (2024)
**Features & Improvements**
- Performance optimizations
- Enhanced error handling
- Improved device state polling
- Various bug fixes

### Version 1.3.0 (2024)
**Features**
- Added leak sensor support
- Improved thermostat control
- Enhanced webhook handling

### Version 1.2.0 (2024)
**Features**
- Added button device support
- Added window covering support
- Improved color light handling

### Version 1.1.0 (2024)
**Features**
- Added fan device support
- Enhanced sensor capabilities
- Improved error messages

### Version 1.0.0 (2024)
**Initial Release**
- Complete Hubitat Elevation integration for Homey Pro
- Maker API integration architecture
- Device discovery and pairing system
- Support for 15 device types:
  - Switches (on/off control)
  - Dimmers (brightness control)
  - Color Lights (RGB and color temperature)
  - Color Temperature Lights
  - Locks (lock/unlock)
  - Thermostats (temperature and mode control)
  - Contact Sensors (door/window detection)
  - Motion Sensors
  - Temperature Sensors (temperature and humidity)
  - Valves (open/close control)
  - Presence Sensors
  - Leak Sensors
  - Buttons (push event triggers)
  - Window Coverings (position control)
  - Fans (speed control)
- Real-time updates via webhook support
- Polling fallback (30 second intervals)
- Settings page for configuration
- Flow card support (triggers, conditions, actions)
- Comprehensive device capability mapping
- Two-way synchronization between Hubitat and Homey

## License

GPL-3.0

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Visit the Homey Community Forum
- Check Hubitat documentation: https://docs2.hubitat.com/

## Credits

**Development**: Claude (Anthropic AI Assistant)
- Complete application development from v1.0.0 through v1.4.9
- Architecture, features, bug fixes, and optimizations
- Developed in collaboration with user through iterative development and testing

**Based on**: Hubitat Elevation's Maker API
- Documentation: https://docs2.hubitat.com/en/apps/maker-api

**Note**: This application was developed entirely through AI-assisted development, with Claude (Anthropic AI Assistant) serving as the primary developer in collaboration with the user.

## Disclaimer

This app is not officially affiliated with or endorsed by Hubitat or Athom. Use at your own risk.
