const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

async function main() {
  console.log('=== QR Code Generator for Store Portal ===\n');

  // 1. Production Web URL Mode (Recommended for real-world deployment)
  const targetUrl = process.argv[2] || 'http://192.168.1.46:3000';
  console.log(`[1] Generating Production URL QR Codes for: ${targetUrl}`);
  
  const urlPngPath = path.join(__dirname, 'qrcode-url.png');
  const urlSvgPath = path.join(__dirname, 'qrcode-url.svg');

  await QRCode.toFile(urlPngPath, targetUrl, {
    errorCorrectionLevel: 'H',
    width: 600,
    margin: 2,
    color: {
      dark: '#00594C', // Barnes & Noble forest green theme
      light: '#FFFFFF'
    }
  });

  const urlSvgString = await QRCode.toString(targetUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#00594C',
      light: '#FFFFFF'
    }
  });
  fs.writeFileSync(urlSvgPath, urlSvgString);

  console.log(`   -> Created: ${urlPngPath} (High Error Correction 'H', 600x600)`);
  console.log(`   -> Created: ${urlSvgPath} (Scalable Vector SVG for print)\n`);

  // 2. Offline Data URI Mode (Directly embeds HTML into QR Code)
  console.log('[2] Generating Standalone Offline Data-URI QR Code...');
  const minHtmlPath = path.join(__dirname, 'index.min.html');
  if (fs.existsSync(minHtmlPath)) {
    let rawHtml = fs.readFileSync(minHtmlPath, 'utf8');
    
    // Extreme whitespace minification
    let minified = rawHtml
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .replace(/;\s+/g, ';')
      .replace(/:\s+/g, ':')
      .replace(/\{\s+/g, '{')
      .replace(/\}\s+/g, '}')
      .replace(/,\s+/g, ',')
      .trim();

    // Construct data URI
    const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(minified);
    const dataUriBytes = Buffer.byteLength(dataUri, 'utf8');

    console.log(`   -> Minified HTML size: ${Buffer.byteLength(minified, 'utf8')} bytes`);
    console.log(`   -> Encoded Data-URI size: ${dataUriBytes} bytes`);

    const maxQrCapacity = 2953; // Max Version 40 Binary Capacity at ECC L
    if (dataUriBytes <= maxQrCapacity) {
      const dataUriPngPath = path.join(__dirname, 'qrcode-datauri.png');
      const dataUriSvgPath = path.join(__dirname, 'qrcode-datauri.svg');

      try {
        await QRCode.toFile(dataUriPngPath, dataUri, {
          errorCorrectionLevel: 'L',
          width: 800,
          margin: 4,
          color: {
            dark: '#111827',
            light: '#FFFFFF'
          }
        });

        const dataUriSvg = await QRCode.toString(dataUri, {
          type: 'svg',
          errorCorrectionLevel: 'L',
          margin: 4
        });
        fs.writeFileSync(dataUriSvgPath, dataUriSvg);

        console.log(`   -> Created: ${dataUriPngPath} (Offline Data-URI PNG, 800x800)`);
        console.log(`   -> Created: ${dataUriSvgPath} (Offline Data-URI SVG)`);
        console.log(`   [SUCCESS] Data fits inside QR Code standard Version 40!`);
      } catch (err) {
        console.warn('   [WARNING] Could not fit raw Data URI into QR code:', err.message);
      }
    } else {
      console.log(`   [NOTE] Data URI size (${dataUriBytes}B) exceeds 2,953B limit. Please use URL mode.`);
    }
  }

  console.log('\n=== Generation Complete ===');
}

main().catch(console.error);
