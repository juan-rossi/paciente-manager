import bcrypt from "bcryptjs";

// Costo 12 (antes 10): cada hash cuesta ~4 veces más de adivinar si la base
// llegara a filtrarse. Los hashes existentes con costo 10 siguen validando
// igual (bcrypt guarda el costo en el propio hash).
export const BCRYPT_COSTO = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COSTO);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export type UserRole = "DOCTOR" | "SECRETARY" | "ADMIN";
