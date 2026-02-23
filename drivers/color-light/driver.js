'use strict';

const Homey = require('homey');

class ColorLightDriver extends Homey.Driver {

  async onInit() {
    this.log('Color light driver has been initialized');
  }

  async onPair(session) {
    let devices = [];

    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        devices = await app.getDevicesForDriver('color-light');
        return devices;
      } catch (error) {
        this.error('Error listing devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your settings.');
      }
    });

    return true;
  }
}

module.exports = ColorLightDriver;
