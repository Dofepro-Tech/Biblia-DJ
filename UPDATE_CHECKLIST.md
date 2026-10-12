# Checklist de Actualizaciones Automáticas - Biblia NG

## 📋 Verificar antes de cada actualización

### 1. app-update.json
- [ ] `apkUrl` apunta a Render: `https://bibliadj.dofepro.do/biblia-ng-android.apk`
- [ ] `downloadUrl` apunta a: `https://bibliadj.dofepro.do/download.html`
- [ ] `updateUrl` apunta a: `https://bibliadj.dofepro.do/app-update.json`
- [ ] `version` está actualizado
- [ ] `publishedAt` tiene fecha actual
- [ ] `notes` y `notesEn` tienen las últimas correcciones
- [ ] Script `write-app-update-manifest.mjs` tiene URL correcta como fallback

### 2. APK
- [ ] APK reconstruido con cambios más recientes
- [ ] Package ID: `com.dofepro.bibliang`
- [ ] APK copiado a `public/biblia-ng-android.apk`
- [ ] APK disponible en Render: `https://bibliadj.dofepro.do/biblia-ng-android.apk`
- [ ] Verificar HTTP 200 al hacer curl del APK

### 3. Código fuente
- [ ] Package ID en `capacitor.config.ts`: `com.dofepro.bibliang`
- [ ] Package ID en deep link OAuth (`App.tsx`): `com.dofepro.bibliang`
- [ ] `getAppApkUrl()` en `share.ts` apunta a Render
- [ ] Todas las correcciones aplicadas
- [ ] Build frontend completo: `npm run build`
- [ ] Sync Capacitor: `npx cap sync android`
- [ ] Build APK: `./gradlew assembleRelease`

### 4. Despliegue
- [ ] Todos los cambios commiteados
- [ ] Git push a main
- [ ] Esperar 2-5 minutos para que Render despliegue
- [ ] Verificar `app-update.json` en producción
- [ ] Verificar APK en producción

## ⚠️ Problemas conocidos

### Package ID
- **App vieja instalada**: `com.dofepro.biblianj`
- **App nueva**: `com.dofepro.bibliang`
- **Resultado**: Son apps diferentes, no hay actualización automática para usuarios viejos
- **Solución**: Usuarios deben desinstalar y reinstalar manualmente

### Render vs GitHub Pages
- **Producción**: Render (`https://bibliadj.dofepro.do`)
- **No usar**: GitHub Pages (`https://dofepro-tech.github.io`)
- **Razón**: Render es el servidor de producción real

### Tiempo de actualización
- Capacitor no verifica instantáneamente
- Verifica a intervalos regulares
- Puede requerir cerrar y volver a abrir la app
- Puede tardar varios minutos

## 📱 Para usuarios nuevos
- ✅ Recibirán actualizaciones automáticas
- ✅ Package ID correcto desde el inicio
- ✅ Sistema de actualizaciones funciona

## 📱 Para usuarios actuales (package ID viejo)
- ❌ No recibirán actualizaciones automáticas
- ❌ Deben desinstalar app vieja
- ❌ Deben instalar APK nuevo manualmente
- ❌ Perderán datos locales

## 🔗 URLs importantes

- APK: `https://bibliadj.dofepro.do/biblia-ng-android.apk`
- Download: `https://bibliadj.dofepro.do/download.html`
- Update manifest: `https://bibliadj.dofepro.do/app-update.json`
- Notice: `https://bibliadj.dofepro.do/notice.html`
- Privacy: `https://bibliadj.dofepro.do/privacy.html`

## 📝 Notas de actualización actual

- Nuevo logo con libro, espada y escudo de Biblia NG
- Mejor contraste en tarjetas de juego en tema claro
- Gemini 3.6 Flash ahora disponible como modelo de IA
- Corrección de navegación de versículos en app móvil
- Package ID corregido en deep link OAuth

## 🔄 Próximos pasos

1. Verificar que Render haya desplegado el último commit
2. Verificar app-update.json en producción
3. Monitorear si las actualizaciones llegan a los usuarios
4. Recibir feedback de usuarios sobre la actualización
