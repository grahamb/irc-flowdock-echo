'use strict';

var fs = require('fs');
const userMapPath = 'userMap.json';

let userMap = JSON.parse(fs.readFileSync(userMapPath, 'utf8'));

const writeMap = (mapping) => {
  try {
    fs.writeFileSync(userMapPath, JSON.stringify(mapping), 'utf8');
  } catch (err) {
    return err;
  }
};

const mapIrcNick = (message) => {
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

const reloadMap = () => {
  userMap = JSON.parse(fs.readFileSync(userMapPath, 'utf8'));
  return userMap;
};

const getMap = () => {
  return userMap;
};

