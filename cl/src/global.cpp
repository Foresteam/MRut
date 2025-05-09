#include "global.h"
#include "helpers/GeneralHelpers.h"

TCPClient* client = nullptr;
Controller* controller = nullptr;
Config appConfig;

Exception::Exception(Error code, uint64_t code2, const std::string& message) : std::runtime_error("Installer error") {
  this->code = code;
  this->code2 = code2;
  this->message = message;
}
void Exception::Log() {
  std::stringstream ss;
  ss << "Installer ERR#" << static_cast<int>(code);
  if (message.length() > 0)
    ss << " (" << message << ")";
  if (code2)
    ss << " ERR2#" << code2;
  std::string s;
  ss >> s;
  Logger::Log(s, Logger::LOG_ERROR);
}

Error Exception::GetErrorCode() {
  return code;
}