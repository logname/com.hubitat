'use strict';

module.exports = {
  async getTestConnection({ homey }) {
    return await homey.app.testConnection();
  },

  async getWebhook({ homey, query }) {
    homey.app.addLog(`GET webhook called - Query: ${JSON.stringify(query)}`);
    return await processWebhook(homey, query);
  },

  async postWebhook({ homey, body, query }) {
    homey.app.addLog(`POST webhook called`);
    homey.app.addLog(`Query: ${JSON.stringify(query)}`);
    homey.app.addLog(`Body: ${JSON.stringify(body)}`);
    homey.app.addLog(`Body type: ${typeof body}`);
    
    // Hubitat sends JSON in body with content.deviceId, content.name, content.value
    let data;
    
    if (body.content) {
      // Hubitat wraps data in 'content' field
      data = body.content;
      homey.app.addLog(`Using body.content: ${JSON.stringify(data)}`);
    } else if (Object.keys(query).length > 0) {
      // Fallback to query params
      data = query;
      homey.app.addLog(`Using query params: ${JSON.stringify(data)}`);
    } else {
      // Try body directly
      data = body;
      homey.app.addLog(`Using body directly: ${JSON.stringify(data)}`);
    }
    
    return await processWebhook(homey, data);
  }
};

async function processWebhook(homey, data) {
  homey.app.addLog(`=== WEBHOOK: ${data.name}=${data.value} for device ${data.deviceId}`);
  
  // Store last webhook time for debugging
  homey.settings.set('last_webhook_time', new Date().toISOString());
  homey.settings.set('last_webhook_data', JSON.stringify(data));
  
  try {
    const deviceId = data.deviceId;
    const attributeName = data.name;
    const attributeValue = data.value;
    const displayName = data.displayName;
    
    if (!deviceId || !attributeName || attributeValue === undefined) {
      homey.app.addLog(`!!! Invalid webhook data`);
      return { success: false, error: 'Missing parameters', received: data };
    }

    // Find and update device
    const drivers = homey.drivers.getDrivers();
    let deviceFound = false;
    
    for (const driverId in drivers) {
      const driver = drivers[driverId];
      const devices = driver.getDevices();
      
      for (const device of devices) {
        if (device.getData().id === deviceId.toString()) {
          homey.app.addLog(`>>> Calling handleAttributeUpdate on ${device.getName()}`);
          await device.handleAttributeUpdate(attributeName, attributeValue);
          homey.app.addLog(`<<< Update complete`);
          deviceFound = true;
          break;
        }
      }
      if (deviceFound) break;
    }
    
    if (!deviceFound) {
      homey.app.addLog(`!!! Device ${deviceId} not found in Homey`);
    }
    
    return { success: true, deviceFound, processed: { deviceId, attributeName, attributeValue } };
  } catch (error) {
    homey.app.addLog(`!!! Webhook error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
