; Instalador de Windows para el servicio de transcripción local.
; Requiere Inno Setup (https://jrsoftware.org/isinfo.php).
;
; Antes de compilar: correr `npm run build-package` en whisper-service/, que
; arma la carpeta autocontenida en dist-package/win32-<arch>/ (Node.js
; portátil + la app + node_modules con los binarios nativos correctos para
; esta máquina — ver scripts/build-package.mjs).

#define MyAppName "Transcriber"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Paciente Manager"
#ifndef SourceDir
  #define SourceDir "..\..\dist-package\win32-x64"
#endif

[Setup]
AppId={{B6A7B7D2-6C3E-4C9D-9B1E-TRANSCRIBER01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename=TranscriberSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
; Toda la carpeta que arma build-package.mjs: node.exe portátil, la app
; bundleada (app\server.cjs + app\node_modules), config\config.example.json
; y Transcriber.vbs (el que de verdad arranca todo, sin mostrar una consola).
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Solo el acceso directo del menú de inicio — el auto-arranque real lo
; registra la propia app (`src/tray/index.ts` -> `auto-launch`, Registry Run
; key) la primera vez que corre. Si acá TAMBIÉN dejáramos un acceso directo
; en la carpeta de Inicio de Windows, el servicio arrancaría dos veces en
; cada inicio de sesión (y la segunda instancia fallaría con el puerto ya
; ocupado).
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\Transcriber.vbs"""

[Run]
Filename: "wscript.exe"; Parameters: """{app}\Transcriber.vbs"""; Description: "Iniciar {#MyAppName}"; Flags: nowait postinstall skipifsilent
