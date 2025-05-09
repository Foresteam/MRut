#include "../global.h"

#include "../Installer.h"
#include "GeneralHelpers.h"
#include "InstallerHelpers.h"
#include <comdef.h>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <shlobj.h> // For SHGetKnownFolderPath
#include <shlwapi.h>
#include <sstream>
#include <string>
#include <taskschd.h>
#include <tlhelp32.h>
#include <vector>
#include <wincrypt.h>

std::wstring InstallerHelpers::GetProgramFilesDirectory() {
  PWSTR path = nullptr;
  HRESULT hr = SHGetKnownFolderPath(FOLDERID_ProgramFiles, 0, nullptr, &path);

  std::wstring programFilesPath;
  if (SUCCEEDED(hr)) {
    programFilesPath = path;
    CoTaskMemFree(path); // Free allocated memory
  }

  return programFilesPath;
}

std::wstring InstallerHelpers::ReadStringValue(HKEY hKey, const wchar_t* valueName) {
  DWORD size = 0;
  if (RegGetValueW(hKey, nullptr, valueName, RRF_RT_REG_SZ, nullptr, nullptr, &size) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_READ_STRING);

  std::vector<wchar_t> buffer(size / sizeof(wchar_t));
  if (RegGetValueW(hKey, nullptr, valueName, RRF_RT_REG_SZ, nullptr, buffer.data(), &size) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_READ_STRING);

  return std::wstring(buffer.data());
}
DWORD InstallerHelpers::ReadDwordValue(HKEY hKey, const wchar_t* valueName) {
  DWORD value = 0;
  DWORD size = sizeof(DWORD);
  if (RegGetValueW(hKey, nullptr, valueName, RRF_RT_REG_DWORD, nullptr, &value, &size) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_READ_DWORD);
  return value;
}
void InstallerHelpers::WriteStringValue(HKEY hKey, const wchar_t* valueName, const std::wstring& value) {
  if (RegSetValueExW(hKey, valueName, 0, REG_SZ, reinterpret_cast<const BYTE*>(value.c_str()), (value.size() + 1) * sizeof(wchar_t)) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_WRITE_STRING);
}
void InstallerHelpers::WriteDwordValue(HKEY hKey, const wchar_t* valueName, DWORD value) {
  if (RegSetValueExW(hKey, valueName, 0, REG_DWORD, reinterpret_cast<const BYTE*>(&value), sizeof(DWORD)) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_WRITE_DWORD);
}
bool InstallerHelpers::IsRunAsAdmin() {
  BOOL isAdmin = FALSE;
  PSID adminGroup;

  // Allocate and initialize a SID for the Administrators group
  SID_IDENTIFIER_AUTHORITY NtAuthority = SECURITY_NT_AUTHORITY;
  if (!AllocateAndInitializeSid(&NtAuthority, 2, SECURITY_BUILTIN_DOMAIN_RID, DOMAIN_ALIAS_RID_ADMINS, 0, 0, 0, 0, 0, 0, &adminGroup)) {
    return false;
  }

  // Check if the token has the Administrators group
  if (!CheckTokenMembership(NULL, adminGroup, &isAdmin)) {
    isAdmin = FALSE;
  }

  FreeSid(adminGroup);
  return isAdmin != FALSE;
}
void InstallerHelpers::StartAsAdmin(const std::wstring& executableName, const std::wstring& workingDirectory, const std::wstring& args) {
  // Prepare command line arguments
  std::wstring parameters = args; // Default argument
  auto executablePath = workingDirectory + L"\\" + executableName;

  // Get and parse existing command line
  LPWSTR existingArgs = GetCommandLineW();
  if (existingArgs && wcslen(existingArgs) > 0) {
    // Skip executable path (handles both quoted and unquoted cases)
    if (existingArgs[0] == L'"') {
      existingArgs = wcschr(existingArgs + 1, L'"');
      if (existingArgs)
        existingArgs++;
    }
    else {
      existingArgs = wcschr(existingArgs, L' ');
    }

    // Append remaining arguments if they exist
    if (existingArgs && *existingArgs) {
      parameters += L" ";
      parameters += existingArgs;
    }
  }

  // Prepare execution info
  SHELLEXECUTEINFOW sei = { sizeof(sei) };
  sei.lpVerb = L"runas";               // Request UAC elevation
  sei.lpFile = executablePath.c_str(); // Target executable
  sei.lpParameters = parameters.c_str();
  sei.lpDirectory = workingDirectory.c_str(); // Set working directory
  sei.nShow = SW_SHOWNORMAL;
  sei.fMask = SEE_MASK_NOCLOSEPROCESS;

  // Launch the process
  if (!ShellExecuteExW(&sei))
    throw Exception(Error::ERROR_ELEVATION, GetLastError(), "Failed to launch elevated instance");
}
void InstallerHelpers::CreateUninstallBatch(const std::filesystem::path& installDir, const std::wstring& scriptName, const std::string& appFileName) {
  std::ofstream batchFile(installDir.wstring() + L"\\" + scriptName);
  if (!batchFile) {
    std::cerr << "Couldn't open uninstall batch for writing" << std::endl;
    throw Exception(Error::ERROR_INSTALLER_INSTALL_CREATE_UNINSTALL_BATCH);
  }

  batchFile << "@echo off\n";
  batchFile << "chcp 65001 > nul\n";
  batchFile << "echo Waiting for program to exit...\n";

  // Wait in loop until process exits
  batchFile << ":waitloop\n";
  batchFile << "tasklist /FI \"IMAGENAME eq " + appFileName + "\" 2>nul | find /I \"" + appFileName + "\" >nul\n";
  batchFile << "if not errorlevel 1 (\n";
  batchFile << "  timeout /t 1 /nobreak > nul\n";
  batchFile << "  goto waitloop\n";
  batchFile << ")\n";

  batchFile << R"(echo Set objWS = CreateObject("WScript.Shell") > "%temp%\uninstall_msg.vbs")" << '\n';
  batchFile << R"(echo objWS.Popup "Successfully uninstalled", 0, "Successfully uninstalled", vbInformation >> "%temp%\uninstall_msg.vbs")" << '\n';
  batchFile << R"(wscript "%temp%\uninstall_msg.vbs")" << '\n';

  batchFile << "echo Uninstalling...\n";
  batchFile << R"(del "%temp%\uninstall_msg.vbs")" << '\n';
  batchFile << "rmdir /s /q \"" << installDir.string() << "\"\n";
  // Self-delete technique
  batchFile << "(goto) 2>nul & del \"%~f0\"\n";
  batchFile.close();
}
void InstallerHelpers::RunUninstallBatch(const std::filesystem::path& installDir, const std::wstring& scriptName) {
  std::wstring batchPath = installDir.wstring() + L"\\" + scriptName;

  // Verify batch file exists
  if (!std::filesystem::exists(batchPath)) {
    throw Exception(Error::ERROR_INSTALLER_UNINSTALL_BATCH_MISSING);
  }

  // Prepare the command
  std::wstring cmd = L"cmd /c start \"\" /B \"" + batchPath + L"\"";

  // Launch the process
  STARTUPINFOW si = { sizeof(si) };
  PROCESS_INFORMATION pi;

  if (!CreateProcessW(NULL, cmd.data(), NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &si, &pi)) {
    DWORD err = GetLastError();
    std::wcerr << L"Failed to launch uninstaller. Error: " << err << std::endl;
    throw Exception(Error::ERROR_ERROR_INSTALLER_LAUNCH_UNINSTALL);
  }

  // Close process handles
  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);
}

