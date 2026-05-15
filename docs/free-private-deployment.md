# Uso privado sin tienda

Objetivo: que dos personas puedan usar Agenda a diario sin pagar App Store ni Google Play.

## Recomendacion

La opcion mas sensata es publicar la app como web/PWA en Vercel:

- La app se exporta como archivos estaticos.
- Se sube a Vercel con el plan gratuito.
- Supabase sigue siendo el backend de datos y autenticacion.
- En el movil se abre la URL y se anade a la pantalla de inicio.
- No hace falta cuenta de Apple Developer ni subir a tiendas.

## Coste esperado

- Hosting estatico: puede ser gratis.
- Supabase: se puede empezar con el plan gratuito.
- Dominio: opcional. Se puede usar una URL gratis del hosting.
- App Store: no hace falta.
- Google Play: no hace falta.

## Limitaciones

- No es exactamente igual que una app nativa.
- Las notificaciones push web en iOS/Android pueden ser mas delicadas que en nativo.
- Para uso offline total haria falta service worker; de momento conviene no meterlo hasta probar bien porque puede cachear versiones antiguas.
- La app depende de Supabase para sincronizar entre moviles. Sin internet puede usar datos locales en el dispositivo, pero no sincroniza hasta volver a conectar.

## Flujo de publicacion

1. Crear un proyecto gratuito en Vercel.
2. Conectar el repositorio.
3. Configurar variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Build command:

   ```bash
   npm run build:web
   ```

5. Output directory:

   ```bash
   dist
   ```

6. Abrir la URL en el movil.
7. Anadir a pantalla de inicio:
   - iPhone: Safari -> compartir -> Anadir a pantalla de inicio.
   - Android: Chrome -> menu -> Instalar app o Anadir a pantalla de inicio.

Guia especifica de Vercel:

```bash
docs/vercel-deployment.md
```

## Decision pendiente

Antes de dejarla fija para uso diario, conviene decidir:

- URL final.
- Nombre visible final.
- Si queremos icono final personalizado.
- Si aceptamos vivir sin push nativo por ahora.
