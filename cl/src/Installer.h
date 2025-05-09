#pragma once
#include <string>
#include <windows.h>

class Installer {
private:
  struct UninstallInfo {
    std::wstring DisplayName;
    std::wstring UninstallString;
    std::wstring InstallLocation;
    std::wstring Publisher;
    std::wstring DisplayVersion;
    DWORD EstimatedSize = 0;

    bool operator==(const UninstallInfo& other) const {
      return DisplayName == other.DisplayName && UninstallString == other.UninstallString && InstallLocation == other.InstallLocation &&
             Publisher == other.Publisher && DisplayVersion == other.DisplayVersion && EstimatedSize == other.EstimatedSize;
    }
  };
  struct InstallValidation {
    bool files;
    bool registry;
    bool services;
  };

public:
  enum InstallStage { FILESYSTEM = 0, REGISTRY_SERVICE };

  std::wstring GetInstallationDirectory();
  std::wstring GetTargetExecutablePath();

  InstallValidation ValidateInstallation() noexcept;
  bool IsInstalled() noexcept;
  bool HasPermissions() noexcept;
  void Install(bool reinstall = false);
  void Uninstall();
  void SetInstallStage(Installer::InstallStage newStage) noexcept;
  void RestartAsAdmin();

  InstallStage installStage = InstallStage::FILESYSTEM;

private:
  UninstallInfo ReadUninstallInfo();
  void WriteUninstallInfo(const UninstallInfo& info);
  void DeleteUninstallInfo();
  std::wstring GetKeyPath();

  void InstallToFilesystem(const std::wstring& installPath);
};