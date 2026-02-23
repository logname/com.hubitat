'use strict';

const Homey = require('homey');

class ButtonDriver extends Homey.Driver {
  async onInit() {
    this.log('Button driver has been initialized');
    
    // Register Flow condition card
    this.buttonNumberCondition = this.homey.flow.getConditionCard('button_pushed_number');
    this.buttonNumberCondition.registerRunListener(async (args, state) => {
      // args.number is the number entered in the condition
      // state.button is the button number from the trigger
      this.log(`Condition check: button ${state.button} === ${args.number}?`);
      return state.button === args.number;
    });
  }

  async onPair(session) {
    session.setHandler('list_devices', async () => {
      try {
        const app = this.homey.app;
        return await app.getDevicesForDriver('button');
      } catch (error) {
        this.error('Error listing devices:', error);
        throw new Error('Failed to get devices from Hubitat. Please check your settings.');
      }
    });
  }
}

module.exports = ButtonDriver;
