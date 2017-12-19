
var decode = require('./decode')

module.exports = function coa_on_message(message, rinfo) {
  var decoded = decode.call(
    this,
    message,
    function(packet) {
      return [
        'Disconnect-ACK',
        'Disconnect-NAK',
        'CoA-ACK',
        'CoA-NAK'
      ].indexOf(packet.code) !== -1
    },
    this.emit.bind(this, 'error#decode#coa')
  )
  if (!decoded) return
  this.emit(decoded.code, decoded, rinfo)
}
