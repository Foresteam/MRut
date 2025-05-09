#include "global.h"

#include <filesystem>
#include <format>
#include <fstream>
#include <iostream>
#include <shlobj.h> // For SHGetKnownFolderPath
#include <shlwapi.h>
#include <vector>

#include "Installer.h"
#include "helpers/GeneralHelpers.h"
#include "helpers/InstallerHelpers.h"
namespace ih = InstallerHelpers;
namespace gh = GlobalHelpers;

std::wstring Installer::GetInstallationDirectory() {
  return ih::GetProgramFilesDirectory() + L"\\" + appConfig.appName;
}
std::wstring Installer::GetTargetExecutablePath() {
  return GetInstallationDirectory() + L"\\" + appConfig.targetExecutableName;
}

Installer::InstallValidation Installer::ValidateInstallation() noexcept {
  bool registry = false;
  try {
    auto info = ReadUninstallInfo();
    registry = true;
  }
  catch (Exception) {
  }
  return InstallValidation{.files = true, .registry = registry, .services = true};
}
bool Installer::IsInstalled() noexcept {
  auto validation = ValidateInstallation();
  return validation.files && validation.registry && validation.services;
}
bool Installer::HasPermissions() noexcept {
  return ih::IsRunAsAdmin();
}
void Installer::RestartAsAdmin() {
  ih::StartAsAdmin(gh::GetExecutableName().wstring(), gh::GetExecutableDirectory().wstring());
}

void Installer::Install(bool reinstall) {
  if (IsInstalled() && !reinstall)
    throw Exception(Error::ERROR_INSTALLER_ALREADY_INSTALLED);
  if (!ih::IsRunAsAdmin())
    throw Exception(Error::ERROR_INSUFFICIENT_ADMIN_PERMISSIONS);
  auto installPath = GetInstallationDirectory();

  if (installStage == InstallStage::FILESYSTEM) {
    InstallToFilesystem(installPath);
    return;
  }

  ih::RemoveScheduledTask(appConfig.appTaskName);
  ih::CreateInteractiveLogonTask(appConfig.appTaskName, GetTargetExecutablePath(), installPath);

  UninstallInfo info = {
      .DisplayName = appConfig.appName,
      .UninstallString = std::format(L"\"{}\\{}\" --uninstall", installPath, appConfig.targetExecutableName),
      .InstallLocation = installPath,
      .Publisher = L"Foresteam",
      .DisplayVersion = L"1.0.0",
      .EstimatedSize = 1024 * 10,
  };
  WriteUninstallInfo(info);
  std::cout << "Installation complete" << std::endl;
}
void Installer::Uninstall() {
  if (!IsInstalled())
    throw Exception(Error::ERROR_INSTALLER_NOT_INSTALLED);
  if (!ih::IsRunAsAdmin())
    throw Exception(Error::ERROR_INSUFFICIENT_ADMIN_PERMISSIONS);
  auto installPath = GetInstallationDirectory();

  if (ih::HasOtherInstances())
    ih::KillOtherInstances();

  ih::RemoveScheduledTask(appConfig.appTaskName);
  DeleteUninstallInfo();
  ih::RunUninstallBatch(installPath, appConfig.uninstallScriptName);
}

