'use strict';

const Homey = require('homey');

class ColorLightDevice extends Homey.Device {

  async onInit() {
    this.log('Color light device has been initialized');

    // Track last command time to prevent webhook race conditions
    this.lastCommandTime = {};

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
    this.registerCapabilityListener('light_hue', this.onCapabilityLightHue.bind(this));
    this.registerCapabilityListener('light_saturation', this.onCapabilityLightSaturation.bind(this));
    this.registerCapabilityListener('light_temperature', this.onCapabilityLightTemperature.bind(this));
    this.registerCapabilityListener('light_mode', this.onCapabilityLightMode.bind(this));

    // Set up polling for device state
    this.pollInterval = setInterval(() => {
      this.pollDeviceState();
    }, 30000); // Poll every 30 seconds (webhooks provide real-time updates)

    // Initial state fetch
    await this.pollDeviceState();
  }

  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  /**
   * Handle onoff capability change
   */
  async onCapabilityOnoff(value) {
    const deviceId = this.getData().id;
    const command = value ? 'on' : 'off';

    try {
      await this.homey.app.sendDeviceCommand(deviceId, command);
      this.log(`Set color light ${deviceId} to ${command}`);
      
      // Poll immediately after command
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting light state:', error);
      throw new Error('Failed to control light');
    }
  }

