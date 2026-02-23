'use strict';

const Homey = require('homey');

class FanDevice extends Homey.Device {
  async onInit() {
    this.log('Fan device has been initialized');

    // Track last command time
    this.lastCommandTime = {};

    // Override setCapabilityValue for fan_speed to log all changes
    this._originalSetCapabilityValue = this.setCapabilityValue.bind(this);
    this.setCapabilityValue = async (capabilityId, value) => {
      if (capabilityId === 'fan_speed') {
        const stack = new Error().stack;
        const caller = stack.split('\n')[2].trim();
        this.log(`[FAN_SPEED CHANGE] Setting fan_speed to ${value} (${Math.round(value*100)}%)`);
        this.log(`[FAN_SPEED CHANGE] Called from: ${caller}`);
      }
      return this._originalSetCapabilityValue(capabilityId, value);
    };

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    
    // Check if device has fan speed capability
    if (this.hasCapability('fan_speed')) {
      this.registerCapabilityListener('fan_speed', this.onCapabilityFanSpeed.bind(this));
    }

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
   * Handle onoff capability
   */
  async onCapabilityOnoff(value) {
    const deviceId = this.getData().id;
    
    this.log(`[FAN ONOFF] Toggling fan ${deviceId} to ${value ? 'ON' : 'OFF'}`);
    
    // Set command time BEFORE sending to prevent webhook echo
    this.lastCommandTime.speed = Date.now();
    this.log(`[FAN ONOFF] Set lastCommandTime.speed = ${this.lastCommandTime.speed}`);

    try {
      if (value) {
        // Turn on - restore last speed from webhook, or use 'medium' as fallback
        const lastSpeedName = await this.getStoreValue('lastSpeedName') || 'medium';
        this.log(`[FAN ONOFF] Turning ON, lastSpeedName = "${lastSpeedName}"`);
        
        await this.homey.app.sendDeviceCommand(deviceId, 'setSpeed', [lastSpeedName]);
        this.log(`[FAN ONOFF] Command sent: setSpeed ["${lastSpeedName}"]`);
        
        // Update onoff capability
        await this.setCapabilityValue('onoff', true);
        this.log(`[FAN ONOFF] Set onoff capability to true`);
        
        // Restore fan_speed slider position
        // Convert speed name back to percentage
        const speedMap = {
          'low': 0.2,
          'medium-low': 0.4,
          'medium': 0.6,
          'medium-high': 0.8,
          'high': 1.0
        };
        const speedValue = speedMap[lastSpeedName] || 0.6;
        await this.setCapabilityValue('fan_speed', speedValue);
        this.log(`[FAN ONOFF] Set fan_speed to ${speedValue} (${Math.round(speedValue*100)}%)`);
      } else {
        // Turn off - set slider to 0
        this.log(`[FAN ONOFF] Turning OFF`);
        
        await this.homey.app.sendDeviceCommand(deviceId, 'setSpeed', ['off']);
        this.log(`[FAN ONOFF] Command sent: setSpeed ["off"]`);
        
        // Update onoff capability
        await this.setCapabilityValue('onoff', false);
        this.log(`[FAN ONOFF] Set onoff capability to false`);
        
        // Set slider to 0
        await this.setCapabilityValue('fan_speed', 0);
        this.log(`[FAN ONOFF] Set fan_speed to 0 (0%)`);
      }
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('[FAN ONOFF] Error:', error);
      throw error;
    }
  }

  /**
   * Handle fan speed capability (0-1 continuous or stepped)
   * Convert to Hubitat named speeds: low, medium-low, medium, medium-high, high
   */
  async onCapabilityFanSpeed(value) {
    const deviceId = this.getData().id;
    const percentage = Math.round(value * 100);
    
    // Convert percentage to named speed for Hubitat
    let speedName;
    if (percentage === 0) {
      speedName = 'off';
    } else if (percentage <= 20) {
      speedName = 'low';
    } else if (percentage <= 40) {
      speedName = 'medium-low';
    } else if (percentage <= 60) {
      speedName = 'medium';
    } else if (percentage <= 80) {
      speedName = 'medium-high';
    } else {
      speedName = 'high';
    }
    
    this.log(`[FAN SPEED] Changing fan ${deviceId} from ${percentage}% to "${speedName}"`);
    this.lastCommandTime.speed = Date.now();
    this.log(`[FAN SPEED] Set lastCommandTime.speed = ${this.lastCommandTime.speed}`);

    try {
      // Save speed name for later restoration (if not 'off')
      if (speedName !== 'off') {
        await this.setStoreValue('lastSpeedName', speedName);
        this.log(`[FAN SPEED] Saved lastSpeedName = "${speedName}"`);
      }
      
      // Send named speed instead of percentage
      await this.homey.app.sendDeviceCommand(deviceId, 'setSpeed', [speedName]);
      this.log(`[FAN SPEED] Command sent: setSpeed ["${speedName}"]`);
      
      // Update onoff capability based on speed
      // If speed > 0, turn on. If speed = 0, turn off.
      const shouldBeOn = percentage > 0;
      await this.setCapabilityValue('onoff', shouldBeOn);
      this.log(`[FAN SPEED] Set onoff to ${shouldBeOn}`);
      
      setTimeout(() => this.pollDeviceState(), 500);
      return value;
    } catch (error) {
      this.error('[FAN SPEED] Error:', error);
      throw error;
    }
  }

  async pollDeviceState() {
    const deviceId = this.getData().id;

    try {
      const deviceInfo = await this.homey.app.getDevice(deviceId);
      
      if (deviceInfo.attributes) {
        // Update onoff state
        const switchAttr = deviceInfo.attributes.find(attr => attr.name === 'switch');
        if (switchAttr) {
          await this.setCapabilityValue('onoff', switchAttr.currentValue === 'on');
        }

        // Update fan speed if supported
        if (this.hasCapability('fan_speed')) {
          const speedAttr = deviceInfo.attributes.find(attr => attr.name === 'speed');
          if (speedAttr) {
            let speedValue = 0;
            const speedCurrent = speedAttr.currentValue;
            
            // Handle both percentage (0-100) and named speeds
            if (typeof speedCurrent === 'number') {
              speedValue = speedCurrent / 100;
            } else if (typeof speedCurrent === 'string') {
              // Map named speeds to percentages
              const speedMap = {
                'off': 0,
                'low': 0.2,
                'medium-low': 0.4,
                'medium': 0.6,
                'medium-high': 0.8,
                'high': 1.0,
                'auto': 0.5
              };
              speedValue = speedMap[speedCurrent.toLowerCase()];
              if (speedValue === undefined) {
                speedValue = 0.5; // Only default to 50% if speed is unknown
              }
            }
            
            await this.setCapabilityValue('fan_speed', Math.max(0, Math.min(1, speedValue)));
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
    
    this.log(`[FAN WEBHOOK] Received: ${attribute} = ${value}`);

    if (attribute === 'switch') {
      this.log(`[FAN WEBHOOK] Switch attribute: ${value}`);
      // Only update onoff if speed is 0 or if no speed capability
      const currentSpeed = this.hasCapability('fan_speed') ? this.getCapabilityValue('fan_speed') : null;
      this.log(`[FAN WEBHOOK] Current speed: ${currentSpeed}`);
      
      if (currentSpeed === null || currentSpeed === 0 || value === 'off') {
        this.log(`[FAN WEBHOOK] Updating onoff to: ${value === 'on'}`);
        await this.setCapabilityValue('onoff', value === 'on');
      } else {
        this.log(`[FAN WEBHOOK] Not updating onoff (speed=${currentSpeed})`);
      }
    } else if (attribute === 'speed' && this.hasCapability('fan_speed')) {
      this.log(`[FAN WEBHOOK] Speed attribute: ${value}`);
      
      // Check cooldown - ignore if we just sent a command
      const timeSinceCommand = this.lastCommandTime.speed ? (now - this.lastCommandTime.speed) : 99999;
      this.log(`[FAN WEBHOOK] Time since last command: ${timeSinceCommand}ms (cooldown: ${cooldown}ms)`);
      
      if (this.lastCommandTime.speed && timeSinceCommand < cooldown) {
        this.log(`[FAN WEBHOOK] IGNORING - within cooldown period`);
        return;
      }
      
      let speedValue = 0;
      
      // Handle numeric percentage values
      if (typeof value === 'number') {
        speedValue = value / 100;
        this.log(`[FAN WEBHOOK] Numeric speed: ${value}% → ${speedValue}`);
      } 
      // Handle string named speeds
      else if (typeof value === 'string') {
        const speedMap = {
          'off': 0,
          'low': 0.2,
          'medium-low': 0.4,
          'medium': 0.6,
          'medium-high': 0.8,
          'high': 1.0,
          'on': 0.5,  // Generic "on" - default to medium
          'auto': 0.5
        };
        speedValue = speedMap[value.toLowerCase()];
        this.log(`[FAN WEBHOOK] Named speed: "${value}" → ${speedValue}`);
        
        // Save the actual speed name for later restoration
        if (value !== 'off' && value !== 'on' && value !== 'auto') {
          await this.setStoreValue('lastSpeedName', value);
          this.log(`[FAN WEBHOOK] Saved lastSpeedName = "${value}"`);
        }
        
        // If unknown named speed, don't update to avoid loops
        if (speedValue === undefined) {
          this.log(`[FAN WEBHOOK] UNKNOWN named speed: ${value}, not updating`);
          return;
        }
      }
      
      // Get current value
      const currentValue = this.getCapabilityValue('fan_speed') || 0;
      this.log(`[FAN WEBHOOK] Current capability value: ${currentValue} (${Math.round(currentValue*100)}%)`);
      
      // Only update if difference is significant (>5% to avoid rounding loops)
      const diff = Math.abs(currentValue - speedValue);
      this.log(`[FAN WEBHOOK] Difference: ${diff.toFixed(3)} (${(diff*100).toFixed(1)}%)`);
      
      if (diff > 0.05) {
        this.log(`[FAN WEBHOOK] UPDATING speed from ${Math.round(currentValue*100)}% to ${Math.round(speedValue*100)}%`);
        await this.setCapabilityValue('fan_speed', Math.max(0, Math.min(1, speedValue)));
        
        // Update onoff based on speed
        const newOnoff = speedValue > 0;
        this.log(`[FAN WEBHOOK] UPDATING onoff to: ${newOnoff}`);
        await this.setCapabilityValue('onoff', newOnoff);
      } else {
        this.log(`[FAN WEBHOOK] NOT UPDATING - difference too small (tolerance: 5%)`);
      }
    }
  }
}

module.exports = FanDevice;
