'use strict';
const config = require('./config');
const mapping = require('./lib/mapping');
const flowdockCommands = require('./lib/flowdockCommands');
const irc = require('irc');
const Session = require('flowdock').Session;
const flowdockSession = new Session(config.flowdock.token);
const flowdockStream = flowdockSession.stream(config.flowdock.flow);


const ircClient = new irc.Client(config.irc.server, config.irc.nick, config.irc.clientOpts);

ircClient.addListener('message', (from, to, message) => {
  console.log({from, to, message});
  message = mapping.mapIrcNick(message);
  if (from !== config.irc.nick) {
    flowdockSession.message(config.flowdock.flow, `(${from}) ${message}`);
  }
});

ircClient.addListener('error', (message) => {
  console.log(`IRC ERROR: ${message}`);
});

ircClient.connect(function() {
  console.log('IRC client connected');
});

flowdockSession.on('error', (error) => {
  console.log(`FLOWDOCK ERROR: ${error}`);
});

flowdockStream.on('message', (message) => {
  const validEvents = ['message', 'user-change'];
  if (validEvents.indexOf(message.event) === -1) { return; }
  const botTag = `:user:${config.flowdock.botUserId}`;

  if (message.event === 'user-change' && message.content.in_flow) {
    const nicks = mapping.mapFlowdockNick(message.content.nick);
    if (!nicks) {
      flowdockSession.message(config.flowdock.flow, `Hey there, @${message.content.nick}! You don't have an IRC nick mapped to your Flowdock user yet. If you don't know know to do that, type \`@${config.flowdock.nick} help\` and read the info on the \`link\` command.`);
    }
    return;
  }

  if (message.event === 'message' && message.content.split(' ')[0] === config.flowdock.nick) {
    flowdockSession.message(config.flowdock.flow, `Psst! You should address me as \`@${config.flowdock.nick}\`!`);
    return;
  }

  if (message.event === 'message' && message.tags.indexOf(botTag) >= 0) {
    flowdockSession.get(`/users/${message.user}`, null, (err, user, response) => {
      const messageParts = message.content.split(' ');
      const command = messageParts[1];
      const args = messageParts.slice(2);
      const output = flowdockCommands.run(command, message, user, args);
      flowdockSession.message(config.flowdock.flow, output);
    });
    return;
  }

  if (message.event === 'message' && message.user !== config.flowdock.botUserId) {
    flowdockSession.get(`/users/${message.user}`, null, (err, user, response) => {
      if (err) {
        console.log(`FLOWDOCK ERROR: ${err}`);
      } else {
        const nick = mapping.mapFlowdockNick(user.nick) || `${config.noNickPrefix}${user.nick}`;
        ircClient.say(config.irc.clientOpts.channels[0], `[${nick}] ${message.content}`);
      }
    });
  }
});
