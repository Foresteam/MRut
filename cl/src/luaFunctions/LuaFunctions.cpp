#include "LuaFunctions.h"

std::vector<std::string> LuaFunctions::luaGetStringArray(lua_State* L, int index) {
  std::vector<std::string> result;

  if (!lua_istable(L, index)) {
    luaL_error(L, "Argument must be a table (array of strings)");
    return result;
  }

  lua_len(L, index); // Push table length onto stack
  int len = lua_tointeger(L, -1);
  lua_pop(L, 1); // Pop the length

  for (int i = 1; i <= len; i++) {
    lua_rawgeti(L, index, i); // Push table[i] onto stack
    if (lua_isstring(L, -1)) {
      result.push_back(lua_tostring(L, -1));
    }
    else {
      luaL_error(L, "Table element #%d is not a string", i);
    }
    lua_pop(L, 1); // Pop the string
  }

  return result;
}

void OkWrapper(const std::string& title, const std::string& text, int type) {
  LuaFunctions::Lua::System::Dialog::Ok(title, text, static_cast<LuaFunctions::Lua::System::MessageBoxType>(type));
}
bool ConfirmWrapper(const std::string& title, const std::string& text, int type) {
  return LuaFunctions::Lua::System::Dialog::Confirm(title, text, static_cast<LuaFunctions::Lua::System::MessageBoxType>(type));
}

void LuaFunctions::Register(lua_State* L) {
  getGlobalNamespace(L)
      .addFunction("_Exec", LuaFunctions::Lua::System::Exec)
      .addFunction("AExec", LuaFunctions::Lua::System::AExec)
      .addFunction("Sleep", LuaFunctions::Lua::System::Sleep)
      .addFunction("GetTimeMs", LuaFunctions::Lua::System::GetTimeMs)
      .beginNamespace("dialog")
      .beginNamespace("type")
      .addConstant("BLANK", static_cast<int>(LuaFunctions::Lua::System::MESSAGEBOX_BLANK))
      .addConstant("INFO", static_cast<int>(LuaFunctions::Lua::System::MESSAGEBOX_INFO))
      .addConstant("WARNING", static_cast<int>(LuaFunctions::Lua::System::MESSAGEBOX_WARNING))
      .addConstant("ERROR", static_cast<int>(LuaFunctions::Lua::System::MESSAGEBOX_ERROR))
      .addConstant("QUESTION", static_cast<int>(LuaFunctions::Lua::System::MESSAGEBOX_QUESTION))
      .endNamespace()
      .addFunction("Ok", OkWrapper)
      .addFunction("Confirm", ConfirmWrapper)
      .addFunction("Input", LuaFunctions::Lua::System::Dialog::Input)
      .endNamespace()
      .beginNamespace("net")
      .addFunction("Send", LuaFunctions::Lua::Net::Send)
      .addFunction("SendFile", LuaFunctions::Lua::Net::SendFile)
      .addFunction("ReceiveFile", LuaFunctions::Lua::Net::ReceiveFile)
      .addFunction("Receive", LuaFunctions::Lua::Net::Receive)
      .addFunction("IsConnected", LuaFunctions::Lua::Net::IsConnected)
      .addFunction("Screencast", LuaFunctions::Lua::Net::Screencast)
      .endNamespace()
      .beginNamespace("fs")
      .addFunction("ReadFile", LuaFunctions::Lua::Fs::ReadFile)
      .addFunction("Rm", LuaFunctions::Lua::Fs::Rm)
      .addFunction("Rename", LuaFunctions::Lua::Fs::Rename)
      .addCFunction("ListDirectory", LuaFunctions::Lua::Fs::CListDirectory)
      .addCFunction("ListDisks", LuaFunctions::Lua::Fs::CListDisks)
      .addCFunction("ListPlaces", LuaFunctions::Lua::Fs::CListPlaces)
      .addCFunction("ReadFileLines", LuaFunctions::Lua::Fs::CReadFileLines)
      .addCFunction("Move", LuaFunctions::Lua::Fs::CMove)
      .addCFunction("Copy", LuaFunctions::Lua::Fs::CCopy)
      .endNamespace()
      .beginNamespace("input")
      .addFunction("MouseMove", LuaFunctions::Lua::Input::MouseMove)
      .addFunction("MouseSetPressed", LuaFunctions::Lua::Input::MouseSetPressed)
      .addFunction("MouseScroll", LuaFunctions::Lua::Input::MouseScroll)
      .addCFunction("KeySetPressed", LuaFunctions::Lua::Input::CKeySetPressed)
      .addFunction("Delay", LuaFunctions::Lua::Input::Delay)
      .addFunction("MouseSetLocked", LuaFunctions::Lua::Input::MouseSetLocked)
      .addFunction("KeyboardSetLocked", LuaFunctions::Lua::Input::KeyboardSetLocked)
      .endNamespace();
}