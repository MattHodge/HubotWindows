'use strict';
// Description:
//   track meetings with hubot
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   meeting add  - adds a new meeting
//   meeting types - lists the possible meeting types
//   meeting add <type> <length_in_minutes> - adds a meeting with a type and a length of time

var sqlite3 = require('sqlite3').verbose();
var Conversation = require('hubot-conversation');

// define the meeting categories
var meetingCategories = [{
  id: 'sr',
  description: 'Scrum Related'
}, {
  id: 'mr',
  description: 'Management Related'
}, {
  id: 'pd',
  description: 'Presentation or Demo'
}, ];

// create meeting list
var arrayOfMeetingTypes = [];
var meetingList = 'Here are the meeting types: \n```\n';

meetingList += meetingCategories.map(meetingCategory => {
  arrayOfMeetingTypes.push(meetingCategory.id);
  return meetingCategory.id + ' - ' + meetingCategory.description;
}).join('\n');

// end of meetingList
meetingList += '```';

// gets the name to record in the databasse for the user
function getNameToRecord(msg) {
  if (msg.message.user.email_address && msg.message.user.real_name === undefined) {
    return msg.reply('I cannot see your email or real name which is required to ' +
      ' store your meeting data. Sorry!');
  }

  var nameToRecord = msg.message.user.email_address || msg.message.user.real_name;
  console.log('Name to record: ' + nameToRecord);
  return nameToRecord;
}

function insertRecordIntoDB(msg, nameToRecord, meetingType, meetingDuration) {
  var db = new sqlite3.Database('meetings.db');

  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS meetings (timestamp INTEGER, user TEXT, ' +
      'type TEXT, duration INTEGER)');
  });

  db.serialize(() => {
    db.run('INSERT INTO meetings VALUES ($timestamp, $user, $type, $duration)', {
      $timestamp: new Date(),
      $user: nameToRecord,
      $type: meetingType,
      $duration: meetingDuration
    }, err => {
      if (err) return msg.reply(':fire: an error occured: ', err);

      msg.reply(`Saved \`${meetingDuration}\` minutes to your meeting time for today.`);
    });
  });

  db.close();
}

function parseMeetingDuration(msg, meetingDuration) {
  var minDuration = 10;
  var maxDuration = 600;
  var duration = parseInt(meetingDuration);

  console.log('meetingDuration: ' + duration);

  // check if duration is number
  if (isNaN(duration)) {
    msg.reply(':thinking_face: That wasn\'t a number... I am going to ignore this.');
    return false;
  }

  // make sure the meeting time is legit
  if (duration < minDuration || duration > maxDuration) {
    msg.reply(':thinking_face: That meeting doesn\'t sound legit. Minimum meeting length is `' +
      minDuration + '` minutes. Maximum meeting length is `' + maxDuration +
      '`. I am going to ignore this.');
    return false;
  }

  return duration;
}

function testMeetingType(msg, validMeetingTypes, meetingType) {
  if (validMeetingTypes.indexOf(meetingType) >= 0) return true;

  msg.reply('Not a valid meeting type. ' + meetingList + '\n Please start adding the meeting again.');
  return false;
}

module.exports = robot => {
  var switchBoard = new Conversation(robot);

  robot.respond(/meeting types$/i, msg => {
    msg.reply(meetingList);
  });

  robot.respond(/meeting add\s(.*)\s(.*)/i, msg => {
    var nameToRecord = getNameToRecord(msg);

    var meetingDuration = parseMeetingDuration(msg, msg.match[2]);
    var meetingType = testMeetingType(msg, arrayOfMeetingTypes, msg.match[1]) ? msg.match[1] : false;

    if (!meetingDuration || !meetingType) return;

    insertRecordIntoDB(msg, nameToRecord, meetingType, meetingDuration);
  });

  robot.respond(/meeting add$/i, msg => {
    var nameToRecord = getNameToRecord(msg);

    // create switchboard
    var dialog = switchBoard.startDialog(msg);

    // Build a nice way to display each message category
    // Start of meetingString
    msg.reply('Sure, what kind of meeting was it? ' + meetingList);

    var msgRegex = /(.*)/;

    /*
      if user is sending a private message, use a different regex capture that doens't include
      the username of the bot in the message
    */
    if (msg.message.user.name === msg.message.user.room) {
      msgRegex = /\s(\w{2})/i;
    }

    dialog.addChoice(msgRegex, msg2 => {
      var meetingType = testMeetingType(msg, arrayOfMeetingTypes, msg2.match[1]) ? msg2.match[1] : false;

      if (!meetingType) return;

      var replyString = 'Meeting type `' + meetingType + '` selected. How many minutes were you in the meeting?';
      msg2.reply(replyString);

      // ask how many minutes
      dialog.addChoice(/(.*)/, msg3 => {
        console.log('User passed in ' + msg3.match + ' for how many minutes the meeting was.');
        // make sure are numbers in what the user passed
        var matches = msg3.match[1].match(/(\d+)/i);

        if (!matches) {
          console.log('No numbers found in what the user passed: ' + msg3.match[1]);
          return msg3.reply(':thinking_face: Please pass only whole numbers. I am going to ignore this.');
        }

        var meetingDuration = matches[0];

        if (!parseMeetingDuration(msg3, meetingDuration)) return;

        insertRecordIntoDB(msg3, nameToRecord, meetingType, meetingDuration);
      });
    });
  });
};