  /**
   * Handle dim capability change
   */
  async onCapabilityDim(value) {
    const deviceId = this.getData().id;
    const level = Math.round(value * 100);

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setLevel', [level]);
      this.log(`Set light ${deviceId} level to ${level}%`);
      
      return value;
    } catch (error) {
      this.error('Error setting light level:', error);
      throw new Error('Failed to set light level');
    }
  }

  /**
   * Handle hue capability change
   */
  async onCapabilityLightHue(value) {
    // Mark that we initiated this change  
    this.lastCommandTime.hue = Date.now();
    this.lastCommandTime.saturation = Date.now(); // Block saturation webhooks too
    
    this.homey.app.addLog(`[Color ${this.getName()}] User adjusting hue to ${value}`);
    
    const hue = Math.round(value * 100);
    const saturation = Math.round(this.getCapabilityValue('light_saturation') * 100);

    // Debounce rapid changes
    clearTimeout(this.colorChangeTimeout);
    this.colorChangeTimeout = setTimeout(async () => {
      this.homey.app.addLog(`[Color] Sending: Hue=${hue}, Saturation=${saturation}`);
      try {
        await this.setHueSaturation(hue, saturation);
      } catch (error) {
        this.homey.app.addLog(`[Color] !!! Error: ${error.message}`);
      }
    }, 100); // Wait 100ms for rapid changes

    return value;
  }

  /**
   * Handle saturation capability change
   */
  async onCapabilityLightSaturation(value) {
    // Mark that we initiated this change
    this.lastCommandTime.hue = Date.now(); // Block hue webhooks too
    this.lastCommandTime.saturation = Date.now();
    
    this.homey.app.addLog(`[Color ${this.getName()}] User adjusting saturation to ${value}`);
    
    const hue = Math.round(this.getCapabilityValue('light_hue') * 100);
    const saturation = Math.round(value * 100);

    // Debounce rapid changes
    clearTimeout(this.colorChangeTimeout);
    this.colorChangeTimeout = setTimeout(async () => {
      this.homey.app.addLog(`[Color] Sending: Hue=${hue}, Saturation=${saturation}`);
      try {
        await this.setHueSaturation(hue, saturation);
      } catch (error) {
        this.homey.app.addLog(`[Color] !!! Error: ${error.message}`);
      }
    }, 100); // Wait 100ms for rapid changes

    return value;
  }

  /**
   * Set hue and saturation
   */
  async setHueSaturation(hue, saturation) {
    const deviceId = this.getData().id;

    this.homey.app.addLog(`[Color] setHueSaturation called: hue=${hue}, sat=${saturation}`);

    try {
      // Track command time to prevent webhook race conditions
      this.lastCommandTime['hue'] = Date.now();
      this.lastCommandTime['saturation'] = Date.now();
      
      // Hubitat setColor expects JSON, needs to be URL-encoded in path
      const colorJSON = JSON.stringify({ 
        hue, 
        saturation, 
        level: Math.round(this.getCapabilityValue('dim') * 100) 
      });
      
      this.homey.app.addLog(`[Color] Color JSON: ${colorJSON}`);
      
      await this.homey.app.sendDeviceCommand(deviceId, 'setColor', [encodeURIComponent(colorJSON)]);
      this.homey.app.addLog(`[Color] setColor command sent successfully`);
      
      // Set light mode to color
      await this.setCapabilityValue('light_mode', 'color');
    } catch (error) {
      this.homey.app.addLog(`[Color] !!! Error in setHueSaturation: ${error.message}`);
      throw new Error('Failed to set light color');
    }
  }

  /**
   * Handle color temperature capability change
   */
  async onCapabilityLightTemperature(value) {
    const deviceId = this.getData().id;
    // Convert from 0-1 range to Kelvin (typically 2200-6500)
    const kelvin = Math.round(2200 + (value * 4300));

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setColorTemperature', [kelvin]);
      this.log(`Set light ${deviceId} color temperature to ${kelvin}K`);
      
      // Set light mode to temperature
      await this.setCapabilityValue('light_mode', 'temperature');
      return value;
    } catch (error) {
      this.error('Error setting color temperature:', error);
      throw new Error('Failed to set color temperature');
    }
  }

  /**
   * Handle light mode capability change
   */
  async onCapabilityLightMode(value) {
    // Light mode is handled automatically when color or temperature is changed
    this.log(`Light mode changed to: ${value}`);
    return value;
  }

  /**
   * Poll device state from Hubitat
   */
  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        const switchAttr = deviceInfo.attributes.find(attr => attr.name === 'switch');
        if (switchAttr) {
          await this.setCapabilityValue('onoff', switchAttr.currentValue === 'on');
        }

        const levelAttr = deviceInfo.attributes.find(attr => attr.name === 'level');
        if (levelAttr) {
          await this.setCapabilityValue('dim', parseInt(levelAttr.currentValue) / 100);
        }

        const hueAttr = deviceInfo.attributes.find(attr => attr.name === 'hue');
        if (hueAttr) {
          await this.setCapabilityValue('light_hue', parseInt(hueAttr.currentValue) / 100);
        }

        const satAttr = deviceInfo.attributes.find(attr => attr.name === 'saturation');
        if (satAttr) {
          await this.setCapabilityValue('light_saturation', parseInt(satAttr.currentValue) / 100);
        }

        const ctAttr = deviceInfo.attributes.find(attr => attr.name === 'colorTemperature');
        if (ctAttr) {
          const kelvin = parseInt(ctAttr.currentValue);
          await this.setCapabilityValue('light_temperature', (kelvin - 2200) / 4300);
        }

        const modeAttr = deviceInfo.attributes.find(attr => attr.name === 'colorMode');
        if (modeAttr) {
          const mode = modeAttr.currentValue === 'CT' ? 'temperature' : 'color';
          await this.setCapabilityValue('light_mode', mode);
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle attribute updates from webhook
   */
  async handleAttributeUpdate(attribute, value) {
    this.homey.app.addLog(`[Color ${this.getName()}] handleAttributeUpdate: ${attribute}=${value}`);

    try {
      // Ignore webhook updates for 2 seconds after sending a command to prevent race conditions
      const cooldownPeriod = 2000; // 2 seconds
      const lastCommand = this.lastCommandTime[attribute] || 0;
      const timeSinceCommand = Date.now() - lastCommand;
      
      if (timeSinceCommand < cooldownPeriod) {
        this.homey.app.addLog(`[Color] Ignoring ${attribute} webhook (${timeSinceCommand}ms since command, cooldown ${cooldownPeriod}ms)`);
        return;
      }

      if (attribute === 'switch') {
        const newValue = value === 'on';
        await this.setCapabilityValue('onoff', newValue);
        this.homey.app.addLog(`[Color] ✓ Set onoff=${newValue}`);
      } else if (attribute === 'level') {
        const newValue = parseInt(value) / 100;
        await this.setCapabilityValue('dim', newValue);
        this.homey.app.addLog(`[Color] ✓ Set dim=${newValue}`);
      } else if (attribute === 'hue') {
        const newValue = parseInt(value) / 100;
        await this.setCapabilityValue('light_hue', newValue);
        this.homey.app.addLog(`[Color] ✓ Set light_hue=${newValue}`);
      } else if (attribute === 'saturation') {
        const newValue = parseInt(value) / 100;
        await this.setCapabilityValue('light_saturation', newValue);
        this.homey.app.addLog(`[Color] ✓ Set light_saturation=${newValue}`);
      } else if (attribute === 'colorTemperature') {
        const kelvin = parseInt(value);
        const newValue = (kelvin - 2200) / 4300;
        await this.setCapabilityValue('light_temperature', newValue);
        this.homey.app.addLog(`[Color] ✓ Set light_temperature=${newValue} (${kelvin}K)`);
      } else if (attribute === 'colorMode') {
        const mode = value === 'CT' ? 'temperature' : 'color';
        await this.setCapabilityValue('light_mode', mode);
        this.homey.app.addLog(`[Color] ✓ Set light_mode=${mode}`);
      } else if (attribute === 'colorName') {
        this.homey.app.addLog(`[Color] Ignoring colorName=${value}`);
      } else {
        this.homey.app.addLog(`[Color] ! Unknown attribute: ${attribute}`);
      }
    } catch (error) {
      this.homey.app.addLog(`[Color] !!! Error updating ${attribute}: ${error.message}`);
    }
  }
}

module.exports = ColorLightDevice;
