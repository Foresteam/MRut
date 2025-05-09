#pragma once
#include <filesystem>
#include <windows.h>

namespace InstallerHelpers {
  std::wstring GetProgramFilesDirectory();

  std::wstring ReadStringValue(HKEY hKey, const wchar_t* valueName);
  DWORD ReadDwordValue(HKEY hKey, const wchar_t* valueName);
  void WriteStringValue(HKEY hKey, const wchar_t* valueName, const std::wstring& value);
  void WriteDwordValue(HKEY hKey, const wchar_t* valueName, DWORD value);

  void CreateUninstallBatch(const std::filesystem::path& installDir, const std::wstring& scriptName, const std::string& appFileName);
  void RunUninstallBatch(const std::filesystem::path& installDir, const std::wstring& scriptName);

  bool IsRunAsAdmin();
  void StartAsAdmin(const std::wstring& executableName, const std::wstring& workingDirectory, const std::wstring& args = L"");
  std::wstring GetCurrentDateString();

  void CreateInteractiveLogonTask(const std::wstring& taskName, const std::wstring& command, const std::wstring& workingDirectory = L"");
  void RemoveScheduledTask(const std::wstring& taskName);

  bool HasOtherInstances();
  void KillOtherInstances();
} // namespace InstallerHelpers