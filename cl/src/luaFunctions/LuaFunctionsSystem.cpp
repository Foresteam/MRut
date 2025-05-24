#include "../Hwid.h"
#include "../helpers/GeneralHelpers.h"
#include "LuaFunctions.h"
#include <array>
#include <commctrl.h>
#pragma comment(                                                                                                                                               \
    linker,                                                                                                                                                    \
    "/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")

LPCWSTR ToWstr(const string& s) {
  wstring stemp = wstring(s.begin(), s.end());
  LPCWSTR sw = stemp.c_str();
  return sw;
}

string LuaFunctions::exec(string cmd) {
#ifdef _WIN32
  array<char, 128> buffer;
  string result;
  unique_ptr<FILE, decltype(&_pclose)> pipe(_popen(cmd.c_str(), "r"), _pclose);
  if (!pipe) {
    throw runtime_error("_popen() failed!");
  }
  while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
    result += buffer.data();
  }
  return result;
#else
  array<char, 128> buffer;
  string result;
  unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd.c_str(), "r"), pclose);
  if (!pipe) {
    throw runtime_error("popen() failed!");
  }
  while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
    result += buffer.data();
  }
  return result;
#endif
}

/// @param cmd Command
/// @returns Result of execution
string LuaFunctions::Lua::System::Exec(const string& cmd) {
  return exec(cmd);
}

void LuaFunctions::Lua::System::AExec(const string& cmd) {
  static list<thread> thrs = list<thread>();
  thrs.push_front(thread(exec, cmd));
}

void LuaFunctions::Lua::System::Sleep(const int64_t& ms) {
  this_thread::sleep_for(chrono::milliseconds(ms));
}

long long LuaFunctions::Lua::System::GetTimeMs() {
  using namespace std::chrono;
  return duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
}

string LuaFunctions::Lua::System::GetHwid() {
  return Hwid::GetHwid();
}

#ifdef _WIN32
LONG MapMessageBoxIcon(LuaFunctions::Lua::System::MessageBoxType type);
bool LuaFunctions::Lua::System::Dialog::Confirm(const std::string& title, const std::string& text, MessageBoxType type) {
  UINT flags = MB_YESNO | MapMessageBoxIcon(type);

  int result = MessageBoxW(NULL, GlobalHelpers::StringToWstring(text).c_str(), GlobalHelpers::StringToWstring(title).c_str(), flags);
  return (result == IDYES); // Returns true if "Yes" was clicked
}
// system(("kdialog --msgbox \"" + msg + "\" --title \"" + title + '"').c_str());
void LuaFunctions::Lua::System::Dialog::Ok(const std::string& title, const std::string& text, MessageBoxType type) {
  UINT flags = MB_OK | MapMessageBoxIcon(type);

  MessageBoxW(NULL, GlobalHelpers::StringToWstring(text).c_str(), GlobalHelpers::StringToWstring(title).c_str(), flags);
}
std::wstring g_inputText;
HRESULT CALLBACK TaskDialogCallbackProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam, LONG_PTR lpRefData) {
  switch (msg) {
  case TDN_CREATED: {
    HWND hEdit = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_CHILD | WS_VISIBLE | ES_AUTOHSCROLL | WS_TABSTOP, 20, 0, 300,
                                 23, // Adjust positioning and size
                                 hwnd, (HMENU)1000, NULL, NULL);

    SendMessage(hEdit, WM_SETFONT, (WPARAM)SendMessage(hwnd, WM_GETFONT, 0, 0), TRUE);
    SetFocus(hEdit);
    break;
  }
  case TDN_BUTTON_CLICKED:
    // When OK is clicked, get the text from the edit control
    if (wParam == IDOK) {
      HWND hEdit = GetDlgItem(hwnd, 1000);
      if (hEdit) {
        wchar_t buffer[256] = { 0 };
        GetWindowTextW(hEdit, buffer, ARRAYSIZE(buffer));
        g_inputText = buffer;
      }
    }
    break;
  }
  return S_OK;
}
std::string LuaFunctions::Lua::System::Dialog::Input(const std::string& title, const std::string& prompt) {
  // Initialize common controls
  INITCOMMONCONTROLSEX icc;
  icc.dwSize = sizeof(icc);
  icc.dwICC = ICC_STANDARD_CLASSES;
  InitCommonControlsEx(&icc);

  // Reset input text
  g_inputText.clear();

  TASKDIALOGCONFIG config = { sizeof(config) };
  config.hwndParent = NULL;
  config.dwFlags = TDF_USE_COMMAND_LINKS | TDF_ALLOW_DIALOG_CANCELLATION | TDF_CALLBACK_TIMER;
  // config.pszWindowTitle = GlobalHelpers::StringToWstring(title).c_str();
  // config.pszMainInstruction = GlobalHelpers::StringToWstring(prompt).c_str();
  config.pszWindowTitle = L"";
  config.pszMainInstruction = L"";
  config.pfCallback = TaskDialogCallbackProc;
  config.lpCallbackData = 0;

  // Buttons
  const TASKDIALOG_BUTTON buttons[] = { { IDOK, L"&OK" } };
  config.pButtons = buttons;
  config.cButtons = ARRAYSIZE(buttons);

  int nButton = 0;
  BOOL bChecked = FALSE;

  // Show the dialog
  TaskDialogIndirect(&config, &nButton, NULL, &bChecked);

  return GlobalHelpers::WindowsWstringToString((nButton == IDOK) ? g_inputText : L"");
}

LONG MapMessageBoxIcon(LuaFunctions::Lua::System::MessageBoxType type) {
  using namespace LuaFunctions::Lua::System;
  switch (type) {
  case MESSAGEBOX_INFO:
    return MB_ICONASTERISK;
  case MESSAGEBOX_WARNING:
    return MB_ICONEXCLAMATION;
  case MESSAGEBOX_ERROR:
    return MB_ICONHAND;
  case MESSAGEBOX_QUESTION:
    return MB_ICONQUESTION;
  case MESSAGEBOX_BLANK:
  default:
    return 0; // No icon
  }
}
#endif
