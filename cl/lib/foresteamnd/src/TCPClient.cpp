#include "TCPClient.h"
#include "Utils.h"
#include <chrono>
#include <cstring>
#include <iostream>
#include <thread>
using namespace std;

#ifdef _WIN32
#pragma comment(lib, "Ws2_32.lib")
#pragma comment(lib, "Mswsock.lib")
#pragma comment(lib, "AdvApi32.lib")
#else
#include <arpa/inet.h>
#include <netdb.h>
#endif

#ifndef INVALID_SOCKET
#define INVALID_SOCKET -1
#endif
#ifndef SOCKET_ERROR
#define SOCKET_ERROR -1
#endif
#ifndef MSG_NOSIGNAL
#define MSG_NOSIGNAL 0
#endif

#ifdef _WIN32
void WSInit() {
  WSADATA data;
  if (WSAStartup(MAKEWORD(1, 1), &data) != 0) {
    fputs("Could not initialise Winsock.\n", stderr);
    exit(1);
  }
}
namespace PLATFORM {
  void CloseConnection(PLATFORM_SOCKET& socket) {
    WSACleanup();
    if (socket == INVALID_SOCKET)
      return;
    shutdown(socket, 0);
    closesocket(socket);
    socket = INVALID_SOCKET;
  }
  bool SetSocketTimeout(PLATFORM_SOCKET& socket, DWORD timeout_ms) {
    if (setsockopt(socket, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout_ms, sizeof(timeout_ms)) == SOCKET_ERROR) {
      return false;
    }
    if (setsockopt(socket, SOL_SOCKET, SO_SNDTIMEO, (const char*)&timeout_ms, sizeof(timeout_ms)) == SOCKET_ERROR) {
      return false;
    }
    return true;
  }
  void OpenConnection(PLATFORM_SOCKET& _socket, PLATFORM_ADDRESS& hints, std::string ip, uint16_t port, DWORD timeout_ms = 5000) {
    WSInit();
    int iResult;
    PLATFORM_ADDRESS* addrinfo = nullptr;
    ZeroMemory(&hints, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;

    if (iResult = getaddrinfo(ip.c_str(), std::to_string(port).c_str(), &hints, &addrinfo)) {
      CloseConnection(_socket);
      return;
    }

    _socket = socket(addrinfo->ai_family, addrinfo->ai_socktype, addrinfo->ai_protocol);
    if (_socket == INVALID_SOCKET) {
      freeaddrinfo(addrinfo);
      CloseConnection(_socket);
      return;
    }

    // ====== ADDED TCP_NODELAY ======
    int nodelay = 1; // 1 = enable (disable Nagle's algorithm)
    if (setsockopt(_socket, IPPROTO_TCP, TCP_NODELAY, (char*)&nodelay, sizeof(nodelay)) == SOCKET_ERROR) {
      freeaddrinfo(addrinfo);
      CloseConnection(_socket);
      return;
    }
    // ===============================

    // Set socket to non-blocking mode for connect timeout
    unsigned long mode = 1;
    ioctlsocket(_socket, FIONBIO, &mode);

    // Try to connect
    iResult = connect(_socket, addrinfo->ai_addr, (int)addrinfo->ai_addrlen);
    if (iResult == SOCKET_ERROR) {
      if (WSAGetLastError() != WSAEWOULDBLOCK) {
        freeaddrinfo(addrinfo);
        CloseConnection(_socket);
        return;
      }

      // Wait for connection with timeout
      fd_set set;
      FD_ZERO(&set);
      FD_SET(_socket, &set);

      timeval timeout;
      timeout.tv_sec = timeout_ms / 1000;
      timeout.tv_usec = (timeout_ms % 1000) * 1000;

      iResult = select(0, nullptr, &set, nullptr, &timeout);
      if (iResult <= 0) {
        // Timeout or error occurred
        freeaddrinfo(addrinfo);
        CloseConnection(_socket);
        return;
      }
    }

    // Set socket back to blocking mode
    mode = 0;
    ioctlsocket(_socket, FIONBIO, &mode);

    // Set socket timeouts for send/recv operations
    if (!SetSocketTimeout(_socket, timeout_ms)) {
      freeaddrinfo(addrinfo);
      CloseConnection(_socket);
      return;
    }

    freeaddrinfo(addrinfo);
  }
  size_t Recv(PLATFORM_SOCKET socket, char* buf, size_t buf_sz, int flags) {
    size_t total_received = 0;
    while (total_received < buf_sz) {
      // Calculate remaining buffer space
      size_t remaining = buf_sz - total_received;

// For Windows, cast remaining to int (since WinSock uses int)
#ifdef _WIN32
      int recv_sz = (remaining > INT_MAX) ? INT_MAX : static_cast<int>(remaining);
#else
      size_t recv_sz = remaining;
#endif

      // Receive data
      auto rc = recv(socket, buf + total_received, recv_sz, flags);

      if (rc > 0)
        total_received += rc;
      else if (rc == 0) {
        // Connection closed by peer
        break;
      }
      else {
        // Error handling (EINTR = interrupted, try again)
        if (errno == EINTR ||
#ifdef _WIN32
            WSAGetLastError() == WSAEINTR
#else
            false
#endif
        ) {
          continue; // Retry if interrupted
        }
        return SOCKET_ERROR; // Real error
      }
    }

    return total_received;
  }
  int __stdcall Send(PLATFORM_SOCKET socket, char* buf, int buf_sz, int flags) { return send(socket, buf, buf_sz, flags); }
} // namespace PLATFORM
#else
namespace PLATFORM {
  void CloseConnection(PLATFORM_SOCKET& socket) {
    shutdown(socket, 0);
    close(socket);
    socket = INVALID_SOCKET;
  }
  void OpenConnection(PLATFORM_SOCKET& _socket, PLATFORM_ADDRESS& address, std::string ip, uint16_t port) {
    _socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    address.sin_family = AF_INET;
    address.sin_port = htons(port);
    inet_pton(AF_INET, ip.c_str(), &address.sin_addr);
    connect(_socket, (struct sockaddr*)&address, sizeof(address));
  }
  ssize_t Recv(PLATFORM_SOCKET socket, void* buf, size_t buf_sz, int flags) { return recv(socket, buf, buf_sz, flags); }
  ssize_t Send(PLATFORM_SOCKET socket, void* buf, size_t buf_sz, int flags) { return send(socket, buf, buf_sz, flags); }
} // namespace PLATFORM
#endif

void TCPClient::Retry(bool dInitial) {
  if (_socket != INVALID_SOCKET)
    return;
  if (debug) {
    if (dInitial)
      printf("Connecting...\n");
    else
      printf("Retrying...\n");
  }
  PLATFORM::OpenConnection(_socket, _address, ResolveIP(_host), _port);
}
void TCPClient::LostConnection() {
  PLATFORM::CloseConnection(_socket);
  if (debug)
    printf("Connection lost\n");
  if (retryPolicy == RetryPolicy::THROW)
    throw runtime_error("Connection lost");
}
char* TCPClient::ReceiveRawData(size_t* sz) {
  Retry(false);
  size_t bufSz;
  // receive the size first
  if (PLATFORM::Recv(_socket, reinterpret_cast<char*>(&bufSz), sizeof(size_t), 0) == SOCKET_ERROR) {
    LostConnection();
    return nullptr;
  }
  char* buf = new char[bufSz];
  memset(buf, 0, bufSz);
  // receive data of the actual size
  if (PLATFORM::Recv(_socket, buf, bufSz, 0) == SOCKET_ERROR) {
    delete[] buf;
    LostConnection();
    return nullptr;
  }
  if (sz)
    *sz = bufSz;
  return buf;
}
std::string TCPClient::ReceiveData() {
  size_t sz;
  char* buf = ReceiveRawData(&sz);
  if (!buf)
    return "";
  std::string rs = (sz == 1 && *buf == 0) ? "" : std::string(buf, sz);
  delete[] buf;
  return rs;
}
bool TCPClient::SendDataRaw(const char* data, size_t size) {
  Retry(false);
  size_t offset = 0, sent;
  while (offset < size)
    if ((sent = PLATFORM::Send(_socket, const_cast<char*>(data + offset), size - offset, MSG_NOSIGNAL)) == (size_t)SOCKET_ERROR) {
      LostConnection();
      return false;
    }
    else
      offset += sent;
  return true;
}
bool TCPClient::SendData(const char* data, size_t size) {
  // now sends size as well
  return SendDataRaw(reinterpret_cast<char*>(&size), sizeof size_t) && SendDataRaw(data, size);
}
bool TCPClient::SendData(const std::vector<std::pair<const char*, size_t>>& data) {
  size_t totalSize = 0;
  for (size_t i = 0; i < data.size(); i++)
    totalSize += data[i].second;
  // now sends size as well
  bool result = SendDataRaw(reinterpret_cast<char*>(&totalSize), sizeof(size_t));
  for (size_t i = 0; i < data.size() && result; i++)
    result &= SendDataRaw(data[i].first, data[i].second);
  return result;
}
bool TCPClient::SendData(const std::string& data) { return SendData(data.c_str(), data.length()); }
TCPClient::TCPClient(PLATFORM_SOCKET socket, PLATFORM_ADDRESS address) : _socket(socket), _address(address) {}
TCPClient::TCPClient(const TCPClient& other) : TCPClient(other._host, other._port, other.retryPolicy, other.debug) {}
TCPClient::TCPClient(std::string host, uint16_t port, RetryPolicy retryPolicy, bool debug) {
  this->retryPolicy = retryPolicy;
  this->debug = debug;
  _socket = INVALID_SOCKET;
  _host = host;
  _port = port;
  Retry(true);
}

TCPClient::~TCPClient() { PLATFORM::CloseConnection(_socket); }

std::string TCPClient::GetHost() const { return _host; }
uint16_t TCPClient::GetPort() const { return _port; }

std::string TCPClient::ResolveIP(std::string host) {
#ifdef _WIN32
  WSInit();
#endif
  struct hostent* he = gethostbyname(host.c_str());
  if (he == NULL)
    switch (h_errno) {
    case HOST_NOT_FOUND:
      fputs("The host was not found.\n", stderr);
      return "";
    case NO_ADDRESS:
      fputs("The name is valid but it has no address.\n", stderr);
      return "";
    case NO_RECOVERY:
      fputs("A non-recoverable name server error occurred.\n", stderr);
      return "";
    case TRY_AGAIN:
      fputs("The name server is temporarily unavailable.", stderr);
      return "";
    }
  std::string result = inet_ntoa(*((struct in_addr*)he->h_addr_list[0]));
#ifdef _WIN32
  WSACleanup();
#endif
  return result;
}