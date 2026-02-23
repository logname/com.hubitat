'use strict';

const Homey = require('homey');

class ColorTempLightDevice extends Homey.Device {

  async onInit() {
    this.log('Color temperature light device has been initialized');

    // Track last command time to prevent webhook race conditions
    this.lastCommandTime = {};

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
    this.registerCapabilityListener('light_temperature', this.onCapabilityLightTemperature.bind(this));

    // Set up polling for device state
    this.pollInterval = setInterval(() => {
      this.pollDeviceState();
    }, 30000);

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
      this.log(`Set color temp light ${deviceId} to ${command}`);
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting onoff:', error);
      throw error;
    }
  }

  /**
   * Handle dim capability change
   */
  async onCapabilityDim(value) {
    const deviceId = this.getData().id;
    const level = Math.round(value * 100);

    this.lastCommandTime.dim = Date.now();

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setLevel', [level]);
      this.log(`Set color temp light ${deviceId} level to ${level}%`);
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting dim level:', error);
      throw error;
    }
  }

  /**
   * Handle light temperature capability change
   */
  async onCapabilityLightTemperature(value) {
    const deviceId = this.getData().id;
    
    // Homey: 0 = cold (6500K/blue), 1 = warm (2700K/red)
    // Hubitat color temperature: typically 2700-6500 Kelvin
    // INVERTED: When Homey slider is at 0 (cold), send 6500K
    //           When Homey slider is at 1 (warm), send 2700K
    const kelvin = Math.round(6500 - (value * (6500 - 2700)));
    
    this.lastCommandTime.temperature = Date.now();

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setColorTemperature', [kelvin]);
      this.log(`Set color temp light ${deviceId} temperature to ${kelvin}K (Homey value: ${value})`);
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting color temperature:', error);
      throw error;
    }
  }

  /**
   * Poll device state from Hubitat
   */
  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        // Update onoff
        const switchAttr = deviceInfo.attributes.find(attr => attr.name === 'switch');
        if (switchAttr) {
          await this.setCapabilityValue('onoff', switchAttr.currentValue === 'on');
        }

        // Update dim level
        const levelAttr = deviceInfo.attributes.find(attr => attr.name === 'level');
        if (levelAttr) {
          const dimValue = parseInt(levelAttr.currentValue) / 100;
          await this.setCapabilityValue('dim', dimValue);
        }

        // Update color temperature
        const colorTempAttr = deviceInfo.attributes.find(attr => attr.name === 'colorTemperature');
        if (colorTempAttr) {
          const kelvin = parseInt(colorTempAttr.currentValue);
          // Convert Kelvin to Homey 0-1 range (INVERTED)
          // Homey: 0 = cold (6500K), 1 = warm (2700K)
          const tempValue = (6500 - kelvin) / (6500 - 2700);
          await this.setCapabilityValue('light_temperature', Math.max(0, Math.min(1, tempValue)));
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle webhook attribute updates from Hubitat
   */
  async handleAttributeUpdate(attribute, value) {
    const now = Date.now();
    
    // Cooldown period: 2 seconds
    const cooldown = 2000;

    if (attribute === 'switch') {
      await this.setCapabilityValue('onoff', value === 'on');
    } else if (attribute === 'level') {
      // Block webhook updates for 2 seconds after dim command
      if (this.lastCommandTime.dim && (now - this.lastCommandTime.dim) < cooldown) {
        this.log('Ignoring level webhook (recently commanded)');
        return;
      }
      const dimValue = parseInt(value) / 100;
      await this.setCapabilityValue('dim', dimValue);
    } else if (attribute === 'colorTemperature') {
      // Block webhook updates for 2 seconds after temperature command
      if (this.lastCommandTime.temperature && (now - this.lastCommandTime.temperature) < cooldown) {
        this.log('Ignoring temperature webhook (recently commanded)');
        return;
      }
      const kelvin = parseInt(value);
      // Homey: 0 = cold (6500K), 1 = warm (2700K) - INVERTED scale
      const tempValue = (6500 - kelvin) / (6500 - 2700);
      await this.setCapabilityValue('light_temperature', Math.max(0, Math.min(1, tempValue)));
    }
  }
}

module.exports = ColorTempLightDevice;
