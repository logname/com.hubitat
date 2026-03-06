'use strict';

const Homey = require('homey');
const http = require('http');

class HubitatElevationApp extends Homey.App {

  async onInit() {
    const manifest = this.homey.manifest;
    this.version = manifest.version; // Store for later use
    
    this.log(`========================================`);
    this.log(`Hubitat Elevation initialized`);
    this.log(`Build: ${this.version}`);
    this.log(`========================================`);
    
    // Initialize log storage
    this.logs = [];
    this.maxLogs = 100;
    
    // Initialize settings
    this.hubitatIP = this.homey.settings.get('hubitat_ip');
    this.makerAPIToken = this.homey.settings.get('maker_api_token');
    this.appId = this.homey.settings.get('app_id');
    
    // Set up settings listener
    this.homey.settings.on('set', (key) => {
      if (key === 'hubitat_ip') {
        this.hubitatIP = this.homey.settings.get('hubitat_ip');
      } else if (key === 'maker_api_token') {
        this.makerAPIToken = this.homey.settings.get('maker_api_token');
      } else if (key === 'app_id') {
        this.appId = this.homey.settings.get('app_id');
      }
    });

    // Log version to settings page logs
    this.addLog(`========================================`);
    this.addLog(`Hubitat Elevation initialized`);
    this.addLog(`Build: ${this.version}`);
    this.addLog(`========================================`);
    this.addLog('App initialized successfully');
  }

  /**
   * Add log entry for settings page
   */
  addLog(message) {
    // Only log if logging is enabled
    const loggingEnabled = this.homey.settings.get('enable_logging');
    if (loggingEnabled === false) {
      return;
    }
    
    const timestamp = new Date().toISOString().substr(11, 12);
    const logEntry = `[${timestamp}] ${message}`;
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Add version header every 20 log entries to help with debugging
    const currentLogs = this.logs.join('\n');
    const logWithVersion = `========================================\nHubitat Elevation Build: ${this.version}\n========================================\n${currentLogs}`;
    
    this.homey.settings.set('app_logs', logWithVersion);
    
    // Also log normally for debugging
    this.log(message);
  }

  /**
   * Get the base URL for Maker API
   */
  getBaseUrl() {
    this.log(`Settings - IP: ${this.hubitatIP}, App ID: ${this.appId}, Token: ${this.makerAPIToken ? 'SET' : 'NOT SET'}`);
    
    if (!this.hubitatIP || !this.appId || !this.makerAPIToken) {
      const missing = [];
      if (!this.hubitatIP) missing.push('IP address');
      if (!this.appId) missing.push('App ID');
      if (!this.makerAPIToken) missing.push('Access Token');
      throw new Error(`Hubitat settings not configured. Missing: ${missing.join(', ')}`);
    }
    return `http://${this.hubitatIP}/apps/api/${this.appId}`;
  }

