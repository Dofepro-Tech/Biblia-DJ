import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dofepro.bibliang',
  appName: 'OmniBiblia',
  webDir: 'dist',
  server: {
    cleartext: false,
  },
  backgroundColor: '#0b1f4f',
};

export default config;