'use strict';

var fs = require('fs');
const userMapPath = process.env['USER_MAP_FILE'] || 'userMap.json';

const writeMap = (mapping) => {
  try {
    fs.writeFileSync(userMapPath, JSON.stringify(mapping), 'utf8');
  } catch (err) {
    return err;
  }
};

try {
  fs.statSync(userMapPath);
} catch(e) {
  console.log(e);
  writeMap({});
}

let userMap = JSON.parse(fs.readFileSync(userMapPath, 'utf8'));

const mapIrcNick = (message) => {
  const urlRexexp = /https?:\/\//;
  const noNickRegexp = new RegExp(`@?${process.env['FLOWDOCK_NO_NICK_PREFIX']}`, 'gi');
  // TODO hacky, need to DRY this up
  if (Object.keys(userMap).length === 0) {
    const words = message.split(' ');
    const replaced = words.map((word) => {
      return word.replace(noNickRegexp, '@');
    });
    return replaced.join(' ');
  }

  for (let nick in userMap) {
    const regexp = new RegExp(`@?${nick}:?`, 'gi');
    const words = message.split(' ');
    const replaced = words.map((word) => {
      if (urlRexexp.test(word)) {
        return word;
      } else if(word.indexOf(process.env['FLOWDOCK_NO_NICK_PREFIX']) > -1) {
        return word.replace(noNickRegexp, '@');
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

const setMap = (map) => {
  userMap = map;
  writeMap(map);
};

const mapFlowdockNick = (flowdockUser) => {
  let result;
  for (let nick in userMap) {
    if (userMap[nick] === flowdockUser) {
      result = nick;
    }
  }
  return result;
};

const link = (flowdockUser, ircNick) => {
  let newMap = Object.assign({}, userMap);
  newMap[ircNick] = flowdockUser;
  const writeStatus = writeMap(newMap);
  if (writeMap(newMap) instanceof Error) {
    return `Error writing userMap file: ${writeStatus.message}`;
  }
  userMap = newMap;
  return `Linked ${ircNick} (IRC) to ${flowdockUser} (Flowdock)`;
};

const unlink = (flowdockUser, ircNick) => {
  let newMap = Object.assign({}, userMap);

  if (ircNick) {
    if (!userMap[ircNick]) {
      return `No link exists for ${ircNick}`;
    } else {
      delete newMap[ircNick];
      const writeStatus = writeMap(newMap);
      if (writeStatus instanceof Error) {
        return `Error writing userMap file: ${writeStatus.message}`;
      }
      userMap = newMap;
      return `Unlinked IRC nick ${ircNick}`;
    }
  } else {
    let unmapped = [];
    for(let nick in newMap) {
      if (newMap[nick] === flowdockUser) {
        delete newMap[nick];
        unmapped.push(nick);
      }
    }
    const writeStatus = writeMap(newMap);
    if (writeStatus instanceof Error) {
      return `Error writing userMap file: ${writeStatus.message}`;
    }
    userMap = newMap;
    return `Unlinked IRC ${unmapped.length > 1 ? 'nicks' : 'nick'} ${unmapped.join(', ')} from Flowdock user ${flowdockUser}`;
  }
};

module.exports = { mapIrcNick, mapFlowdockNick, getMap, setMap, reloadMap, link, unlink };
