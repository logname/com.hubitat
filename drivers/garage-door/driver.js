'use strict';

const Homey = require('homey');

class GarageDoorDriver extends Homey.Driver {

  async onInit() {
    this.log('Garage Door driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('garage-door');
      } catch (error) {
        this.error('Error listing garage door devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your connection settings.');
      }
    });
  }

}

module.exports = GarageDoorDriver;
