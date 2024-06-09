#include <algorithm>
#include <memory>
#include <vector>

#include <ankerl/unordered_dense.h>
#include <oneapi/tbb/parallel_for_each.h>

#include <cw1/grid-search.h>
#include <cw1/program.h>
#include <cw1/solution.h>
#include <cw1/test.h>

void solve(Program& program, const Test& test) {
    program.logStart(test);

    GridSearch gridSearch;
    gridSearch.addParameter("preferExpThreshold", 0.0, 1.0, 0.05);
    gridSearch.addParameter("passMonsterThreshold", 0.0, 1.0, 0.05);

    gridSearch.run(
        [&](const ankerl::unordered_dense::map<std::string, double>& values) {
            int preferExpThreshold = test.noTurns * values.at("preferExpThreshold");
            double passMonsterThreshold = values.at("passMonsterThreshold");

            State state(test);
            std::vector<std::unique_ptr<Action>> actions;

            for (int i = 0; i < state.test.noTurns; ++i) {
                bool preferExp = i < preferExpThreshold;

                long long targetValue = 0;
                for (const auto& monster : state.test.monsters) {
                    if (monster.hp <= 0 || monster.hp > state.power * 100) {
                        continue;
                    }

                    targetValue = std::max(targetValue, preferExp ? monster.exp : monster.gold);
                }

                long long minValue = targetValue * passMonsterThreshold;

                auto sortedMonsters = state.test.monsters;
                std::ranges::sort(
                    sortedMonsters,
                    [&](const Monster& a, const Monster& b) {
                        int valueA = preferExp ? a.exp : a.gold;
                        int valueB = preferExp ? b.exp : b.gold;

                        if (valueA >= minValue && valueB >= minValue) {
                            return state.position.distanceTo(a.position) < state.position.distanceTo(b.position);
                        }

                        return valueA > valueB;
                    });

                bool attacked = false;

                for (const auto& monster : sortedMonsters) {
                    if (monster.hp <= 0 || monster.hp > state.power * 100) {
                        continue;
                    }

                    int currentValue = preferExp ? monster.exp : monster.gold;;
                    if (currentValue < minValue) {
                        continue;
                    }

                    if (monster.position.isInRange(state.position, state.range)) {
                        actions.emplace_back(attack(state, monster.id));
                        attacked = true;
                        break;
                    }
                }

                if (attacked) {
                    continue;
                }

                for (const auto& monster : sortedMonsters) {
                    if (monster.hp <= 0 || monster.hp > state.power * 100) {
                        continue;
                    }

                    actions.emplace_back(move(state, state.position.positionTowards(monster.position, state.speed)));
                    break;
                }
            }

            program.submit(test, actions);
        });
}

int main(int argc, char* argv[]) {
    Program program;
    auto tests = program.parseArgs(argc, argv);

    tbb::parallel_for_each(
        tests,
        [&](const Test& test) {
            solve(program, test);
        });

    return 0;
}
