'use strict';

const Homey = require('homey');

class EnergyManagerDevice extends Homey.Device {

  async onInit() {
    this.log('Energy Manager device has been initialized');

    // No capability listeners needed - this is a read-only sensor

    // Set up polling for device state
    this.pollInterval = setInterval(() => {
      this.pollDeviceState();
    }, 30000); // Poll every 30 seconds

    // Initial state fetch
    await this.pollDeviceState();
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
        // Update power measurement
        if (this.hasCapability('measure_power')) {
          const powerAttr = deviceInfo.attributes.find(attr => attr.name === 'power');
          if (powerAttr && powerAttr.currentValue !== null) {
            await this.setCapabilityValue('measure_power', parseFloat(powerAttr.currentValue));
          }
        }
        
        // Update energy measurement
        if (this.hasCapability('meter_power')) {
          const energyAttr = deviceInfo.attributes.find(attr => attr.name === 'energy');
          if (energyAttr && energyAttr.currentValue !== null) {
            await this.setCapabilityValue('meter_power', parseFloat(energyAttr.currentValue));
          }
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
      if (attribute === 'power' && this.hasCapability('measure_power')) {
        const powerValue = parseFloat(value);
        this.log(`Setting measure_power to: ${powerValue}W`);
        await this.setCapabilityValue('measure_power', powerValue);
        this.log(`✓ measure_power updated to ${powerValue}W`);
      } else if (attribute === 'energy' && this.hasCapability('meter_power')) {
        const energyValue = parseFloat(value);
        this.log(`Setting meter_power to: ${energyValue}kWh`);
        await this.setCapabilityValue('meter_power', energyValue);
        this.log(`✓ meter_power updated to ${energyValue}kWh`);
      } else {
        this.log(`⚠ Unknown or unsupported attribute: ${attribute}`);
      }
    } catch (error) {
      this.error(`✗ Error in handleAttributeUpdate:`, error);
    }
  }
}

module.exports = EnergyManagerDevice;
