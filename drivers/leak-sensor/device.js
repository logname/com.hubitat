'use strict';

const Homey = require('homey');

class LeakSensorDevice extends Homey.Device {
  async onInit() {
    this.log('Leak sensor device has been initialized');

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
        const waterAttr = deviceInfo.attributes.find(attr => attr.name === 'water');
        if (waterAttr) {
          // Hubitat: 'wet' = alarm true, 'dry' = alarm false
          await this.setCapabilityValue('alarm_water', waterAttr.currentValue === 'wet');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'water') {
      await this.setCapabilityValue('alarm_water', value === 'wet');
    }
  }
}

module.exports = LeakSensorDevice;
