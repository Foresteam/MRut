#include "Hwid.h"
#include "global.h"
#include "helpers/GeneralHelpers.h"
#include "helpers/InstallerHelpers.h"
#include <Wbemidl.h>
#include <comdef.h>
#include <iomanip>
#include <sstream>
#include <windows.h>

#include <uuid_v4.h>
#pragma comment(lib, "wbemuuid.lib")

// --- Method 1: Volume serial number of C:\ drive ---
std::string GetVolumeSerial() {
  DWORD serial = 0;
  if (GetVolumeInformationA("C:\\", nullptr, 0, &serial, nullptr, nullptr, nullptr, 0)) {
    std::ostringstream oss;
    oss << std::hex << std::setw(8) << std::setfill('0') << serial;
    return oss.str();
  }
  return "";
}

// --- Method 2: ProcessorId via WMI ---
std::string GetProcessorId() {
  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(hr))
    return "";

  hr = CoInitializeSecurity(nullptr, -1, nullptr, nullptr, RPC_C_AUTHN_LEVEL_DEFAULT, RPC_C_IMP_LEVEL_IMPERSONATE, nullptr, EOAC_NONE, nullptr);
  if (FAILED(hr)) {
    CoUninitialize();
    return "";
  }

  IWbemLocator* pLoc = nullptr;
  hr = CoCreateInstance(CLSID_WbemLocator, nullptr, CLSCTX_INPROC_SERVER, IID_IWbemLocator, (void**)&pLoc);
  if (FAILED(hr)) {
    CoUninitialize();
    return "";
  }

  IWbemServices* pSvc = nullptr;
  hr = pLoc->ConnectServer(_bstr_t(L"ROOT\\CIMV2"), nullptr, nullptr, nullptr, WBEM_FLAG_CONNECT_USE_MAX_WAIT, nullptr, nullptr, &pSvc);
  pLoc->Release();
  if (FAILED(hr)) {
    CoUninitialize();
    return "";
  }

  // Set security levels on the proxy
  CoSetProxyBlanket(pSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, nullptr, RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, nullptr, EOAC_NONE);

  IEnumWbemClassObject* pEnumerator = nullptr;
  hr = pSvc->ExecQuery(bstr_t("WQL"), bstr_t("SELECT ProcessorId FROM Win32_Processor"), WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY, nullptr,
                       &pEnumerator);
  if (FAILED(hr)) {
    pSvc->Release();
    CoUninitialize();
    return "";
  }

  IWbemClassObject* pObj = nullptr;
  ULONG uReturn = 0;
  std::string procId;

  if (pEnumerator->Next(WBEM_INFINITE, 1, &pObj, &uReturn) == WBEM_S_NO_ERROR) {
    VARIANT vtProp;
    if (SUCCEEDED(pObj->Get(L"ProcessorId", 0, &vtProp, nullptr, nullptr)) && vtProp.vt == VT_BSTR) {
      _bstr_t bs(vtProp.bstrVal);
      procId = static_cast<const char*>(bs);
      VariantClear(&vtProp);
    }
    pObj->Release();
  }

  pEnumerator->Release();
  pSvc->Release();
  CoUninitialize();
  return procId;
}

std::string hwid;
// --- Combine into one “HWID” string ---
std::string Hwid::GetHwid() {
  if (hwid.length())
    return hwid;
  std::string vol = GetVolumeSerial();
  std::string cpu = GetProcessorId();
  if (!vol.empty() && !cpu.empty())
    return hwid = cpu + "-" + vol;
  else if (!cpu.empty())
    return hwid = cpu;
  else
    return hwid = vol;
}

std::string GenerateUuidString() {
  UUIDv4::UUIDGenerator<std::mt19937_64> uuidGenerator;
  UUIDv4::UUID uuid = uuidGenerator.getUUID();
  return uuid.str();
}

std::string uuidString;
void Hwid::GeneratePcUuidV4(const std::wstring& registryPath) {
#if !DEBUG
  HKEY hKey;
  DWORD disposition; // REG_CREATED_NEW_KEY or REG_OPENED_EXISTING_KEY
  auto open =
      RegCreateKeyExW(HKEY_LOCAL_MACHINE, registryPath.c_str(), 0, nullptr, REG_OPTION_NON_VOLATILE, KEY_WRITE | KEY_WOW64_64KEY, nullptr, &hKey, &disposition);
  if (open != ERROR_SUCCESS)
    throw Exception(Error::ERROR_REG_KEY_OPEN);
  try {
    uuidString = GlobalHelpers::WstringToString(InstallerHelpers::ReadStringValue(hKey, L"UUID"));
  }
  catch (std::exception) {
    auto uuid = GenerateUuidString();
    InstallerHelpers::WriteStringValue(hKey, L"UUID", GlobalHelpers::StringToWstring(uuid));

    uuidString = uuid;
  }
  RegCloseKey(hKey);
#endif
}
std::string Hwid::GetPcUuidV4() noexcept {
#ifdef _DEBUG
  return GetHwid();
#else
  return uuidString;
#endif
}