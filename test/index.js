
'use strict';

// ensures this library doesn't pass messages to itself
function send(type, packet, done) {
  var socket = dgram.createSocket('udp4');
  socket.bind(9000, socket.send.bind(
    socket,
    packet,
    0,
    packet.length,
    type === 'acct' ? 1813 : 1812,
    '0.0.0.0',
    socket.close.bind(socket, done || function() {})
  ));
}

const readFileSync = require('fs').readFileSync;
const join = require('path').join;
const dgram = require('dgram');

const expect = require('chai').expect;

const RadiusServer = require('../');

const packets = {
  auth: {
    mangled: readFileSync(join(__dirname, '/packets/mangled.auth.packet')),
    healthy: readFileSync(join(__dirname, '/packets/auth.packet'))
  },
  acct: {
    mangled: readFileSync(join(__dirname, '/packets/mangled.acct.packet')),
    healthy: readFileSync(join(__dirname, '/packets/acct.packet')),
    start: readFileSync(join(__dirname, '/packets/Accounting-Request-Start.packet')),
    interimUpdate: readFileSync(join(__dirname, '/packets/Accounting-Request-Interim-Update.packet')),
    stop: readFileSync(join(__dirname, '/packets/Accounting-Request-Stop.packet'))
  }
};

describe('RadiusServer', function() {

  describe('auth, acct and coa sockets', function() {

    var server = new RadiusServer(
      'c33kr1t',
      1812, 1813, 1814,
      `${__dirname}/dictionaries/mikrotik.dictionary`,
      14988
    );

    it('should bind', function(done) {
      server.bind(done);
    });

    it('should unbind', function(done) {
      server.unbind(done);
    });

  });

  describe('auth, acct and coa packet transmission', function() {

    var server;

    beforeEach(function(done) {
      server = new RadiusServer(
        'c33kr1t',
        1812, 1813, 1814,
        `${__dirname}/dictionaries/mikrotik.dictionary`,
        14988
      );
      server.bind(done);
    });

    afterEach(function(done) {
      server.unbind(done);
    });

    it('should handle invalid auth request packets gracefully', function(done) {
      server.on('error#decode#auth', done.bind(done, null));
      process.nextTick(send.bind(send, 'auth', packets.auth.mangled));
    });

    it('should emit Access-Request object on receiving packet', function(done) {
      server.on('Access-Request', done.bind(done, null));
      process.nextTick(send.bind(send, 'auth', packets.auth.healthy));
    });

    it('should handle invalid acct request packets gracefully', function(done) {
      server.on('error#decode#acct', done.bind(done, null));
      process.nextTick(send.bind(send, 'acct', packets.acct.mangled));
    });

    it('should emit Accounting-Request-Accounting-On object on receiving packet', function(done) {
      server.on('Accounting-Request-Accounting-On', done.bind(done, null));
      process.nextTick(send.bind(send, 'acct', packets.acct.healthy));
    });

    it('should send a response correctly for accounting-requests', function(done) {
      server.on('Accounting-Request-Accounting-On', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done);
      });
      process.nextTick(send.bind(send, 'acct', packets.acct.healthy));
    });

    it('should send a response correctly for accounting interim packets', function(done) {
      server.on('Accounting-Request-Interim-Update', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done);
      });
      process.nextTick(send.bind(send, 'acct', packets.acct.interimUpdate));
    });

    it('should send a response correctly for access-requests', function(done) {
      server.on('Access-Request', function(request, rinfo) {
        server.respond('auth', request, 'Access-Accept', rinfo, [], [], done);
      });
      process.nextTick(send.bind(send, 'auth', packets.auth.healthy));
    });

  });

});
