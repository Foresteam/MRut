#pragma once
#include "TCPClient.h"
#include <functional>
#include <list>
#include <thread>

// Damn fucked up. Seems it doesn't clean the shit up well after it's done, so next time it just won't start
// I will keep this, but just to be
// DO NOT USE
class TCPServer {
private:
	//Тип Callback-функции обработчика клиента
	typedef std::function<void(TCPClient)> handler_function_t;
	//Статус сервера
	enum class status : uint8_t {
		up = 0,
		err_socket_init = 1,
		err_socket_bind = 2,
		err_socket_listening = 3,
		close = 4
	};

	uint16_t port; //Порт
	status _status = status::close;
	handler_function_t handler;

	std::thread handler_thread;
	std::list<std::thread> client_handler_threads;
	std::list<std::thread::id> client_handling_end;

#ifdef _WIN32
	SOCKET serv_socket = INVALID_SOCKET;
	WSAData w_data;
#else
	int serv_socket;
#endif

	void HandlingLoop();
public:
	TCPServer(const uint16_t port, handler_function_t handler);
	~TCPServer();

	//! Set client handler
	void SetHandler(handler_function_t handler);

	uint16_t GetPort() const;
	uint16_t SetPort(const uint16_t port);

	status GetStatus() const { return _status; }

	status Restart();
	status Start();
	void Stop();

	void JoinLoop();
};