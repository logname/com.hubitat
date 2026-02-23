'use strict';

const Homey = require('homey');

class ThermostatDevice extends Homey.Device {
  async onInit() {
    this.log('Thermostat device has been initialized');

    this.registerCapabilityListener('target_temperature', this.onCapabilityTargetTemperature.bind(this));
    this.registerCapabilityListener('thermostat_mode', this.onCapabilityThermostatMode.bind(this));

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

  async onCapabilityTargetTemperature(value) {
    const deviceId = this.getData().id;

    try {
      // Check current mode to use appropriate command
      const mode = this.getCapabilityValue('thermostat_mode');
      
      if (mode === 'heat') {
        await this.homey.app.sendDeviceCommand(deviceId, 'setHeatingSetpoint', [value]);
      } else if (mode === 'cool') {
        await this.homey.app.sendDeviceCommand(deviceId, 'setCoolingSetpoint', [value]);
      } else {
        // For auto mode, set both
        await this.homey.app.sendDeviceCommand(deviceId, 'setHeatingSetpoint', [value - 1]);
        await this.homey.app.sendDeviceCommand(deviceId, 'setCoolingSetpoint', [value + 1]);
      }
      
      this.log(`Set thermostat ${deviceId} target temperature to ${value}`);
      
      return value;
    } catch (error) {
      this.error('Error setting target temperature:', error);
      throw new Error('Failed to set target temperature');
    }
  }

  async onCapabilityThermostatMode(value) {
    const deviceId = this.getData().id;

    try {
      await this.homey.app.sendDeviceCommand(deviceId, 'setThermostatMode', [value]);
      this.log(`Set thermostat ${deviceId} mode to ${value}`);
      return value;
    } catch (error) {
      this.error('Error setting thermostat mode:', error);
      throw new Error('Failed to set thermostat mode');
    }
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        const tempAttr = deviceInfo.attributes.find(attr => attr.name === 'temperature');
        if (tempAttr) {
          await this.setCapabilityValue('measure_temperature', parseFloat(tempAttr.currentValue));
        }

        const modeAttr = deviceInfo.attributes.find(attr => attr.name === 'thermostatMode');
        if (modeAttr) {
          await this.setCapabilityValue('thermostat_mode', modeAttr.currentValue);
        }

        const heatingSetpointAttr = deviceInfo.attributes.find(attr => attr.name === 'heatingSetpoint');
        const coolingSetpointAttr = deviceInfo.attributes.find(attr => attr.name === 'coolingSetpoint');
        
        const mode = this.getCapabilityValue('thermostat_mode');
        if (mode === 'heat' && heatingSetpointAttr) {
          await this.setCapabilityValue('target_temperature', parseFloat(heatingSetpointAttr.currentValue));
        } else if (mode === 'cool' && coolingSetpointAttr) {
          await this.setCapabilityValue('target_temperature', parseFloat(coolingSetpointAttr.currentValue));
        } else if (heatingSetpointAttr && coolingSetpointAttr) {
          // For auto mode, use average
          const avg = (parseFloat(heatingSetpointAttr.currentValue) + parseFloat(coolingSetpointAttr.currentValue)) / 2;
          await this.setCapabilityValue('target_temperature', avg);
        }
      }
    } catch (error) {
      this.error('Error polling device state:', error);
    }
  }

  async handleAttributeUpdate(attribute, value) {
    if (attribute === 'temperature') {
      await this.setCapabilityValue('measure_temperature', parseFloat(value));
    } else if (attribute === 'thermostatMode') {
      await this.setCapabilityValue('thermostat_mode', value);
    } else if (attribute === 'heatingSetpoint' || attribute === 'coolingSetpoint') {
      // Re-poll to get the correct target temperature based on mode
      await this.pollDeviceState();
    }
  }
}

module.exports = ThermostatDevice;
