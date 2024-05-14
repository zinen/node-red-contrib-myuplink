module.exports = function (RED) {
  'use strict'
  const MyUplinkClient = require('myuplink-fetcher')
  const path = require('node:path')
  const fs = require('node:fs/promises')
  function NibeuplinkConfigNode (n) {
    RED.nodes.createNode(this, n)
    const node = this
    try {
      node.myUplinkClient = new MyUplinkClient({
        debug: 2, // TODO: remove this
        clientId: node.credentials.clientId,
        clientSecret: node.credentials.clientSecret,
        systemId: node.credentials.systemId || undefined,
        authCode: n.authCode || '',
        scope: 'READSYSTEM WRITESYSTEM offline_access',
        sessionStore: path.join(__dirname, '.session' + node.id + '.json')
      })
    } catch (error) {
      node.error('myUplink config error: ' + error.message || error)
    }
    this.on('close', async function (removed, done) {
      // This node is being restarted or disabled/deleted
      try {
        if (removed) {
          // This node has been disabled/deleted
          if (node.myUplinkClient) node.myUplinkClient.clearSession()
          fs.unlink(path.join(__dirname, '.session' + node.id + '.json')).catch()
        }
      } catch (_) { }
      done()
    })
  }
  RED.nodes.registerType('myuplink-config', NibeuplinkConfigNode, {
    credentials: {
      clientId: { type: 'text' },
      clientSecret: { type: 'password' },
      systemId: { type: 'text' }
    }
  })

  function NibeuplinkNode (config) {
    RED.nodes.createNode(this, config)
    const node = this
    this.config = config
    node.on('input', async function (msg, send, done) {
      node.server = RED.nodes.getNode(config.server)
      try {
        if (!node.server || !node.server.myUplinkClient) {
          throw new Error('Unknown config error')
        }
        node.status({ fill: '', text: 'Requesting data' })
        if (!node.server.myUplinkClient.options.systemId) await node.server.myUplinkClient.getSystems()
        const systemId = node.server.myUplinkClient.options.systemId
        const deviceId = node.server.myUplinkClient.options.deviceId || 0
        if (msg.authCode && typeof msg.authCode === 'string') node.server.myUplinkClient.options.systemId = String()
        // Note that outputChoice might be undefined
        if (!node.config.outputChoice || node.config.outputChoice === 'default') {
          msg.payload = await node.server.myUplinkClient.getAllParameters()
        } else if (node.config.outputChoice === 'GET-aid-mode') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/devices/${deviceId}/aidMode`)
        } else if (node.config.outputChoice === 'GET-devices') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/devices/${deviceId}`)
        } else if (node.config.outputChoice === 'GET-smart-home-categories') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/devices/${deviceId}/smart-home-categories`)
        } else if (node.config.outputChoice === 'GET-smart-home-zones') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/devices/${deviceId}/smart-home-zones`)
        } else if (node.config.outputChoice === 'PATCH-devices-points') {
          msg.payload = await node.server.myUplinkClient.patchURLPath(`/v2/devices/${deviceId}/points`, msg.payload)
        } else if (node.config.outputChoice === 'PATCH-devices-zones') {
          msg.payload = await node.server.myUplinkClient.patchURLPath(`/v2/devices/${deviceId}/points`, msg.payload)
        } else if (node.config.outputChoice === 'GET-devices-points') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v3/devices/${deviceId}/points`)
        } else if (node.config.outputChoice === 'GET-alarms') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/systems/${systemId}/notifications`)
        } else if (node.config.outputChoice === 'systems') {
          msg.payload = await node.server.myUplinkClient.getURLPath('/v2/systems/me')
        } else if (node.config.outputChoice === 'PUT-smart-home-mode') {
          const acceptedValues = ['Default', 'Normal', 'Away', 'Vacation', 'Home']
          if (!acceptedValues.includes(msg.payload)) throw new Error(`payload must string with content of either: ${acceptedValues.join(' or ')}.`)
          msg.payload = await node.server.myUplinkClient.putURLPath(`/v2/systems/${systemId}/smart-home-mode`, { smartHomeMode: msg.payload })
        } else if (node.config.outputChoice === 'GET-smart-home-mode') {
          msg.payload = await node.server.myUplinkClient.getURLPath(`/v2/systems/${systemId}/smart-home-mode`)
        } else {
          throw new Error('Error understanding configured output choice')
        }
        node.status({ fill: '', text: '' })
        send(msg)
        done()
      } catch (error) {
        if (error.message && error.message.includes('Need new authCode.')) {
          // Normal to hit this on first request or when session expires
          node.status({ fill: '', text: 'Waiting for auth code. See warning in console for url link' })
        } else {
          node.status({ fill: 'red', text: error.message || error })
        }
        done(error.message || error)
      }
    })
    this.on('close', function () {
      node.server = RED.nodes.getNode(config.server)
      if (node.server && node.server.myUplinkClient) {
        // Safety measure as a backup to keep the queue ready
        node.server.myUplinkClient.requestQueueActive = false
        node.server.myUplinkClient.requestQueue = 0
      }
    })
  }
  RED.nodes.registerType('myuplink', NibeuplinkNode)
}
