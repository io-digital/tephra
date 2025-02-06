
import decode from './decode.js'
import access_accept from './access_accept.js'
import access_reject from './access_reject.js'

export default function auth_on_message(message, rinfo) {
  var decoded = decode.call(
    this,
    message,
    function(packet) {
      return packet.code === 'Access-Request'
    },
    this.emit.bind(this, 'error#decode#auth')
  )

  if (!decoded) {
    // seems sensible to default to access-reject here
    return access_reject.call(this, decoded, rinfo)
  }

  this.emit(
    decoded.code,
    decoded,
    rinfo,
    access_accept.bind(this, decoded, rinfo),
    access_reject.bind(this, decoded, rinfo)
  )
}
