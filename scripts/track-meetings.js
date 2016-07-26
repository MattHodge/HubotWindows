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

var Conversation = require('hubot-conversation');

// define the meeting categories
var meetingCategories = [{
  id: "sr",
  description: "Scrum Related"
}, {
  id: "mr",
  description: "Management Related"
}, {
  id: "pd",
  description: "Presentation or Demo"
}, ];

// create meeting list
var arrayOfMeetingTypes = [];
var meetingList = "Here are the meeting types: \n```\n";

meetingCategories.forEach(function(meetingCategory) {
  meetingList += meetingCategory.id + " - " + meetingCategory.description + "\n";
  arrayOfMeetingTypes.push(meetingCategory.id);
});

// end of meetingList
meetingList += "```";

// gets the name to record in the databasse for the user
function getNameToRecord(msg) {
  if (msg.message.user.email_address && msg.message.user.real_name === undefined) {
    msg.reply("I cannot see your email or real name which is required to store your meeting data. Sorry!");
  } else {
    var nameToRecord = msg.message.user.email_address || msg.message.user.real_name;
    console.log(("Name to record: " + nameToRecord));
    return nameToRecord;
  }
}

function insertRecordIntoDB(msg, nameToRecord, meetingType, meetingDuration) {
  var sqlite3 = require('sqlite3').verbose();
  var db = new sqlite3.Database('meetings.db');

  db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS meetings (timestamp INTEGER, user TEXT, type TEXT, duration INTEGER)");
  });

  db.serialize(function() {
    db.run("INSERT INTO meetings VALUES ($timestamp, $user, $type, $duration)", {
      $timestamp: new Date(),
      $user: nameToRecord,
      $type: meetingType,
      $duration: meetingDuration
    }, function(err) {
      if (err) {
        return msg.reply((":fire: an error occured: " + err));
      }

      var replyString = "Saved `" + meetingDuration + "` minutes to your meeting time for today.";
      msg.reply(replyString);
    });
  });

  db.close();
}

function parseMeetingDuration(msg, meetingDuration) {
  var minDuration = 10;
  var maxDuration = 600;
  var duration = parseInt(meetingDuration);
  console.log("meetingDuration: " + duration);

  // check if duration is number
  if (isNaN(duration)) {
    msg.reply(":thinking_face: That wasn't a number... I am going to ignore this.");
    return false;
  }

  // make sure the meeting time is legit
  if (duration < minDuration || duration > maxDuration) {
    msg.reply(":thinking_face: That meeting doesn't sound legit. Minimum meeting length is `" + minDuration + "` minutes. Maximum meeting length is `" + maxDuration + "`. I am going to ignore this.");
    return false;
  }

  return duration;
}

function testMeetingType(msg, validMeetingTypes, meetingType) {
  if (validMeetingTypes.indexOf(meetingType) >= 0) {
    return true;
  } else {
    msg.reply("Not a valid meeting type. " + meetingList);
    return false;
  }
}

module.exports = function(robot) {

  var switchBoard = new Conversation(robot);

  robot.respond(/meeting types$/i, function(msg) {
    msg.reply(meetingList);
  });

  robot.respond(/meeting add\s(.*)\s(.*)/i, function(msg) {
    nameToRecord = getNameToRecord(msg);

    // check if meeting is valid type
    var meetingType = testMeetingType(msg, arrayOfMeetingTypes, msg.match[1]) ? msg.match[1] : false;

    if (!meetingType) {
      return;
    }

    // check if meeting duration is valid
    var meetingDuration = parseMeetingDuration(msg, msg.match[2]);

    if (!meetingDuration) {
      return;
    }

    insertRecordIntoDB(msg, nameToRecord, meetingType, meetingDuration);
  });

  robot.respond(/meeting add$/i, function(msg) {
    nameToRecord = getNameToRecord(msg);

    // create switchboard
    var dialog = switchBoard.startDialog(msg);

    // Build a nice way to display each message category
    // Start of meetingString
    var meetingString = "Sure, what kind of meeting was it? ";
    meetingString += meetingList;

    msg.reply(meetingString);

    arrayOfMeetingTypes.forEach(function(meetingType) {
      dialog.addChoice(/(.*)/, function(msg2) {
        var meetingType = testMeetingType(msg, arrayOfMeetingTypes, msg2.match[1]) ? msg2.match[1] : false;

        if (!meetingType) {
          return;
        }

        var replyString = "Meeting type `" + meetingType + "` selected. How many minutes were you in the meeting?";
        msg2.reply(replyString);

        // ask how many minutes
        dialog.addChoice(/(.*)/, function(msg3) {
          console.log("User passed in " + msg3.match + " for how many minutes the meeting was.");
          // make sure are numbers in what the user passed
          matches = msg3.match[1].match(/(\d+)/i);

          if (!matches) {
            console.log("No numbers found in what the user passed: " + msg3.match[1]);
            return msg3.reply(":thinking_face: Please pass only whole numbers. I am going to ignore this.");
          }

          var meetingDuration = matches[0];

          if (!parseMeetingDuration(msg3, meetingDuration)) {
            return;
          }

          insertRecordIntoDB(msg3, nameToRecord, meetingType, meetingDuration);
        });
      });
    });
  });
};
