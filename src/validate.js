
export function vendor_dictionary(vendor_dictionary) {
  return (
    typeof vendor_dictionary.name === 'string' &&
    vendor_dictionary.name.length &&
    typeof vendor_dictionary.path === 'string' &&
    vendor_dictionary.path.length &&
    !isNaN(vendor_dictionary.id) &&
    Number.isInteger(vendor_dictionary.id) &&
    vendor_dictionary.id
  )
}

export function port(port) {
  return (
    !isNaN(port) &&
    Number.isInteger(port) &&
    port >= 0 &&
    port <= 65535
  )
}
