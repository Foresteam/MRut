#include "../helpers/GeneralHelpers.h"
#include "LuaFunctions.h"
#include <chrono>
#include <filesystem>
#include <fstream>
#include <sstream>
#ifdef WIN32
#include <codecvt>
#include <locale>
#include <vector>
#include <windows.h>
#endif

namespace fs = filesystem;

bool deleteRecursively(const fs::path& path, std::error_code& ec) {
  try {
    if (!fs::exists(path, ec)) {
      if (ec)
        return false;
      return true; // Path doesn't exist - consider this success
    }

// Remove read-only attributes if needed (Windows)
#ifdef _WIN32
    fs::permissions(path, fs::perms::owner_all, fs::perm_options::add, ec);
#else
    fs::permissions(path, fs::perms::all, fs::perm_options::add, ec);
#endif

    if (fs::is_directory(path, ec)) {
      for (const auto& entry : fs::directory_iterator(path, ec)) {
        if (ec)
          return false;
        if (!deleteRecursively(entry.path(), ec)) {
          return false;
        }
      }
    }

    return fs::remove(path, ec);
  }
  catch (const std::exception& e) {
    ec = std::error_code(errno, std::generic_category());
    std::cerr << "Error deleting " << path << ": " << e.what() << '\n';
    return false;
  }
}

vector<pair<string, KNOWNFOLDERID>> LuaFunctions::placeIds = { { "Home", FOLDERID_Profile },        { "Desktop", FOLDERID_Desktop },
                                                               { "Downloads", FOLDERID_Downloads }, { "Documents", FOLDERID_Documents },
                                                               { "Pictures", FOLDERID_Pictures },   { "Videos", FOLDERID_Videos } };
string LuaFunctions::GetKnownFolderPath(const KNOWNFOLDERID& folderId) {
  PWSTR widePath = nullptr;
  if (SUCCEEDED(SHGetKnownFolderPath(folderId, 0, nullptr, &widePath))) {
    // Convert wide string to narrow string
    wstring_convert<codecvt_utf8_utf16<wchar_t>> converter;
    string narrowPath = converter.to_bytes(widePath);
    CoTaskMemFree(widePath);
    return narrowPath;
  }
  return "";
}

