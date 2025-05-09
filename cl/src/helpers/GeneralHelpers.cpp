#include <fstream>
#include <iostream>
#include <sstream>
#ifdef _WIN32
#include <windows.h>
#endif

#include "GeneralHelpers.h"

std::filesystem::path GlobalHelpers::GetExecutablePath() {
  // Get the path to the executable
  std::filesystem::path exePath = std::filesystem::current_path(); // Default to current dir

#if defined(_WIN32)
  wchar_t path[MAX_PATH] = { 0 };
  GetModuleFileNameW(NULL, path, MAX_PATH);
  exePath = path;
#elif defined(__linux__) || defined(__APPLE__)
  char path[PATH_MAX] = { 0 };
  ssize_t count = readlink("/proc/self/exe", path, PATH_MAX);
  if (count != -1) {
    exePath = path;
  }
#endif

  return exePath;
}

std::filesystem::path GlobalHelpers::GetExecutableName() {
  return GetExecutablePath().filename();
}

std::filesystem::path GlobalHelpers::GetExecutableDirectory() {
  return GetExecutablePath().parent_path();
}

std::vector<unsigned char> GlobalHelpers::ReadFile(const std::string& filename) {
  std::ifstream file(filename, std::ios::binary);
  if (!file) {
    throw std::runtime_error("Cannot open file: " + filename);
  }

  // Correct way to construct from iterators:
  std::vector<unsigned char> buffer;
  file >> std::noskipws; // Don't skip whitespace
  std::copy(std::istreambuf_iterator<char>(file), std::istreambuf_iterator<char>(), std::back_inserter(buffer));
  buffer.push_back(0);

  return buffer;
}

std::wstring GlobalHelpers::StringToWstring(const std::string& str, unsigned int encoding) {
  if (str.empty())
    return L"";

  // Get required buffer size
  auto cStr = str.c_str();
  int len = MultiByteToWideChar(encoding, 0, cStr, -1, nullptr, 0);
  if (len == 0)
    return L"";

  // Allocate buffer and convert
  std::vector<wchar_t> buf(len);
  MultiByteToWideChar(encoding, 0, cStr, -1, buf.data(), len);

  return std::wstring(buf.data());
}
std::string GlobalHelpers::WstringToString(const std::wstring& wstr) {
  std::string str;
  str.reserve(wstr.size() * 4); // UTF-8 can use up to 4 bytes per char

  std::mbstate_t state {};
  char mb[MB_LEN_MAX] {};
  for (wchar_t wc : wstr) {
    std::size_t len = std::wcrtomb(mb, wc, &state);
    if (len == static_cast<std::size_t>(-1))
      break; // Error
    str.append(mb, len);
  }
  return str;
}
// Convert UTF-16 std::wstring to UTF-8 std::string
std::string GlobalHelpers::WindowsWstringToString(const std::wstring& wstr) {
  if (wstr.empty())
    return "";

  int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), nullptr, 0, nullptr, nullptr);

  std::string utf8(size_needed, 0);
  WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), &utf8[0], size_needed, nullptr, nullptr);

  return utf8;
}

void Logger::Log(std::string_view log, Logger::LogLevel level) {
  std::ofstream file("mrut.log", std::ios::app);
  std::string levelPrefix;
  std::ostream* stream = nullptr;
  switch (level) {
  case LOG_ERROR:
    stream = &std::cerr;
    levelPrefix = "ERROR: ";
    break;
  case LOG_INFO:
    stream = &std::cout;
    levelPrefix = "INFO: ";
    break;
  case LOG_WARNING:
    stream = &std::cout;
    levelPrefix = "WARNING: ";
    break;
  }

  *stream << levelPrefix;
  *stream << log.data();
  *stream << '\n';

  file << levelPrefix;
  file << log.data();
  file << '\n';
  file.close();
}
void Logger::Log(const std::wstring& log, Logger::LogLevel level) {
  auto string = GlobalHelpers::WstringToString(log);
  Log(string, level);
}
void Logger::LogError(const std::string& log, uint64_t code) {
  std::stringstream ss;
  ss << log << " CODE " << code;
  std::string resultLog;
  ss >> resultLog;
  Log(resultLog, LOG_ERROR);
}