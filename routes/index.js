var express = require('express');
var router = express.Router();
const User = require("../models/user");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

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
router.post('/sign-up', (req, res, next) => {
  bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
    const user = new User({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      username: req.body.username,
      password: hashedPassword,
      membership_status: true,
      messages: [],
    });
    user.save().then(err => {
      if(err) {
        return next(err);
      }
      res.redirect("/");
    })
  })
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/",
}));

module.exports = router;
