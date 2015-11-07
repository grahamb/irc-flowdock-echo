'use strict';

const mapping = require('./mapping');


const commands = {
  help: (message, user, args) => {
    const channel = `\`${process.env['IRC_CHANNEL']}\``;
    return `Howdy, ${user.nick}! I'm ${process.env['FLOWDOCK_NICK']}, your friendly IRC ↔ Flowdock Bot. Here's how I work:

By default, whatever you type into this Flow will be echoed into an IRC channel.
I'm currently configured to echo into ${channel} on \`${process.env['IRC_SERVER']}\`.
My nick there is ${process.env['IRC_NICK']}.

When someone else in ${channel} types into their IRC client, I'll display the message here.

I'm more than just a mounthpiece, though! I know a few commands. You tell me what to do by
addressing your commands to me, like this: \`@${process.env['FLOWDOCK_NICK']} ping\`. The output from your
command will display here in the Flow. Your commands, and their output, will **not** be echoed
to the IRC channel. Some things are better kept in-house :wink:

Here are the commands I know about. Some of them take arguments.

* \`help\`: Displays this help text. You must already found it!
* \`ping\`: Responds with "pong".
* \`list\`: Lists all IRC nick ↔ Flowdock nick mappings.
* \`reload\`: Reload the user mapping file from disk.
* \`link\`: Links an IRC nick to a Flowdock nick
  * \`link [ircNick]\`: links your Flowdock nick to the given \`ircNick\`
  * \`link [flowdockNick] [ircnick] \`: links the given \`flowdockNick\` to the given \`ircNick\`
* \`unlink\`: unlinks an IRC nick from a Flowdock nick
  * \`unlink\`: unlinks all IRC nicks associated with your Flowdock nick
  * \`unlink [ircNick]\`: unlinks your Flowdock nick from the given \`ircNick\`
  * \`unlink [flowdockNick] [ircnick] \`: unlinks the given \`flowdockNick\` from the given \`ircNick\`
`;
  },

  ping: () => {
    return 'pong';
  },

  reload: () => {
    mapping.reloadMap();
    const list = commands.list();
    return `Reloaded user mapping.\n\n${list}`;
  },

  list: () => {
    const userMap = mapping.getMap();
    if (Object.keys(userMap).length === 0) { return 'There are no IRC nick to Flowdock nick mappings configured.'; }
    let response = ['**IRC Nick   →   Flowdock User**'];
    for (let nick in userMap) {
      if (userMap.hasOwnProperty(nick)) {
        response.push(`${nick}   →   ${userMap[nick]}`);
      }
    }
    return response.join('\n');
  },

  link: (message, user, args) => {
    // args -> [ircNick] -or- [flowdockNick, ircNick]
    let response;
    switch(args.length) {
    case 1:
      response = mapping.link(user.nick, args[0]);
      break;
    case 2:
      response = mapping.link(args[0], args[1]);
      break;
    default:
      response = `You didn't give me an IRC nick to link. Try \`@${process.env['FLOWDOCK_NICK']} help\` to learn how to use the \`link\` command.`;
    }
    return response;
  },

  unlink: (message, user, args) => {
    // args -> [] -or- [ircNick] -or- [flowdockNick, ircNick]
    let response;
    switch(args.length) {
    case 0:
      response = mapping.unlink(user.nick);
      break;
    case 1:
      response = mapping.unlink(user.nick, args[0]);
      break;
    case 2:
      response = mapping.unlink(args[0], args[1]);
      break;
    default:
      response = `You didn't give me an IRC nick to unlink. Try \`@${process.env['FLOWDOCK_NICK']} help\` to learn how to use the \`unlink\` command.`;
    }
    return response;
  }
};

const run = (command, message, user, args) => {
  console.log(command, args);
  if (Object.keys(commands).indexOf(command) === -1) {
    return `Sorry, I don't know anything about "${command}". :cry:\nYou can ask me for help if you want: \`@${process.env['FLOWDOCK_NICK']} help\``;
  }
  return commands[command](message, user, args);
};

module.exports = { run };