/** @returns YYYYMMDD date string */
std::wstring InstallerHelpers::GetCurrentDateString() {
  auto t = std::time(nullptr);
  auto tm = *std::localtime(&t);

  std::wostringstream woss;
  woss << (tm.tm_year + 1900) << std::setfill(L'0') << std::setw(2) << (tm.tm_mon + 1) << std::setw(2) << tm.tm_mday;
  return woss.str();
}

void InstallerHelpers::CreateInteractiveLogonTask(const std::wstring& taskName, const std::wstring& command, const std::wstring& workingDirectory) {
  HRESULT hr = S_OK;
  ITaskService* pService = nullptr;
  ITaskFolder* pRootFolder = nullptr;
  IRegisteredTask* pRegisteredTask = nullptr;
  ITaskDefinition* pTask = nullptr;
  IPrincipal* pPrincipal = nullptr;
  IRegistrationInfo* pRegInfo = nullptr;
  ITriggerCollection* pTriggerCollection = nullptr;
  ITrigger* pTrigger = nullptr;
  ILogonTrigger* pLogonTrigger = nullptr;
  IActionCollection* pActionCollection = nullptr;
  IAction* pAction = nullptr;
  IExecAction* pExecAction = nullptr;
  ITaskSettings* pSettings = nullptr;

  // Initialize COM
  hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(hr)) {
    throw Exception(Error::ERROR_COM_INIT);
  }

  // Create Task Service object
  hr = CoCreateInstance(CLSID_TaskScheduler, nullptr, CLSCTX_INPROC_SERVER, IID_ITaskService, reinterpret_cast<void**>(&pService));
  if (FAILED(hr)) {
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_SERVICE_CREATE);
  }

  // Connect to task service
  hr = pService->Connect(_variant_t(), _variant_t(), _variant_t(), _variant_t());
  if (FAILED(hr)) {
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_SERVICE_CONNECT);
  }

  // Get root folder
  hr = pService->GetFolder(_bstr_t(L"\\"), &pRootFolder);
  if (FAILED(hr)) {
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_FOLDER_ACCESS);
  }

  // Delete existing task if it exists
  pRootFolder->DeleteTask(_bstr_t(taskName.c_str()), 0);

  // Create new task definition
  hr = pService->NewTask(0, &pTask);
  if (FAILED(hr)) {
    pRootFolder->Release();
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_DEFINITION_CREATE);
  }

  // Configure task settings
  hr = pTask->get_Settings(&pSettings);
  if (SUCCEEDED(hr)) {
    // Enable wake-on-LAN (from third image)
    pSettings->put_WakeToRun(VARIANT_TRUE);

    // Configure power settings (from fourth image)
    pSettings->put_DisallowStartIfOnBatteries(VARIANT_FALSE); // Allow on battery
    pSettings->put_StopIfGoingOnBatteries(VARIANT_FALSE);     // DON'T Stop if switching to battery

    // Remove execution time limit (set to infinite)
    pSettings->put_ExecutionTimeLimit(_bstr_t(L"PT0S")); // <-- This removes the timeout

    pSettings->Release();
  }

  // Set registration info
  hr = pTask->get_RegistrationInfo(&pRegInfo);
  if (SUCCEEDED(hr)) {
    pRegInfo->put_Author(_bstr_t(L"System"));
    pRegInfo->Release();
  }

  // Set principal for interactive access
  hr = pTask->get_Principal(&pPrincipal);
  if (SUCCEEDED(hr)) {
    pPrincipal->put_RunLevel(TASK_RUNLEVEL_HIGHEST);
    pPrincipal->put_LogonType(TASK_LOGON_INTERACTIVE_TOKEN);
    pPrincipal->put_Id(_bstr_t(L"InteractiveUser"));
    pPrincipal->Release();
  }

  // Create logon trigger
  hr = pTask->get_Triggers(&pTriggerCollection);
  if (SUCCEEDED(hr)) {
    hr = pTriggerCollection->Create(TASK_TRIGGER_LOGON, &pTrigger);
    if (SUCCEEDED(hr)) {
      hr = pTrigger->QueryInterface(IID_ILogonTrigger, reinterpret_cast<void**>(&pLogonTrigger));
      if (SUCCEEDED(hr)) {
        pLogonTrigger->Release();
      }
      pTrigger->Release();
    }
    pTriggerCollection->Release();
  }

  // Create action
  hr = pTask->get_Actions(&pActionCollection);
  if (SUCCEEDED(hr)) {
    hr = pActionCollection->Create(TASK_ACTION_EXEC, &pAction);
    if (SUCCEEDED(hr)) {
      hr = pAction->QueryInterface(IID_IExecAction, reinterpret_cast<void**>(&pExecAction));
      if (SUCCEEDED(hr)) {
        pExecAction->put_Path(_bstr_t(command.c_str()));
        pExecAction->put_WorkingDirectory(_bstr_t(workingDirectory.length() > 0 ? workingDirectory.c_str() : L"C:\\Windows\\System32"));
        pExecAction->Release();
      }
      pAction->Release();
    }
    pActionCollection->Release();
  }

  // Register the task
  hr = pRootFolder->RegisterTaskDefinition(_bstr_t(taskName.c_str()), pTask, TASK_CREATE_OR_UPDATE, _variant_t(), _variant_t(), TASK_LOGON_INTERACTIVE_TOKEN,
                                           _variant_t(L""), &pRegisteredTask);

  if (FAILED(hr)) {
    pTask->Release();
    pRootFolder->Release();
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_REGISTRATION);
  }

  // Clean up
  if (pRegisteredTask)
    pRegisteredTask->Release();
  if (pTask)
    pTask->Release();
  if (pRootFolder)
    pRootFolder->Release();
  if (pService)
    pService->Release();
  CoUninitialize();
}
void InstallerHelpers::RemoveScheduledTask(const std::wstring& taskName) {
  HRESULT hr = S_OK;
  ITaskService* pService = nullptr;
  ITaskFolder* pRootFolder = nullptr;

  // Initialize COM
  hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(hr)) {
    throw Exception(Error::ERROR_COM_INIT);
  }

  // Create Task Service object
  hr = CoCreateInstance(CLSID_TaskScheduler, nullptr, CLSCTX_INPROC_SERVER, IID_ITaskService, reinterpret_cast<void**>(&pService));
  if (FAILED(hr)) {
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_SERVICE_CREATE);
  }

  // Connect to task service
  hr = pService->Connect(_variant_t(), _variant_t(), _variant_t(), _variant_t());
  if (FAILED(hr)) {
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_SERVICE_CONNECT);
  }

  // Get root folder
  hr = pService->GetFolder(_bstr_t(L"\\"), &pRootFolder);
  if (FAILED(hr)) {
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_FOLDER_ACCESS);
  }

  // Delete the task (ignore if it doesn't exist)
  hr = pRootFolder->DeleteTask(_bstr_t(taskName.c_str()), 0);
  if (FAILED(hr) && hr != HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND)) {
    pRootFolder->Release();
    pService->Release();
    CoUninitialize();
    throw Exception(Error::ERROR_TASK_DELETION);
  }

  // Clean up
  pRootFolder->Release();
  pService->Release();
  CoUninitialize();
}

