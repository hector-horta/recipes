# 🚀 Guía de Migración a Multi-Tenant

Esta guía detalla el proceso para migrar una base de datos existente de Wati (monolítica/single-tenant) a la nueva arquitectura multi-tenant basada en organizaciones.

---

## 📋 Contexto de la Migración

La versión actual de Wati introduce el concepto de **Organizaciones**. Cada registro en las tablas principales (`users`, `recipes`, `activity_logs`, etc.) ahora debe estar asociado a un `organization_id`. Los registros antiguos que no tienen este campo (o están en `NULL`) se consideran "huérfanos" y no serán visibles en las aplicaciones del ecosistema a menos que se migren.

## 🛠️ Herramienta de Migración

Se ha creado un script de utilidad permanente para facilitar esta transición:

**Ubicación:** `backend/utils/migrateToTenant.js`

### ¿Qué hace el script?
1. **Crea una Organización por Defecto**: Si no existe, crea una organización con el slug `default-org`.
2. **Asocia Usuarios**: Asigna a todos los usuarios sin organización a `default-org`.
3. **Crea Membresías**: Sincroniza la tabla `user_organizations` para que los usuarios tengan acceso formal a la organización.
4. **Asocia Contenido**: Migra recetas, logs de actividad, logs de búsqueda y favoritos a la organización por defecto.

---

## 🚀 Pasos para la Migración

### 1. Preparar el entorno
Asegúrate de que los contenedores estén corriendo y las migraciones de base de datos base ya se hayan ejecutado.

```bash
docker compose exec backend npx sequelize-cli db:migrate
```

### 2. Ejecutar el script de migración
Ejecuta el script directamente dentro del contenedor del backend:

```bash
docker compose exec backend node utils/migrateToTenant.js
```

### 3. Verificar el resultado
Puedes verificar que no queden registros huérfanos consultando la base de datos:

```bash
docker compose exec postgres psql -U wati_user -d wati_db -c "SELECT COUNT(*) FROM users WHERE organization_id IS NULL;"
docker compose exec postgres psql -U wati_user -d wati_db -c "SELECT COUNT(*) FROM recipes WHERE organization_id IS NULL;"
```
*Ambos conteos deberían ser 0 (a menos que sean recetas globales intencionales).*

### 4. Promoción de Super Admin (Opcional)
Para acceder al panel de administración global (**More Admin**), necesitas al menos un usuario con el rol `super_admin`. Puedes promover a cualquier usuario existente con el siguiente comando:

```bash
docker compose exec postgres psql -U wati_user -d wati_db -c "UPDATE users SET role = 'super_admin' WHERE email = 'tu-email@ejemplo.com';"
```

---

## ⚠️ Notas Importantes

- **Recetas Globales**: En el ecosistema Wati, las recetas con `organization_id = NULL` se consideran **Globales** y son visibles para todos los tenants. El script de migración asocia las recetas existentes a `default-org` por seguridad, pero puedes volver a ponerlas en `NULL` si deseas que sean públicas para todo el ecosistema.
- **Roles**: Por defecto, el script asigna el rol que el usuario ya tenía en la tabla `users` a su nueva membresía en `user_organizations`.
- **Idempotencia**: El script es seguro de ejecutar múltiples veces. Solo procesará registros que aún no tengan un `organization_id`.

---

## 🔄 Reversión (Rollback)
Si necesitas revertir los cambios de asociación (aunque no es recomendado), deberás hacerlo manualmente vía SQL, ya que el script realiza cambios destructivos sobre los campos `NULL`.

---
*Última actualización: Mayo 2026*
