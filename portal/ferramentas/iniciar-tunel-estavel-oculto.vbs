' Inicia o supervisor Sites ADS apenas no usuário Windows AS, sem janela.
Set shell = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
If LCase(shell.ExpandEnvironmentStrings("%USERNAME%")) <> "as" Then WScript.Quit 1
pasta = fs.GetParentFolderName(WScript.ScriptFullName)
caminho = fs.BuildPath(pasta, "servidor-tunel-estavel.mjs")
node = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
If Not fs.FileExists(node) Then WScript.Quit 2
shell.Run """" & node & """ """ & caminho & """", 0, False
' Atualiza o endereço do túnel no Gist já utilizado pela página fixa.
watcher = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\SitesAdsTeste\atualizar-link.mjs"
If fs.FileExists(watcher) Then shell.Run """" & node & """ """ & watcher & """", 0, False
