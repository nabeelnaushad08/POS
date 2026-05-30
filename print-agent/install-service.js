const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'POS Print Agent',
  description: 'Zenthoz POS System - Local printer bridge service',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  // Keep alive if it crashes
  wait: 2,
  grow: 0.5,
  maxRestarts: 10,
  abortOnError: false,
});

svc.on('install', function() {
  svc.start();
  console.log('✅ POS Print Agent installed as Windows service!');
  console.log('   Service will start automatically on every Windows boot.');
  console.log('   To check: Open Services (services.msc) and look for "POS Print Agent"');
});

svc.on('alreadyinstalled', function() {
  console.log('ℹ️  Service already installed. Use uninstall-service.js to reinstall.');
});

svc.on('error', function(err) {
  console.error('❌ Error:', err);
});

svc.install();
