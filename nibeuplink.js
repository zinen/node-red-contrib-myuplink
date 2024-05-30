module.exports = function (RED) {
  'use strict'
  const NibeuplinkClient = require('nibe-fetcher-promise')
  const Path = require('path')
  const fs = require('node:fs/promises')
  function NibeuplinkConfigNode (n) {
    RED.nodes.createNode(this, n)
    const node = this
    try {
      node.nibeuplinkClient = new NibeuplinkClient({
        // debug: 2, // TODO: remove this
        clientId: node.credentials.clientId,
        clientSecret: node.credentials.clientSecret,
        systemId: node.credentials.systemId || undefined,
        authCode: n.authCode || '',
        scope: 'READSYSTEM WRITESYSTEM',
        sessionStore: Path.join(__dirname, '.session' + node.id + '.json')
      })
    } catch (error) {
      node.error('nibe config error: ' + error.message || error)
    }
    this.on('close', async function (removed, done) {
      // This node is being restarted or disabled/deleted
      try {
        if (removed) {
          // This node has been disabled/deleted
          if (node.nibeuplinkClient) node.nibeuplinkClient.clearSession()
          fs.unlink(Path.join(__dirname, '.session' + node.id + '.json')).catch()
        }
      } catch (_) { }
      done()
    })
  }
  RED.nodes.registerType('nibeuplink-config', NibeuplinkConfigNode, {
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
        if (!node.server || !node.server.nibeuplinkClient) {
          throw new Error('Unknown config error')
        }
        if (msg.authCode && typeof msg.authCode === 'string') {
          node.server.nibeuplinkClient.options.authCode = String(msg.authCode)
          await node.server.nibeuplinkClient.getNewAccessToken()
          node.warn('Nibe uplink one time auth code used to update token successful.')
        }
        node.status({ fill: '', text: 'Requesting data' })
        if (!node.server.nibeuplinkClient.options.systemId) await node.server.nibeuplinkClient.getSystems()
        const systemID = node.server.nibeuplinkClient.options.systemId
        const systemUnitId = msg.systemUnitId || node.config.systemUnitId || 0
        // Note that outputChoice might be undefined if this node was installed in version 0.2.0 or before
        if (!node.config.outputChoice || node.config.outputChoice === 'default') {
          msg.payload = await node.server.nibeuplinkClient.getAllParameters()
        } else if (node.config.outputChoice === 'statusSystem') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/status/system`)
        } else if (node.config.outputChoice === 'statusSystemUnit') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/status/systemUnit/${systemUnitId}`)
        } else if (node.config.outputChoice === 'system') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}`)
        } else if (node.config.outputChoice === 'software') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/software`)
        } else if (node.config.outputChoice === 'config') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/config`)
        } else if (node.config.outputChoice === 'units') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/units`)
        } else if (node.config.outputChoice === 'notifications') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/notifications`)
        } else if (node.config.outputChoice === 'parametersGet') {
          if (!msg.payload || typeof msg.payload !== 'object') throw new Error('payload must be an object.')
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/parameters`, msg.payload)
        } else if (node.config.outputChoice === 'parametersPut') {
          if (!msg.payload || typeof msg.payload !== 'object') throw new Error('payload must be an object.')
          msg.payload = await node.server.nibeuplinkClient.putURLPath(`api/v1/systems/${systemID}/parameters`, msg.payload)
        } else if (node.config.outputChoice === 'premium') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/premium`)
        } else if (node.config.outputChoice === 'categories') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/serviceinfo/categories/${msg.payload || ''}`, { parameters: true, systemUnitId })
        } else if (node.config.outputChoice === 'modeGet') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/smarthome/mode`)
        } else if (node.config.outputChoice === 'modePut') {
          if (!msg.payload || typeof msg.payload !== 'object') throw new Error('payload must be an object.')
          msg.payload = await node.server.nibeuplinkClient.putURLPath(`api/v1/systems/${systemID}/smarthome/mode`, msg.payload)
        } else if (node.config.outputChoice === 'thermostatsGet') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/smarthome/thermostats`, msg.payload)
        } else if (node.config.outputChoice === 'thermostatsPost') {
          if (!msg.payload || typeof msg.payload !== 'object') throw new Error('payload must be an object.')
          msg.payload = await node.server.nibeuplinkClient.postURLPath(`api/v1/systems/${systemID}/smarthome/thermostats`, msg.payload)
        } else if (node.config.outputChoice === 'systems') {
          msg.payload = await node.server.nibeuplinkClient.getURLPath('api/v1/systems/')
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
      if (node.server && node.server.nibeuplinkClient) {
        // Safety measure as a backup to keep the queue ready
        node.server.nibeuplinkClient.requestQueueActive = false
        node.server.nibeuplinkClient.requestQueue = 0
      }
    })
  }
  RED.nodes.registerType('nibeuplink', NibeuplinkNode)
}
