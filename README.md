
# tephra

> tephra, n: rock fragments and particles ejected by a volcanic eruption

##### test

```
npm test
```

##### example

```javascript
var users = {'joe-bloggs': 'secret-password'};

server.on('Access-Request', function(request, rinfo) {
  var username = request.attributes['User-Name'],
      password = request.attributes['User-Password'];
  if (username in users && users[username] === password) {
    server.respond('auth', request, 'Access-Accept', rinfo, [], []);
  } else {
    server.respond('auth', request, 'Access-Reject', rinfo, [], []);
  }
});
```
