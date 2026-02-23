'use strict';

const Homey = require('homey');

class LockDevice extends Homey.Device {
  async onInit() {
    this.log('Lock device has been initialized');

    this.registerCapabilityListener('locked', this.onCapabilityLocked.bind(this));

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

  async onCapabilityLocked(value) {
    const deviceId = this.getData().id;
    const command = value ? 'lock' : 'unlock';

    try {
      await this.homey.app.sendDeviceCommand(deviceId, command);
      this.log(`Set lock ${deviceId} to ${command}`);
      return value;
    } catch (error) {
      this.error('Error setting lock state:', error);
      throw new Error('Failed to control lock');
    }
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        const lockAttr = deviceInfo.attributes.find(attr => attr.name === 'lock');
        if (lockAttr) {
          await this.setCapabilityValue('locked', lockAttr.currentValue === 'locked');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'lock') {
      await this.setCapabilityValue('locked', value === 'locked');
    }
  }
}

module.exports = LockDevice;
