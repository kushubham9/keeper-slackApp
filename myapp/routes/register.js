const express = require('express')
const router = express.Router()
const rp = require('request-promise')
const globalConstants = require('../constants/global')
const { appTokens } = require('./../mysql/driver')


/* GET home page. */
router.get('/oauth', async function (req, res, next) {
  try {
    if (!req.query.code) { // access denied
      next(new Error('Something went wrong.'))
    }

    const data = {
      client_id: globalConstants.CLIENT_ID,
      client_secret: globalConstants.CLIENT_SECRET,
      code: req.query.code
    }

    const accessData = await rp({
      method: 'POST',
      uri: 'https://slack.com/api/oauth.access',
      form: {
        data
      }
    })

    const token = accessData.access_token
    const teamId = accessData.team_id

    await appTokens.insert({
      teamId: teamId,
      apiToken: token
    })
    return res.status(200).send({ teamId })
  } catch (error) {
    return next(error)
  }
})