int LuaFunctions::Lua::Fs::CListDirectory(lua_State* L) {
  // Get directory path from Lua argument
  const char* path = luaL_checkstring(L, 1);

  // Create new table to hold results
  lua_newtable(L);
  int resultTableIdx = lua_gettop(L);
  int entryIndex = 1; // Lua arrays start at 1

  try {
    for (const auto& entry : fs::directory_iterator(path)) {
      // Create table for this entry
      lua_newtable(L);
      int entryTableIdx = lua_gettop(L);

      // Push name field - using u8string() for proper UTF-8 encoding
      std::string filename = reinterpret_cast<const char*>(entry.path().filename().u8string().c_str());
      lua_pushstring(L, filename.c_str());
      lua_setfield(L, entryTableIdx, "name");

      // Push path field - using u8string() for proper UTF-8 encoding
      std::string path = reinterpret_cast<const char*>(entry.path().u8string().c_str());
      lua_pushstring(L, path.c_str());
      lua_setfield(L, entryTableIdx, "path");

      // Push isDirectory field
      lua_pushboolean(L, entry.is_directory());
      lua_setfield(L, entryTableIdx, "isDirectory");

      if (!entry.is_directory()) {
        // Push size
        lua_pushinteger(L, static_cast<lua_Integer>(entry.file_size()));
        lua_setfield(L, entryTableIdx, "size");
      }

      // Push last modified time (works for both files and directories)
      auto ftime = entry.last_write_time();
      auto sctp = chrono::time_point_cast<chrono::system_clock::duration>(ftime - fs::file_time_type::clock::now() + chrono::system_clock::now());
      time_t timeS = chrono::system_clock::to_time_t(sctp);
      lua_pushinteger(L, static_cast<lua_Integer>(timeS * 1000));
      lua_setfield(L, entryTableIdx, "dateModified");

      // Add entry to results table
      lua_rawseti(L, resultTableIdx, entryIndex++);
    }
  }
  catch (const fs::filesystem_error& e) {
    cerr << "Filesystem error: " << e.what() << endl;
    lua_pop(L, 1); // Remove the table we created
                   // Return empty table (already created)
  }
  catch (...) {
    cerr << "Unknown error while listing directory" << endl;
    lua_pop(L, 1); // Remove the table we created
                   // Return empty table (already created)
  }

  // Return the results table (already on stack)
  return 1;
}
int LuaFunctions::Lua::Fs::CListDisks(lua_State* L) {
#ifdef WIN32
  // Create a new Lua table
  lua_newtable(L);
  int tableIndex = lua_gettop(L);

  // Get bitmask of available drives
  DWORD driveMask = GetLogicalDrives();

  if (driveMask == 0) {
    cerr << "GetLogicalDrives failed: " << GetLastError() << endl;
    return 1; // Return empty table
  }

  int i = 1; // Lua arrays start at 1
  for (char drive = 'A'; drive <= 'Z'; drive++) {
    if (driveMask & (1 << (drive - 'A'))) {
      string rootPath = string(1, drive) + ":\\";

      // Create a new table for this drive
      lua_newtable(L);

      // Get drive type
      UINT type = GetDriveTypeA(rootPath.c_str());
      const char* typeStr = "Unknown";
      switch (type) {
      case DRIVE_FIXED:
        typeStr = "Fixed";
        break;
      case DRIVE_REMOVABLE:
        typeStr = "Removable";
        break;
      case DRIVE_REMOTE:
        typeStr = "Network";
        break;
      case DRIVE_CDROM:
        typeStr = "CD-ROM";
        break;
      case DRIVE_RAMDISK:
        typeStr = "RAM Disk";
        break;
      }

      // Get disk space information
      ULARGE_INTEGER freeBytes, totalBytes, totalFreeBytes;
      uint64_t totalSpace = 0;
      uint64_t freeSpace = 0;
      if (GetDiskFreeSpaceExA(rootPath.c_str(), &freeBytes, &totalBytes, &totalFreeBytes)) {
        totalSpace = totalBytes.QuadPart;
        freeSpace = freeBytes.QuadPart;
      }

      // Add drive properties to the drive table
      lua_pushstring(L, rootPath.substr(0, 2).c_str()); // "C:"
      lua_setfield(L, -2, "name");

      lua_pushstring(L, typeStr);
      lua_setfield(L, -2, "type");

      lua_pushinteger(L, static_cast<lua_Integer>(totalSpace));
      lua_setfield(L, -2, "totalSpace");

      lua_pushinteger(L, static_cast<lua_Integer>(freeSpace));
      lua_setfield(L, -2, "freeSpace");

      // Add this drive table to our main results table
      lua_rawseti(L, tableIndex, i++);
    }
  }

  // The results table is already on top of the stack
  return 1;
#else
  return 0;
#endif
}
int LuaFunctions::Lua::Fs::CListPlaces(lua_State* L) {
#ifdef _WIN32
  lua_newtable(L);
  int tableIndex = lua_gettop(L);

  CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
  for (const auto& folder : placeIds) {
    string path = GetKnownFolderPath(folder.second);
    lua_pushstring(L, path.c_str());
    lua_setfield(L, -2, folder.first.c_str());
  }
  CoUninitialize();

  return 1;
#else
  return 0;
#endif
}
string LuaFunctions::Lua::Fs::ReadFile(const string& filePath) {
  ifstream file(filePath, ios::binary);
  if (!file.is_open()) {
    throw runtime_error("Failed to open file: " + filePath);
  }

  vector<char> fileData((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());

  return string(fileData.begin(), fileData.end());
}
int LuaFunctions::Lua::Fs::CReadFileLines(lua_State* L) {
  string filePath;
  filePath = lua_tostring(L, 1);
  auto fileData = LuaFunctions::Lua::Fs::ReadFile(filePath);
  std::istringstream iss(fileData);
  std::string line;

  lua_newtable(L);
  int tableIndex = lua_gettop(L);
  int i = 1;
  while (std::getline(iss, line)) {
    lua_pushstring(L, line.c_str());
    lua_rawseti(L, tableIndex, i++);
  }
  return 1;
}
bool LuaFunctions::Lua::Fs::Rm(const std::string& path) {
  std::error_code ec;
  bool result = deleteRecursively(path, ec);
  if (ec)
    Logger::Log("Error deleting " + path + ": " + ec.message(), Logger::LOG_ERROR);
  return result;
}
bool _MoveCopyParseArgs(lua_State* L, std::vector<std::string>& paths, std::string& destDir) {
  paths = LuaFunctions::luaGetStringArray(L, 1);
  destDir = lua_tostring(L, 2);

  return true;
}
int LuaFunctions::Lua::Fs::CMove(lua_State* L) {
  std::vector<std::string> paths;
  std::string destDir;
  if (!_MoveCopyParseArgs(L, paths, destDir)) {
    lua_pushboolean(L, false);
    return 1;
  }
  std::error_code ec;
  try {
    fs::path destination(destDir);

    // Create destination directory if it doesn't exist
    if (!fs::exists(destination, ec)) {
      fs::create_directories(destination, ec);
      if (ec) {
        lua_pushboolean(L, false);
        return 1;
      }
    }

    for (const auto& pathStr : paths) {
      fs::path source(pathStr);
      if (!fs::exists(source, ec)) {
        std::cerr << "Source not found: " << source << "\n";
        continue;
      }

      fs::path target = destination / source.filename();

      // Handle overwrite conflicts
      if (fs::exists(target, ec)) {
        std::cerr << "Target exists, overwriting: " << target << "\n";
        fs::remove_all(target, ec);
        if (ec) {
          lua_pushboolean(L, false);
          return 1;
        }
      }

      fs::rename(source, target, ec); // Atomic move within same filesystem
      if (ec) {
        cout << "Could not move.." << ec.value() << endl;
        // Fallback to copy+delete if rename fails (e.g., across devices)
        fs::copy(source, target, fs::copy_options::recursive | fs::copy_options::overwrite_existing, ec);
        if (!ec)
          fs::remove_all(source, ec);
        if (ec) {
          lua_pushboolean(L, false);
          return 1;
        }
      }
    }
    lua_pushboolean(L, true);
    return 1;
  }
  catch (const std::exception& e) {
    ec = std::error_code(errno, std::generic_category());
    Logger::Log(std::string("Error moving files: ") + e.what(), Logger::LOG_ERROR);
    lua_pushboolean(L, false);
    return 1;
  }
}
int LuaFunctions::Lua::Fs::CCopy(lua_State* L) {
  std::vector<std::string> paths;
  std::string destDir;
  if (!_MoveCopyParseArgs(L, paths, destDir)) {
    lua_pushboolean(L, false);
    return 1;
  }

  std::error_code ec;
  try {
    fs::path destination(destDir);

    if (!fs::exists(destination, ec)) {
      fs::create_directories(destination, ec);
      if (ec) {
        lua_pushboolean(L, false);
        return 1;
      }
    }

    for (const auto& pathStr : paths) {
      fs::path source(pathStr);
      if (source.parent_path() == destination)
        continue;
      if (!fs::exists(source, ec)) {
        std::cerr << "Source not found: " << source << "\n";
        continue;
      }

      fs::path target = destination / source.filename();

      if (fs::is_directory(source, ec)) {
        fs::copy(source, target, fs::copy_options::recursive | fs::copy_options::overwrite_existing, ec);
      }
      else {
        fs::copy_file(source, target, fs::copy_options::overwrite_existing, ec);
      }
      if (ec) {
        lua_pushboolean(L, false);
        return 1;
      }
    }
    lua_pushboolean(L, true);
    return 1;
  }
  catch (const std::exception& e) {
    ec = std::error_code(errno, std::generic_category());
    std::cerr << "Error copying files: " << e.what() << "\n";
    {
      lua_pushboolean(L, false);
      return 1;
    }
  }
}
bool LuaFunctions::Lua::Fs::Rename(std::string source, std::string destination) {
  if (source == destination)
    return true;
  std::error_code ec;
  try {
    if (!fs::exists(source, ec)) {
      Logger::Log("Source not found: " + source, Logger::LOG_ERROR);
      return false;
    }

    // Handle overwrite conflicts
    if (fs::exists(destination, ec)) {
      Logger::Log("Target exists, overwriting: " + destination, Logger::LOG_ERROR);
      fs::remove_all(destination, ec);
      if (ec)
        return false;
    }

    fs::rename(source, destination, ec);
    if (ec) {
      Logger::LogError("Could not move..", ec.value());
      return false;
    }
    return true;
  }
  catch (const std::exception& e) {
    ec = std::error_code(errno, std::generic_category());
    Logger::Log(std::string("Error moving files: ") + e.what(), Logger::LOG_ERROR);
    return false;
  }
}
