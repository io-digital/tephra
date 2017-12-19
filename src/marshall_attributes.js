
module.exports = function marshall_attributes(attributes, vendor_attributes) {
  var marshalled = []
  if (Array.isArray(attributes) && attributes.length) {
    marshalled = marshalled.concat(attributes)
  }
  if (this.VENDOR_ID && Array.isArray(vendor_attributes) && vendor_attributes.length) {
    marshalled.push(['Vendor-Specific', this.VENDOR_ID, vendor_attributes])
  }
  return marshalled
}
