'use strict';

const Homey = require('homey');

class MotionSensorDevice extends Homey.Device {
  async onInit() {
    this.log('Motion sensor device has been initialized');

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
        const motionAttr = deviceInfo.attributes.find(attr => attr.name === 'motion');
        if (motionAttr) {
          await this.setCapabilityValue('alarm_motion', motionAttr.currentValue === 'active');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'motion') {
      await this.setCapabilityValue('alarm_motion', value === 'active');
    }
  }
}

module.exports = MotionSensorDevice;
