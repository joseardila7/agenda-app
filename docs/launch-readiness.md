# Agenda - checklist de lanzamiento

Este documento marca el camino hacia una beta real y una publicacion en tiendas. La idea es reducir incertidumbre: cada bloque debe estar verde antes de abrir la app a mas gente.

## Estado objetivo

- Beta interna: amigos/familia o 5-20 usuarios de confianza.
- Beta publica controlada: usuarios reales con feedback y soporte.
- Tienda: App Store y Google Play con privacidad, estabilidad y descripcion clara.

## Fase 1 - Base tecnica

- [x] App con nombre e identificadores nativos (`com.josemanuel.agenda`).
- [x] Configuracion EAS para development, preview y production.
- [x] Scripts de comprobacion local.
- [ ] Primer build preview de Android.
- [ ] Primer build preview de iOS.
- [ ] Prueba en movil real durante una semana de uso normal.
- [ ] Revisar que no haya texto roto o mojibake visible.
- [ ] Revisar pantallas en movil pequeno.

## Fase 2 - Cuenta, privacidad y datos

- [ ] Recuperar contrasena.
- [ ] Confirmacion de email clara.
- [ ] Borrar cuenta y datos.
- [ ] Politica de privacidad.
- [ ] Mensajes de error comprensibles cuando falla Supabase.
- [ ] Probar alta de usuario desde cero.
- [ ] Probar modo offline y vuelta a online.

## Fase 3 - Producto

- [ ] Onboarding corto para primer uso.
- [ ] Empty states finales en Agenda y Ajustes.
- [ ] Ajustes con secciones mas limpias.
- [ ] Revisar si alguna funcion sobra o complica.
- [ ] Pulir textos de botones, avisos y dialogos.
- [ ] Revisar accesibilidad: labels, contraste, tamanos tactiles.

## Fase 4 - Tiendas

- [ ] Icono final.
- [ ] Splash final.
- [ ] Capturas para App Store y Google Play.
- [ ] Nombre comercial definitivo.
- [ ] Descripcion corta y descripcion larga.
- [ ] Categoria de tienda.
- [ ] Politica de privacidad publicada.
- [ ] Build production firmado.
- [ ] TestFlight / Internal testing.

## Comandos de control

```bash
npm run preflight
```

```bash
npx eas build --profile preview --platform android
```

```bash
npx eas build --profile preview --platform ios
```

## Notas de decision

- El identificador nativo actual es `com.josemanuel.agenda`. Si se va a usar otro nombre comercial, conviene decidirlo antes de subir a tiendas.
- La app ya tiene mucha funcionalidad; durante esta fase conviene priorizar estabilidad, privacidad y claridad por encima de anadir funciones grandes.
