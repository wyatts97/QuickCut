; QuickCut Custom NSIS Installer Script
; Adds FFmpeg detection and optional bundled FFmpeg removal

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

; Variables for FFmpeg options
Var FFmpegCheckbox
Var FFmpegFound
Var FFmpegVersion
Var UseSystemFFmpeg

; Custom page for FFmpeg options
Page custom FFmpegOptionsPage FFmpegOptionsPageLeave

; Function to detect FFmpeg on system PATH
Function DetectFFmpeg
    ; Try to run ffmpeg -version
    nsExec::ExecToStack 'cmd /c ffmpeg -version 2>&1'
    Pop $0 ; Return value
    Pop $1 ; Output
    
    ${If} $0 == 0
        StrCpy $FFmpegFound "true"
        ; Extract version from output (first line contains version)
        ${WordFind} $1 " " "+2" $FFmpegVersion
    ${Else}
        StrCpy $FFmpegFound "false"
        StrCpy $FFmpegVersion ""
    ${EndIf}
FunctionEnd

; FFmpeg Options Page
Function FFmpegOptionsPage
    ; Detect FFmpeg first
    Call DetectFFmpeg
    
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
        Abort
    ${EndIf}
    
    ; Title
    ${NSD_CreateLabel} 0 0 100% 20u "FFmpeg Configuration"
    Pop $0
    CreateFont $1 "$(^Font)" 12 700
    SendMessage $0 ${WM_SETFONT} $1 0
    
    ; Description
    ${NSD_CreateLabel} 0 25u 100% 30u "QuickCut requires FFmpeg for video processing. You can use the bundled FFmpeg or your system installation."
    Pop $0
    
    ; FFmpeg detection status
    ${If} $FFmpegFound == "true"
        ${NSD_CreateLabel} 0 60u 100% 20u "✓ FFmpeg detected on your system: $FFmpegVersion"
        Pop $0
        SetCtlColors $0 0x228B22 transparent ; Green color
        
        ; Checkbox to use system FFmpeg
        ${NSD_CreateCheckbox} 0 85u 100% 15u "Use my system FFmpeg (saves ~40MB disk space)"
        Pop $FFmpegCheckbox
        ${NSD_Check} $FFmpegCheckbox ; Check by default if FFmpeg found
        
        ${NSD_CreateLabel} 0 105u 100% 30u "If checked, the bundled FFmpeg will be removed after installation to save disk space."
        Pop $0
    ${Else}
        ${NSD_CreateLabel} 0 60u 100% 20u "✗ FFmpeg not found on your system PATH"
        Pop $0
        SetCtlColors $0 0xCC0000 transparent ; Red color
        
        ; Checkbox disabled
        ${NSD_CreateCheckbox} 0 85u 100% 15u "Use my system FFmpeg (not available - FFmpeg not detected)"
        Pop $FFmpegCheckbox
        EnableWindow $FFmpegCheckbox 0 ; Disable checkbox
        
        ${NSD_CreateLabel} 0 105u 100% 40u "The bundled FFmpeg will be installed. If you install FFmpeg to your system PATH later, you can manually delete the ffmpeg folder from the installation directory."
        Pop $0
    ${EndIf}
    
    nsDialogs::Show
FunctionEnd

; Leave function - save user choice
Function FFmpegOptionsPageLeave
    ${NSD_GetState} $FFmpegCheckbox $UseSystemFFmpeg
FunctionEnd

; Post-install: Remove bundled FFmpeg if user chose system FFmpeg
Function .onInstSuccess
    ${If} $UseSystemFFmpeg == ${BST_CHECKED}
        ; Delete the bundled ffmpeg folder
        RMDir /r "$INSTDIR\resources\ffmpeg"
        
        ; Show message
        MessageBox MB_OK "Bundled FFmpeg has been removed. QuickCut will use your system FFmpeg installation."
    ${EndIf}
FunctionEnd

; Macro to be called during installation
!macro customInstall
    ; This runs during the install process
    DetailPrint "QuickCut installation complete"
!macroend

!macro customUnInstall
    ; Clean up ffmpeg folder on uninstall (if it exists)
    RMDir /r "$INSTDIR\resources\ffmpeg"
!macroend
