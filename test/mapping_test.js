/*eslint-env mocha */
'use strict';
const expect = require('chai').expect;
const fs = require('fs');
let mapping;


const userMapPath = 'userMap.json';
const originalUserMap = fs.readFileSync(userMapPath);

const setTestFiles = () => {
  // This is gross, but I haven't been able to get
  // a stub fs.readFileSync to work.  ¯\_(ツ)_/¯
  const testUserMap = fs.readFileSync('./test/test_userMap.json');
  fs.writeFileSync(userMapPath, testUserMap);
  mapping = require('../lib/mapping');
};

const resetFiles = () => {
  // This is gross, but I haven't been able to get
  // a stub fs.readFileSync to work.  ¯\_(ツ)_/¯
  fs.writeFileSync(userMapPath, originalUserMap);
};


describe('Mapping', () => {

  before(() => {
    setTestFiles();
  });

  after(() => {
    resetFiles();
  });

  describe('#mapIrcNick', () => {
    describe('replaces a single IRC nick with the Flowdock name', () => {
      it('when it is standalone', () => {
        const message = 'Hey ircNick1, could you take a look at this?';
        const expectation = 'Hey @FlowdockUser1, could you take a look at this?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });

      it('when it is prefixed with an @ character', () => {
        const message = 'Hey @ircNick1, could you take a look at this?';
        const expectation = 'Hey @FlowdockUser1, could you take a look at this?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });

      it('when it is followed by a : character', () => {
        const message = 'ircNick1: could you take a look at this?';
        const expectation = '@FlowdockUser1 could you take a look at this?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });
    });

    describe('replaces multiple nicks', () => {
      it('replaces multiple nicks', () => {
        const message = `ircNick1: I agree, but we should get ircNick4's opinion too`;
        const expectation = `@FlowdockUser1 I agree, but we should get @FlowdockUser4's opinion too`;
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });
    });

    describe('does not replace a nick', () => {
      it('when there is no corresponding entry in the userMap', () => {
        const message = 'NoNick, could you take a look at this?';
        expect(mapping.mapIrcNick(message)).to.eql(message);
      });

      it('when it is inside a URL', () => {
        const message = '@ircNick2: we should look at using https://github.com/ircNick1/wharrgarbl';
        const expectation = '@FlowdockUser2 we should look at using https://github.com/ircNick1/wharrgarbl';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });
    });

    describe('replaces noNickPrefix', () => {
      it('when it is prefixed with an @ character', () => {
        const message = `@${process.env['FLOWDOCK_NO_NICK_PREFIX']}NoMappingUser are you there?`;
        const expectation = '@NoMappingUser are you there?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });

      it('when on its own', () => {
        const message = `${process.env['FLOWDOCK_NO_NICK_PREFIX']}NoMappingUser are you there?`;
        const expectation = '@NoMappingUser are you there?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });

      it('when it is followed by a : character', () => {
        const message = `${process.env['FLOWDOCK_NO_NICK_PREFIX']}NoMappingUser: are you there?`;
        const expectation = '@NoMappingUser: are you there?';
        expect(mapping.mapIrcNick(message)).to.eql(expectation);
      });
    });
  });

  describe('#mapFlowdockNick', () => {
    it('returns the IRC nick for a Flowdock user', () => {
      expect(mapping.mapFlowdockNick('FlowdockUser1')).to.eql('ircNick1');
    });

    it('returns undefined when there is no IRC nick for the Flowdock user', () => {
      expect(mapping.mapFlowdockNick('wharrgarbl')).to.be.undefined;
    });
  });

  describe('#link', () => {
    it('successfully maps a IRC nick to a Flowdock user', () => {
      const res = mapping.link('NewUser', 'newnick');
      expect(res).to.eql('Linked newnick (IRC) to NewUser (Flowdock)');
      expect(Object.keys(mapping.getMap())).to.include('newnick');
    });

    describe('when a write error occurs', () => {
      before(() => {
        // make the userMap file read-only
        fs.chmodSync(userMapPath, '400');
      });

      after(() => {
        // restore userMap mode
        fs.chmodSync(userMapPath, '644');
      });

      it('returns an error when the userMap can not be written', () => {
        const res = mapping.link('NewUser1', 'newnick1');
        expect(res.indexOf('Error')).to.eql(0);
      });

      it('userMap does not contain the new user when a write error is thrown', () => {
        mapping.link('NewUser1', 'newnick1');
        expect(Object.keys(mapping.getMap())).to.not.include('newnick1');
      });
    });
  });

  describe('#unlink', () => {
    before(() => {
      mapping.link('FlowdockUser1', 'ircNick1_');
      mapping.link('FlowdockUser1', 'ircNick1__');
    });

    it('returns an error when unmapping a nick that is not in the map', () => {
      const res = mapping.unlink('InvalidUser', 'invalidNick');
      expect(res).to.eql('No link exists for invalidNick');
    });

    it('unlinks a single IRC nick', () => {
      const res = mapping.unlink('FlowdockUser2', 'ircNick2');
      expect(res).to.eql('Unlinked IRC nick ircNick2');
    });

    it('unlinks all IRC nicks from a given Flowdock user', () => {
      const res = mapping.unlink('FlowdockUser1');
      const nicks = Object.keys(mapping.getMap());
      expect(res).to.include('Unlinked IRC nicks');
      expect(nicks).to.not.contain('ircNick1')
        .and.to.not.contain('ircNick1_')
        .and.to.not.contain('ircNick1__');
    });
  });
});
