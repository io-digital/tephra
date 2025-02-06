
export default function send(buffer, remote_host, on_sent) {
  this.send(
    buffer,
    0,
    buffer.length,
    remote_host.port,
    remote_host.address,
    on_sent
  )
}
