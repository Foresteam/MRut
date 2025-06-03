#include <string>

namespace Hwid {
  std::string GetHwid();
  void GeneratePcUuidV4(const std::wstring& registryPath);
  std::string GetPcUuidV4() noexcept;
}