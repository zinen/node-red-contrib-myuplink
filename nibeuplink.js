module.exports = function (RED) {
  'use strict'
  const NibeFetcher = require('nibe-fetcher')
  function nibeuplinkConfig (n) {
    RED.nodes.createNode(this, n)
    const node = this
    node.nibeFetcher = new NibeFetcher({
      clientId: n.clientId,
      clientSecret: n.clientSecret,
      authCode: n.authCode,
      systemId: n.systemId,
      autoStart: false
    })
    node.clientId = n.clientId
    node.authCodeDone = n.authCode? true : false
    node.getNibeData = async function() {
      const node = this
      return new Promise(function(resolve, reject) {
        node.nibeFetcher.start()
        node.nibeFetcher.on('data', (data) => {
          const payload = {}
          data.forEach(element => {
            if (typeof element.key  == "number") {
              return
            } 
            element.key = String(element.key) + "_" + element.unit.replace("°C", "degreeC").replace("%", "percentage").replace("/", "_pr_")
            if (payload[element.categoryId]) {
              payload[element.categoryId][element.key] = element.value || element.rawValue
            } else {
              payload[element.categoryId] = {
                [element.key]: element.value || element.rawValue
              }
            }
          })
          node.nibeFetcher.stop()
          resolve(payload)
        })
        node.nibeFetcher.on('error', (data) => {
          node.nibeFetcher.stop()
          node.nibeFetcher.clear()
          reject(data)
        })
      });
    }
  }
  RED.nodes.registerType('nibeuplink-config', nibeuplinkConfig)

  function nibeuplink (config) {
    RED.nodes.createNode(this, config)
    const node = this
    node.on('input', async function (msg, send, done) {
      node.server = RED.nodes.getNode(config.server)
      try {
        if (!node.server.authCodeDone) {
          node.warn(`Open webpage to get OAuth code https://api.nibeuplink.com/oauth/authorize?response_type=code&client_id=${node.server.clientId}&scope=READSYSTEM&redirect_uri=http%3A%2F%2Fz0mt3c.github.io%2Fnibe.html&state=init`)
          done()
          return
        }
        msg.payload = await node.server.getNibeData()
        send(msg)
        done()
      } catch (error) {
        done(error.message)
      }
    })
  }
  RED.nodes.registerType('nibeuplink', nibeuplink)
}
