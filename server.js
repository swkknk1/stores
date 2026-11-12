const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const PORT = 3000;

// Determine local network IP (e.g. 192.168.x.x)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  let candidate = null;
  for (const name of Object.keys(interfaces)) {
    // Ignore VirtualBox / Host-Only / VPN
    if (/virtual|vbox|vpn|radmin|vmware/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.1.')) {
          return iface.address; // Exact home router subnet
        }
        if (iface.address.startsWith('192.168.') && !iface.address.startsWith('192.168.56.')) {
          candidate = iface.address;
        } else if (!candidate && (iface.address.startsWith('10.') || iface.address.startsWith('172.'))) {
          candidate = iface.address;
        }
      }
    }
  }
  return candidate || '192.168.1.46';
}

const localIP = getLocalIP();
const localUrl = `http://${localIP}:${PORT}`;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);

  // Security check: ensure within root dir
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n=================================================`);
  console.log(`🚀 本地网站服务已启动成功！`);
  console.log(`📱 手机扫码直达地址: ${localUrl}`);
  console.log(`💻 电脑本地访问:     http://localhost:${PORT}`);
  console.log(`=================================================\n`);

  // Generate QR code for this local URL
  try {
    const qrPngPath = path.join(__dirname, 'qrcode-local.png');
    await QRCode.toFile(qrPngPath, localUrl, {
      errorCorrectionLevel: 'H',
      width: 600,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const qrSvgPath = path.join(__dirname, 'qrcode-local.svg');
    const qrSvg = await QRCode.toString(localUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2
    });
    fs.writeFileSync(qrSvgPath, qrSvg);

    console.log(`✅ 已生成手机专用二维码图片:`);
    console.log(`   - qrcode-local.png (用手机相机扫描此二维码，同WiFi下秒开网页！)`);
    console.log(`   - qrcode-local.svg (高清矢量图)`);
  } catch (err) {
    console.error('生成二维码失败:', err);
  }
});
