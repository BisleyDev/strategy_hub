#!/bin/bash

git pull --rebase
rm -r dist
npm i
npm run build
pm2 reload all
