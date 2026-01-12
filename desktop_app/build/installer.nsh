; Custom NSIS installer script to handle app closing
; This script helps the installer properly detect and close the running application

; Function to close the application before installation
Function .onInit
  ; Check if app is running and close it
  FindWindow $0 "" "Savdo Programma"
  IntCmp $0 0 done
    MessageBox MB_OK|MB_ICONEXCLAMATION "Savdo Programma ishlayapti. Iltimos, dasturni yoping va qayta urinib ko'ring."
    Abort
  done:
FunctionEnd

; Pre-installation: Close app if running
!macro customPreInstall
  ; Try to close gracefully first
  FindWindow $0 "" "Savdo Programma"
  IntCmp $0 0 skipClose
    SendMessage $0 ${WM_CLOSE} 0 0
    Sleep 2000
    ; Force kill if still running
    ExecWait 'taskkill /F /IM "Savdo Programma.exe" /T' $0
    ExecWait 'taskkill /F /IM "electron.exe" /FI "WINDOWTITLE eq Savdo Programma*" /T' $0
    Sleep 1000
  skipClose:
!macroend

; Post-installation: Optional cleanup
!macro customPostInstall
  ; Installation completed successfully
!macroend
