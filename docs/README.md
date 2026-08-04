# Proyecto SUPER — E-commerce Full-Stack de Componentes de PC y Electrónica

**SUPER** es una tienda en línea full-stack desacoplada, con base de datos PostgreSQL, autenticación propia JWT, panel de administración con métricas y control de stock, y pasarela de pago integrada con **Mercado Pago Checkout Bricks**.

---

## 🚀 Stack Tecnológico

- **Backend:** Node.js + Express (JavaScript puro) en arquitectura por capas (`routes` -> `controllers` -> `services` -> `models/repositories`).
- **ORM & DB:** Sequelize ORM con PostgreSQL (Totalmente desacoplado de Supabase SDK, migrable a cualquier Postgres cambiando sólo `DATABASE_URL`).
- **Frontend:** React + Vite + JSX + TailwindCSS.
- **Manejo de Estado:** Zustand para UI/Carrito/Comparador y TanStack Query para caché del servidor.
- **Pagos:** Mercado Pago (SDK `@mercadopago/sdk-react` en frontend con Checkout Bricks y `mercadopago` Node SDK en backend con webhooks e IPN).
- **Seguridad:** JWT + bcrypt + Helmet + Rate Limiting (`express-rate-limit`) + CORS explícito.
- **Storage:** Adaptador genérico `services/storageService.js` (Local / Supabase / S3).

---

## 🛠️ Guía de Ejecución Local

### 1. Requisitos Previos
- Node.js (v18+)
- PostgreSQL corriendo localmente o una instancia en la nube (Supabase, Neon, Railway).

### 2. Configurar Backend
```bash
cd backend
npm install
# Duplicar el archivo de entorno y ajustar variables si es necesario
cp .env.example .env
# Iniciar servidor en modo desarrollo
npm run dev
El backend se iniciará en `http://localhost:5000`.

Para sembrar datos de prueba manualmente en la base de datos (después de ejecutar las migraciones de Sequelize), se puede correr opcionalmente:
```bash
npm run seed
```

### 3. Configurar Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
El frontend estará disponible en `http://localhost:5173`.

---

## 💳 Credenciales de Prueba Mercado Pago

Para probar el flujo de checkout en sandbox con tarjetas de prueba:
1. En el frontend se utiliza la `VITE_MP_PUBLIC_KEY` configurada en `frontend/.env`.
2. En el backend se utiliza el `MP_ACCESS_TOKEN` privado en `backend/.env`.
3. Al realizar una compra en el checkout, el componente de Checkout Bricks renderizará las opciones de pago.

---

## 👥 Cuentas de Usuario de Prueba (Pre-sembradas)

- **Administrador Super:**
  - Email: `admin@supertech.com`
  - Password: `admin123456`
  - Acceso completo a `/admin` (Dashboard, Métricas, CRUD de Productos, Control de Stock).

- **Cliente Demo:**
  - Email: `cliente@supertech.com`
  - Password: `cliente123456`
