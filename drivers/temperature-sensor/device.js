'use strict';

const Homey = require('homey');

class TemperatureSensorDevice extends Homey.Device {
  async onInit() {
    this.log('Temperature sensor device has been initialized');

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
        const tempAttr = deviceInfo.attributes.find(attr => attr.name === 'temperature');
        if (tempAttr) {
          await this.setCapabilityValue('measure_temperature', parseFloat(tempAttr.currentValue));
        }

        const humidityAttr = deviceInfo.attributes.find(attr => attr.name === 'humidity');
        if (humidityAttr && this.hasCapability('measure_humidity')) {
          await this.setCapabilityValue('measure_humidity', parseFloat(humidityAttr.currentValue));
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'temperature') {
      await this.setCapabilityValue('measure_temperature', parseFloat(value));
    } else if (attribute === 'humidity' && this.hasCapability('measure_humidity')) {
      await this.setCapabilityValue('measure_humidity', parseFloat(value));
    }
  }
}

module.exports = TemperatureSensorDevice;
