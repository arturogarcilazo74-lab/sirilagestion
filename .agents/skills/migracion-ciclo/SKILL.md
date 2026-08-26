---
name: migracion-ciclo
description: >-
  Skill para ejecutar la migración de datos al nuevo ciclo escolar. Promueve alumnos, egresa a los de sexto grado, y actualiza los maestros y el ciclo en la configuración.
---

# Migración de Ciclo Escolar

Esta skill describe cómo realizar la migración automática de datos para el inicio de un nuevo ciclo escolar en la plataforma Sirila Gestión.

## Qué hace la migración
1. **Alumnos**: Promueve a los alumnos al siguiente grado (por ejemplo, los de 1er grado pasan a 2do grado). A los alumnos de 6to grado se les asigna el estatus de `BAJA` (egresados) para que ya no aparezcan en las listas activas, conservando su historial.
2. **Configuración**: Actualiza el campo `schoolYear` al nuevo ciclo escolar.
3. **Maestros**: Actualiza el grupo asignado a cada docente según lo estipulado para el nuevo ciclo, respetando a la directora y personal de apoyo.

## Instrucciones de Uso

Para ejecutar la migración, corre el script de Node.js preparado en la carpeta de herramientas:

```bash
node tools/migrate_2026_2027.js
```

### Notas Importantes
- Asegúrate de que la base de datos esté respaldada antes de ejecutar este script, ya que los cambios en el grado de los alumnos son directos.
- Los alumnos de primer grado (nuevo ingreso) deberán ser capturados de forma manual una vez que la plataforma esté lista, ya que el sistema deja libre el grupo "1 A" después de promover a los anteriores a "2 A".
- Según las reglas de _Safe Refactoring_, este script no interfiere con el código funcional de la aplicación (React/Node API), solo actualiza la base de datos de manera segura utilizando las mismas conexiones.
