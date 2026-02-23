'use strict';

const Homey = require('homey');

class WindowCoveringDevice extends Homey.Device {
  async onInit() {
    this.log('Window covering device has been initialized');

    // Register capability listeners
    this.registerCapabilityListener('windowcoverings_state', this.onCapabilityWindowCoveringsState.bind(this));
    this.registerCapabilityListener('windowcoverings_set', this.onCapabilityWindowCoveringsSet.bind(this));

    // Track last command time
    this.lastCommandTime = {};

    // Set up polling
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

  /**
   * Handle window coverings state capability (up/idle/down)
   */
  async onCapabilityWindowCoveringsState(value) {
    const deviceId = this.getData().id;
    
    try {
      if (value === 'up') {
        await this.homey.app.sendDeviceCommand(deviceId, 'open');
        this.log(`Opening window covering ${deviceId}`);
      } else if (value === 'down') {
        await this.homey.app.sendDeviceCommand(deviceId, 'close');
        this.log(`Closing window covering ${deviceId}`);
      } else if (value === 'idle') {
        // Stop command - Hubitat uses stopPositionChange
        await this.homey.app.sendDeviceCommand(deviceId, 'stopPositionChange');
        this.log(`Stopping window covering ${deviceId}`);
      }
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting window covering state:', error);
      throw error;
    }
  }

  /**
   * Handle window coverings set capability (position 0-1)
   */
  async onCapabilityWindowCoveringsSet(value) {
    const deviceId = this.getData().id;
    const position = Math.round(value * 100);
    
    this.lastCommandTime.position = Date.now();

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setPosition', [position]);
      this.log(`Set window covering ${deviceId} position to ${position}%`);
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('Error setting window covering position:', error);
      throw error;
    }
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        // Update position
        const positionAttr = deviceInfo.attributes.find(attr => attr.name === 'position');
        if (positionAttr) {
          const position = parseInt(positionAttr.currentValue) / 100;
          await this.setCapabilityValue('windowcoverings_set', position);
        }

        // Update state based on windowShade attribute
        const shadeAttr = deviceInfo.attributes.find(attr => attr.name === 'windowShade');
        if (shadeAttr) {
          const state = shadeAttr.currentValue;
          if (state === 'open' || state === 'opening') {
            await this.setCapabilityValue('windowcoverings_state', 'up');
          } else if (state === 'closed' || state === 'closing') {
            await this.setCapabilityValue('windowcoverings_state', 'down');
          } else {
            await this.setCapabilityValue('windowcoverings_state', 'idle');
          }
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle webhook attribute updates
   */
  async handleAttributeUpdate(attribute, value) {
    const now = Date.now();
    const cooldown = 2000;

    if (attribute === 'position') {
      if (this.lastCommandTime.position && (now - this.lastCommandTime.position) < cooldown) {
        this.log('Ignoring position webhook (recently commanded)');
        return;
      }
      const position = parseInt(value) / 100;
      await this.setCapabilityValue('windowcoverings_set', position);
    } else if (attribute === 'windowShade') {
      if (value === 'open' || value === 'opening') {
        await this.setCapabilityValue('windowcoverings_state', 'up');
      } else if (value === 'closed' || value === 'closing') {
        await this.setCapabilityValue('windowcoverings_state', 'down');
      } else {
        await this.setCapabilityValue('windowcoverings_state', 'idle');
      }
    }
  }
}

module.exports = WindowCoveringDevice;
