
'use strict'

// ensures this library doesn't pass messages to itself
function send(type, packet, done) {
  var socket = dgram.createSocket('udp4')
  socket.bind(function() {
    socket.send(
      packet,
      0,
      packet.length,
      type === 'acct' ? 1813 : 1812,
      '0.0.0.0',
      socket.close.bind(socket, done || function() {})
    )
  })
}

var readFileSync = require('fs').readFileSync
var join = require('path').join
var dgram = require('dgram')

var expect = require('chai').expect

var tephra = require('../')

var packets = {
  auth: {
    mangled: readFileSync('./test/packets/mikrotik/mangled.auth.packet'),
    healthy: readFileSync('./test/packets/mikrotik/auth.packet')
  },
  acct: {
    mangled: readFileSync('./test/packets/mikrotik/mangled.acct.packet'),
    healthy: readFileSync('./test/packets/mikrotik/acct.packet'),
    start: readFileSync('./test/packets/mikrotik/Accounting_Request_Start.packet'),
    interim_update: readFileSync('./test/packets/mikrotik/Accounting_Request_Interim_Update.packet'),
    stop: readFileSync('./test/packets/mikrotik/Accounting_Request_Stop.packet')
  }
}

describe('tephra', function() {

  describe('lifecycle', function() {

    var server

    it('#constructor should throw if required arguments are missing', function() {
      expect(function() {
        new tephra()
      }).to.throw(/Missing SHARED_SECRET/)
    })

    it('#constructor should throw if vendor_id is missing when dictionary_path is present', function() {
      expect(function() {
        new tephra(
          'c33kr1t',
          1812,
          1813,
          1814,
          './test/dictionaries/mikrotik.dictionary'
        )
      }).to.throw(/argument VENDOR_ID/)
    })

    server = new tephra(
      'c33kr1t',
      1812,
      1813,
      1814,
      './test/dictionaries/mikrotik.dictionary',
      14988
    )

    it('sockets should bind', function(done) {
      server.bind(done)
    })

    it('sockets should unbind', function(done) {
      server.unbind(done)
    })

  })

  describe('auth, acct and coa packet transmission', function() {

    var server

    beforeEach(function(done) {
      server = new tephra(
        'c33kr1t',
        1812,
        1813,
        1814,
        './test/dictionaries/mikrotik.dictionary',
        14988
      )
      server.bind(done)
    })

    afterEach(function(done) {
      server.unbind(done)
    })

    it('should handle invalid auth request packets gracefully', function(done) {
      server.on('error#decode#auth', done.bind(done, null))
      send('auth', packets.auth.mangled)
    })

    it('should reject irrelevant packet types directed at the auth socket', function(done) {
      server.on('error#decode#auth', done.bind(done, null))

      // send an ACCOUNTING packet to the AUTHENTICATION socket
      send('auth', packets.acct.healthy)
    })

    it('should emit Access-Request object on receiving packet', function(done) {
      server.on('Access-Request', done.bind(done, null))
      send('auth', packets.auth.healthy)
    })

    it('should handle invalid acct request packets gracefully', function(done) {
      server.on('error#decode#acct', done.bind(done, null))
      send('acct', packets.acct.mangled)
    })

    it('should reject irrelevant packet types directed at the acct socket', function(done) {
      server.on('error#decode#acct', done.bind(done, null))

      // send an AUTHENTICATION packet to the ACCOUNTING socket
      send('acct', packets.auth.healthy)
    })

    it('should send a response correctly for accounting packets', function(done) {
      server.on('Accounting-Request-Interim-Update', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done)
      })
      send('acct', packets.acct.interim_update)
    })

    it('should send a response correctly for accounting packets using the event handler responder function', function(done) {
      server.on('Accounting-Request-Interim-Update', function(request, rinfo, respond) {
        respond([], [], done)
      })
      send('acct', packets.acct.interim_update)
    })

    it('should send a response correctly for access-request packets', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        server.respond('auth', request, 'Access-Accept', rinfo, [], [], done)
      })
      send('auth', packets.auth.healthy)
    })

    it('should send a response correctly for access-request packets using the event handler responder function', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        accept([], [], done)
      })
      send('auth', packets.auth.healthy)
    })

    it('#send throw if supplied non-string type', function() {
      expect(server.send).to.throw(/string argument type/)
    })

    it('#send yield an error if supplied non-array type', function(done) {
      server.send(
        'acct',
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          return err ? done() : (
            done(new Error('assertion failed: expected `err` to be truthy'))
          )
        }
      )
    })

    it('#respond throw if supplied non-string type', function() {
      expect(server.respond).to.throw(/string argument type/)
    })

    it('#respond yield an error if no packet is given', function(done) {
      server.respond(
        'acct',
        null,
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          return err ? done() : (
            done(new Error('assertion failed: expected `err` to be truthy'))
          )
        }
      )
    })

  })

})
