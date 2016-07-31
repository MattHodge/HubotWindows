/*jshint esversion: 6 */
'use strict';
// Description:
//   get processes from the local bot
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   get process name - gets a local process on the hubot machine

const psScriptToInvoke = 'Get-ProcessHubot.ps1';

function getSlackAttachmentMsg(channel, text, attachmentColor, fallback, fields) {
  const msgData = {
    channel: channel,
    text: text,
    attachments: [{
      color: attachmentColor,
      fallback: fallback,
      mrkdwn_in: [
        'fields'
      ],
      fields: fields
    }]
  };

  return msgData;
}

function createTable(resultOutput) {
  // parse the json sent from PS
  const resultsParsed = JSON.parse(resultOutput);
  console.log(resultsParsed);

  const AsciiTable = require('ascii-table');
  const table = new AsciiTable('');

  // construct the heading by getting the keys for the first result
  table.setHeading(Object.keys(resultsParsed[0]));

  // build each row of the table
  resultsParsed.forEach((x) => {
    const tableRows = [];
    Object.keys(x).forEach(function(key) {
      tableRows.push(x[key]);
    });
    table.addRow(tableRows);
  });

  // format in backticks
  const formatedTable = `\`\`\`\n${table.toString()}\n\`\`\``;
  console.log(formatedTable);
  return formatedTable;
}

function throwPSError(robot, msg, errorObject) {
  console.log(errorObject);

  // array to store the fields from the error object
  const fieldArray = [];

  // go through each field and add to a hash
  Object.keys(errorObject).forEach((key) => {
    var hash = {};
    const capitalizedKey = key[0].toUpperCase() + key.slice(1);
    hash.title = capitalizedKey;
    hash.value = errorObject[key];
    console.log(`adding ${key} and ${errorObject[key]} to fields`);
    fieldArray.push(hash);
  });

  const textString = `:fire: Error when calling \`${psScriptToInvoke}\``;
  //if computerName
  //  textString += " against machine `#{computerName}`"

  const msgData = getSlackAttachmentMsg(
    msg.message.room,
    textString,
    'danger',
    errorObject,
    fieldArray
  );

  console.log(JSON.stringify(msgData));
  // send the msg
  robot.adapter.customMessage(msgData);
}

module.exports = robot => {
  robot.respond(/get process (.*)$/i, msg => {
    // load dependencies
    const Shell = require('node-powershell');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const processName = msg.match[1];
    console.log('ProcessName: ' + processName);

    // create the PowerShell script to be invoked
    const psScript = `
      . ${path.resolve(__dirname, 'Invoke-HubotPowerShell.ps1')}

      $invokeSplat = @{
        FilePath = '${path.resolve(__dirname, psScriptToInvoke)}'
        Splat = @{
          Name = '${processName}'
        }
      }

      Invoke-HubotPowerShell @invokeSplat
    `;

    // find the temporary path for the script
    const tempPath = path.resolve(os.tmpdir(), 'test.ps1');

    // save the script
    fs.writeFile(tempPath, psScript, function(err) {
      if (err) {
        return console.log(err);
      }

      console.log(`Saving temporary PowerShell file at: ${tempPath}`);
    });

    const ps = new Shell({
      executionPolicy: 'Bypass',
      debugMsg: true
    });

    // execute the temp script
    ps.addCommand(`."${tempPath}"`)
      .then(function() {
        return ps.invoke();
      })
      .then(function(output) {
        console.log(output);
        console.log(ps.history);

        // convert the powershell result from json into an ojbect
        const result = JSON.parse(output);
        console.log('result ' + result.ouput);

        if (result.success === true) {
          // Build a string to send back to the channel and
          // include the output (this comes from the JSON output)

          const returnValue = result.result_is_json ? createTable(result.output) : `\`\`\`${result.output}\`\`\``;

          const textString = `:white_check_mark: Success calling \`${psScriptToInvoke}\``;

          const msgData = getSlackAttachmentMsg(
            msg.message.room,
            textString,
            'good',
            result.output,
            [{
              title: 'Processes',
              value: returnValue
            }]
          );

          console.log(JSON.stringify(msgData));

          robot.adapter.customMessage(msgData);
        } else {
          console.log('Invoke-HubotPowerShell.ps1 caught an error. Handling it.');
          throwPSError(robot, msg, result.error);
        }

        ps.dispose();
      })
      .catch(function(err) {
        console.log(err);
        const textString = `:fire: Error when calling \`Invoke-HubotPowerShell.ps1\``;

        const msgData = getSlackAttachmentMsg(
          msg.message.room,
          textString,
          'danger',
          err,
          [{
            title: 'Error From Node.js',
            value: `\`\`\`\n${err}\n\`\`\``
          }]
        );

        console.log(JSON.stringify(msgData));

        robot.adapter.customMessage(msgData);
        ps.dispose();
      });
  });
};
