#!/bin/sh -x
git config --global push.default simple; 
git config user.name "Travis CI";    
git config user.email "travis@travis-ci.org"; 
echo "" > .nojekyll;
cat <<EOF > README.md
  # node-binance-api
  Node Binance API is an asynchronous Nodejs library for the Binance API designed to be easy to use.
  https://github.com/binance-exchange/node-binance-api
EOF
jsdoc --debug --verbose ../node-binance-api.js -d .; 
git add --all;
git commit -m "Deploy code docs to GitHub Pages Travis build: ${TRAVIS_BUILD_NUMBER}" -m "Commit: ${TRAVIS_COMMIT}";
git push --force "https://${GH_REPO_TOKEN}@${GH_REPO_REF}" > /dev/null 2>&1;
