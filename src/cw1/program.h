#pragma once

#include <chrono>
#include <cstdlib>
#include <locale>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include <ankerl/unordered_dense.h>
#include <fmt/format.h>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

#include <cw1/config.h>
#include <cw1/test.h>
#include <cw1/solution.h>

#define CPPHTTPLIB_OPENSSL_SUPPORT
#include <httplib/httplib.h>

class Program {
    httplib::Client httpClient;

    ankerl::unordered_dense::map<int, int> bestScores;
    std::mutex bestScoresMutex;

public:
    Program()
        : httpClient("https://codeweekend.dev:3721") {
        httpClient.set_bearer_token_auth(getApiToken());

        auto scoreboardResponse = httpClient.Get("/api/scoreboard");
        if (!scoreboardResponse) {
            spdlog::error("Cannot retrieve scoreboard: {}", httplib::to_string(scoreboardResponse.error()));
            std::exit(1);
        }

        auto json = nlohmann::json::parse(scoreboardResponse->body);
        for (const auto& team : json["teams"]) {
            if (team["user_display_name"].get<std::string>() != "camel_case") {
                continue;
            }

            auto tasks = team["tasks"];
            bestScores.reserve(tasks.size());

            for (const auto& task : tasks) {
                auto rawScore = task["raw_score"];
                bestScores.emplace(task["task_id"].get<int>(), !rawScore.is_null() ? rawScore.get<int>() : 0);
            }

            break;
        }
    }

    std::vector<Test> parseArgs(int argc, char* argv[]) {
        std::locale::global(std::locale("en_US.UTF-8"));

        std::vector<int> orderedIds;
        ankerl::unordered_dense::set<int> seenIds;

        for (int i = 1; i < argc; ++i) {
            std::string arg(argv[i]);

            auto rangeSeparator = arg.find('-');
            if (rangeSeparator != std::string::npos) {
                int lhs = std::stoi(arg.substr(0, rangeSeparator));
                int rhs = std::stoi(arg.substr(rangeSeparator + 1));

                for (int j = lhs; j <= rhs; ++j) {
                    if (!seenIds.contains(j)) {
                        orderedIds.emplace_back(j);
                        seenIds.emplace(j);
                    }
                }
            } else {
                int id = std::stoi(arg);
                if (!seenIds.contains(id)) {
                    orderedIds.emplace_back(id);
                    seenIds.emplace(id);
                }
            }
        }

        auto allTests = getAllTests();
        spdlog::info("Test count: {}", allTests.size());

        if (orderedIds.empty()) {
            orderedIds.reserve(allTests.size());
            for (const auto& test : allTests) {
                orderedIds.emplace_back(test.id);
            }
        }

        std::vector<Test> selectedTests;
        selectedTests.reserve(orderedIds.size());

        std::vector<int> selectedTestIds;
        selectedTestIds.reserve(orderedIds.size());

        for (int id : orderedIds) {
            if (id < 1 || id > allTests.size()) {
                spdlog::warn("{} is not a valid test id", id);
                continue;
            }

            selectedTests.emplace_back(allTests[id - 1]);
            selectedTestIds.emplace_back(id);
        }

        if (selectedTests.empty()) {
            spdlog::error("No tests to solve");
            std::exit(1);
        }

        spdlog::info("Solving ({}): {}", selectedTests.size(), spdlog::fmt_lib::join(selectedTestIds, " "));
        return selectedTests;
    }

    void logStart(const Test& test) const {
        spdlog::info(
            "[Test {}] Starting solve (width: {}, height: {}, #turns: {}, #monsters: {})",
            test.id,
            test.width,
            test.height,
            test.noTurns,
            test.monsters.size());
    }

    void submit(const Test& test, const std::vector<std::unique_ptr<Action>>& actions, bool wait = false) {
        State validator(test);
        for (const auto& action : actions) {
            action->apply(validator);
        }

        if (bestScores.contains(test.id) && bestScores[test.id] >= validator.gold) {
            return;
        }

        auto oldScore = bestScores.contains(test.id) ? fmt::format("{:L}", bestScores[test.id]) : "no score";
        spdlog::info("[Test {}] Submitting {} actions: {} -> {:L}", test.id, actions.size(), oldScore, validator.gold);

        std::vector<nlohmann::json> moves;
        moves.reserve(actions.size());
        for (const auto& action : actions) {
            moves.emplace_back(action->toJson());
        }

        nlohmann::json solution{{"moves", moves}};

        httplib::MultipartFormDataItems formData;
        formData.emplace_back("file", solution.dump(), "submission.json", "application/json");

        auto submitResponse = httpClient.Post(fmt::format("/api/submit/{}", test.id), formData);
        if (!submitResponse) {
            spdlog::warn("[Test {}] Cannot submit: {}", test.id, httplib::to_string(submitResponse.error()));
            return;
        }

        {
            std::lock_guard lock(bestScoresMutex);
            bestScores[test.id] = validator.gold;
        }

        if (!wait) {
            return;
        }

        auto submissionId = submitResponse->body;

        while (true) {
            spdlog::info("[Test {}] Polling submission status", test.id);

            auto submissionResponse = httpClient.Get(fmt::format("/api/submission_info/{}", submissionId));
            if (!submissionResponse) {
                spdlog::warn(
                    "[Test {}] Cannot retrieve submission info: {}",
                    test.id,
                    httplib::to_string(submissionResponse.error()));
                break;
            }

            auto info = nlohmann::json::parse(submissionResponse->body);
            if (info.contains("InvalidSubmission")) {
                spdlog::warn("[Test {}] Invalid submission: {}", test.id, info["InvalidSubmission"].get<std::string>());
                break;
            }

            if (info.contains("Ok")) {
                spdlog::info("[Test {}] Score: {}", test.id, info["Ok"].get<int>());
                break;
            }

            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }
};
