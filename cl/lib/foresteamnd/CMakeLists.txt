cmake_minimum_required(VERSION 3.30.0)
project(foresteamnd VERSION 0.1.0)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
	message(STATUS "Setting build type to 'Release' as none was specified.")
	set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Choose the type of build." FORCE)
	# Set the possible values of build type for cmake-gui
	set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

include(CTest)
enable_testing()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(BUILD_FILES
    src/ExePath.h
    src/Vector.h
    src/Vector2.h
    src/Utils.h
    src/Matrix.h
    src/Quaternion.h
    src/Triangle.h
    src/Stack.h
    src/Table.h
    src/TCPClient.h
    # src/TCPServer.h
    
    src/ExePath.cpp
    src/Vector.cpp
    src/Vector2.cpp
    src/Utils.cpp
    src/Matrix.cpp
    src/Quaternion.cpp
    src/Triangle.cpp
    # src/Stack.tcc
    # src/Table.tcc
    src/TCPClient.cpp
    # src/TCPServer.cpp
)

if(CMAKE_BUILD_TYPE STREQUAL "Debug" AND NOT FORESTEAMND_BUILD_STATIC)
    list(APPEND BUILD_FILES main.cpp)
    add_executable(foresteamnd ${BUILD_FILES})
else()
    add_library(foresteamnd ${BUILD_FILES})
endif()
target_compile_features(foresteamnd PRIVATE cxx_std_17)

if (UNIX AND NOT APPLE)
    set(PLATFORM_LIBS pthread)
    add_compile_options(--std=g++17)
elseif (WIN32)
    add_compile_options(-std=c++17)
    set(PLATFORM_LIBS shlwapi ws2_32)
endif()

if (UNIX AND NOT APPLE)
    add_custom_target(create_includes ALL
        COMMAND bash create_include.sh
        WORKING_DIRECTORY ..
        SOURCES ../src
        BYPRODUCTS ../include
    )
elseif (WIN32)
    find_program(GIT_BASH_EXE NAMES git-bash.exe PATHS "C:/Program Files/Git")
    if(NOT GIT_BASH_EXE)
        message(FATAL_ERROR "Git Bash not found")
    endif()
    add_custom_target(create_includes ALL
        COMMAND ${GIT_BASH_EXE} create_include.sh
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/
        SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/src
        BYPRODUCTS ${CMAKE_CURRENT_SOURCE_DIR}/include
    )
endif()
add_dependencies(foresteamnd create_includes)

target_link_libraries(foresteamnd ${PLATFORM_LIBS})

set(CPACK_PROJECT_NAME ${PROJECT_NAME})
set(CPACK_PROJECT_VERSION ${PROJECT_VERSION})
include(CPack)