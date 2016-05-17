
'use strict';

var fs = require('fs');

var radius = require('radius');

var command = process.argv[0];
var script = process.argv[1];
var packet = process.argv[2];
var shared_secret = process.argv[3];

if (!(packet && shared_secret)) process.exit(1);

radius.add_dictionary(`${__dirname}/dictionaries/mikrotik.dictionary`);

fs.readFile(
  `${__dirname}/packets/mikrotik/${packet}`,
  function(err, buffer) {
    if (err) throw err;
    console.dir(
      radius.decode({
        packet: buffer,
        secret: shared_secret
      }).attributes
    );
  }
);
