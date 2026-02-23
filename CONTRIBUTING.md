# Contributing to Hubitat Elevation for Homey

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

1. **Node.js** - Version 14 or higher
2. **Homey CLI** - Install globally: `npm install -g homey`
3. **Homey** - For testing (firmware 12.2.0 or higher)
4. **Hubitat Elevation** - For integration testing

### Getting Started

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd hubitat-integration
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your webhook credentials if needed
   ```

4. **Run the App**
   ```bash
   homey app run
   ```

## Project Structure

```
hubitat-integration/
├── app.js                 # Main application logic
├── app.json              # App manifest and metadata
├── api.js                # API endpoints for settings
├── package.json          # Node.js dependencies
├── locales/              # Internationalization files
│   └── en.json
├── settings/             # App settings page
│   └── index.html
├── drivers/              # Device drivers
│   ├── switch/
│   │   ├── driver.js     # Driver logic (pairing, etc.)
│   │   └── device.js     # Device instance logic
│   ├── dimmer/
│   ├── color-light/
│   ├── lock/
│   ├── thermostat/
│   ├── contact-sensor/
│   ├── motion-sensor/
│   ├── temperature-sensor/
│   ├── valve/
│   └── presence-sensor/
└── assets/               # App icons and images
```

## Architecture Overview

### Main App (`app.js`)

The main app handles:
- Connection to Hubitat Maker API
- Device discovery and mapping
- API request handling
- Webhook event processing
- Settings management

Key methods:
- `makeRequest(endpoint, params)` - Make API calls to Hubitat
- `getDevices()` - Retrieve all devices
- `sendDeviceCommand(deviceId, command, params)` - Control devices
- `mapDeviceToDriver(hubitatDevice)` - Map Hubitat device to Homey driver

### Drivers

Each driver handles:
- Device pairing
- Listing available devices of that type
- Device instantiation

### Devices

Each device instance handles:
- Capability registration
- Command execution
- State polling
- Webhook event processing

## Adding New Device Types

To add support for a new device type:

### 1. Create Driver Files

```bash
mkdir -p drivers/new-device-type
```

Create `drivers/new-device-type/driver.js`:
```javascript
'use strict';

const Homey = require('homey');

class NewDeviceDriver extends Homey.Driver {
  async onInit() {
    this.log('New device driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('new-device-type');
      } catch (error) {
        this.error('Error listing devices:', error);
        throw new Error('Failed to get devices from Hubitat.');
      }
    });
  }
}

module.exports = NewDeviceDriver;
```

Create `drivers/new-device-type/device.js`:
```javascript
'use strict';

const Homey = require('homey');

class NewDeviceDevice extends Homey.Device {
  async onInit() {
    this.log('New device has been initialized');

    // Register capability listeners
    this.registerCapabilityListener('your_capability', this.onCapability.bind(this));

    // Set up polling
    this.pollInterval = setInterval(() => {
      this.pollDeviceState();
    }, 30000);

    await this.pollDeviceState();
  }

  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async onCapability(value) {
    const deviceId = this.getData().id;
    // Implement command sending
    await this.homey.app.sendDeviceCommand(deviceId, 'command', [value]);
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;
    const deviceInfo = await this.homey.app.getDevice(deviceId);
    // Update capabilities based on device state
  }

  async handleAttributeUpdate(attribute, value) {
    // Handle webhook updates
  }
}

