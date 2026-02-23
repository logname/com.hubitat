# Hubitat Elevation for Homey - Installation Guide

## Quick Start Guide

This guide will walk you through setting up the Hubitat Elevation integration for Homey step by step.

## Prerequisites

Before you begin, make sure you have:

1. **Hubitat Elevation Hub** - Running on your local network
2. **Homey** - Running firmware version 12.2.0 or higher
3. **Network Access** - Both devices on the same local network (or accessible via VPN/routing)
4. **Web Browser** - To access both Hubitat and Homey interfaces

## Part 1: Configure Hubitat Maker API

### Step 1: Access Hubitat Interface

1. Open a web browser
2. Navigate to your Hubitat hub's IP address (e.g., `http://192.168.1.100`)
3. Log in if required

### Step 2: Install Maker API

1. Click on **Apps** in the left sidebar
2. Click **Add Built-In App**
3. Scroll down and select **Maker API**
4. Click **Done** on the initial setup screen

### Step 3: Configure Maker API

1. In the Maker API app, you'll see a list of all your devices
2. **Select the devices** you want to control from Homey by checking their boxes
   - Tip: You can use "Select All" and then deselect any you don't want
3. Scroll down and click **Update**

### Step 4: Get Your API Credentials

1. Scroll to the top of the Maker API page
2. Find the section titled **"Get All Devices"**
3. You'll see a URL that looks like:
   ```
   http://192.168.1.100/apps/api/123/devices/all?access_token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
4. Note down these values:
   - **IP Address**: `192.168.1.100` (from the URL)
   - **App ID**: `123` (the number after `/api/`)
   - **Access Token**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (after `access_token=`)

### Step 5: Test the API (Optional but Recommended)

1. Copy the entire URL from the Maker API page
2. Paste it into a new browser tab
3. You should see a JSON response listing all your devices
4. If you see an error, verify your Maker API configuration

## Part 2: Install and Configure Homey App

### Step 6: Install the App

**Option A: From Homey App Store** (when published)
1. Open the Homey app or web interface
2. Go to **Apps**
3. Search for "Hubitat Elevation"
4. Click **Install**

**Option B: Sideload During Development**
1. Install Homey CLI: `npm install -g homey`
2. Navigate to the app directory
3. Run: `homey app install`

### Step 7: Configure App Settings

1. Open the Homey web interface (`http://homey.local` or your Homey IP)
2. Go to **More** → **Apps**
3. Find **Hubitat Elevation** and click on it
4. Click **Configure app** or the settings gear icon
5. Fill in the configuration:
   - **Hubitat IP Address**: Enter your Hubitat's IP (e.g., `192.168.1.100`)
   - **App ID**: Enter the App ID from Step 4
   - **Access Token**: Enter the Access Token from Step 4

### Step 8: Test Connection

1. Click the **Test Connection** button
2. Wait for the result:
   - ✅ **Success**: "Connection successful!" - proceed to next step
   - ❌ **Failed**: See troubleshooting section below
3. Click **Save Settings**

## Part 3: Add Devices to Homey

### Step 9: Add Your First Device

1. In Homey, go to **Devices**
2. Click the **+** button (Add Device)
3. Search for or select **Hubitat Elevation**
4. Choose the device type you want to add:
   - **Switch** - For on/off switches and outlets
   - **Dimmer** - For dimmable lights
   - **Color Light** - For RGB/RGBW lights
   - **Color Temperature Light** - For adjustable white lights
   - **Lock** - For smart locks
   - **Thermostat** - For thermostats
   - **Contact Sensor** - For door/window sensors
   - **Motion Sensor** - For motion detectors
   - **Temperature Sensor** - For temperature/humidity sensors
   - **Presence Sensor** - For presence detection
   - **Leak Sensor** - For water leak detection
   - **Valve** - For water valves
   - **Button** - For button controllers (push, hold, release, double-tap events)
   - **Window Covering** - For blinds, shades, and curtains
   - **Fan** - For variable speed fans

### Step 10: Select Devices

1. The app will display all compatible devices from Hubitat
2. Check the boxes next to the devices you want to add
3. Click **Add X devices** (where X is the number selected)
4. Wait for the devices to be added

### Step 11: Verify Device Control

1. Go to your **Devices** page in Homey
2. Find one of your newly added Hubitat devices
3. Try controlling it:
   - For switches/lights: Toggle on/off
   - For dimmers: Adjust brightness
   - For sensors: Check if the current state is correct
4. Verify the physical device responds correctly

## Part 4: Optional - Configure Webhooks for Real-time Updates

By default, Homey polls your Hubitat devices every 30 seconds. For instant updates, you can configure webhooks.

### Step 12: Get Webhook URL (Advanced)

1. In the Homey app settings, look for the webhook configuration section
2. Note the webhook URL provided
3. In Hubitat Maker API settings, find "URL to send device events to"
4. Paste your webhook URL
5. Click **Update**

Note: Webhook configuration may require additional setup depending on your network configuration.

## Troubleshooting

