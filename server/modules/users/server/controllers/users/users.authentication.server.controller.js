'use strict';

/**
 * Module dependencies
 */
const path = require('path')
const config = require(path.resolve('./lib/config'))
const ApiError = require(path.resolve('./lib/helpers/ApiError'))
const errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'))
const mongoose = require('mongoose')
const passport = require('passport')
const User = mongoose.model('User')

const UserService = require('../../services/user.service')

/**
 * Signup
 */
exports.signup = async function (req, res, next) {
  try {
    const user = await UserService.signUp(req.body)
    return res.json(user)
  } catch (err) {
    return next(new ApiError(err.message))
  }
}

/**
 * Signin after passport authentication
 */
exports.signin = async function (req, res) {
  return res.json(req.user)
}

/**
 * Signout
 */
exports.signout = function (req, res) {
  req.logout()
  return res.status(200).send()
}

/**
 * Jwt Token Auth
 */
exports.token = async function (req, res, next) {
  try {
    // Authenticate the user based on credentials
    // @TODO be consistent with whether the login field for user identification
    // is a username or an email
    const username = req.body.email
    const password = req.body.password
    const user = await UserService.authenticate(username, password)

    const token = await UserService.createToken(user)
    return res.status(200).json({token})
  } catch (err) {
    return next(new ApiError(err.message))
  }
}

/**
 * OAuth provider call
 */
exports.oauthCall = function (req, res, next) {
  const strategy = req.params.strategy;
  passport.authenticate(strategy)(req, res, next);
};

/**
 * OAuth callback
 */
exports.oauthCallback = function (req, res, next) {
  const strategy = req.params.strategy

  // info.redirect_to contains intended redirect path
  passport.authenticate(strategy, async function (err, user, info = {}) {
    if (err || !user) {
      return res.redirect('/?err=authentication-failed')
    }

    try {
      const token = await UserService.createToken(user)
      res.cookie('token', token)
      return res.redirect(info.redirect_to || '/')
    } catch (err) {
      return res.redirect('/?err=authentication-failed')
    }
  })(req, res, next)
}

/**
 * Helper function to save or update a OAuth user profile
 */
/*
exports.saveOAuthUserProfile = function (req, providerUserProfile, done) {
  // Setup info object
  var info = {};

  // Set redirection path on session.
  // Do not redirect to a signin or signup page
  if (noReturnUrls.indexOf(req.session.redirect_to) === -1)
    info.redirect_to = req.session.redirect_to;

  if (!req.user) {
    // Define a search query fields
    var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
    var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

    // Define main provider search query
    var mainProviderSearchQuery = {};
    mainProviderSearchQuery.provider = providerUserProfile.provider;
    mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

    // Define additional provider search query
    var additionalProviderSearchQuery = {};
    additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

    // Define a search query to find existing user with current provider profile
    var searchQuery = {
      $or: [mainProviderSearchQuery, additionalProviderSearchQuery]
    };

    User.findOne(searchQuery, function (err, user) {
      if (err) {
        return done(err);
      } else {
        if (!user) {
          var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

          User.findUniqueUsername(possibleUsername, null, function (availableUsername) {
            user = new User({
              firstName: providerUserProfile.firstName,
              lastName: providerUserProfile.lastName,
              username: availableUsername,
              displayName: providerUserProfile.displayName,
              profileImageURL: providerUserProfile.profileImageURL,
              provider: providerUserProfile.provider,
              providerData: providerUserProfile.providerData
            });

            // Email intentionally added later to allow defaults (sparse settings) to be applid.
            // Handles case where no email is supplied.
            // See comment: https://github.com/meanjs/mean/pull/1495#issuecomment-246090193
            user.email = providerUserProfile.email;

            // And save the user
            user.save(function (err) {
              return done(err, user, info);
            });
          });
        } else {
          return done(err, user, info);
        }
      }
    });
  } else {
    // User is already logged in, join the provider data to the existing user
    var user = req.user;

    // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
    if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
      // Add the provider data to the additional provider data field
      if (!user.additionalProvidersData) {
        user.additionalProvidersData = {};
      }

      user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

      // Then tell mongoose that we've updated the additionalProvidersData field
      user.markModified('additionalProvidersData');

      // And save the user
      user.save(function (err) {
        return done(err, user, info);
      });
    } else {
      return done(new Error('User is already connected using this provider'), user);
    }
  }
};
*/

/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function (req, res, next) {
  var user = req.user;
  var provider = req.query.provider;

  if (!user) {
    return res.status(401).json({
      message: 'User is not authenticated'
    });
  } else if (!provider) {
    return res.status(400).send();
  }

  // Delete the additional provider
  if (user.additionalProvidersData[provider]) {
    delete user.additionalProvidersData[provider];

    // Then tell mongoose that we've updated the additionalProvidersData field
    user.markModified('additionalProvidersData');
  }

  user.save(function (err) {
    if (err) {
      return res.status(422).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      req.login(user, function (err) {
        if (err) {
          return res.status(400).send(err);
        } else {
          return res.json(user);
        }
      });
    }
  });
};
