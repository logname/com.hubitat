'use strict';

const Homey = require('homey');

class ContactSensorDevice extends Homey.Device {
  async onInit() {
    this.log('Contact sensor device has been initialized');

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
        const contactAttr = deviceInfo.attributes.find(attr => attr.name === 'contact');
        if (contactAttr) {
          // Hubitat: 'open' = alarm true, 'closed' = alarm false
          await this.setCapabilityValue('alarm_contact', contactAttr.currentValue === 'open');
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'contact') {
      await this.setCapabilityValue('alarm_contact', value === 'open');
    }
  }
}

module.exports = ContactSensorDevice;
