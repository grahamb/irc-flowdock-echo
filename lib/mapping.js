'use strict';

var fs = require('fs');
const userMapPath = 'userMap.json';

let userMap = JSON.parse(fs.readFileSync(userMapPath, 'utf8'));

const mapUsernames = (message) => {
  const urlRexexp = /https?:\/\//;
  for (let nick in userMap) {
    const regexp = new RegExp(`@?${nick}:?`, 'gi');
    const words = message.split(' ');
    const replaced = words.map((word) => {
      if (urlRexexp.test(word)) {
        return word;
      } else {
        return word.replace(regexp, `@${userMap[nick]}`);
      }
    });
    message = replaced.join(' ');
  }
  return message;
};

module.exports = { mapUsernames };