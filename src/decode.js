
var radius = (await import('radius')).default

export default function decode(message, guard, on_error) {
  try {
    var decoded = radius.decode({
      packet: message,
      secret: this.secret
    })
  } catch (err) {
    on_error(err)
    return
  }

  if (!guard(decoded)) {
    on_error(new Error('packed decode guard failed'))
    return
  }

  return decoded
}
