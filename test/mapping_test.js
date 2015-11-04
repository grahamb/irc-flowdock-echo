'use strict';
const expect = require('chai').expect;
const fs = require('fs');
let mapping;

const originalUserMap = fs.readFileSync('userMap.json');

describe('Mapping', () => {
  describe('mapUsernames', () => {

    before(() => {
      // This is gross, but I haven't been able to get
      // a stub fs.readFileSync to work.  ¯\_(ツ)_/¯
      const testUserMap = fs.readFileSync('./test/test_userMap.json');
      fs.writeFileSync('userMap.json', testUserMap);
      mapping = require('../lib/mapping');
    });

    after(() => {
      // This is gross, but I haven't been able to get
      // a stub fs.readFileSync to work.  ¯\_(ツ)_/¯
      fs.writeFileSync('userMap.json', originalUserMap);
    });

    describe('replaces a single IRC nick with the Flowdock name', () => {
      it('when it is standalone', () => {
        const message = 'Hey ircNick1, could you take a look at this?';
        const expectation = 'Hey @FlowdockUser1, could you take a look at this?';
        expect(mapping.mapUsernames(message)).to.eql(expectation);
      });

      it('when it is prefixed with an @ character', () => {
        const message = 'Hey @ircNick1, could you take a look at this?';
        const expectation = 'Hey @FlowdockUser1, could you take a look at this?';
        expect(mapping.mapUsernames(message)).to.eql(expectation);
      });

      it('when it is followed by a : character', () => {
        const message = 'ircNick1: could you take a look at this?';
        const expectation = '@FlowdockUser1 could you take a look at this?';
        expect(mapping.mapUsernames(message)).to.eql(expectation);
      });
    });

    describe('replaces multiple nicks', () => {
      it('replaces multiple nicks', () => {
        const message = `ircNick1: I agree, but we should get ircNick4's opinion too`;
        const expectation = `@FlowdockUser1 I agree, but we should get @FlowdockUser4's opinion too`;
        expect(mapping.mapUsernames(message)).to.eql(expectation);
      });
    });

    describe('does not replace a nick', () => {
      it('when there is no corresponding entry in the userMap', () => {
        const message = 'NoNick, could you take a look at this?';
        expect(mapping.mapUsernames(message)).to.eql(message);
      });

      it('when it is inside a URL', () => {
        const message = '@ircNick2: we should look at using https://github.com/ircNick1/wharrgarbl';
        const expectation = '@FlowdockUser2 we should look at using https://github.com/ircNick1/wharrgarbl';
        expect(mapping.mapUsernames(message)).to.eql(expectation);
      });
    });
  });


});
