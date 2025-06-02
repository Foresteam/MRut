# Multi-target Remote udministration tool, AKA MRut

## Roadmap
* ~~**Autostart & install script**~~
  * Install system-wide (all users)
  * Updating
* Chat (complex af)
* Bulk screencast (switch single/many in tab)
* Protocols
  * Optimizations
  * Mb use existing protocols (zmq tcp+udp)?
  * Move streaming to WebRTC?

## How to run
Install **Node.js 16**, **yarn**, MSVC (Visual Studio 2022), cmake...
```sh
git clone --recursive https://github.com/Foresteam/rut-2.git
cd rut-2
```

Server (./nsv)
```sh
yarn
yarn watch
```

Client (./cl): ` (cd src/lua; yarn) `

To run debug:
```sh
just use vscode...
```

<!-- Release: i beleive it's done this way
## Build (Linux)
```bash
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release -j{NUMBER_OF_THREADS}
``` -->
## Build DEMO (Windows)
Упрощенная сборка без шифрования, и с возможностью замены ключей без пересборки
```bash
cmake .. -G "Visual Studio 17 2022" -DCMAKE_BUILD_TYPE=Release -DDEMO_MODE=true
cmake --build . --target ALL_BUILD --config Release
```
## Build (Windows)
```bash
cmake .. -G "Visual Studio 17 2022" -DCMAKE_BUILD_TYPE=Release
cmake --build . --target ALL_BUILD --config Release
```

## The UI
![1](screenshots/1.png)
![2](screenshots/2.png)
![3](screenshots/3.png)

```sh
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:secp521r1 -keyout server.key -out server.crt -days 3650 -nodes \
  -subj "/CN=mrut" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=serverAuth,clientAuth"
```