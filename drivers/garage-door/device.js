'use strict';

const Homey = require('homey');

class GarageDoorDevice extends Homey.Device {

  async onInit() {
    this.log('Garage Door device has been initialized');

    // Track last command time to prevent race conditions
    this.lastCommandTime = {};

    // Register capability listener for garage door control
    this.registerCapabilityListener('garagedoor_closed', this.onCapabilityGarageDoorClosed.bind(this));

    // Set up polling for device state
    this.pollInterval = setInterval(() => {
      this.pollDeviceState();
    }, 30000); // Poll every 30 seconds

    // Initial state fetch
    await this.pollDeviceState();
  }

  async onCapabilityGarageDoorClosed(value) {
    const deviceId = this.getData().id;
    const command = value ? 'close' : 'open';
    
    this.log(`[GARAGE] Command triggered: device ${deviceId}, command ${command}, value ${value}`);
    
    try {
      // Track command time for cooldown
      this.lastCommandTime['door'] = Date.now();
      
      const result = await this.homey.app.sendDeviceCommand(deviceId, command);
      this.log(`[GARAGE] ✓ Command ${command} successful:`, result);
      
      // Poll immediately after command to get updated state quickly
      setTimeout(() => this.pollDeviceState(), 500);
      
      return value;
      
    } catch (error) {
      this.error(`[GARAGE] ✗ Error controlling garage door:`, error);
      this.error(`[GARAGE] Error details:`, error.message);
      throw new Error(`Failed to control garage door: ${error.message}`);
    }
  }

  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  /**
   * Poll device state from Hubitat
   */
  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        // Hubitat door attribute: "open", "closed", "opening", "closing", "unknown"
        const doorAttr = deviceInfo.attributes.find(attr => attr.name === 'door');
        if (doorAttr) {
          const isClosed = doorAttr.currentValue === 'closed';
          await this.setCapabilityValue('garagedoor_closed', isClosed);
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  /**
   * Handle attribute updates from webhook
   */
  async handleAttributeUpdate(attribute, value) {
    this.log(`=== handleAttributeUpdate called ===`);
    this.log(`Attribute: "${attribute}", Value: "${value}"`);

    try {
      if (attribute === 'door') {
        // Ignore webhook updates for 5 seconds after sending a command to prevent race conditions
        const cooldownPeriod = 5000;
        const lastCommand = this.lastCommandTime['door'] || 0;
        const timeSinceCommand = Date.now() - lastCommand;
        
        if (timeSinceCommand < cooldownPeriod) {
          this.log(`⏸ Ignoring door webhook (${timeSinceCommand}ms since command, cooldown: ${cooldownPeriod}ms)`);
          return;
        }
        
        const isClosed = value === 'closed';
        this.log(`Setting garagedoor_closed to: ${isClosed} (door state: ${value})`);
        await this.setCapabilityValue('garagedoor_closed', isClosed);
        this.log(`✓ garagedoor_closed updated to ${isClosed}`);
      } else {
        this.log(`⚠ Unknown attribute: ${attribute}`);
      }
    } catch (error) {
      this.error(`✗ Error in handleAttributeUpdate:`, error);
    }
  }
}

module.exports = GarageDoorDevice;
