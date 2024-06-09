cmake_minimum_required(VERSION 3.22)
project(code-weekend-1)

set(CMAKE_CXX_STANDARD 20)

find_package(fmt CONFIG REQUIRED)
find_package(httplib CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(OpenSSL CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(taopq CONFIG REQUIRED)
find_package(TBB CONFIG REQUIRED)
find_package(unordered_dense CONFIG REQUIRED)

file(GLOB_RECURSE common_sources src/*.cpp)
list(FILTER common_sources EXCLUDE REGEX "\/cw1\/tools\/")

set(common_includes src)
set(common_libraries
        fmt::fmt
        httplib::httplib
        nlohmann_json::nlohmann_json
        openssl::openssl
        spdlog::spdlog
        taocpp::taopq
        TBB::tbb
        unordered_dense::unordered_dense)

file(GLOB target_files src/cw1/solvers/*.cpp)
foreach (target_file ${target_files})
    get_filename_component(target_name ${target_file} NAME_WE)

    add_executable(${target_name} ${target_file} ${common_sources})
    target_include_directories(${target_name} PRIVATE ${common_includes})
    target_link_libraries(${target_name} PRIVATE ${common_libraries})
endforeach ()
