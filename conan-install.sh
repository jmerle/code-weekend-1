#!/usr/bin/env bash

set -e
set -x

conan install . --build=missing --settings=build_type=Release
conan install . --build=missing --settings=build_type=Debug
conan install . --build=missing --settings=build_type=RelWithDebInfo
