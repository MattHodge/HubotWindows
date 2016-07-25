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
var meetingList = "Here are the meeting types: \n```\n";
var arrayOfMeetingTypes = [];
var i;

for (i = 0, len = meetingCategories.length; i < len; i++) {
  // create nice string
  meetingList += meetingCategories[i].id + " - " + meetingCategories[i].description + "\n";
  // add eaceh id to arrayOfMeetingTypes
  arrayOfMeetingTypes.push(meetingCategories[i].id);
}
// end of meetingList
meetingList += "```";

module.exports = function(robot) {

  var switchBoard = new Conversation(robot);

  robot.respond(/meeting types$/i, function(msg) {
    msg.reply(meetingList);
  });

  robot.respond(/meeting add$/i, function(msg) {
    // make sure we have either email or real name of user
    if (msg.message.user.email_address === undefined && msg.message.user.real_name) {
      res.reply("I cannot see your email or real name which is required to store your meeting data. Sorry!");
    } else {
      // determine what name to use for the user
      var nameToRecord;
      if (msg.message.user.email_address !== undefined) {
        nameToRecord = msg.message.user.email_address;
      } else {
        nameToRecord = msg.message.user.real_name;
      }

      console.log(("Name to record: " + nameToRecord));

      // create switchboard
      var dialog = switchBoard.startDialog(msg);

      // Build a nice way to display each message category
      // Start of meetingString
      var meetingString = "Sure, what kind of meeting was it?";
      meetingString += meetingList;

      msg.reply(meetingString);

      for ( i = 0, len = arrayOfMeetingTypes.length; i < len; i++) {
        var regexPattern = "(" + arrayOfMeetingTypes[i] + ")";
        var choiceRegex = new RegExp(regexPattern, "i");
        dialog.addChoice(choiceRegex, function(msg2) {
          var replyString = "Meeting type `" + msg2.match[1] + "` selected. How many minutes were you in the meeting?";
          msg2.reply(replyString);
          // ask how many minutes
          dialog.addChoice(/(\d+)/, function(msg3) {
            if (msg3.match[1] > 9 && msg3.match[1] < 600) {
                var sqlite3 = require('sqlite3').verbose();
                var db = new sqlite3.Database('meetings.db');

                db.serialize(function() {
                  db.run("CREATE TABLE IF NOT EXISTS meetings (timestamp INTEGER, user TEXT, type TEXT, duration INTEGER)");
                });

                db.serialize(function() {
                  db.run("INSERT INTO meetings VALUES ($timestamp, $user, $type, $duration)", {
                    $timestamp: new Date(),
                    $user: nameToRecord,
                    $type: msg2.match[1],
                    $duration: msg3.match[1]
                  }, function (err) {
                    if (err) {
                      msg3.reply((":fire: an error occured: " + err));
                    } else {
                      var replyString = "Saved `" + msg3.match[1] + "` minutes to your meeting time for today.";
                      msg3.reply(replyString);
                    }
                  });
                });
                
                db.close();
            } else {
              msg3.reply(":thinking_face: That meeting doesn't sound legit. I am going to ignore this.");
            }
          });
        });
      }
    }
  });
};
