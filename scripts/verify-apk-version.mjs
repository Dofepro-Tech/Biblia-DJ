#!/usr/bin/env node

/**
 * Script para verificar la versión del APK en producción
 */

import https from 'https';

const MANIFEST_URL = 'https://bibliadj.dofepro.do/app-update.json';
const APK_URL = 'https://bibliadj.dofepro.do/biblia-ng-android.apk';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getHEAD(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      resolve({
        'content-length': res.headers['content-length'],
        'last-modified': res.headers['last-modified'],
        'etag': res.headers['etag']
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍 Verificando versión del APK en producción...\n');

  try {
    // Verificar manifest
    console.log('📄 Manifest (app-update.json):');
    const manifest = await fetchJSON(MANIFEST_URL);
    console.log(`   Versión: ${manifest.version}`);
    console.log(`   APK URL: ${manifest.apkUrl}`);
    console.log(`   Fecha: ${manifest.publishedAt}\n`);

    // Verificar APK
    console.log('📦 APK (biblia-ng-android.apk):');
    const apkInfo = await getHEAD(APK_URL);
    console.log(`   Tamaño: ${apkInfo['content-length']} bytes (${(apkInfo['content-length'] / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Última modificación: ${apkInfo['last-modified']}`);
    console.log(`   ETag: ${apkInfo['etag']}\n`);

    console.log('✅ Verificación completada\n');
    console.log('📱 Para probar en tu celular:');
    console.log('   1. Cierra completamente la app');
    console.log('   2. Espera 1-2 minutos');
    console.log('   3. Vuelve a abrir la app');
    console.log('   4. Debería aparecer notificación de actualización');
    console.log('   5. Instala la actualización');
    console.log('   6. Verifica que diga versión 1.0.20\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
