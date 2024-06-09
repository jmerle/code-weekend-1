#pragma once

#include <cstddef>
#include <string>
#include <vector>

#include <ankerl/unordered_dense.h>

struct GridSearchParameter {
    std::string name;
    double min;
    double max;
    double step;

    GridSearchParameter(const std::string& name, double min, double max, double step)
        : name(name),
          min(min),
          max(max),
          step(step) {}
};

class GridSearch {
    std::vector<GridSearchParameter> parameters;

public:
    void addParameter(const std::string& name, double min, double max, double step) {
        parameters.emplace_back(name, min, max, step);
    }

    template<typename F>
    void run(F&& func) {
        std::size_t noParams = parameters.size();

        std::vector<double> values;
        values.reserve(noParams);
        for (const auto& param : parameters) {
            values.emplace_back(param.min);
        }

        while (true) {
            ankerl::unordered_dense::map<std::string, double> namedValues;
            namedValues.reserve(noParams);
            for (std::size_t i = 0; i < noParams; ++i) {
                namedValues.emplace(parameters[i].name, values[i]);
            }

            func(namedValues);

            std::size_t k = noParams;
            while (k > 0) {
                --k;

                auto& value = values[k];
                auto& parameter = parameters[k];

                value += parameter.step;
                if (value <= parameter.max + 1e-6) {
                    break;
                }

                value = parameter.min;
                if (k == 0) {
                    return;
                }
            }
        }
    }
};
