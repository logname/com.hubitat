'use strict';

const Homey = require('homey');

class SwitchDevice extends Homey.Device {

  async onInit() {
    this.log('Switch device has been initialized');

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

    // Set up polling for device state - faster polling for better responsiveness
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

    this.log(`Switch command triggered: device ${deviceId}, command ${command}, value ${value}`);

    try {
      const result = await this.homey.app.sendDeviceCommand(deviceId, command);
      this.log(`Switch ${deviceId} command ${command} successful:`, result);
      
      // Poll immediately after command to get updated state quickly
      setTimeout(() => this.pollDeviceState(), 500);
      
      // Homey automatically updates the capability value when we return successfully
      // We just need to return the value to confirm the command
      return value;
    } catch (error) {
      this.error('Error setting switch state:', error);
      this.error('Error stack:', error.stack);
      throw new Error(`Failed to control switch: ${error.message}`);
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
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle attribute updates from webhook
   */
  async handleAttributeUpdate(attribute, value) {
    this.log(`=== handleAttributeUpdate called ===`);
    this.log(`Attribute: "${attribute}", Value: "${value}"`);

    try {
      if (attribute === 'switch') {
        const newValue = value === 'on';
        this.log(`Setting onoff to: ${newValue}`);
        await this.setCapabilityValue('onoff', newValue);
        this.log(`✓ onoff updated to ${newValue}`);
      } else {
        this.log(`⚠ Unknown attribute: ${attribute}`);
      }
    } catch (error) {
      this.error(`✗ Error in handleAttributeUpdate:`, error);
    }
  }
}

module.exports = SwitchDevice;
