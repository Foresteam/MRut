#pragma once
#include <filesystem>
#include <string>

namespace GlobalHelpers {
  std::filesystem::path GetExecutablePath();
  std::filesystem::path GetExecutableName();
  std::filesystem::path GetExecutableDirectory();
  std::vector<unsigned char> ReadFile(const std::string& filename);

  // CP_UTF8
  std::wstring StringToWstring(const std::string& str, unsigned int encoding = 65001);
  std::string WstringToString(const std::wstring& wstr);
  std::string WindowsWstringToString(const std::wstring& wstr);
} // namespace GlobalHelpers
class Logger {
public:
  enum LogLevel { LOG_INFO = 0, LOG_WARNING, LOG_ERROR };
  static void Log(std::string_view log, LogLevel level = LOG_INFO);
  static void Log(const std::wstring& log, LogLevel level = LOG_INFO);
  static void LogError(const std::string& log, uint64_t code);
};