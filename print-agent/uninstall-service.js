const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'POS Print Agent',
  script: path.join(__dirname, 'index.js'),
});

svc.on('uninstall', function() {
  console.log('✅ POS Print Agent service uninstalled.');
  console.log('   The service will no longer run on startup.');
});

svc.uninstall();
