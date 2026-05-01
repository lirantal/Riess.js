'use strict'

const path = require('path')
const errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'))
const mongoose = require('mongoose')
const passport = require('passport')
const User = mongoose.model('User')

class UserRepository {
  static create (userObj) {
    const user = new User(userObj)
    return user.save()
  }

  static getById (id) {
    return User.findOne({_id: String(id)}).exec()
  }

  static getByProvider (providerName, providerId) {
    // @TODO is it a security issue to use a possible user-input
    // to build a query parameter?

    // @TODO refactor out the .id field identifier to be provided externally
    // to this function from the service? the service can maintain a
    // config/map for provider's and their id fields and pass it here
    const providerField = `providerData.${String(providerName)}.id`
    const query = {
      [providerField]: String(providerId)
    }

    return User.findOne(query).exec()
  }

  static getByEmail (email) {
    // @TODO change the user's model field to email to be consistent
    return User.findOne({username: String(email)}).exec()
  }
}

module.exports = UserRepository
