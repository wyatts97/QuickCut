// Minimal test to check if electron module works
console.log('Testing electron module...');
const electron = require('electron');
console.log('electron:', electron);
console.log('electron.app:', electron.app);

if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('Electron app is ready!');
    electron.app.quit();
  });
} else {
  console.log('ERROR: electron.app is undefined');
  process.exit(1);
}
