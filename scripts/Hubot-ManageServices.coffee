# Description:
#   Perform actions against Windows Services with hubot.
#
# Commands:
#   hubot get service <name> - Gets the status of a service
#   hubot stop service <name> - Stops the status of a service
#   hubot start service <name> - Starts the status of a service
#   hubot restart service <name> - Restarts the status of a service
#   hubot get service <name> <computerName> - Gets the status of a service on a remote machine
#   hubot stop service <name> <computerName> - Stops the status of a service on a remote machine
#   hubot start service <name> <computerName> - Starts the status of a service on a remote machine
#   hubot restart service <name> <computerName> - Restarts the status of a service on a remote machine

# Set Variables
exports = this
exports.psScript = 'Hubot-ManageServices.ps1'
exports.psScriptPath = '.\scripts'

# Require the edge module we installed
edge = require("edge")

# Build the PowerShell that will execute
executePowerShell = edge.func('ps', -> ###
  # Dot source the function
  . .\scripts\Invoke-HubotPowerShell.ps1

  # Edge.js passes an object to PowerShell as a variable - $inputFromJS
  # Create a hashtable to pass to Invoke-HubotPowerShell
  $invokeSplat = @{
    FilePath = ".\scripts\$($inputFromJS.psScript)"
    Splat = @{
      Name = $inputFromJS.serviceName
      Action = $inputFromJS.serviceAction
    }
  }

  # Detect if a computer name was passed
  if (-not([string]::IsNullOrEmpty($inputFromJS.ComputerName)))
  {
      $invokeSplat.ComputerName = $inputFromJS.ComputerName
      $invokeSplat.Credential = Import-Clixml F:\ProjectsGit\HubotWindows\scripts\vagrantcreds.xml
      $invokeSplat.Port = 55985
  }
  Invoke-HubotPowerShell @invokeSplat
###
)

module.exports = (robot) ->
  # Capture the user message using a regex capture
  # to find the name of the service
  robot.respond /(.*) service (.*)$/i, (msg) ->
    console.log msg.match

    serviceAction = msg.match[1]
    console.log "serviceAction - #{serviceAction}"

    # split the message to check if the user passed a server name
    splitMsg = msg.match[2].split " "
    serviceName = splitMsg[0]
    console.log "serviceName - #{serviceName}"

    if splitMsg[1]
      computerName = splitMsg[1]
      console.log "computerName - #{computerName}"

    # Build an object to send to PowerShell
    psObject = {
      serviceName: serviceName
      serviceAction: serviceAction.toLowerCase()
      psScript: exports.psScript
      psScriptPath: exports.psScriptPath
      computerName: computerName
    }

    if !robot.auth.hasRole(msg.envelope.user, 'accept')
      msg.reply "Sorry, you don't have 'accept' role"
    else
      # Build the PowerShell callback
      callPowerShell = (psObject, msg, start) ->
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

              textString = ":white_check_mark: Success calling `#{exports.psScript}`"
              if computerName
                textString += " against machine `#{computerName}`"
              msgData = {
                channel: msg.message.room
                text: textString
                attachments: [
                  {
                    color: msgColor
                    fallback: result.output
                    mrkdwn_in: [
                      "fields"
                    ]
                    fields: [
                      {
                        title: 'Output'
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

                textString = ":fire: Error when calling `#{exports.psScript}`"
                if computerName
                  textString += " against machine `#{computerName}`"

                robot.emit 'slack-attachment',
                              channel: msg.message.room
                              fallback: result.error.message
                              text: textString
                              content:
                                color: msgColor
                                fields: fieldArray
              else
                msg.send ":warning: #{result.output}"

      # Call PowerShell function
      callPowerShell psObject, msg
