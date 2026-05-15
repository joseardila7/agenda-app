# Agenda

Agenda es una app movil hecha con Expo y React Native para gestionar eventos, categorias, plantillas, tareas, recordatorios, papelera y sincronizacion con Supabase.

## Desarrollo

Instalar dependencias:

```bash
npm install
```

Arrancar Expo:

```bash
npm start
```

Abrir por plataforma:

```bash
npm run android
npm run ios
npm run web
```

## Verificacion

Antes de considerar una mejora lista:

```bash
npm run preflight
```

Este comando ejecuta:

- TypeScript sin emitir archivos.
- Lint de Expo.
- Export web de comprobacion.

## Builds

La configuracion de EAS esta en `eas.json`.

Build interno de Android:

```bash
npx eas build --profile preview --platform android
```

Build interno de iOS:

```bash
npx eas build --profile preview --platform ios
```

Build de produccion:

```bash
npx eas build --profile production --platform all
```

## Uso privado sin tienda

Para usar la app sin App Store ni Google Play, se puede publicar como web/PWA:

```bash
npm run build:web
```

El resultado sale en `dist`.

Guia interna:

```bash
docs/free-private-deployment.md
```

Guia de Vercel:

```bash
docs/vercel-deployment.md
```

## Base de datos

El esquema principal de Supabase esta en:

```bash
supabase/agenda_events.sql
```

## Lanzamiento

La checklist de beta y tienda vive en:

```bash
docs/launch-readiness.md
```
