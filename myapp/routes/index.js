const globalConst = require('./../constants/global')
const express = require('express')
const router = express.Router()
const rp = require('request-promise')
const uuidv1 = require('uuid/v1')
const Cryptr = require('cryptr')
const nodemailer = require('nodemailer')

const { appTokens } = require('./../mysql/driver')
const { encryptionKey } = require('./../mysql/driver')
const { encryptedData } = require('./../mysql/driver')

router.get('/:rId', async (req, res, next) => {
  console.log(req.body)
  try {
    const rId = req.params.rId

    if (rId) {
      const encKey = await encryptionKey.findOne({
        where: {
          rId
        }
      })

      if (encKey) {
        const { key } = encKey
        const cryptr = new Cryptr(key)
        const dataObj = await encryptedData.findOne({
          where: {
            rId
          }
        })

        const data = {
          password: cryptr.decrypt(dataObj.data),
          title: dataObj.title,
          description: dataObj.description
        }

        return res.status(200).json(data)
      } else {
        throw new Error('Invalid request.')
      }
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
})

/* GET home page. */
router.post('/', async (req, res, next) => {
  console.log(req.body)
  try {
    validateRequest(req.body)
    const teamId = req.body.team_id

    /** Fetch the app token */
    const appTokenData = await appTokens.findOne({
      where: {
        teamId
      }
    })
    const token = appTokenData.apiToken

    /** const userProfile = await getUserProfile(teamId, token) */
    const inputData = parseText(req.body.text)
    res.status(200).send('Sharing a password over your email.')

    /** Get all the user ids. */
    const userList = await prepareUserList(inputData.audience, token)
    const uniqueUsers = userList.filter((v, i, a) => a.indexOf(v) === i)

    /** Encrypt the password */
    const rId = await encryptData(inputData.passData)

    /** Fetch email Ids */
    const emailIds = await fetchEmailIds(uniqueUsers, token)

    /** Email Password */
    await emailUsers(emailIds, rId)
    console.log(rId)
  } catch (err) {
    console.log(err)
    next(err)
  }
})

/**
 * @param emailIds
 * @param rId
 * @return {Promise<void>}
 */
async function emailUsers (emailIds, rId) {
  emailIds.forEach((email) => {
    let transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    })
    transporter.sendMail({
      from: 'no-reply@tagdabe.com',
      to: email,
      subject: 'Password shared on slack.',
      text: 'A password has been shared with you. Find it on the link below: http://tagdabe.com/rId'
    }, (err, info) => {
      console.log(info.envelope)
      console.log(info.messageId)
    })
  })
}

/**
 * @param userIds
 * @param token
 * @return {Promise<[]>}
 */
async function fetchEmailIds (userIds, token) {
  const promiseArray = []
  userIds.forEach((userId) => {
    promiseArray.push(getUserEmail(userId, token))
  })

  const emails = await Promise.all(promiseArray)
    .catch((error) => {
      throw error
    })

  return emails
}

/**
 * @param inputData
 * @return {Promise<*>}
 */
async function encryptData (inputData) {
  const rId = uuidv1()
  const key = generateRandomKey(64)

  /** Generate and store the encryption key at a safe place */
  await encryptionKey.create({
    rId,
    key
  })

  const cryptr = new Cryptr(key)
  await encryptedData.create({
    rId,
    data: cryptr.encrypt(inputData.password),
    title: inputData.title,
    description: inputData.description
  })

  return rId
}

/**
 * @param audience
 * @param token
 * @return {Promise<Array>}
 */
async function prepareUserList (audience, token) {
  let userList = []
  // Merge all the user IDs.
  if (audience.users) {
    userList = userList.concat(audience.users)
  }

  const promiseArray = []
  if (audience.channels) {
    (audience.channels).forEach((channelId) => {
      promiseArray.push(fetchMemberList(channelId, token))
    })
  }

  let resolvedData = await Promise.all(promiseArray)
    .catch((error) => {
      throw error
    })

  resolvedData.forEach((data) => {
    if (data && data.length > 0) {
      userList = userList.concat(data)
    }
  })

  return userList
}

/**
 * @param channelId
 * @param token
 * @return {Promise<[]>}
 */
async function fetchMemberList (channelId, token) {
  const data = {
    token,
    channel: channelId
  }

  const profileData = await rp({
    method: 'POST',
    uri: 'https://slack.com/api/channels.info',
    useQuerystring: true,
    form: data
  })

  return JSON.parse(profileData).channel.members
}

/**
 * @param textMessage
 * @return {{audience: {users: Array, channels: Array}, passData: {password: *, title: *, description: *}}}
 */
function parseText (textMessage) {
  const audience = identifyChannelsAndUsers(textMessage)
  const passData = identifyPassword(textMessage)
  return {
    audience,
    passData
  }
}

/**
 * @return {{password: *, title: *, description: *}}
 */
function identifyPassword (textMessage) {
  // Identify the password, title and description.
  const regex = /(?=["'])(?:"[^"\\]*(?:\\[\s\S][^"\\]*)*"|'[^'\\]*(?:\\[\s\S][^'\\]*)*')/g
  const str = textMessage
  const passData = []
  let m

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match) => {
      if (typeof match === 'string' && match.length > 2) {
        passData.push(unescape(match.substring(1, match.length - 1)))
      }
    })
  }

  if (passData.length === 0) {
    throw new Error('No password specified.')
  } else {
    return {
      password: passData[0],
      title: passData[1],
      description: passData[2],
    }
  }
}

/**
 * @param textMessage
 * @return {{users: Array, channels: Array}}
 */
function identifyChannelsAndUsers (textMessage) {
  const regex = /\<(.*?)\>/g
  const str = textMessage
  let m

  const channels = []
  const users = []

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 1) {
        if (match.indexOf('@') === 0) {
          users.push(match.substring(1, match.indexOf('|')))
        } else if (match.indexOf('#') === 0) {
          channels.push(match.substring(1, match.indexOf('|')))
        }
      }
    })
  }

  if (channels.length === 0 && users.length === 0) {
    throw new Error('No users/channels specified.')
  } else {
    return {
      users,
      channels
    }
  }
}

/**
 * @param userId
 * @param token
 * @return {Promise<string|string>}
 */
async function getUserEmail (userId, token) {
  const data = {
    token,
    user: userId
  }

  const profileData = await rp({
    method: 'POST',
    uri: 'https://slack.com/api/users.profile.get',
    useQuerystring: true,
    form: data
  })

  return JSON.parse(profileData).profile.email
}

/**
 * @param requestBody {Object}
 */
function validateRequest (requestBody) {
  if (requestBody.token !== globalConst.VERIFICATION_TOKEN) {
    throw new Error('Not authorized.')
  }
}


/**
 * Returns a random alphanumeric string of 'length' characters.
 * @param length
 * @returns {string}
 */
function generateRandomKey (length) {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

module.exports = router
