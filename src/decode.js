
var radius = require('radius')

module.exports = function decode(message, guard, on_error) {
  try {
    var decoded = radius.decode({
      packet: message,
      secret: this.SHARED_SECRET
    })
  } catch (err) {
    on_error(err.message)
    return
  }
  if (!guard(decoded)) {
    on_error('packed decode guard failed')
    return
  }
  return decoded
}