module.exports = NewDeviceDevice;
```

### 2. Update `app.json`

Add driver definition:
```json
{
  "id": "new-device-type",
  "name": {
    "en": "New Device Type"
  },
  "class": "appropriate-class",
  "capabilities": ["capability1", "capability2"],
  "pair": [
    {
      "id": "list_devices",
      "template": "list_devices",
      "navigation": {
        "next": "add_devices"
      }
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ]
}
```

### 3. Update Device Mapping

In `app.js`, add mapping logic to `mapDeviceToDriver()`:
```javascript
mapDeviceToDriver(hubitatDevice) {
  const capabilities = hubitatDevice.capabilities || [];
  
  if (capabilities.includes('YourCapability')) {
    return 'new-device-type';
  }
  
  // ... existing mappings
}
```

### 4. Test the New Device Type

1. Run the app: `homey app run`
2. Try pairing the new device type
3. Test all capabilities
4. Verify state updates work

## Code Style Guidelines

### JavaScript

- Use ES6+ features where appropriate
- Use async/await for asynchronous operations
- Use meaningful variable and function names
- Add comments for complex logic
- Handle errors gracefully

Example:
```javascript
async pollDeviceState() {
  const deviceId = this.getData().id;

  try {
    const deviceInfo = await this.homey.app.getDevice(deviceId);
    
    if (deviceInfo.attributes) {
      const attr = deviceInfo.attributes.find(a => a.name === 'switch');
      if (attr) {
        await this.setCapabilityValue('onoff', attr.currentValue === 'on');
      }
    }
  } catch (error) {
    this.error('Error polling device state:', error);
  }
}
```

### Error Handling

Always wrap API calls in try-catch:
```javascript
try {
  await this.homey.app.sendDeviceCommand(deviceId, command);
} catch (error) {
  this.error('Error sending command:', error);
  throw new Error('Failed to control device');
}
```

### Logging

Use appropriate log levels:
```javascript
this.log('Normal operation message');
this.error('Error message:', error);
```

## Testing

### Manual Testing Checklist

Before submitting changes:

- [ ] App installs without errors
- [ ] Settings page loads correctly
- [ ] Connection test works
- [ ] Device pairing works
- [ ] Device control works (on/off, dim, etc.)
- [ ] Device state updates correctly
- [ ] Polling works
- [ ] Webhooks work (if configured)
- [ ] App can be removed cleanly
- [ ] No errors in logs

### Testing Commands

```bash
# Validate app manifest and files
homey app validate

# Install app to Homey (development mode)
homey app install

# Run app in development mode with live reload
homey app run

# Build app for publishing
homey app build

# Manage app in Homey Developer Tools
homey app manage

# Update app version
homey app version <major|minor|patch>

# View installed app details
homey app view

# Publish app to Homey App Store
homey app publish
```

### Advanced Testing

```bash
# Add TypeScript declarations
homey app add-types

# Translate app using OpenAI
homey app translate

# Add GitHub workflows for CI/CD
homey app add-github-workflows

# Driver-specific commands
homey app driver <command>

# Flow-specific commands
homey app flow <command>

# Widget-specific commands
homey app widget <command>
```

### Viewing Logs

The app includes built-in logging accessible through the settings page:

1. Open the Hubitat Elevation app settings in Homey
2. Enable "Debug Logging"
3. Logs will appear in the settings interface
4. Look for prefixed logs like `[FAN ONOFF]`, `[FAN SPEED]`, `[FAN WEBHOOK]`

**Important**: The `homey app log` command is not available in current Homey CLI. Use the built-in settings page logging instead.

## Debugging

### Enable Debug Logging

The app includes a built-in logging system accessible through settings:

1. Open Homey web interface
2. Navigate to Settings → Apps → Hubitat Elevation
3. Enable "Debug Logging"
4. View logs directly in the settings page

Add detailed logging in your code:
```javascript
this.log('Device state:', deviceInfo);
this.log('Command:', command, 'Parameters:', parameters);
```

The app automatically adds timestamps and prefixes to logs:
```
[02:41:33.382] [FAN ONOFF] Toggling fan 1073 to OFF
[02:41:33.385] [FAN SPEED] Changing fan 1073 from 75% to "medium-high"
```

### Testing Workflow

1. **Install app**:
   ```bash
   homey app install
   ```

2. **Enable debug logging** in settings page

3. **Test functionality** (pair device, control, etc.)

4. **Check logs** in settings interface

5. **Make changes** to code

6. **Reinstall**:
   ```bash
   homey app install
   ```

### Common Issues

**Issue**: Device not responding
- Check API endpoint in logs
- Verify device ID is correct
- Test Maker API directly

**Issue**: State not updating
- Check polling interval
- Verify attribute names match
- Check webhook configuration

## Submitting Changes

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Follow existing patterns
   - Test thoroughly

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add: description of changes"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Describe what you changed
   - Explain why you made the change
   - Reference any related issues

### Commit Message Format

Use descriptive commit messages:
- `Add: new temperature sensor driver`
- `Fix: dimmer level not updating`
- `Update: improve error handling`
- `Docs: add installation guide`

### Code Review

All pull requests will be reviewed for:
- Code quality
- Functionality
- Testing
- Documentation

## Versioning

We follow Semantic Versioning (SemVer):
- MAJOR version for incompatible API changes
- MINOR version for new functionality
- PATCH version for bug fixes

Update version in:
- `app.json`
- `package.json`
- `.homeychangelog.json`

Use Homey CLI to update version:
```bash
# Increment patch version (1.4.9 → 1.4.10)
homey app version patch

# Increment minor version (1.4.9 → 1.5.0)
homey app version minor

# Increment major version (1.4.9 → 2.0.0)
homey app version major
```

## AI-Assisted Development

This application was developed through **AI-assisted collaborative development** with Claude (Anthropic AI Assistant).

### Development Approach

**How It Works**:
1. **Requirements**: Human provides requirements, bug reports, feature requests
2. **Implementation**: AI (Claude) designs and implements features
3. **Testing**: Human tests with real hardware (Hubitat + Homey)
4. **Feedback**: Human provides detailed logs and observations
5. **Refinement**: AI debugs and refines based on feedback
6. **Iteration**: Process repeats until feature works correctly

**Example**: The fan control feature (v1.4.1 - v1.4.9)
- Initial problem: Fan not responding
- Iterative fixes: Commands, cooldown, tolerance, named speeds
- Final solution: Complete named speed support matching Home Assistant
- Result: 9 versions of refinement to get it perfect

### Contributing to AI-Developed Code

When contributing to this codebase:

**What Works Well**:
- ✅ Clear bug reports with logs showing exact behavior
- ✅ Step-by-step reproduction instructions
- ✅ Comparison to expected behavior (e.g., "Home Assistant does X")
- ✅ Specific examples with device IDs and commands
- ✅ Actual vs. expected output

**What Helps Less**:
- ❌ Vague descriptions ("it doesn't work")
- ❌ Missing context about device types
- ❌ No logs or error messages
- ❌ Assumptions about what's happening internally

**Best Practices**:
1. **Test thoroughly** - AI can write code, but needs your hardware testing
2. **Provide detailed feedback** - More context = better fixes
3. **Share logs** - Actual output reveals the truth
4. **Reference working examples** - "X integration does this" is helpful
5. **Be iterative** - Complex features may need multiple refinements

### Why This Approach Works

**Advantages**:
- Rapid prototyping and implementation
- Consistent code patterns
- Comprehensive error handling
- Detailed documentation
- Quick bug fixes based on feedback

**Limitations**:
- Requires human testing (AI can't run the actual hardware)
- Needs iterative refinement for complex features
- Benefits from domain expertise in feedback

### Current Status

**Development**: Complete (v1.0.0 - v1.4.9)
- All features implemented and tested
- All known bugs fixed
- Matches Home Assistant integration behavior

**Maintenance**: Ongoing
- Bug reports welcome
- Feature requests considered
- Community contributions appreciated

## Resources

### Documentation

- [Homey Apps SDK Documentation](https://apps.developer.homey.app/)
- [Hubitat Maker API](https://docs2.hubitat.com/en/apps/maker-api)
- [Node.js Documentation](https://nodejs.org/docs/)

### Community

- Homey Community Forum
- Hubitat Community Forum
- GitHub Issues/Discussions

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.

## Questions?

If you have questions about contributing:
- Open an issue on GitHub
- Ask in the community forum
- Check existing documentation

Thank you for contributing! 🎉
