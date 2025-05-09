#!/bin/bash
rm -rf include
mkdir include
mkdir include/foresteamnd
cp src/*.h include/foresteamnd
cp src/*.tcc include/foresteamnd

cd include/foresteamnd/
find ./ -maxdepth 1 -name '*.h' | while read file; do ln -r -s "$file" "${file%.*}"; done
find ./ -maxdepth 1 -name '*.tcc' | while read file; do ln -f -r -s "$file" "${file%.*}"; done