### Issue: "Failed to get devices from Hubitat"

**Possible Causes and Solutions:**

1. **Incorrect IP Address**
   - Verify the IP in Hubitat web interface (look in browser address bar)
   - Try pinging the IP from your computer: `ping 192.168.1.100`

2. **Wrong App ID or Access Token**
   - Double-check the values from the Maker API page
   - Make sure there are no extra spaces when copying

3. **Network Issues**
   - Ensure Homey and Hubitat are on the same network
   - Check firewall settings
   - Try accessing Hubitat from Homey's IP address

4. **Maker API Not Configured**
   - Verify Maker API is installed and has devices selected
   - Test the API URL directly in a browser

### Issue: Devices Not Listed During Pairing

**Solutions:**
- Make sure devices are selected in Maker API settings
- Verify device type matches the driver you're trying to add
- Check that devices have the necessary capabilities
- Try refreshing the pairing page

### Issue: Device Not Responding to Commands

**Solutions:**
- Verify device works in Hubitat interface
- Check app logs in Homey developer tools
- Remove and re-add the device
- Ensure Maker API still has the device selected

### Issue: Device State Not Updating

**Solutions:**
- Wait 30 seconds (default polling interval)
- Configure webhooks for instant updates
- Check network connectivity
- Restart Homey app

### Issue: Connection Test Fails

**Solutions:**
1. Verify all three settings are correct
2. Test the API URL manually in browser:
   ```
   http://[IP]/apps/api/[APP_ID]/devices/all?access_token=[TOKEN]
   ```
3. Check Hubitat hub is online and accessible
4. Ensure no VPN or network segmentation is blocking access

## Advanced Configuration

### Finding Your Hubitat IP Address

**Method 1: From Hubitat Interface**
- Look at your browser's address bar when connected to Hubitat

**Method 2: From Router**
- Log into your router
- Look for "Hubitat Elevation" in connected devices list

**Method 3: Using Network Scanner**
- Use a network scanning tool (e.g., Fing, Advanced IP Scanner)
- Look for device named "Hubitat" or manufacturer "Hubitat"

### Recommended Network Setup

For best performance:
- Use static IP or DHCP reservation for Hubitat hub
- Ensure both Homey and Hubitat are on same VLAN
- Configure Quality of Service (QoS) for reliable communication
- Use wired Ethernet for Hubitat when possible

### Adding Multiple Hubs

Currently, the app supports one Hubitat hub. To use multiple hubs:
1. Install separate instances of the app (if supported)
2. Or use Hub Mesh in Hubitat to share devices between hubs

## Getting Help

If you continue to experience issues:

1. **Check Logs**
   - Homey Developer Tools: `homey app log com.hubitat.elevation`
   - Look for error messages

2. **Community Support**
   - Homey Community Forum
   - Hubitat Community Forum
   - GitHub Issues (if applicable)

3. **Documentation**
   - Hubitat Maker API Docs: https://docs2.hubitat.com/en/apps/maker-api
   - Homey Developer Docs: https://apps.developer.homey.app/

## Next Steps

Once you have devices added:

1. **Create Flows**
   - Use your Hubitat devices in Homey flows
   - Combine with other Homey apps and devices

2. **Set Up Scenes**
   - Create scenes that control multiple devices
   - Include both Hubitat and native Homey devices

3. **Voice Control**
   - Use with Homey voice commands
   - Integrate with Google Assistant or Amazon Alexa via Homey

4. **Automation**
   - Create advanced automations using Homey's flow engine
   - Combine Hubitat devices with other smart home platforms

## Best Practices

1. **Device Naming**
   - Use clear, descriptive names in Hubitat
   - These names will appear in Homey

2. **Organization**
   - Group related devices in Homey zones
   - Use consistent naming conventions

3. **Testing**
   - Test each device after adding
   - Verify automations work as expected

4. **Maintenance**
   - Keep Hubitat firmware updated
   - Update Homey app when new versions are available
   - Periodically verify connection is working

Enjoy your integrated smart home! 🏠✨

## Part 4: Configure Real-time Updates (Webhooks)

By default, the app polls devices every 30 seconds. For instant updates, configure webhooks:

### Enable Real-time Updates

1. Open Hubitat Maker API settings
2. Find **"URL to send device events to by POST"**
3. Enter: `http://[HOMEY-IP]:80/api/app/com.hubitat.elevation/webhook`
   - Replace `[HOMEY-IP]` with your Homey's local IP
   - Example: `http://192.168.1.50:80/api/app/com.hubitat.elevation/webhook/hubitat`
4. Click **Update**

**Finding Homey IP:**
- Look at your Homey web interface URL
- Check router DHCP client list
- Homey app → More → Settings → Network

**Benefits:**
- ✅ Instant updates (< 1 second)
- ✅ Reduced network traffic
- ✅ Better battery sensor reporting
- ⚠️ Requires Homey and Hubitat on same network

**Without webhooks:**
- Updates every 30 seconds via polling
- Still fully functional
