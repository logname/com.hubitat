'use strict';

const Homey = require('homey');

class AirQualityDriver extends Homey.Driver {

  async onInit() {
    this.log('Air Quality Sensor driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('air-quality');
      } catch (error) {
        this.error('Error listing air quality devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your connection settings.');
      }
    });
  }

}

module.exports = AirQualityDriver;