  /**
   * Make a request to Hubitat Maker API
   */
  async makeRequest(endpoint, params = {}) {
    try {
      const url = new URL(`${this.getBaseUrl()}${endpoint}`);
      url.searchParams.append('access_token', this.makerAPIToken);
      
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      this.log(`Making request to: ${url.toString().replace(this.makerAPIToken, 'XXXXX')}`);

      return new Promise((resolve, reject) => {
        http.get(url.toString(), (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            this.log(`Response status: ${res.statusCode}`);
            this.log(`Response data: ${data.substring(0, 200)}`);
            
            try {
              if (res.statusCode !== 200) {
                reject(new Error(`Hubitat API error: ${res.statusCode} ${res.statusMessage}`));
              } else {
                const json = JSON.parse(data);
                resolve(json);
              }
            } catch (error) {
              this.error(`Failed to parse response: ${error.message}`);
              this.error(`Raw data: ${data}`);
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          });
        }).on('error', (error) => {
          this.error(`HTTP request failed: ${error.message}`);
          reject(new Error(`HTTP request failed: ${error.message}`));
        });
      });
    } catch (error) {
      this.error(`makeRequest error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all devices from Hubitat
   */
  async getDevices() {
    return await this.makeRequest('/devices/all');
  }

  /**
   * Get specific device details
   */
  async getDevice(deviceId) {
    return await this.makeRequest(`/devices/${deviceId}`);
  }

  /**
   * Send a command to a device
   */
  async sendDeviceCommand(deviceId, command, parameters = []) {
    this.addLog(`>>> Sending command to device ${deviceId}: ${command} ${JSON.stringify(parameters)}`);
    
    // Hubitat Maker API expects parameters in the URL path, not as query params
    // Correct: /devices/123/setLevel/75
    // Wrong: /devices/123/setLevel?param1=75
    let endpoint = `/devices/${deviceId}/${command}`;
    if (parameters.length > 0) {
      endpoint += '/' + parameters.join('/');
    }
    
    this.addLog(`Endpoint: ${endpoint}`);

    try {
      const result = await this.makeRequest(endpoint, {});
      this.addLog(`<<< Command successful`);
      return result;
    } catch (error) {
      this.addLog(`!!! Command failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Hubitat device to Homey driver
   */
  mapDeviceToDriver(hubitatDevice) {
    const capabilities = hubitatDevice.capabilities || [];
    const attributes = hubitatDevice.attributes || [];
    const deviceType = (hubitatDevice.type || '').toLowerCase();
    const deviceName = (hubitatDevice.label || hubitatDevice.name || '').toLowerCase();
    
    // Build list of compatible drivers for this device
    const compatibleDrivers = [];
    
    // Check most specific device types first
    if (capabilities.includes('Thermostat')) {
      compatibleDrivers.push('thermostat');
    }
    if (capabilities.includes('Lock')) {
      compatibleDrivers.push('lock');
    }
    if (capabilities.includes('FanControl') || capabilities.includes('FanSpeed')) {
      compatibleDrivers.push('fan');
    }
    if (capabilities.includes('WindowShade')) {
      compatibleDrivers.push('window-covering');
    }
    if (capabilities.includes('PushableButton') || capabilities.includes('HoldableButton') || capabilities.includes('DoubleTapableButton')) {
      compatibleDrivers.push('button');
    }
    if (capabilities.includes('ColorControl')) {
      compatibleDrivers.push('color-light');
    }
    if (capabilities.includes('ColorTemperature') && !capabilities.includes('ColorControl')) {
      compatibleDrivers.push('color-temp-light');
    }
    if (capabilities.includes('Valve') || deviceType.includes('valve') || deviceName.includes('valve')) {
      compatibleDrivers.push('valve');
    }
    if (capabilities.includes('SwitchLevel')) {
      compatibleDrivers.push('dimmer');
    }
    if (capabilities.includes('Switch')) {
      compatibleDrivers.push('switch');
    }
    
    // Energy management devices (PowerMeter and/or EnergyMeter capabilities)
    // These are typically monitoring-only devices without control capabilities
    if ((capabilities.includes('PowerMeter') || capabilities.includes('EnergyMeter')) && 
        !capabilities.includes('Switch') && !capabilities.includes('SwitchLevel')) {
      compatibleDrivers.push('energy-manager');
    }
    
    if (capabilities.includes('ContactSensor')) {
      compatibleDrivers.push('contact-sensor');
    }
    if (capabilities.includes('MotionSensor')) {
      compatibleDrivers.push('motion-sensor');
    }
    if (capabilities.includes('PresenceSensor')) {
      compatibleDrivers.push('presence-sensor');
    }
    if (capabilities.includes('WaterSensor')) {
      compatibleDrivers.push('leak-sensor');
    }
    if (capabilities.includes('TemperatureMeasurement')) {
      compatibleDrivers.push('temperature-sensor');
    }
    
    // Return array of compatible drivers (or null if none found)
    return compatibleDrivers.length > 0 ? compatibleDrivers : null;
  }

  /**
   * Get devices for a specific driver
   */
  async getDevicesForDriver(driverId) {
    const allDevices = await this.getDevices();
    
    return allDevices.filter(device => {
      const compatibleDrivers = this.mapDeviceToDriver(device);
      // Check if this driver is in the list of compatible drivers
      return compatibleDrivers && compatibleDrivers.includes(driverId);
    }).map(device => ({
      name: device.label || device.name,
      data: {
        id: device.id.toString()
      }
      // Don't specify capabilities here - they come from the driver definition in app.json
    }));
  }

  /**
   * Test connection to Hubitat
   */
  async testConnection() {
    try {
      await this.getDevices();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = HubitatElevationApp;
