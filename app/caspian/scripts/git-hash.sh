#!/bin/bash

BUILD_DIRECTORY="../builds"
if [ ! -d $BUILD_DIRECTORY ]
then
    mkdir $BUILD_DIRECTORY
fi

GIT_HASH_FILE="$BUILD_DIRECTORY/git_hash.json"

GIT_HASH="$(git rev-parse --short HEAD)"
GIT_TAG="$(git tag --points-at HEAD)"
DATE="$(date +'%Y-%m-%d')"

echo "{
    \"git_hash\": \"$GIT_HASH\",
    \"git_tag\": \"$GIT_TAG\",
    \"date\": \"$DATE\",
    \"user\": \"$USER\"
}" > $GIT_HASH_FILE
