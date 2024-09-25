'use strict'
/* global describe, beforeEach, afterEach, it,  */
// eslint-disable-next-line no-unused-vars
const should = require('should')
const helper = require('node-red-node-test-helper')
// const Path = require('path')
const fs = require('node:fs/promises')
const testNode = require('../myuplink.js')

async function dotEnvMini () {
  let data = await fs.readFile('.env', { encoding: 'utf8' })
  data = data.split(/\r?\n/)
  for (const line of data) {
    if (line.trim()[0] === '#') continue
    const [key, value] = line.split('=')
    if (value === undefined) continue
    process.env[key.trim()] = value.trim()
  }
}

async function start (params) {
  await dotEnvMini()
}

start()

describe('myuplink Node', function () {
  beforeEach(function (done) {
    helper.startServer(done)
  })

  afterEach(function (done) {
    helper.unload()
    helper.stopServer(done)
  })

  it('should be loaded', function (done) {
    const flow = [{ id: 'n1', type: 'myuplink', name: 'myuplink-set-name' }]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      try {
        n1.should.have.property('name', 'myuplink-set-name')
        done()
      } catch (err) {
        done(err)
      }
    })
  })
  it('should throw error after input if no config', function (done) {
    // this.skip()
    const flow = [{ id: 'n1', type: 'myuplink' }]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      n1.on('call:error', function (msg) {
        // console.log(msg)
        try {
          msg.should.have.property('firstArg', 'Unknown config error')
          done()
        } catch (error) {
          console.error(`Error: ${error.message}`)
        }
      })
      n1.receive({ payload: '' })
    })
  })
  it('should throw error after input if empty config', function (done) {
    // this.skip()
    const flow = [{ id: 'n1', type: 'myuplink', server: 'config1', name: 'lala-ta' }, { id: 'config1', type: 'myuplink-config' }]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      const config1 = helper.getNode('config1')

      n1.on('call:error', function (msg) {
        try {
          msg.should.have.property('firstArg', 'Unknown config error')
        } catch (error) {
          console.error(`Error: ${error.message}`)
        }
      })
      config1.on('call:error', function (msg) {
        done()
      })

      n1.receive({ payload: '' })
    })
  })
  it('env should be defined', function (done) {
    process.env.should.have.property('UPLINK_CLIENT_ID')
    process.env.should.have.property('UPLINK_CLIENT_SECRET')

    done()
  })

  it('should accept auth code as input but throw error due to invalid authcode', function (done) {
    // this.skip()
    const flow = [{ id: 'n1', type: 'myuplink', server: 'config1', name: 'lala-ta' },
      { id: 'config1', type: 'myuplink-config' }]
    const credentials = { config1: { clientId: process.env.UPLINK_CLIENT_ID, clientSecret: process.env.UPLINK_CLIENT_SECRET } }
    helper.load(testNode, flow, credentials, function () {
      const n1 = helper.getNode('n1')

      n1.on('call:error', function (msg) {
        try {
          msg.should.have.property('firstArg')
          msg.firstArg.should.containEql('The one time use of authCode might be used already')
          done()
        } catch (error) {
          console.error(`Error: ${error.message}`)
        }
      })

      n1.receive({ payload: '', authCode: 'TestingAuthCodeInput' })
    })
  })
})
