# Checklist de despliegue y publicación

## 1. Desarrollo local

- Verificar que `.env.local` exista en la raíz del proyecto.
- Confirmar que `AI_PROVIDER="openrouter"` esté definido.
- Confirmar que `OPENROUTER_API_KEY` tenga una clave válida.
- Mantener `OPENROUTER_SITE_URL="http://localhost:3000"` solo para pruebas locales.
- Ejecutar `npm run lint`.
- Ejecutar `npm run build`.
- Ejecutar `npm run dev` o `npm start`.
- Probar una llamada real a `/api/ai/explain`.
- Probar la búsqueda global en `/api/bible/search`.

## 2. Seguridad

- Si una clave fue expuesta en chat, capturas o repositorios, regenerarla de inmediato.
- No subir `.env.local` al repositorio.
- No colocar `OPENROUTER_API_KEY` en frontend, Android o iOS.
- Publicar el backend final usando HTTPS.

## 3. Producción backend

- Desplegar el backend Express en un hosting con HTTPS.
- Si quieres que web e IA funcionen siempre, no dependas solo de GitHub Pages para la app completa; publica el backend en un host Node estable y usa Pages solo como landing o como cliente estático con `VITE_API_BASE_URL`.
- Si usas Render, el proyecto ya incluye `render.yaml` y el healthcheck en `/api/health`.
- Para Cloud Run, despliega el repositorio con Cloud Build/buildpacks. Usa `npm start` como comando de inicio y permite acceso público; Express sirve la web y la API `/api` desde el mismo servicio.
- En el build de Cloud Run define `VITE_USE_SAME_ORIGIN_API=true` y `VITE_PUBLIC_BASE_PATH=/`; son variables de compilación, no de runtime.
- En runtime configura `APP_URL` con el origen HTTPS de Cloud Run y conserva `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` del proyecto `portafolio-db`.
- Biblia usa `portafolio-db` tanto para autenticación como para opiniones. Configura `OPINIONS_SUPABASE_URL` con la URL del mismo proyecto y `OPINIONS_SUPABASE_SECRET_KEY` con su clave secreta. No conectes `AllConnected`.
- Guarda las claves privadas en Secret Manager y enlázalas al servicio como variables secretas.
- Para servir RVR1960 con API.Bible, define `BIBLE_API_KEY` y `BIBLE_API_ES_BIBLE_ID` en el backend. La clave debe permanecer privada y la cuenta debe tener RVR1960 habilitada.
- Configurar en el hosting las variables:

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=TU_CLAVE_REAL
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=https://tu-dominio.com
OPENROUTER_APP_NAME=Biblia NJ
BIBLE_API_KEY=TU_CLAVE_API_BIBLE
BIBLE_API_ES_BIBLE_ID=ID_RVR1960_HABILITADO_EN_TU_CUENTA
SUPABASE_URL=https://TU_PROYECTO.supabase.co
OPINIONS_SUPABASE_URL=https://PROYECTO_PORTAFOLIO.supabase.co
OPINIONS_SUPABASE_SECRET_KEY=CLAVE_PRIVADA_SOLO_DEL_BACKEND
```

- Aplicar `supabase/migrations/20260930_create_opinions.sql` en el SQL Editor de `portafolio-db` antes de habilitar `/api/opinions`.
- No publicar claves `OPINIONS_SUPABASE_*` en variables `VITE_*`, en Android ni en iOS.

- Confirmar que el backend responda en rutas como `/api/ai/explain`.
- Confirmar que `/api/health` devuelva `status: ok` y `ai.configured: true`.
- Confirmar que el dominio público use HTTPS.
- Si frontend y backend se separan, definir `ALLOWED_ORIGINS` en el backend.
- Confirmar que `/assets/*.css` y `/assets/*.js` respondan con MIME correcto.
- Confirmar que un asset inexistente dentro de `/assets` responda `404` y no `index.html`.

## 3.1 Acceso con Google (Supabase de Biblia)

- En Google Auth Platform crea un OAuth Client ID de tipo Web.
- En Google agrega como origen autorizado el dominio de Cloud Run y `http://localhost:3000` para desarrollo.
- Como URI de redirección autorizada de Google agrega el callback que muestra Supabase: `https://<proyecto-portafolio-db>.supabase.co/auth/v1/callback`.
- En `portafolio-db` abre Authentication > Sign In / Providers > Google y guarda allí el Client ID y Client Secret de Google.
- En Authentication > URL Configuration agrega `https://bibliadj.dofepro.do/**`, `https://<dominio-cloud-run>/**`, `http://localhost:3000/**` y `com.dofepro.biblianj://auth/callback` a Redirect URLs.
- No pongas el Client Secret de Google en el frontend, Android, Git ni variables `VITE_*`.

## 4. App móvil

- Ejecutar `powershell -ExecutionPolicy Bypass -File .\scripts\generate-brand-assets.ps1` si hubo cambios de iconos, splash o branding.
- Ejecutar `npx cap sync android` después de cada `npm run build` que vaya a usarse en Android.
- Verificar que `android/app/src/main/assets/public/index.html` apunte a los hashes actuales del `dist/`.
- Generar la build debug con `android\gradlew.bat assembleDebug`.
- Generar la build release con `android\gradlew.bat assembleRelease`.
- Si la build release debe quedar firmada, preparar `android/keystore.properties` a partir de `android/keystore.properties.example` y colocar el `.jks` real.
- Conservar `android/app/biblia-dj-release-2026.jks` y `android/keystore.properties` como identidad permanente de publicación; nunca regenerar el keystore para una actualización.
- Mantener al menos dos copias cifradas del `.jks` y de `android/keystore.properties` en ubicaciones seguras. Ambos archivos están excluidos de Git; sin el `.jks`, alias y contraseñas no se podrán firmar futuras actualizaciones.
- Las instalaciones firmadas con la clave anterior deben desinstalarse para instalar esta versión; los datos guardados únicamente en el teléfono se borrarán. El perfil autenticado permanece en Supabase.
- Configurar la app móvil para consumir el backend público por HTTPS.
- Antes de compilar Android contra Cloud Run, define `VITE_API_BASE_URL=https://<servicio-cloud-run>.run.app`.
- Cloud Run actualiza la web y el backend, pero no el JavaScript que ya está dentro de la APK instalada. Para llevar cambios de interfaz a Android hay que subir una nueva APK firmada con la misma clave y publicarla en la URL estable de `VITE_APP_APK_URL`/`VITE_APP_UPDATE_URL`; la app consulta `app-update.json` y ofrece la actualización.
- Definir una variable pública de cliente solo para la URL del backend.
- Si la web seguirá en GitHub Pages, definir `PUBLIC_API_BASE_URL` como variable del repositorio y activar `REQUIRE_PUBLIC_API_BASE_URL=true` para impedir publicaciones sin backend público.
- No almacenar claves de OpenRouter en la app.
- Para pruebas Android locales, usar `VITE_API_BASE_URL` con la IP LAN del backend.
- Recordar que la build release solo saldrá firmada si existe `android/keystore.properties` con un keystore válido.
- Para iOS, realizar la compilación final en macOS con Xcode.

## 5. Publicación en tiendas

- Publicar una política de privacidad accesible por URL pública.
- Declarar uso de servicios remotos si la tienda lo solicita.
- Declarar uso de funciones de IA si la tienda lo solicita.
- Mantener correo de contacto visible para soporte y privacidad.
- Verificar que icono, splash y nombre de aplicación sean los finales antes de subir la build.

## 6. Validación final

- Probar lectura bíblica sin IA.
- Probar explicación, chat y estudio guiado con IA.
- Probar retos diarios, racha, recompensas y contenido diario.
- Verificar errores de red y mensajes de fallback.
- Confirmar que el frontend no exponga claves.
- Si se usa un túnel temporal como localhost.run, tratarlo solo como pruebas; no usarlo como URL pública permanente.
