
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

const tephra = require('../');

const packets = {
  auth: {
    mangled: readFileSync(__dirname + '/packets/mikrotik/mangled.auth.packet'),
    healthy: readFileSync(__dirname + '/packets/mikrotik/auth.packet')
  },
  acct: {
    mangled: readFileSync(__dirname + '/packets/mikrotik/mangled.acct.packet'),
    healthy: readFileSync(__dirname + '/packets/mikrotik/acct.packet'),
    start: readFileSync(__dirname + '/packets/mikrotik/Accounting_Request_Start.packet'),
    interimUpdate: readFileSync(__dirname + '/packets/mikrotik/Accounting_Request_Interim_Update.packet'),
    stop: readFileSync(__dirname + '/packets/mikrotik/Accounting_Request_Stop.packet')
  }
};

describe('tephra', function() {

  describe('lifecycle', function() {

    var server;

    it('#constructor should throw if required arguments are missing', function() {
      expect(function() {
        new tephra();
      }).to.throw(/Missing SHARED_SECRET/);
    });

    it('#constructor should throw if vendor_id is missing when dictionary_path is present', function() {
      expect(function() {
        new tephra(
          'c33kr1t',
          1812, 1813, 1814,
          `${__dirname}/dictionaries/mikrotik.dictionary`
        );
      }).to.throw(/argument VENDOR_ID/);
    });

    server = new tephra(
      'c33kr1t',
      1812, 1813, 1814,
      `${__dirname}/dictionaries/mikrotik.dictionary`,
      14988
    );

    it('sockets should bind', function(done) {
      server.bind(done);
    });

    it('sockets should unbind', function(done) {
      server.unbind(done);
    });

  });

  describe('auth, acct and coa packet transmission', function() {

    var server;

    beforeEach(function(done) {
      server = new tephra(
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
      send('auth', packets.auth.mangled);
    });

    it('should emit Access-Request object on receiving packet', function(done) {
      server.on('Access-Request', done.bind(done, null));
      send('auth', packets.auth.healthy);
    });

    it('should handle invalid acct request packets gracefully', function(done) {
      server.on('error#decode#acct', done.bind(done, null));
      send('acct', packets.acct.mangled);
    });

    it('should emit Accounting-Request-Accounting-On object on receiving packet', function(done) {
      server.on('Accounting-Request-Accounting-On', done.bind(done, null));
      send('acct', packets.acct.healthy);
    });

    it('should send a response correctly for accounting-requests', function(done) {
      server.on('Accounting-Request-Accounting-On', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done);
      });
      send('acct', packets.acct.healthy);
    });

    it('should send a response correctly for accounting interim packets', function(done) {
      server.on('Accounting-Request-Interim-Update', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done);
      });
      send('acct', packets.acct.interimUpdate);
    });

    it('should send a response correctly for access-requests', function(done) {
      server.on('Access-Request', function(request, rinfo) {
        server.respond('auth', request, 'Access-Accept', rinfo, [], [], done);
      });
      send('auth', packets.auth.healthy);
    });

    it('#send throw if supplied non-string type', function() {
      expect(server.send).to.throw(/string argument type/);
    });

    it('#send yield an error if supplied non-array type', function(done) {
      server.send('acct', 0, {address: '0.0.0.0', port: 12345}, null, null, function(err) {
        expect(err).to.be.ok;
        done();
      });
    });

    it('#respond throw if supplied non-string type', function() {
      expect(server.respond).to.throw(/string argument type/);
    });

    it('#respond yield an error if supplied non-array type', function(done) {
      // type, packet, code, rinfo, attributes, vendorAttributes, onResponded
      server.respond('acct', null, 0, {address: '0.0.0.0', port: 12345}, null, null, function(err) {
        expect(err).to.be.ok;
        done();
      })
    });

  });

});
