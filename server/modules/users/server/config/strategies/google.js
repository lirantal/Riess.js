'use strict'

const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const UserService = require('../../services/user.service')

async function verifyCallback (req, accessToken, refreshToken, profile, done) {
  // Set the provider data and include tokens
  const providerData = {
    google: { ...profile._json, id: profile._json.id, accessToken, refreshToken }
  }

  // Create the user OAuth profile
  const userProfile = {
    firstName: profile.name.givenName,
    lastName: profile.name.familyName,
    displayName: profile.displayName,
    email: profile.emails[0].value,
    username: profile.username ? profile.username : '',
    profileImageURL: providerData.image && providerData.image.url ? providerData.image.url : undefined,
    provider: 'external',
    providerData: providerData
  }

  // Flow description:
  // 1. Check if user profile exists
  // 1.2. If it does, load the user and provide it to passport's callback with the user object
  // @TODO even if user exists, maybe at this point we also want to
  // update the existing user object in the database with new values
  // on the user's profile once he re-connected now with his social
  // account?
  try {
    const user = await UserService.getUserDeserializedByProvider('google', profile._json.id)
    if (user) {
      return done(null, user)
    }
  } catch(err) {
    return done(err)
  }

  // 2. If profile doesn't exist, create a new user profile
  try {
    const user = await UserService.socialSignUp(userProfile)
    if (user) {
      return done(null, user)
    }
  } catch(err) {
    return done(err)
  }

  return done(new Error('Unable to process verifyCallback for strategy'))
}

module.exports = function(config) {
  const strategy = new GoogleStrategy(
    {
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
      passReqToCallback: true,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    }, verifyCallback)

  passport.use(strategy)
}
