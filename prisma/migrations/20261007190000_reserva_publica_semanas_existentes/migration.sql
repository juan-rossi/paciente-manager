-- Los medicos que ya existian arrancan con 4 semanas de agenda publica;
-- los nuevos siguen tomando el default de la columna (2).
UPDATE "User" SET "reservaPublicaSemanas" = 4;
