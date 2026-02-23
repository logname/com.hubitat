'use strict';

const Homey = require('homey');

class ValveDevice extends Homey.Device {
  async onInit() {
    this.log('Valve device has been initialized');

    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

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

  async onCapabilityOnoff(value) {
    const deviceId = this.getData().id;
    const command = value ? 'open' : 'close';

    try {
      await this.homey.app.sendDeviceCommand(deviceId, command);
      this.log(`Set valve ${deviceId} to ${command}`);
      
      // Poll immediately after command
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting valve state:', error);
      throw new Error('Failed to control valve');
    }
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        const valveAttr = deviceInfo.attributes.find(attr => attr.name === 'valve');
        if (valveAttr) {
          await this.setCapabilityValue('onoff', valveAttr.currentValue === 'open');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'valve') {
      await this.setCapabilityValue('onoff', value === 'open');
    }
  }
}

module.exports = ValveDevice;
