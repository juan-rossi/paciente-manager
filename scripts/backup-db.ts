import { execFileSync } from "node:child_process";

type Branch = {
  id: string;
  name: string;
  created_at: string;
};

const projectId = process.env.NEON_PROJECT_ID;
const apiKey = process.env.NEON_API_KEY;
const keepLast = Number(process.env.BACKUP_KEEP_LAST ?? 15);

if (!projectId) {
  console.error("Definí NEON_PROJECT_ID antes de correr el backup.");
  process.exit(1);
}

// NEON_API_KEY es obligatorio en CI (GitHub Actions no tiene sesión interactiva).
// Corriendo a mano, si ya estás autenticado con `neonctl` (sesión OAuth guardada),
// se puede omitir y usa esa sesión.
function neonctl(args: string[]): string {
  const authArgs = apiKey ? ["--api-key", apiKey] : [];
  return execFileSync(
    "npx",
    ["neonctl", ...args, "--project-id", projectId!, ...authArgs, "-o", "json"],
    // shell: true -- en Windows "npx" es npx.cmd; sin esto execFileSync no lo resuelve (ENOENT).
    { encoding: "utf8", shell: true }
  );
}

function backupBranchName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-${stamp}`;
}

function createBackup(): Branch {
  const name = backupBranchName();
  console.log(`Creando branch de backup "${name}"...`);
  // --no-compute: es solo un snapshot de datos, no hace falta un endpoint activo.
  const output = neonctl(["branches", "create", "--name", name, "--no-compute"]);
  const branch = JSON.parse(output) as Branch;
  console.log(`Backup listo: ${branch.name} (${branch.id})`);
  return branch;
}

function pruneOldBackups() {
  const output = neonctl(["branches", "list"]);
  const branches = JSON.parse(output) as Branch[];
  const backups = branches
    .filter((b) => b.name.startsWith("backup-"))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const toDelete = backups.slice(keepLast);
  if (toDelete.length === 0) return;

  console.log(
    `Borrando ${toDelete.length} backup(s) viejo(s) (se conservan los últimos ${keepLast})...`
  );
  for (const branch of toDelete) {
    neonctl(["branches", "delete", branch.id]);
    console.log(`  - borrado ${branch.name}`);
  }
}

try {
  createBackup();
  pruneOldBackups();
} catch (error) {
  const stderr = (error as { stderr?: Buffer | string }).stderr;
  console.error(stderr ? stderr.toString() : error);
  process.exit(1);
}
