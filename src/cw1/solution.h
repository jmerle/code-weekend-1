#pragma once

#include <cmath>
#include <memory>
#include <string>

#include <nlohmann/json.hpp>

#include <cw1/test.h>

struct State {
    Test test;

    Position position;

    int speed;
    int power;
    int range;

    int gold;
    int exp;
    int level;

    long long fatigue;

    explicit State(const Test& test)
        : test(test),
          position(test.startPosition),
          speed(test.hero.baseSpeed),
          power(test.hero.basePower),
          range(test.hero.baseRange),
          gold(0),
          exp(0),
          level(0),
          fatigue(0) {}
};

struct Action {
    std::string type;
    std::string comment;

    Action(const std::string& type, const std::string& comment)
        : type(type),
          comment(comment) {}

    virtual ~Action() = default;

    virtual void apply(State& state) const = 0;

    void applyAttacks(State& state) const {
        for (const auto& monster : state.test.monsters) {
            if (monster.hp > 0 && monster.position.isInRange(state.position, monster.range)) {
                state.fatigue += monster.attack;
            }
        }
    }

    virtual nlohmann::json toJson() const {
        nlohmann::json obj{{"type", type}};

        if (!comment.empty()) {
            obj["comment"] = comment;
        }

        return obj;
    }
};

struct MoveAction : Action {
    int x;
    int y;

    MoveAction(const Position& position, const std::string& comment = "")
        : MoveAction(position.x, position.y, comment) {}

    MoveAction(int x, int y, const std::string& comment = "")
        : Action("move", comment),
          x(x),
          y(y) {}

    void apply(State& state) const override {
        state.position.x = x;
        state.position.y = y;
        applyAttacks(state);
    }

    nlohmann::json toJson() const override {
        auto json = Action::toJson();
        json["target_x"] = x;
        json["target_y"] = y;
        return json;
    }
};

struct AttackAction : Action {
    int target;

    explicit AttackAction(int target, const std::string& comment = "")
        : Action("attack", comment),
          target(target) {}

    void apply(State& state) const override {
        auto& monster = state.test.monsters[target];

        monster.hp -= state.power;

        if (monster.hp <= 0) {
            state.gold += std::floor(
                static_cast<double>(monster.gold) * (1000.0 / (1000.0 + static_cast<double>(state.fatigue))) + 1e-6);
            state.exp += monster.exp;

            int oldLevel = state.level;

            while (true) {
                int requiredExp = 1000 + (state.level + 1) * state.level * 50;
                if (state.exp < requiredExp) {
                    break;
                }

                state.exp -= requiredExp;
                ++state.level;
            }

            if (state.level != oldLevel) {
                state.speed = calculateStat(state.level, state.test.hero.baseSpeed, state.test.hero.coeffSpeed);
                state.power = calculateStat(state.level, state.test.hero.basePower, state.test.hero.coeffPower);
                state.range = calculateStat(state.level, state.test.hero.baseRange, state.test.hero.coeffRange);
            }
        }

        applyAttacks(state);
    }

    nlohmann::json toJson() const override {
        auto json = Action::toJson();
        json["target_id"] = target;
        return json;
    }

private:
    int calculateStat(int level, int base, int coeff) const {
        double levelDouble = level;
        double baseDouble = base;
        double coeffDouble = coeff;

        return std::floor(baseDouble * (1.0 + levelDouble * (coeffDouble / 100.0)) + 1e-6);
    }
};

inline std::unique_ptr<MoveAction> move(const Position& position, const std::string& comment = "") {
    return std::make_unique<MoveAction>(position, comment);
}

inline std::unique_ptr<MoveAction> move(int x, int y, const std::string& comment = "") {
    return std::make_unique<MoveAction>(x, y, comment);
}

inline std::unique_ptr<MoveAction> move(State& state, const Position& position, const std::string& comment = "") {
    auto action = std::make_unique<MoveAction>(position, comment);
    action->apply(state);
    return action;
}

inline std::unique_ptr<MoveAction> move(State& state, int x, int y, const std::string& comment = "") {
    auto action = std::make_unique<MoveAction>(x, y, comment);
    action->apply(state);
    return action;
}

inline std::unique_ptr<AttackAction> attack(int target, const std::string& comment = "") {
    return std::make_unique<AttackAction>(target, comment);
}

inline std::unique_ptr<AttackAction> attack(State& state, int target, const std::string& comment = "") {
    auto action = std::make_unique<AttackAction>(target, comment);
    action->apply(state);
    return action;
}
