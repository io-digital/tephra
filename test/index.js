
function radclient(
  address,
  packet_type,
  shared_secret,
  packet,
  on_exec
) {
  // TODO add options for flooding
  var cmd = `echo "${packet}" | ${process.env.TEST ? '/usr/bin/' : './test/'}radclient -n 1 -x ${address} ${packet_type} ${shared_secret}`
  cp.exec(cmd, {
    timeout: 1000
  }, function(err, stdout, stderr) {
    return on_exec(err)
  })
}

import cp from 'child_process'

import {expect} from 'chai'

import tephra from '../src/index.js'

// some fixtures
var test_secret = 'shared_secret'
var auth_request = 'User-Name=foo,User-Password=bar'
var acct_interim = 'Acct-Status-Type=Interim-Update'
var acct_start = 'Acct-Status-Type=Start'
var acct_stop = 'Acct-Status-Type=Stop'
var port_permutations = [
  [1812, 1813, 1814],
  [1812, 1813, false],
  [1812, false, 1814],
  [1812, false, false],
  [false, 1813, 1814],
  [false, 1813, false],
  [false, false, 1814]
]

describe('tephra', function() {

  this.timeout(2000)

  describe('constructor', function() {

    it('should throw if required arguments are missing', function() {
      expect(function() {
        new tephra
      }).to.throw(/Missing shared secret/)
    })

    it('should throw an error if no ports are specified', function() {
      expect(function() {
        new tephra({
          shared_secret: test_secret
        })
      }).to.throw(/At least one port is required/)

      expect(function() {
        new tephra({
          shared_secret: test_secret,
          ports: {}
        })
      }).to.throw(/At least one port is required/)
    })

    it('should throw if vendor dictionary arguments are invalid', function() {
      expect(function() {
        new tephra({
          shared_secret: test_secret,
          ports: {
            auth: 1812,
            acct: 1813,
            coa: 1814
          },
          vendor_dictionaries: [
            {}
          ]
        })
      }).to.throw(
        /Vendor dictionary at index 0 is malformed/
      )
    })

    it('should hold an internal representation of vendor dictionaries, mapping vendor name to vendor id', function() {
      var t = new tephra({
        shared_secret: test_secret,
        ports: {
          auth: 1812,
          acct: 1813,
          coa: 1814
        },
        vendor_dictionaries: [
          {
            name: 'telkom',
            path: './test/dictionaries/telkom.dictionary',
            id: 1431
          },
          {
            name: 'mikrotik',
            path: './test/dictionaries/mikrotik.dictionary',
            id: 14988
          }
        ]
      })

      expect(t.vendor_ids.mikrotik).to.equal(14988)
      expect(t.vendor_ids.telkom).to.equal(1431)
    })

  })

  describe('socket permutations (authentication, accounting, change of authorisation)', function() {

    port_permutations.forEach(function(ports, idx) {
      it(`permutation ${idx + 1} (${JSON.stringify(ports)}) should bind and unbind successfully`, function(done) {
        var t = new tephra({
          shared_secret: test_secret,
          ports: {
            auth: ports[0],
            acct: ports[1],
            coa: ports[2]
          }
        })

        t.bind(function() {
          t.unbind(done)
        })
      })
    })
  })

  describe('authentication, accounting, and change of authorisation packet transmission', function() {

    var server

    beforeEach(function(done) {
      try {
        server = new tephra({
          shared_secret: test_secret,
          ports: {
            auth: 1812,
            acct: 1813,
            coa: 1814
          }
        })

        server.bind(done)
      } catch (e) {
        done(e)
        return
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
          if (err && !err.killed) {
            done(err)
            return
          }
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
          if (err && !err.killed) {
            done(err)
            return
          }
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
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should send a response for accounting packets', function(done) {
      server.on('Accounting-Request', function(request, rinfo) {
        server.respond('accounting', request, 'Accounting-Response', rinfo, [], {}, done)
      })

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should send a response for accounting packets using the event handler responder function', function(done) {
      server.on('Accounting-Request', function(request, rinfo, respond) {
        respond([], {}, done)
      })

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should emit the accounting request status type when receiving an accounting request', function(done) {
      var emissions = 0
      var expected = 6

      function emission_counter() {
        emissions += 1
        if (emissions === expected) {
          done()
          return
        }
      }


      // expected to be emitted three times (once per accounting status type)
      server.on('Accounting-Request', emission_counter)

      // each expected to be emitted just once
      server.on('Accounting-Request-Start', emission_counter)
      server.on('Accounting-Request-Interim-Update', emission_counter)
      server.on('Accounting-Request-Stop', emission_counter)

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_start,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_interim,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )

      radclient(
        'localhost:1813',
        'acct',
        test_secret,
        acct_stop,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should send a response for access-request packets', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        server.respond('authentication', request, 'Access-Accept', rinfo, [], {}, done)
      })

      radclient(
        'localhost:1812',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should send a response for access-request packets using the event handler responder function', function(done) {
      server.on('Access-Request', function(request, rinfo, accept, reject) {
        accept([], {}, done)
      })

      radclient(
        'localhost:1812',
        'auth',
        test_secret,
        auth_request,
        function(err) {
          if (err && !err.killed) {
            done(err)
            return
          }
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
          if (err && !err.killed) {
            done(err)
            return
          }
        }
      )
    })

    it('should emit coa ack or nack and disconnect ack or nack when receiving a change of authorisation response', function(done) {
      var emissions = 0
      var expected = 4

      function emission_counter() {
        emissions += 1
        if (emissions === expected) {
          done()
          return
        }
      }

      server.on('CoA-NAK', emission_counter)
      server.on('CoA-ACK', emission_counter)
      server.on('Disconnect-NAK', emission_counter)
      server.on('Disconnect-ACK', emission_counter)

      server.send('authentication', 'CoA-ACK', {port: 1814, address: 'localhost'}, [], {}, function() {})
      server.send('authentication', 'CoA-NAK', {port: 1814, address: 'localhost'}, [], {}, function() {})
      server.send('authentication', 'Disconnect-ACK', {port: 1814, address: 'localhost'}, [], {}, function() {})
      server.send('authentication', 'Disconnect-NAK', {port: 1814, address: 'localhost'}, [], {}, function() {})
    })

    it('should throw when disconnect is not given rinfo', function() {
      expect(
        server.disconnect.bind(server, null, [], {})
      ).to.throw()
    })

    it('should not throw when disconnect is given all required arguments', function() {
      expect(
        server.disconnect.bind(server, {address: '0.0.0.0', port: 12345}, [], {})
      ).to.not.throw
    })

    it('should throw when send is supplied non-string type', function() {
      expect(server.send).to.throw(/string argument type/)
    })

    it('should yield an error when send is supplied non-array type', function(done) {
      server.send(
        'accounting',
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          done(
            err ?
            null :
            new Error(
              'assertion failed: expected `err` to be truthy'
            )
          )
          return
        }
      )
    })

    it('should throw when respond is supplied non-string type', function() {
      expect(server.respond).to.throw(/string argument type/)
    })

    it('should yield an error when respond is not given a packet type', function(done) {
      server.respond(
        'accounting',
        null,
        0,
        {address: '0.0.0.0', port: 12345},
        null,
        null,
        function(err) {
          done(
            err ?
            null :
            new Error(
              'assertion failed: expected `err` to be truthy'
            )
          )
          return
        }
      )
    })

  })

})
