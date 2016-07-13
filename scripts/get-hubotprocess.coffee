# Description:
#   Gets the status of a service on the Hubot server
#
# Commands:
#   hubot get process <name> - Finds the status of a process on the Hubot server

# Require the edge module we installed
edge = require("edge")

# Set Variables
exports = this
exports.psScript = 'Get-ProcessHubot.ps1'
exports.psScriptPath = '.\scripts'

# Build the PowerShell that will execute
executePowerShell = edge.func('ps', -> ###
  # Dot source the function
  . .\scripts\Invoke-HubotPowerShell.ps1

  # Edge.js passes an object to PowerShell as a variable - $inputFromJS

  # Create a hashtable to pass to Invoke-HubotPowerShell
  $splat = @{
    Name = $inputFromJS.processName
  }

  # $scriptPath = Join-Path $inputFromJS.psScriptPath $inputFromJS.psScript

  Invoke-HubotPowerShell -FilePath .\scripts\Get-ProcessHubot.ps1 -Splat $splat
###
)

module.exports = (robot) ->
  # Capture the user message using a regex capture
  # to find the name of the service
  robot.respond /get proc (.*)$/i, (msg) ->
    # Set the service name to a varaible
    processName = msg.match[1]

    # Build an object to send to PowerShell
    psObject = {
      processName: processName
      psScript: exports.psScript
      psScriptPath: exports.psScriptPath
    }

    # Build the PowerShell callback
    callPowerShell = (psObject, msg) ->
      executePowerShell psObject, (error,result) ->
        # If there are any errors that come from the CoffeeScript command
        if error
          msg.send ":fire: An error was thrown in Node.js/CoffeeScript"
          msg.send error
        else
          # Capture the PowerShell outpout and convert the
          # JSON that the function returned into a CoffeeScript object
          result = JSON.parse result[0]

          # Output the results into the Hubot log file so
          # we can see what happened - useful for troubleshooting
          console.log result

          # Check in our object if the command was a success
          # (checks the JSON returned from PowerShell)
          # If there is a success, prepend a check mark emoji
          # to the output from PowerShell.
          if result.success is true
            msgColor = '7CD197' #green
            # Build a string to send back to the channel and
            # include the output (this comes from the JSON output)
            # msg.send "```#{result.output}```"
            
            msgData = {
              channel: msg.message.room
              text: ":white_check_mark: Success callinng `#{exports.psScript}`"
              attachments: [
                {
                  color: msgColor
                  fallback: result.output
                  mrkdwn_in: [
                    "fields"
                  ]
                  fields: [
                    {
                      title: 'Processes'
                      value: "```#{result.output}```"
                    }
                  ]
                }
              ]
            }

            console.log JSON.stringify(msgData)

            robot.adapter.customMessage msgData

          # If there is a failure, prepend a warning emoji to
          # the output from PowerShell.
          else
            console.log typeof result.error
            msgColor = 'F35A00' #red

            # Build a string to send back to the channel and
            #include the output (this comes from the JSON output)
            if typeof result.error is 'object'
              fieldArray = []

              for key, value of result.error
                hash = { }
                # make first letter uppercase
                capitalizedKey = key[0].toUpperCase() + key[1..-1].toLowerCase()
                hash['title'] = capitalizedKey
                hash['value'] = value
                console.log "adding #{key} and #{value} to fields"
                fieldArray.push hash

              robot.emit 'slack-attachment',
                            channel: msg.message.room
                            fallback: result.error.message
                            text: ":fire: Error when calling `#{exports.psScript}`"
                            content:
                              color: msgColor
                              fields: fieldArray
            else
              msg.send ":warning: #{result.output}"

    # Call PowerShell function
    callPowerShell psObject, msg
