cmake_minimum_required(VERSION 3.30)
project(rut VERSION 0.1.0)

#-------------------------------------------------------------------------------
# Compiler Configuration
#-------------------------------------------------------------------------------
if(MSVC)
    add_compile_options(/utf-8)  # Source files are UTF-8 encoded
    add_definitions(-D_UNICODE -DUNICODE)  # Enable Unicode APIs
endif()
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

#-------------------------------------------------------------------------------
# Platform Configuration
#-------------------------------------------------------------------------------
if(WIN32 AND NOT MSVC)
    message(FATAL_ERROR "Must use MSVC on Windows")
endif()

if(MSVC)
    # Runtime library selection for all configs
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

#-------------------------------------------------------------------------------
# Dependencies
#-------------------------------------------------------------------------------
add_subdirectory(lib/lua)
set(FORESTEAMND_BUILD_STATIC true)
add_subdirectory(lib/foresteamnd)

#-------------------------------------------------------------------------------
# Lua Configuration
#-------------------------------------------------------------------------------
if(NOT DEMO_MODE)
    file(GLOB LUA_SOURCES "${CMAKE_SOURCE_DIR}/lua/*.lua")
    file(GLOB LUA_HEADERS "${CMAKE_SOURCE_DIR}/lua/*.h")
    add_custom_target(luacompile ALL
        COMMAND node compile.js
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/src/lua
        DEPENDS ${LUA_SOURCES} ${CMAKE_SOURCE_DIR}/root.crt
        BYPRODUCTS ${LUA_HEADERS}
    )
endif()

#-------------------------------------------------------------------------------
# Test Configuration
#-------------------------------------------------------------------------------
include(CTest)
enable_testing()

#-------------------------------------------------------------------------------
# Platform-Specific Configuration
#-------------------------------------------------------------------------------
if(UNIX AND NOT APPLE)
    set(PLATFORM_EMBEDDED_LIBS 
        src/lodepng/lodepng.h
        src/lodepng/lodepng.cpp
    )
endif()

#-------------------------------------------------------------------------------
# Main Executable
#-------------------------------------------------------------------------------
add_executable(rut
    ${LUA_HEADERS}
    lib/uuidv4/uuid_v4.h
    src/Controller.h
    src/global.h
    src/Installer.h
    src/helpers/GeneralHelpers.h
    src/helpers/InstallerHelpers.h
    src/Hwid.h
    src/luaFunctions/LuaFunctions.h
    src/Screenshot.h
    ${PLATFORM_EMBEDDED_LIBS}
    lib/uuidv4/endianness.h
    src/global.cpp
    src/Controller.cpp
    src/Installer.cpp
    src/helpers/GeneralHelpers.cpp
    src/helpers/InstallerHelpers.cpp
    src/Hwid.cpp
    src/luaFunctions/LuaFunctionsSystem.cpp
    src/luaFunctions/LuaFunctionsNet.cpp
    src/luaFunctions/LuaFunctionsFs.cpp
    src/luaFunctions/LuaFunctionsInput.cpp
    src/luaFunctions/LuaFunctions.cpp
    src/Screenshot.cpp
    src/main.cpp
    rut.rc 
)

#-------------------------------------------------------------------------------
# Build Configuration
#-------------------------------------------------------------------------------
if(CMAKE_CONFIGURATION_TYPES)  # Multi-config generator (Visual Studio)
    message(STATUS "Multi-config generator detected")
    
    # Debug settings (applies only when building with --config Debug)
    add_compile_definitions("$<$<CONFIG:Debug>:_DEBUG>")
    
else()  # Single-config generator (e.g., Makefiles)
    if(NOT CMAKE_BUILD_TYPE)
        set(CMAKE_BUILD_TYPE Release)
    endif()
    
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        target_compile_definitions(rut PRIVATE _DEBUG)
    endif()
    if(MSVC)
        target_compile_definitions(rut PRIVATE _MSVC)
    endif()
endif()
if(DEMO_MODE)
    target_compile_definitions(rut PRIVATE DEMO_MODE)
endif()

if(NOT DEMO_MODE)
    add_dependencies(rut luacompile)
endif()

#-------------------------------------------------------------------------------
# Include Directories
#-------------------------------------------------------------------------------
target_include_directories(rut PUBLIC
    lib/LuaBridge/Source
    lib/lua/lua-5.4.4/include
    lib/plusaes/include
    lib/foresteamnd/include
    lib/libwebp/include
    lib/uuidv4
)

#-------------------------------------------------------------------------------
# Library Configuration
#-------------------------------------------------------------------------------
if(WIN32)
    find_library(LIBWEBP libwebp 
        PATHS ${CMAKE_SOURCE_DIR}/lib/libwebp/lib/win32 
        NO_DEFAULT_PATH
    )
    target_link_libraries(rut
        foresteamnd
        lua_static
        ${LIBWEBP}
        shlwapi
        ws2_32
        gdiplus
        shell32
        taskschd
        comsupp
        crypt32
        comctl32
        wbemuuid
    )
endif()

#-------------------------------------------------------------------------------
# Packaging
#-------------------------------------------------------------------------------
set(CPACK_PROJECT_NAME ${PROJECT_NAME})
set(CPACK_PROJECT_VERSION ${PROJECT_VERSION})
include(CPack)

if(DEMO_MODE AND (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_CONFIGURATION_TYPES))
    if(WIN32)
        set(DELETE_CMD 
            "cmd" "/c" 
            "del /Q \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\*.lua\" & del /Q \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\*.crt\""
        )
        set(COPY_CMD 
            "cmd" "/c" 
            "copy /Y \"${CMAKE_SOURCE_DIR}\\src\\lua\\*.lua\" \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\\" & copy /Y \"${CMAKE_SOURCE_DIR}\\src\\lua\\*.crt\" \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\\""
        )
        set(CREATE_INSTALLER_CMD 
            "cmd" "/c" 
            "echo rut.exe --install > \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\install.bat\""
        )
    elseif(UNIX AND NOT APPLE)
        set(DELETE_CMD 
            "bash" "-c" 
            "rm -f \"${CMAKE_CURRENT_BINARY_DIR}/Release\"/*.lua \"${CMAKE_CURRENT_BINARY_DIR}/Release\"/*.crt"
        )
        set(COPY_CMD 
            "bash" "-c" 
            "cp -t \"${CMAKE_CURRENT_BINARY_DIR}/Release\" \"${CMAKE_SOURCE_DIR}/src/lua\"/*.lua \"${CMAKE_SOURCE_DIR}/src/lua\"/*.crt"
        )
    endif()
	add_custom_command(TARGET rut POST_BUILD
		COMMAND ${DELETE_CMD}
		COMMAND ${COPY_CMD}
        COMMAND ${CREATE_INSTALLER_CMD}
		COMMENT "Running post-build steps for rut"
	)
endif()
if(NOT DEMO_MODE AND (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_CONFIGURATION_TYPES))
    if(WIN32)
        set(CREATE_INSTALLER_CMD 
            "cmd" "/c" 
            "echo rut.exe --install > \"${CMAKE_CURRENT_BINARY_DIR}\\$<CONFIG>\\install.bat\""
        )
    endif()
    add_custom_command(TARGET rut POST_BUILD
      COMMAND ${CREATE_INSTALLER_CMD}
      COMMENT "Running post-build steps for rut"
	)
endif()