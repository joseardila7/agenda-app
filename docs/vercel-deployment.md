# Deploy privado en Vercel

Esta es la ruta recomendada para usar Agenda sin App Store ni Google Play.

## 1. Crear el proyecto en Vercel

1. Entra en Vercel.
2. Importa el repositorio de GitHub.
3. Framework preset: `Other`.
4. Build command:

   ```bash
   npm run build:web
   ```

5. Output directory:

   ```bash
   dist
   ```

El archivo `vercel.json` ya deja estos valores configurados.

## 2. Variables de entorno

En Vercel, abre el proyecto y ve a:

```text
Settings -> Environment Variables
```

Anade estas dos variables en Production y Preview:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Usa los mismos valores que tienes en `.env.local`.

## 3. Supabase Auth

Cuando Vercel genere la URL, anadela en Supabase:

```text
Authentication -> URL Configuration
```

Configura:

```text
Site URL: https://TU-PROYECTO.vercel.app
Redirect URLs:
https://TU-PROYECTO.vercel.app/**
```

Si mas adelante compras dominio, anade tambien:

```text
https://TU-DOMINIO.com/**
```

## 4. Instalar en el movil

### iPhone

1. Abre la URL en Safari.
2. Pulsa compartir.
3. Pulsa `Anadir a pantalla de inicio`.

### Android

1. Abre la URL en Chrome.
2. Abre el menu.
3. Pulsa `Instalar app` o `Anadir a pantalla de inicio`.

## 5. Notas importantes

- No hace falta subir nada a tiendas.
- No hace falta pagar Apple Developer.
- Vercel sirve la web.
- Supabase guarda y sincroniza datos.
- La app puede usar almacenamiento local, pero la sincronizacion entre moviles necesita internet.
- De momento no hay service worker agresivo para evitar que el movil se quede con versiones antiguas cacheadas.
