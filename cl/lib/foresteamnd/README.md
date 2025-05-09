# foresteamnd
## Prepare build
```bash
mkdir build
cd build
```
## Build (Linux)
```bash
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . --config Release -j{NUMBER_OF_THREADS}
```
## Build (Windows)
```bash
cmake -G "Visual Studio 17 2022" .. -DCMAKE_BUILD_TYPE=Release
NUMBER_OF_THREADS=24 cmake --build . --config Release -j ${NUMBER_OF_THREADS}
```
## Install. System-wide, Linux only
```bash
chmod +x install
sudo ./install
```
## Install-extract (use bash shell). Organizes files for future import
```bash
chmod +x install_extract
./install_extract
```

(rm -rf build; mkdir build; cd build; cmake -G "Visual Studio 17 2022" .. -DCMAKE_BUILD_TYPE=Release; NUMBER_OF_THREADS=24 cmake --build . --config Release -j ${NUMBER_OF_THREADS})