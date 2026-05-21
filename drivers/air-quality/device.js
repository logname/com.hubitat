'use strict';

const Homey = require('homey');

class AirQualityDevice extends Homey.Device {

  async onInit() {
    this.log('Air Quality Sensor device has been initialized');

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
        // Temperature
        if (this.hasCapability('measure_temperature')) {
          const tempAttr = deviceInfo.attributes.find(attr => attr.name === 'temperature');
          if (tempAttr && tempAttr.currentValue !== null) {
            await this.setCapabilityValue('measure_temperature', parseFloat(tempAttr.currentValue));
          }
        }

        // Humidity
        if (this.hasCapability('measure_humidity')) {
          const humidityAttr = deviceInfo.attributes.find(attr => attr.name === 'humidity');
          if (humidityAttr && humidityAttr.currentValue !== null) {
            await this.setCapabilityValue('measure_humidity', parseFloat(humidityAttr.currentValue));
          }
        }

        // Carbon Dioxide (CO2)
        if (this.hasCapability('measure_co2')) {
          const co2Attr = deviceInfo.attributes.find(attr => attr.name === 'carbonDioxide');
          if (co2Attr && co2Attr.currentValue !== null) {
            await this.setCapabilityValue('measure_co2', parseFloat(co2Attr.currentValue));
          }
        }

        // PM2.5
        if (this.hasCapability('measure_pm25')) {
          const pm25Attr = deviceInfo.attributes.find(attr => attr.name === 'pm25');
          if (pm25Attr && pm25Attr.currentValue !== null) {
            await this.setCapabilityValue('measure_pm25', parseFloat(pm25Attr.currentValue));
          }
        }

        // PM10
        if (this.hasCapability('measure_pm10')) {
          const pm10Attr = deviceInfo.attributes.find(attr => attr.name === 'pm10');
          if (pm10Attr && pm10Attr.currentValue !== null) {
            await this.setCapabilityValue('measure_pm10', parseFloat(pm10Attr.currentValue));
          }
        }

        // VOC (Volatile Organic Compounds)
        if (this.hasCapability('measure_tvoc')) {
          const vocAttr = deviceInfo.attributes.find(attr => attr.name === 'voc' || attr.name === 'tvoc');
          if (vocAttr && vocAttr.currentValue !== null) {
            await this.setCapabilityValue('measure_tvoc', parseFloat(vocAttr.currentValue));
          }
        }

        // Air Quality Index
        if (this.hasCapability('measure_aqi')) {
          const aqiAttr = deviceInfo.attributes.find(attr => attr.name === 'airQualityIndex');
          if (aqiAttr && aqiAttr.currentValue !== null) {
            await this.setCapabilityValue('measure_aqi', parseFloat(aqiAttr.currentValue));
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
      if (attribute === 'temperature' && this.hasCapability('measure_temperature')) {
        const tempValue = parseFloat(value);
        this.log(`Setting measure_temperature to: ${tempValue}°C`);
        await this.setCapabilityValue('measure_temperature', tempValue);
        this.log(`✓ measure_temperature updated to ${tempValue}°C`);
      } else if (attribute === 'humidity' && this.hasCapability('measure_humidity')) {
        const humidityValue = parseFloat(value);
        this.log(`Setting measure_humidity to: ${humidityValue}%`);
        await this.setCapabilityValue('measure_humidity', humidityValue);
        this.log(`✓ measure_humidity updated to ${humidityValue}%`);
      } else if (attribute === 'carbonDioxide' && this.hasCapability('measure_co2')) {
        const co2Value = parseFloat(value);
        this.log(`Setting measure_co2 to: ${co2Value} ppm`);
        await this.setCapabilityValue('measure_co2', co2Value);
        this.log(`✓ measure_co2 updated to ${co2Value} ppm`);
      } else if (attribute === 'pm25' && this.hasCapability('measure_pm25')) {
        const pm25Value = parseFloat(value);
        this.log(`Setting measure_pm25 to: ${pm25Value} µg/m³`);
        await this.setCapabilityValue('measure_pm25', pm25Value);
        this.log(`✓ measure_pm25 updated to ${pm25Value} µg/m³`);
      } else if (attribute === 'pm10' && this.hasCapability('measure_pm10')) {
        const pm10Value = parseFloat(value);
        this.log(`Setting measure_pm10 to: ${pm10Value} µg/m³`);
        await this.setCapabilityValue('measure_pm10', pm10Value);
        this.log(`✓ measure_pm10 updated to ${pm10Value} µg/m³`);
      } else if ((attribute === 'voc' || attribute === 'tvoc') && this.hasCapability('measure_tvoc')) {
        const vocValue = parseFloat(value);
        this.log(`Setting measure_tvoc to: ${vocValue} µg/m³`);
        await this.setCapabilityValue('measure_tvoc', vocValue);
        this.log(`✓ measure_tvoc updated to ${vocValue} µg/m³`);
      } else if (attribute === 'airQualityIndex' && this.hasCapability('measure_aqi')) {
        const aqiValue = parseFloat(value);
        this.log(`Setting measure_aqi to: ${aqiValue}`);
        await this.setCapabilityValue('measure_aqi', aqiValue);
        this.log(`✓ measure_aqi updated to ${aqiValue}`);
      } else {
        this.log(`⚠ Unknown or unsupported attribute: ${attribute}`);
      }
    } catch (error) {
      this.error(`✗ Error in handleAttributeUpdate:`, error);
    }
  }
}

module.exports = AirQualityDevice;
