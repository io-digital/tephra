
'use strict'

/**
 * invokes freeradius's radius client with given packet contents
 * which helps us ensure that our server is as close to
 * rfc-compliant as possible or at least compatible with
 * existing radius implementations
 */
function radclient(
  address,
  packet_type,
  shared_secret,
  packet,
  on_exec
) {
  // TODO add options for flooding
  var cmd = `echo "${packet}" | ${process.env.TRAVIS ? '/usr/bin/' : './test/'}radclient -n 1 -x ${address} ${packet_type} ${shared_secret}`
  try {
    cp.exec(cmd, function(err, stdout, stderr) {
      if (err) return on_exec(err)
      return on_exec()
    })
  } catch (e) {
    return on_exec(e)
  }
}

var cp = require('child_process')

var expect = require('chai').expect

var tephra = require('../')

var test_secret = 'shared_secret' // shared secret for all test cases

// example packet contents
var auth_request = 'User-Name=foo,User-Password=bar'
var acct_interim = 'Acct-Status-Type=Interim-Update'
var acct_start = 'Acct-Status-Type=Start'
var acct_stop = 'Acct-Status-Type=Stop'
var coa_disconnect = 'Acct-Session-Id=foo,User-Name=bar,NAS-IP-Address=10.0.0.1'

describe('tephra', function() {

  describe('lifecycle', function() {

    var server

    it('#constructor should throw if required arguments are missing', function() {
      expect(function() {
        new tephra
      }).to.throw(/Missing SHARED_SECRET/)
    })

    it('#constructor should throw if vendor_id is missing when dictionary_path is present', function() {
      expect(function() {
        new tephra(
          test_secret,
          1812,
          1813,
          1814,
          './test/dictionaries/telkom.dictionary'
        )
      }).to.throw(/argument VENDOR_ID/)
    })

    server = new tephra(
      test_secret,
      1812,
      1813,
      1814
    )

    it('sockets should bind', function(done) {
      server.bind(done)
    })

    it('sockets should unbind', function(done) {
      server.unbind(done)
    })

  })

  describe('auth, acct and coa packet transmission', function() {

    var server // one instance set-up and torn down per test case

    beforeEach(function(done) {
      delete require.cache[require.resolve('..')]
      try {
        server = new tephra(
          test_secret,
          1812,
          1813,
          1814
        )
        server.bind(done)
      } catch (e) {
        return done(e)
      }
    })

    afterEach(function(done) {
      server.unbind(done)
    })

    it('should reject irrelevant packet types directed at the auth socket', function(done) {
      server.on('error#decode#auth', done.bind(done, null))

      // send an ACCOUNTING packet to the AUTHENTICATION socket
      radclient(
        'localhost:1812',
        'acct',
        test_secret,
        acct_start,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should emit Access-Request object on receiving packet', function(done) {
      server.on('Access-Request', done.bind(done, null))

      radclient(
        'localhost:1812',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should reject irrelevant packet types directed at the acct socket', function(done) {
      server.on('error#decode#acct', done.bind(done, null))

      // send an AUTHENTICATION packet to the ACCOUNTING socket
      radclient(
        'localhost:1813',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should send a response for accounting packets', function(done) {
      server.on('Accounting-Request', function(request, rinfo) {
        server.respond('acct', request, 'Accounting-Response', rinfo, [], [], done)
      })

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should send a response for accounting packets using the event handler responder function', function(done) {
      server.on('Accounting-Request', function(request, rinfo, respond) {
        respond([], [], done)
      })

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should emit the accounting request status type when receiving an accounting request', function(done) {
      var emissions = 0
      var expected = 2

      function emission_counter() {
        emissions += 1
        if (emissions === expected) return done()
      }

      server.on('Accounting-Request', emission_counter)
      server.on('Accounting-Request-Interim-Update', emission_counter)

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should send a response for access-request packets', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        server.respond('auth', request, 'Access-Accept', rinfo, [], [], done)
      })

      radclient(
        'localhost:1812',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should send a response for access-request packets using the event handler responder function', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        accept([], [], done)
      })
      radclient(
        'localhost:1812',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('should reject irrelevant packet types directed at the coa socket', function(done) {
      server.on('error#decode#coa', done.bind(done, null))

      radclient(
        'localhost:1814',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err) return done(err)
        }
      )
    })

    it('#disconnect should throw if not given rinfo', function() {
      expect(server.disconnect.bind(server, null, [], [])).to.throw(/.* \'address\' .*/)
    })

    it('#disconnect should not throw if given all required arguments', function() {
      expect(server.disconnect.bind(server, {address: '0.0.0.0', port: 12345}, [], [])).to.not.throw
    })

    it('#send should throw if supplied non-string type', function() {
      expect(server.send).to.throw(/string argument type/)
    })

    it('#send should yield an error if supplied non-array type', function(done) {
      server.send(
        'acct',
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          return done(
            err ?
            null :
            new Error(
              'assertion failed: expected `err` to be truthy'
            )
          )
        }
      )
    })

    it('#respond should throw if supplied non-string type', function() {
      expect(server.respond).to.throw(/string argument type/)
    })

    it('#respond should yield an error if no packet is given', function(done) {
      server.respond(
        'acct',
        null,
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          return done(
            err ?
            null :
            new Error(
              'assertion failed: expected `err` to be truthy'
            )
          )
        }
      )
    })

  })

})
