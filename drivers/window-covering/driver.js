'use strict';

const Homey = require('homey');

class WindowCoveringDriver extends Homey.Driver {
  async onInit() {
    this.log('Window covering driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('window-covering');
      } catch (error) {
        this.error('Error listing devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your settings.');
      }
    });
  }
}

module.exports = WindowCoveringDriver;
