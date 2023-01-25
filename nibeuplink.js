module.exports = function (RED) {
  'use strict'
  const NibeuplinkClient = require('nibe-fetcher-promise')
  function nibeuplinkConfigNode(n) {
    RED.nodes.createNode(this, n)
    const node = this
    node.nibeuplinkClient = new NibeuplinkClient({
      clientId: node.credentials.clientId,
      clientSecret: node.credentials.clientSecret,
      systemId: node.credentials.systemId || undefined,
      authCode: n.authCode || ""
    })
    node.clientId = node.credentials.clientId
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
      try {
        node.status({ fill: '', text: 'Requesting data' })
        msg.payload = await node.server.nibeuplinkClient.getAllParameters()
        node.status({ fill: '', text: '' })
        send(msg)
        done()
      } catch (error) {
        if (error.message.includes('Need new authCode.')) {
          // Normal to hit this on first request or when session expires
          node.status({ fill: '', text: 'Waiting for auth code. See warning in console for url link' })
        } else {
          node.status({ fill: 'red', text: error.message })
        }
        done(error.message)
      }
    })
    this.on('close', function() {
        node.server = RED.nodes.getNode(config.server)
        // Safety measure as a backup to keep the queue ready
        node.server.nibeuplinkClient.requestQueueActive = false
        node.server.nibeuplinkClient.requestQueue = 0
  });
  }
  RED.nodes.registerType('nibeuplink', nibeuplinkNode)
}
