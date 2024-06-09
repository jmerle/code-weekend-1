#pragma once

#include <cstdlib>
#include <filesystem>
#include <string>

#include <spdlog/spdlog.h>

inline std::string getEnv(const std::string& variable) {
    const char* value = std::getenv(variable.c_str());
    if (value == nullptr) {
        spdlog::error("{} environment variable is not set", variable);
        std::exit(1);
    }

    return value;
}

inline std::filesystem::path getPathFromEnv(const std::string& variable) {
    return std::filesystem::current_path() / getEnv(variable);
}

inline std::string getApiToken() {
    return getEnv("API_TOKEN");
}

inline std::filesystem::path getDataDirectory() {
    return getPathFromEnv("DATA_DIRECTORY");
}
