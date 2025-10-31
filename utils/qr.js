const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 150
    });
  } catch (err) {
    console.error('QR generation failed:', err);
    return null;
  }
};

module.exports = generateQRCode;
