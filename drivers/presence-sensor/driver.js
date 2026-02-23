'use strict';

const Homey = require('homey');

class PresenceSensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Presence sensor driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('presence-sensor');
      } catch (error) {
        this.error('Error listing devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your settings.');
      }
    });
  }
}

module.exports = PresenceSensorDriver;
