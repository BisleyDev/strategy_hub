#!/bin/bash

  echo "start build project"
  rm -rf dist
  rm logger.log
  npm install
  npm run build
  npm run start &> logger.log
