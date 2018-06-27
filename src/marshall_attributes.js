
module.exports = function marshall_attributes(attributes, vendor_attributes) {
  var marshalled = []
  if (Array.isArray(attributes) && attributes.length) {
    marshalled = marshalled.concat(attributes)
  }

  Object.keys(vendor_attributes).forEach((vendorName) => {
  	marshalled.push(['Vendor-Specific', this.VENDOR_IDS[vendorName], vendor_attributes[vendorName]])
  })

  return marshalled
}
