#include "../Screenshot.h"
#include "LuaFunctions.h"
#include <filesystem> // C++17 filesystem API
#include <fstream>

void LuaFunctions::waitReceive() {
  string data = client->ReceiveData();
  if (data.length() > 0)
    throw new exception();
}

bool LuaFunctions::sendFile(const int code, char* buffer, size_t size) {
  bool result = client->SendData({ { reinterpret_cast<const char*>(&code), sizeof(char) }, { buffer, size } });
  // Sleep(500);
  // waitReceive();
  return result;
}

bool LuaFunctions::Lua::Net::Send(const int& code, const string& data) {
  return client->SendData((char)code + data);
}
bool LuaFunctions::Lua::Net::SendFile(const int& code, const string& path) {
  ifstream file(fixUtf8(path), ios::binary | ios::ate);
  size_t size = file.tellg();
  file.seekg(0, ios::beg);
  char* buffer = new char[size];
  file.read(buffer, size);
  file.close();
  bool result = sendFile(code, buffer, size);
  delete[] buffer;
  return result;
}
bool LuaFunctions::Lua::Net::Screencast() {
  auto start = LuaFunctions::Lua::System::GetTimeMs();
  // takes ENORMOUS time to grab....
  Screenshot pic = Screenshot();
  cout << pic.webp.size() << ' ' << (LuaFunctions::Lua::System::GetTimeMs() - start) << endl;
  bool result = sendFile(3, pic.webp.data(), pic.webp.size());
  return result;
}
string LuaFunctions::Lua::Net::Receive() {
  return client->ReceiveData();
}
bool LuaFunctions::Lua::Net::ReceiveFile(const string& path) {
  size_t sz;
  char* buf = client->ReceiveRawData(&sz);
  if (!buf)
    return false;
  ofstream file(fixUtf8(path), ios::binary);
  file.write(buf, sz);
  file.close();
  delete[] buf;
  return true;
}
bool LuaFunctions::Lua::Net::IsConnected() {
  return !!client;
}
