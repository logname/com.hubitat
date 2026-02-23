'use strict';

const Homey = require('homey');

class PresenceSensorDevice extends Homey.Device {
  async onInit() {
    this.log('Presence sensor device has been initialized');

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

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        const presenceAttr = deviceInfo.attributes.find(attr => attr.name === 'presence');
        if (presenceAttr) {
          await this.setCapabilityValue('alarm_presence', presenceAttr.currentValue === 'present');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'presence') {
      await this.setCapabilityValue('alarm_presence', value === 'present');
    }
  }
}

module.exports = PresenceSensorDevice;
