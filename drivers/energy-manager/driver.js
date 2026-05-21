'use strict';

const Homey = require('homey');

class EnergyManagerDriver extends Homey.Driver {

  async onInit() {
    this.log('Energy Manager driver has been initialized');
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('energy-manager');
      } catch (error) {
        this.error('Error listing energy manager devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your connection settings.');
      }
    });
  }

}

module.exports = EnergyManagerDriver;