std::vector<DWORD> FindOtherInstancesByPath() {
  DWORD currentPID = GetCurrentProcessId();
  std::wstring currentExePath(MAX_PATH, L'\0');
  if (!GetModuleFileNameW(nullptr, currentExePath.data(), MAX_PATH)) {
    throw Exception(Error::ERROR_PROCESS_ENUMERATION, GetLastError(), "Failed to get current executable path");
  }
  currentExePath.resize(wcslen(currentExePath.c_str()));

  HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (hSnapshot == INVALID_HANDLE_VALUE) {
    throw Exception(Error::ERROR_PROCESS_ENUMERATION, GetLastError(), "Failed to create process snapshot");
  }

  PROCESSENTRY32W pe32;
  pe32.dwSize = sizeof(PROCESSENTRY32W);
  std::vector<DWORD> otherInstances;

  if (!Process32FirstW(hSnapshot, &pe32)) {
    DWORD err = GetLastError();
    CloseHandle(hSnapshot);
    throw Exception(Error::ERROR_PROCESS_ENUMERATION, err, "Failed to enumerate processes");
  }

  do {
    if (pe32.th32ProcessID == currentPID)
      continue;

    HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pe32.th32ProcessID);
    if (hProcess) {
      std::wstring exePath(MAX_PATH, L'\0');
      DWORD size = MAX_PATH;
      if (QueryFullProcessImageNameW(hProcess, 0, exePath.data(), &size)) {
        exePath.resize(size);
        if (exePath == currentExePath) {
          otherInstances.push_back(pe32.th32ProcessID);
        }
      }
      CloseHandle(hProcess);
    }
  } while (Process32NextW(hSnapshot, &pe32));

  CloseHandle(hSnapshot);
  return otherInstances;
}

bool InstallerHelpers::HasOtherInstances() {
  try {
    return !FindOtherInstancesByPath().empty();
  }
  catch (const Exception&) {
    throw; // Re-throw our custom exceptions
  }
  catch (...) {
    throw Exception(Error::ERROR_UNKNOWN, 0, "Unexpected error checking for other instances");
  }
}

void InstallerHelpers::KillOtherInstances() {
  try {
    std::vector<DWORD> instances = FindOtherInstancesByPath();

    for (DWORD pid : instances) {
      HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
      if (hProcess) {
        if (!TerminateProcess(hProcess, 0)) {
          DWORD err = GetLastError();
          CloseHandle(hProcess);
          throw Exception(Error::ERROR_PROCESS_TERMINATION, err, "Failed to terminate process " + std::to_string(pid));
        }
        CloseHandle(hProcess);
      }
      else {
        throw Exception(Error::ERROR_PROCESS_ACCESS_DENIED, GetLastError(), "Failed to open process " + std::to_string(pid));
      }
    }
  }
  catch (const Exception&) {
    throw; // Re-throw our custom exceptions
  }
  catch (...) {
    throw Exception(Error::ERROR_UNKNOWN, 0, "Unexpected error killing other instances");
  }
}