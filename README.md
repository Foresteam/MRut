# Multi-target Remote udministration tool, AKA MRut

## Запуск
Установить **Node.js 20**, **yarn**, **MSVC (Visual Studio 2022)**, **cmake**, **OpenSSL v3.3.0+**
```sh
git clone --recursive https://github.com/Foresteam/MRut.git
cd MRut
```

### Server (./nsv)
Установка модулей:
```sh
yarn -D
```
### Debug
```sh
yarn watch
```

### Release
```sh
yarn compile
```
Установочный файл и бинарники будут в `./dist`.

## Client (./cl) 

Подготовка Node.JS к работе:
```sh
(cd src/lua; yarn)
```

### Debug
Расширение VSCode CMake (предпочтительно), либо Visual Studio 2022.

### Build DEMO (Windows)
Упрощенная сборка без шифрования, и с возможностью замены ключей без пересборки
```bash
cmake .. -G "Visual Studio 17 2022" -DCMAKE_BUILD_TYPE=Release -DDEMO_MODE=true
cmake --build . --target ALL_BUILD --config Release
```
### Build (Windows)
```bash
cmake .. -G "Visual Studio 17 2022" -DCMAKE_BUILD_TYPE=Release
cmake --build . --target ALL_BUILD --config Release
```

Результат сборки будет в `./build/Release`.

## Примерный скрипт генерации собственного ключа (сертификата)
```sh
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:secp521r1 -keyout server.key -out server.crt -days 3650 -nodes \
  -subj "/CN=mrut" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=serverAuth,clientAuth"
```