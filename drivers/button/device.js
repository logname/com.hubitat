'use strict';

const Homey = require('homey');

class ButtonDevice extends Homey.Device {
  async onInit() {
    this.log('Button device has been initialized');

    // Register Flow card triggers
    this.pushedTrigger = this.homey.flow.getDeviceTriggerCard('button_pushed');
    this.heldTrigger = this.homey.flow.getDeviceTriggerCard('button_held');
    this.releasedTrigger = this.homey.flow.getDeviceTriggerCard('button_released');
    this.doubleTappedTrigger = this.homey.flow.getDeviceTriggerCard('button_double_tapped');

    // Set up polling for device state (though buttons are primarily event-driven)
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
        // Check for numberOfButtons attribute
        const numButtonsAttr = deviceInfo.attributes.find(attr => attr.name === 'numberOfButtons');
        if (numButtonsAttr) {
          this.setStoreValue('numberOfButtons', parseInt(numButtonsAttr.currentValue));
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle webhook attribute updates from Hubitat
   */
  async handleAttributeUpdate(attribute, value) {
    this.log(`Button event: ${attribute} = ${value}`);

    // Hubitat button attributes: pushed, held, released, doubleTapped
    // Value is the button number
    const buttonNumber = parseInt(value) || 1;
    
    // Tokens for Flow cards (displayed to user)
    const tokens = { button: buttonNumber };
    
    // State for Flow condition cards (used in condition matching)
    const state = { button: buttonNumber };

    try {
      if (attribute === 'pushed') {
        this.log(`Triggering button_pushed Flow with button ${buttonNumber}`);
        await this.pushedTrigger.trigger(this, tokens, state)
          .catch(err => this.error('Error in pushedTrigger:', err));
      } else if (attribute === 'held') {
        this.log(`Triggering button_held Flow with button ${buttonNumber}`);
        await this.heldTrigger.trigger(this, tokens, state)
          .catch(err => this.error('Error in heldTrigger:', err));
      } else if (attribute === 'released') {
        this.log(`Triggering button_released Flow with button ${buttonNumber}`);
        await this.releasedTrigger.trigger(this, tokens, state)
          .catch(err => this.error('Error in releasedTrigger:', err));
      } else if (attribute === 'doubleTapped') {
        this.log(`Triggering button_double_tapped Flow with button ${buttonNumber}`);
        await this.doubleTappedTrigger.trigger(this, tokens, state)
          .catch(err => this.error('Error in doubleTappedTrigger:', err));
      }
      this.log(`Flow trigger completed for ${attribute}`);
    } catch (error) {
      this.error(`Error triggering Flow card for ${attribute}:`, error);
    }
  }
}

module.exports = ButtonDevice;
