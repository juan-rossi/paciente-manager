' Arranca el servicio sin mostrar una ventana de consola. Calcula todas las
' rutas relativas a su propia ubicación (no rutas absolutas fijas) para que
' funcione sin importar dónde lo haya instalado Inno Setup.
Dim fso, scriptDir, shell, command

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set shell = CreateObject("WScript.Shell")
shell.Environment("PROCESS")("WHISPER_SERVICE_ROOT") = scriptDir

command = """" & scriptDir & "\node.exe"" """ & scriptDir & "\app\server.cjs"""
shell.Run command, 0, False
