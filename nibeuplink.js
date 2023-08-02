module.exports = function (RED) {
  'use strict'
  const NibeuplinkClient = require('nibe-fetcher-promise')
  const Path = require('path')
  const fs = require('node:fs/promises')
  function NibeuplinkConfigNode(n) {
    RED.nodes.createNode(this, n)
    const node = this
    try {
      node.nibeuplinkClient = new NibeuplinkClient({
        // debug: 2, // TODO: remove this
        clientId: node.credentials.clientId,
        clientSecret: node.credentials.clientSecret,
        systemId: node.credentials.systemId || undefined,
        authCode: n.authCode || "",
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
      } catch (_) {
        //
      }
      done()
    })
  }
  RED.nodes.registerType('nibeuplink-config', NibeuplinkConfigNode, {
    credentials: {
      clientId: { type: "text" },
      clientSecret: { type: "password" },
      systemId: { type: "text" }
    }
  })

  function NibeuplinkNode(config) {
    RED.nodes.createNode(this, config)
    const node = this
    this.config = config
    node.on('input', async function (msg, send, done) {
      node.server = RED.nodes.getNode(config.server)
      if (!node.server || !node.server.nibeuplinkClient) {
        node.status({ fill: 'red', text: 'Unknown config error' })
        done('Unknown config error')
        return
      }
      try {
        node.status({ fill: '', text: 'Requesting data' })
        // Note that outputChoice might be undefined if this node was installed in version 0.2.0 or before
        if (!node.config.outputChoice || node.config.outputChoice == 'default') {
          if (msg.systemUnitId) {
            node.warn('Input of msg.systemUnitId is ignored when using default output choice')
          }
          msg.payload = await node.server.nibeuplinkClient.getAllParameters()
        } else if (node.config.outputChoice == 'msg.category') {
          if (!node.server.nibeuplinkClient.options.systemId) await node.server.nibeuplinkClient.getSystems()
          const systemID = node.server.nibeuplinkClient.options.systemId
          const getCategory = msg.category || ""
          const query = { parameters: true, systemUnitId: msg.systemUnitId || node.config.systemUnitId || 0 }
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/serviceinfo/categories/${getCategory}`, query)
        } else if (node.config.outputChoice == 'systemStatus') {
          if (!node.server.nibeuplinkClient.options.systemId) await node.server.nibeuplinkClient.getSystems()
          const systemID = node.server.nibeuplinkClient.options.systemId
          const systemUnitId = msg.systemUnitId || node.config.systemUnitId || 0
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/status/systemUnit/${systemUnitId}`)
        } else if (node.config.outputChoice == 'parametersGet') {
          if (!node.server.nibeuplinkClient.options.systemId) await node.server.nibeuplinkClient.getSystems()
          const systemID = node.server.nibeuplinkClient.options.systemId
          msg.payload = await node.server.nibeuplinkClient.getURLPath(`api/v1/systems/${systemID}/parameters`)
        } else if (node.config.outputChoice == 'parametersPut') {
          if (!msg.payload) throw new Error(`payload was empty. It must not be.`)
          if (!node.server.nibeuplinkClient.options.systemId) await node.server.nibeuplinkClient.getSystems()
          const systemID = node.server.nibeuplinkClient.options.systemId
          msg.payload = await node.server.nibeuplinkClient.postURLPath(`api/v1/systems/${systemID}/parameters`,msg.payload)
        } else {
          done('Error understanding configured Output choice')
          return
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
        done(error.message)
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
