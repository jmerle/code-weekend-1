#pragma once

#include <algorithm>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <vector>

#include <fmt/format.h>
#include <nlohmann/json.hpp>

#include <cw1/config.h>

struct Hero {
    int baseSpeed;
    int basePower;
    int baseRange;
    int coeffSpeed;
    int coeffPower;
    int coeffRange;

    Hero(int baseSpeed, int basePower, int baseRange, int coeffSpeed, int coeffPower, int coeffRange)
        : baseSpeed(baseSpeed),
          basePower(basePower),
          baseRange(baseRange),
          coeffSpeed(coeffSpeed),
          coeffPower(coeffPower),
          coeffRange(coeffRange) {}
};

struct Position {
    int x;
    int y;

    Position(int x, int y)
        : x(x),
          y(y) {}

    int distanceTo(const Position& other) const {
        return distanceTo(other.x, other.y);
    }

    int distanceTo(int otherX, int otherY) const {
        return std::pow(otherX - x, 2) + std::pow(otherY - y, 2);
    }

    bool isInRange(const Position& other, int maxDistance) const {
        return isInRange(other.x, other.y, maxDistance);
    }

    bool isInRange(int otherX, int otherY, int maxDistance) const {
        return distanceTo(otherX, otherY) <= std::pow(maxDistance, 2);
    }

    Position positionTowards(const Position& other, int maxDistance) const {
        return positionTowards(other.x, other.y, maxDistance);
    }

    Position positionTowards(int otherX, int otherY, int maxDistance) const {
        int outX = x;
        int outY = y;

        while (outX != otherX || outY != otherY) {
            int dx = std::clamp(otherX - outX, -1, 1);
            int dy = std::clamp(otherY - outY, -1, 1);

            if (isInRange(outX + dx, outY + dy, maxDistance)) {
                outX += dx;
                outY += dy;
                continue;
            }

            if (dx != 0 && isInRange(outX + dx, outY, maxDistance)) {
                outX += dx;
                continue;
            }

            if (dy != 0 && isInRange(outX, outY + dy, maxDistance)) {
                outY += dy;
                continue;
            }

            break;
        }

        return {outX, outY};
    }
};

struct Monster {
    int id;
    Position position;
    long long hp;
    long long gold;
    long long exp;
    long long range;
    long long attack;

    Monster(
        int id,
        const Position& position,
        long long hp,
        long long gold,
        long long exp,
        long long range,
        long long attack)
        : id(id),
          position(position),
          hp(hp),
          gold(gold),
          exp(exp),
          range(range),
          attack(attack) {}
};

struct Test {
    int id;

    Hero hero;
    Position startPosition;

    int width;
    int height;
    int noTurns;

    std::vector<Monster> monsters;

    Test(
        int id,
        const Hero& hero,
        const Position& startPosition,
        int width,
        int height,
        int noTurns,
        const std::vector<Monster>& monsters)
        : id(id),
          hero(hero),
          startPosition(startPosition),
          width(width),
          height(height),
          noTurns(noTurns),
          monsters(monsters) {}
};

inline std::vector<Test> getAllTests() {
    std::vector<Test> tests;

    auto dataDirectory = getDataDirectory();
    for (int i = 1; ; ++i) {
        auto file = dataDirectory / fmt::format("{:03d}.json", i);
        if (!std::filesystem::exists(file)) {
            break;
        }

        std::ifstream in(file);

        auto json = nlohmann::json::parse(in);
        auto jsonHero = json["hero"];
        auto jsonMonsters = json["monsters"];

        Hero hero(
            jsonHero["base_speed"].get<int>(),
            jsonHero["base_power"].get<int>(),
            jsonHero["base_range"].get<int>(),
            jsonHero["level_speed_coeff"].get<int>(),
            jsonHero["level_power_coeff"].get<int>(),
            jsonHero["level_range_coeff"].get<int>());

        Position startPosition(json["start_x"].get<int>(), json["start_y"].get<int>());

        int width = json["width"].get<int>();
        int height = json["height"].get<int>();
        int noTurns = json["num_turns"].get<int>();

        std::vector<Monster> monsters;
        monsters.reserve(jsonMonsters.size());

        for (const auto& jsonMonster : jsonMonsters) {
            Position position(jsonMonster["x"].get<int>(), jsonMonster["y"].get<int>());
            long long hp = jsonMonster["hp"].get<long long>();
            long long gold = jsonMonster["gold"].get<long long>();
            long long exp = jsonMonster["exp"].get<long long>();
            long long range = i > 25 ? jsonMonster["range"].get<long long>() : 0;
            long long attack = i > 25 ? jsonMonster["attack"].get<long long>() : 0;

            monsters.emplace_back(monsters.size(), position, hp, gold, exp, range, attack);
        }

        tests.emplace_back(i, hero, startPosition, width, height, noTurns, monsters);
    }

    return tests;
}
