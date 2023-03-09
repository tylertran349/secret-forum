var express = require('express');
var router = express.Router();
const User = require("../models/user");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
require('dotenv').config();

passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username: username }).then((user, err) => {
    if (err) { 
      return done(err);
    }
    if (!user) {
      return done(null, false, { message: "Incorrect username" });
    }
    bcrypt.compare(password, user.password, (err, res) => {
        if(res) {
            // Passwords match, log user in
            return done(null, user)
        } else {
            // Passwords do not match
            return done(null, false, {message: "Incorrect password"});
        }
    })
  }).catch(err => done(err));
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// TODO: Model.findById() no longer accepts a callback
passport.deserializeUser(function(id, done) {
  User.findById(id).then(user => {
    done(null, user);
  }).catch(err => done(err));
});

router.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
router.use(passport.initialize());
router.use(passport.session());
router.use(express.urlencoded({ extended: false }));
router.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.messages = req.messages;
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login-form', { title: 'Secret Chat Room', user: req.user });
});

// Display user sign up form on GET
router.get('/sign-up', function(req, res, next) {
  res.render('sign-up-form', { title: 'Sign Up' });
});

router.get("/log-out", (req, res, next) => {
  req.logout(function(err) {
    if(err) {
      return next(err);
    }
    res.redirect("/");
  })
})

// Handle user sign up on POST
router.post('/sign-up', [
  body('first_name').trim().isLength({min: 1}).escape().withMessage("First name must be specified.")
  .isAlphanumeric().withMessage("First name has non-alphanumeric characters."),
  body('last_name').trim().isLength({min: 1}).escape().withMessage("Last name must be specified.")
  .isAlphanumeric().withMessage("Last name has non-alphanumeric characters."),
  body('username').trim().isLength({min: 1}).escape().withMessage("Username must be specified.")
  .isAlphanumeric().withMessage("Username has non-alphanumeric characters."),
  body('password').trim().isLength({min: 8}).escape().withMessage("Password must have 8 or more characters."),
  body('confirm-password').trim().escape().custom((value, {req}) => value === req.body.password).withMessage("The passwords do not match."),
], (req, res, next) => {
  // Extract any validation errors from a request
  const errors = validationResult(req);
  // If there are errors, re-render the sign up form again
  if(!errors.isEmpty()) {
    return res.render('sign-up-form', {title: 'Sign Up', errors: errors.array()});
  } else {
    User.findOne({ username: req.body.username }).then(found_username => {
      if(found_username) {
        const error = [{msg: "Username already exists."}]; // Create an array with a single object that contains a msg property with the custom error message
        return res.render("sign-up-form", {title: 'Sign Up', errors: error }); // Pass the array to the sign-up-form view using the errors property
      } else {
        bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
          const user = new User({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            username: req.body.username,
            password: hashedPassword,
            membership_status: false,
            messages: [],
          });
          user.save().then(function() { // If save() was successful, redirect to localhost:3000
            res.redirect("/");
          }, function(err) { // If save() was unsuccessful, return an error
            return next(err);
          });
        });
      }
    })
  }
})

router.post('/login', passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/",
}));

router.get('/join-club', function(req, res, next) {
  res.render('join-the-club-form', { title: 'Join the Club', user: req.user });
});

// TODO: When the correct passcode (13579) gets entered, the membership_status doesn't get changed to true as it should
router.post('/join-club', [
  body('passcode').trim().escape().custom((value, {req}) => value === process.env.SECRET_PASSCODE).withMessage("The passcode you entered is incorrect.")
], (req, res, next) => {
  const errors = validationResult(req);

  if(!errors.isEmpty()) {
    return res.render('join-the-club-form', { title: "Join the Club", user: req.user, errors: errors.array() })
  } else {
    User.findOneAndUpdate({ username: req.user.username }, { membership_status: true}, { upsert: false, useFindAndModify: false }).then(function() {
      res.redirect("/");
    }, function(err) {
      return next(err);
    });
  }
});

module.exports = router;
