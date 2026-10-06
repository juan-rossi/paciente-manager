-- Quita "Particular" del catálogo de coberturas. Los vínculos DoctorPrepaga se borran en cascada.
DELETE FROM "Prepaga" WHERE "nombre" = 'PARTICULAR';
