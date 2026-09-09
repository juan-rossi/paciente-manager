; Scaffold de Inno Setup para TranscriberSetup.exe — no verificado end-to-end
; todavía. Requiere Inno Setup (https://jrsoftware.org/isinfo.php).
;
; Antes de compilar: correr `npm run build-sea`, que genera
; dist-sea/transcriber.exe, y copiar junto a él (ver scripts/build-sea.mjs) el
; addon nativo @fugood/node-whisper-win32-<arch> y los paquetes de bandeja.

#define MyAppName "Transcriber"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Paciente Manager"

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
ArchitecturesInstallIn64BitMode=x64 arm64

[Files]
; La carpeta "payload" la arma build-sea.mjs: transcriber.exe + node_modules
; nativos necesarios (addon whisper.node, systray2, auto-launch).
Source: "..\..\dist-sea\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\config\config.example.json"; DestDir: "{app}\config"; DestName: "config.json"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\transcriber.exe"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\transcriber.exe"; Flags: runminimized

[Run]
Filename: "{app}\transcriber.exe"; Description: "Iniciar {#MyAppName}"; Flags: nowait postinstall skipifsilent