std::wstring Installer::GetKeyPath() {
  return L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\" + appConfig.appName;
}
Installer::UninstallInfo Installer::ReadUninstallInfo() {
  UninstallInfo info;

  // Open the registry key
  HKEY hKey;
  auto keyPath = GetKeyPath();

  if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, keyPath.c_str(), 0, KEY_READ | KEY_WOW64_64KEY, &hKey) != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_KEY_OPEN);

  // Read all values
  info.DisplayName = ih::ReadStringValue(hKey, L"DisplayName");
  info.UninstallString = ih::ReadStringValue(hKey, L"UninstallString");
  info.InstallLocation = ih::ReadStringValue(hKey, L"InstallLocation");
  info.Publisher = ih::ReadStringValue(hKey, L"Publisher");
  info.DisplayVersion = ih::ReadStringValue(hKey, L"DisplayVersion");
  info.EstimatedSize = ih::ReadDwordValue(hKey, L"EstimatedSize");

  RegCloseKey(hKey);
  return info;
}
void Installer::DeleteUninstallInfo() {
  auto keyPath = GetKeyPath();
  HKEY hKey;
  LONG result = RegOpenKeyExW(HKEY_LOCAL_MACHINE, keyPath.c_str(), 0, DELETE, &hKey);

  if (result != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_KEY_OPEN);

  result = RegDeleteKeyW(HKEY_LOCAL_MACHINE, keyPath.c_str());
  RegCloseKey(hKey);

  if (result != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_KEY_DELETE);
}

void Installer::WriteUninstallInfo(const Installer::UninstallInfo& info) {
  HKEY hKey;
  DWORD disposition; // REG_CREATED_NEW_KEY or REG_OPENED_EXISTING_KEY

  // Create or open the registry key
  auto keyPath = GetKeyPath();
  if (RegCreateKeyExW(HKEY_LOCAL_MACHINE, keyPath.c_str(), 0, nullptr, REG_OPTION_NON_VOLATILE, KEY_WRITE | KEY_WOW64_64KEY, nullptr, &hKey, &disposition) !=
      ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_KEY_OPEN);

  try {
    ih::WriteStringValue(hKey, L"DisplayName", info.DisplayName);
    ih::WriteStringValue(hKey, L"UninstallString", info.UninstallString);
    ih::WriteStringValue(hKey, L"InstallLocation", info.InstallLocation);
    ih::WriteStringValue(hKey, L"Publisher", info.Publisher);
    ih::WriteStringValue(hKey, L"DisplayVersion", info.DisplayVersion);
    ih::WriteDwordValue(hKey, L"EstimatedSize", info.EstimatedSize);

    ih::WriteStringValue(hKey, L"InstallDate", ih::GetCurrentDateString().c_str());
    ih::WriteDwordValue(hKey, L"NoModify", true);
    ih::WriteDwordValue(hKey, L"NoRepair", true);
    RegCloseKey(hKey);
  }
  catch (Exception e) {
    RegCloseKey(hKey);
    throw e;
  }
}

void Installer::SetInstallStage(Installer::InstallStage newStage) noexcept {
  installStage = newStage;
}

void Installer::InstallToFilesystem(const std::wstring& installPath) {
  // Ensure target directory exists
  if (!PathFileExistsW(installPath.c_str())) {
    if (!CreateDirectoryW(installPath.c_str(), NULL)) {
      DWORD err = GetLastError();
      std::wcerr << L"Failed to create install directory. Error: " << err << std::endl;
      throw Exception(Error::ERROR_INSTALLER_INSTALL_CREATE_INSTALL_DIRECTORY);
    }
  }

  auto exePath = gh::GetExecutablePath().wstring();
  std::wstring destPath = installPath + L"\\" + appConfig.targetExecutableName;

  if (_wcsicmp(exePath.c_str(), destPath.c_str()) == 0) {
    throw Exception(Error::ERROR_INSTALLER_ALREADY_INSTALLED_MOVE_SELF);
  }

  // Copy the executable to target location
  if (!CopyFileW(exePath.c_str(), destPath.c_str(), FALSE)) {
    DWORD err = GetLastError();
    std::wcerr << L"Failed to copy executable. Error: " << err << std::endl;
    throw Exception(Error::ERROR_INSTALLER_INSTALL_COPY_SELF);
  }

  ih::CreateUninstallBatch(installPath, appConfig.uninstallScriptName, gh::WstringToString(appConfig.targetExecutableName));

  ih::StartAsAdmin(appConfig.targetExecutableName, installPath, L"-i1");

  ExitProcess(0);
}