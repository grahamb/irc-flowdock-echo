'use strict';

const requiredEnvVars = ['FLOWDOCK_TOKEN',
                         'FLOWDOCK_FLOW',
                         'FLOWDOCK_BOT_USER_ID',
                         'FLOWDOCK_NICK',
                         'FLOWDOCK_NO_NICK_PREFIX',
                         'IRC_SERVER',
                         'IRC_NICK',
                         'IRC_CHANNEL'
];

let missingEnvVars = requiredEnvVars.map((v) => {
  return process.env[v] ? null : v;
}).filter((val) => !!val);

if (missingEnvVars.length > 0) {
  console.log(`The following required environment variables are missing.
${missingEnvVars.join(', ')}
Please refer to the Readme for more information.`);
  process.exit(1);
}

const mapping = require('./lib/mapping');
const flowdockCommands = require('./lib/flowdockCommands');
const irc = require('irc');
const Session = require('flowdock').Session;
const flowdockSession = new Session(process.env['FLOWDOCK_TOKEN']);
const flowdockStream = flowdockSession.stream(process.env['FLOWDOCK_FLOW']);

const ircClient = new irc.Client(process.env['IRC_SERVER'], process.env['IRC_NICK'], {
  channels: [ process.env['IRC_CHANNEL'] ] || [],
  port: process.env['IRC_PORT'] || 6697,
  debug: false,
  showErrors: true,
  secure: true,
  autoConnect: false,
  autoRejoin: true,
  retryCount: 3
});

ircClient.addListener('message', (from, to, message) => {
  message = mapping.mapIrcNick(message);
  if (from !== process.env['IRC_NICK']) {
    flowdockSession.message(process.env['FLOWDOCK_FLOW'], `(${from}) ${message}`);
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
  const botTag = `:user:${process.env['FLOWDOCK_BOT_USER_ID']}`;

  if (message.event === 'user-change' && message.content.in_flow) {
    const nicks = mapping.mapFlowdockNick(message.content.nick);
    if (!nicks) {
      flowdockSession.message(process.env['FLOWDOCK_FLOW'], `Hey there, @${message.content.nick}! You don't have an IRC nick mapped to your Flowdock user yet. If you don't know know to do that, type \`@${process.env['FLOWDOCK_NICK']} help\` and read the info on the \`link\` command.`);
    }
    return;
  }

  if (message.event === 'message' && message.content.split(' ')[0] === process.env['FLOWDOCK_NICK']) {
    flowdockSession.message(process.env['FLOWDOCK_FLOW'], `Psst! You should address me as \`@${process.env['FLOWDOCK_NICK']}\`!`);
    return;
  }

  if (message.event === 'message' && message.tags.indexOf(botTag) >= 0) {
    flowdockSession.get(`/users/${message.user}`, null, (err, user, response) => {
      const messageParts = message.content.split(' ');
      const command = messageParts[1];
      const args = messageParts.slice(2);
      const output = flowdockCommands.run(command, message, user, args);
      flowdockSession.message(process.env['FLOWDOCK_FLOW'], output);
    });
    return;
  }

  if (message.event === 'message' && message.user !== process.env['FLOWDOCK_BOT_USER_ID']) {
    flowdockSession.get(`/users/${message.user}`, null, (err, user, response) => {
      if (err) {
        console.log(`FLOWDOCK ERROR: ${err}`);
      } else {
        const nick = mapping.mapFlowdockNick(user.nick) || `${process.env['FLOWDOCK_NO_NICK_PREFIX']}${user.nick}`;
        ircClient.say(process.env['IRC_CHANNEL'], `[${nick}] ${message.content}`);
      }
    });
  }
});
