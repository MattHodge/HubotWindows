# Description:
#   Shows the users Hubot knows about
#
# Commands:
#   hubot show users - Get a list of the users Hubot knows about

module.exports = (robot) ->
  robot.respond /show users$/i, (msg) ->
    response = ""

    for own key, user of robot.brain.data.users
      response += "#{user.id} #{user.name}"
      response += " <#{user.email_address}>" if user.email_address
      response += "\n"

    msg.send response
