'use strict';

const Homey = require('homey');

class DimmerDevice extends Homey.Device {

  async onInit() {
    this.log('Dimmer device has been initialized');

    // Track last command time to prevent webhook race conditions
    this.lastCommandTime = {};

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));

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
      this.log(`Set dimmer ${deviceId} to ${command}`);
      
      // Poll immediately after command
      setTimeout(() => this.pollDeviceState(), 500);
      
      return value;
    } catch (error) {
      this.error('Error setting dimmer state:', error);
      throw new Error('Failed to control dimmer');
    }
  }

  /**
   * Handle dim capability change
   */
  async onCapabilityDim(value) {
    const deviceId = this.getData().id;
    const level = Math.round(value * 100);
    
    this.homey.app.addLog(`[Dimmer ${this.getName()}] User set dim to ${value} (${level}%)`);

    try {
      // Track command time to prevent webhook race conditions
      this.lastCommandTime['level'] = Date.now();
      
      await this.homey.app.sendDeviceCommand(deviceId, 'setLevel', [level]);
      this.homey.app.addLog(`[Dimmer] Command sent successfully`);
      
      return value;
    } catch (error) {
      this.homey.app.addLog(`[Dimmer] !!! Error: ${error.message}`);
      throw new Error('Failed to set dimmer level');
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
        const switchAttr = deviceInfo.attributes.find(attr => attr.name === 'switch');
        if (switchAttr) {
          await this.setCapabilityValue('onoff', switchAttr.currentValue === 'on');
        }

        const levelAttr = deviceInfo.attributes.find(attr => attr.name === 'level');
        if (levelAttr) {
          await this.setCapabilityValue('dim', parseInt(levelAttr.currentValue) / 100);
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
    this.homey.app.addLog(`[Dimmer ${this.getName()}] handleAttributeUpdate: ${attribute}=${value}`);

    try {
      // Ignore webhook updates for 2 seconds after sending a command to prevent race conditions
      const cooldownPeriod = 2000;
      const lastCommand = this.lastCommandTime[attribute] || 0;
      const timeSinceCommand = Date.now() - lastCommand;
      
      if (timeSinceCommand < cooldownPeriod) {
        this.homey.app.addLog(`[Dimmer] Ignoring ${attribute} webhook (${timeSinceCommand}ms since command)`);
        return;
      }

      if (attribute === 'switch') {
        const newValue = value === 'on';
        await this.setCapabilityValue('onoff', newValue);
        this.homey.app.addLog(`[Dimmer] ✓ Set onoff=${newValue}`);
      } else if (attribute === 'level') {
        const newValue = parseInt(value) / 100;
        await this.setCapabilityValue('dim', newValue);
        this.homey.app.addLog(`[Dimmer] ✓ Set dim=${newValue}`);
      } else {
        this.homey.app.addLog(`[Dimmer] ! Unknown attribute: ${attribute}`);
      }
    } catch (error) {
      this.homey.app.addLog(`[Dimmer] !!! Error: ${error.message}`);
    }
  }
}

module.exports = DimmerDevice;
