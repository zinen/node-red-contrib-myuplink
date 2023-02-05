module.exports = function (RED) {
  'use strict'
  const NibeuplinkClient = require('nibe-fetcher-promise')
  const Path = require('path')
  const fs = require('node:fs/promises')
  function nibeuplinkConfigNode(n) {
    RED.nodes.createNode(this, n)
    const node = this
    try {
      node.nibeuplinkClient = new NibeuplinkClient({
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
  RED.nodes.registerType('nibeuplink-config', nibeuplinkConfigNode, {
    credentials: {
      clientId: { type: "text" },
      clientSecret: { type: "password" },
      systemId: { type: "text" }
    }
  })

  function nibeuplinkNode(config) {
    RED.nodes.createNode(this, config)
    const node = this
    node.on('input', async function (msg, send, done) {
      node.server = RED.nodes.getNode(config.server)
      if (!node.server || !node.server.nibeuplinkClient) {
        node.status({ fill: 'red', text: 'Unknown config error' })
        done('Unknown config error')
        return
      }
      try {
        node.status({ fill: '', text: 'Requesting data' })
        msg.payload = await node.server.nibeuplinkClient.getAllParameters()
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
  RED.nodes.registerType('nibeuplink', nibeuplinkNode)
}
