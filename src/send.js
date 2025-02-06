
export default function send(buffer, rinfo, on_sent) {
  this.send(
    buffer,
    0,
    buffer.length,
    rinfo.port,
    rinfo.address,
    on_sent
  )
}
