# Guía de Migración e Infraestructura de Producción (SUPER)

El proyecto **SUPER** fue diseñado siguiendo el principio de **cero lock-in con proveedores gratuitos**. A continuación se detalla el procedimiento para migrar cada componente a infraestructura dedicada o de pago sin modificar el código de la aplicación.

---

## 1. Base de Datos PostgreSQL (Supabase → AWS RDS / Neon / Railway / VPS)

Dado que la base de datos se consume a través de **Sequelize ORM** con SQL estándar y migraciones versionadas:

### Pasos para Migrar la Base de Datos:
1. Exportar la base de datos actual con `pg_dump`:
   ```bash
   pg_dump "postgresql://postgres:pass@db.supabase.co:5432/postgres" > backup.sql
   ```
2. Restaurar la base de datos en la nueva instancia (ej. AWS RDS o Neon):
   ```bash
   psql "postgresql://user:pass@rds-instance.amazonaws.com:5432/super_prod" < backup.sql
   ```
3. En el servicio donde corre el backend Express (Render, Railway, Fly.io, AWS EC2), actualizar únicamente la variable de entorno:
   ```env
   DATABASE_URL=postgresql://user:pass@rds-instance.amazonaws.com:5432/super_prod
   ```

---

## 2. Backend Express API (Render → AWS EC2 / Railway / DigitalOcean VPS)

El backend es una aplicación de Node.js totalmente contenerizable mediante `Dockerfile`.

### Despliegue con Docker / CapRover / VPS:
```bash
cd backend
docker build -t super-backend:latest .
docker run -d -p 5000:5000 --env-file .env super-backend:latest
```

---

## 3. Storage de Imágenes (Local / Supabase Storage → Cloudflare R2 / AWS S3)

El servicio `src/services/storageService.js` abstrae las llamadas de carga y eliminación de imágenes.

Para migrar a AWS S3 o Cloudflare R2:
1. Reemplazar la implementación interna de `uploadFile` y `deleteFile` en `services/storageService.js` usando el SDK `@aws-sdk/client-s3`.
2. Las llamadas en los controladores (`productController.js`, `adminController.js`) continuarán llamando a `storageService.uploadFile()` sin sufrir ningún cambio.

---

## 4. Pasarela de Pagos (Mercado Pago → Stripe / Culqi)

Toda la lógica de pago está contenida dentro del adaptador `src/services/paymentService.js`.
- Para añadir Stripe o Culqi, simplemente implementa los métodos `createPayment`, `handleWebhook` y `getPaymentStatus` dentro de un nuevo adaptador `stripePaymentService.js` y conéctalo en `paymentController.js`.
