#include "../global.h"
#include "LuaFunctions.h"

void LuaFunctions::Lua::Input::MouseMove(double x, double y) {
  controller->PushSequence({ .mouseX = x, .mouseY = y });
}
void LuaFunctions::Lua::Input::MouseSetPressed(uint32_t button, bool state) {
  controller->PushSequence({ .button = button, .buttonPressed = state });
}
void LuaFunctions::Lua::Input::MouseScroll(double pixels) {
  controller->PushSequence({ .mouseScroll = pixels });
}

int LuaFunctions::Lua::Input::CKeySetPressed(lua_State* L) {
  if (!lua_isnumber(L, 1) && !lua_isstring(L, 1)) {
    lua_pushliteral(L, "Expected number or char at 1");
    lua_error(L);
  }
  if (!lua_isboolean(L, 2)) {
    lua_pushliteral(L, "Expected boolean at 2");
    lua_error(L);
  }
  uint16_t key;
  if (lua_isnumber(L, 1))
    key = lua_tonumber(L, 1);
  else {
    std::string keyChar = lua_tostring(L, 1);
#ifdef _WIN32
    key = LOBYTE(VkKeyScanA(keyChar[0]));
#else
    throw std::runtime_error("not implemented");
#endif
  }
  bool state = lua_toboolean(L, 2);
  controller->PushSequence({ .key = (uint16_t)key, .keyPressed = state });
  return 0;
}
void LuaFunctions::Lua::Input::Delay(int milliseconds) {
  controller->PushSequence({ .sleepFor = std::chrono::milliseconds(milliseconds) });
}

void LuaFunctions::Lua::Input::MouseSetLocked(bool value) {
  Controller::SetMouseLock(value);
}
void LuaFunctions::Lua::Input::KeyboardSetLocked(bool value) {
}

luabridge::LuaRef LuaFunctions::Lua::Input::GetPressedKeys(lua_State* L) {
  auto keys = controller->GetPressedKeys();

  luabridge::LuaRef table = luabridge::newTable(L);
  int index = 1;
  for (auto key : keys) {
    table[index++] = key;
  }
  return table;
}

luabridge::LuaRef LuaFunctions::Lua::Input::GetPressedButtons(lua_State* L) {
  auto buttons = controller->GetPressedButtons();

  luabridge::LuaRef table = luabridge::newTable(L);
  int index = 1;
  for (auto btn : buttons) {
    table[index++] = btn;
  }
  return table;
}