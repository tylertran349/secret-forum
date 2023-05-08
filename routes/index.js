var express = require('express');
var router = express.Router();
const User = require("../models/user");
const Post = require("../models/post");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const flash = require('connect-flash');
require('dotenv').config();

passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username: username }).then((user, err) => { // Find a user with the given username
    if (err) { 
      return done(err); // Only if there's an error while querying database
    }
    if (!user) {
      return done(null, false, { message: "Incorrect username" }); // Only if no user with the given username exists in the database
    }
    bcrypt.compare(password, user.password, (err, res) => {
        if(res) {
            // Passwords match, log user in
            return done(null, user)
        } else {
            // Passwords do not match
            return done(null, false, { message: "Incorrect password" }); // Only if user enters incorrect password for the user that was found in the database
        }
    })
  }).catch(err => done(err));
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id).then(user => {
    done(null, user);
  }).catch(err => done(err));
});

router.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
router.use(passport.initialize());
router.use(passport.session());
router.use(flash());
router.use(express.urlencoded({ extended: false }));
router.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  Post.find({}, "user title content time")
  .populate({path: 'user', select: 'username'}) // Populate the user (path attribute is user) field of the message with its corresponding user and only include the username (select attribute is username)
  .then(function(list_posts) {
    res.render('home', { title: '💬 Secret Forum', user: req.user, posts: list_posts});
  })
  .catch(next); // Catch any errors that might occur during the find and populate operations and pass them on to the "next" middleware function
})

// Display user sign up form on GET
router.get('/sign-up', function(req, res, next) {
  res.render('sign-up-form', { title: 'Sign Up' });
});

router.get("/log-out", (req, res, next) => {
  req.logout(function(err) { // Logout the current user
    if(err) {
      return next(err);
    }
    res.redirect("/"); // Log out successful, redirect to home page
  })
})

// Handle user sign up on POST
router.post('/sign-up', [
  body('first_name').trim().isLength({min: 1}).escape().withMessage("First name must be specified.") // Checks if the value entered into the input element with the name attribute "first_name" has at least 1 character
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
        bcrypt.hash(req.body.password, 10, (err, hashedPassword) => { // Salt password from request body using bcrypt
          const user = new User({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            username: req.body.username,
            password: hashedPassword, // Set password to the salted password
            membership_status: false,
            admin_status: false,
            posts: [],
          });
          user.save().then(function() { // If save() was successful, redirect to home page
            res.redirect("/");
          }, function(err) { // If save() was unsuccessful, return an error
            return next(err);
          });
        });
      }
    })
  }
})

router.get('/login', function(req, res, next) {
  res.render('login-form', { title: "Login", message: req.flash('error') }); // Pass message property to view in case of any errors (req.flash stores error message)
});

router.post('/login', passport.authenticate("local", {
  successRedirect: "/", // If authentication is successful, redirect to home
  failureRedirect: "/login", // If authentication is unsuccessful, redirect back to login form and store a flash message containing the error message in the session using req.flash()
  failureFlash: true // Enable use of flash messages to display error messages
}), (req, res) => {
  res.render('login-form', { title: "Login", message: req.flash('error') }); // Pass error message stored in req.flash('error') variable to login-form template
});

router.get('/become-member', function(req, res, next) {
  res.render('member-form', { title: 'Become a Member', user: req.user });
});

router.post('/become-member', [
  body('passcode').trim().escape().custom((value, {req}) => value === process.env.SECRET_PASSCODE).withMessage("The passcode you entered is incorrect.")
], (req, res, next) => {
  const errors = validationResult(req);

  if(!errors.isEmpty()) {
    return res.render('member-form', { title: "Become a Member", user: req.user, errors: errors.array() })
  } else {
    // Update the user with the given username, set upsert to false so no new user will be inserted into the database if no matching user is found, and set useFindAndModify to false so that Mongoose will use findOneAndUpdate() rather than the legacy findAndModify() function
    User.findOneAndUpdate({ username: req.user.username }, { membership_status: true}, { upsert: false, useFindAndModify: false }).then(function() {
      res.redirect("/");
    }, function(err) {
      return next(err);
    });
  }
});

router.get('/new-post', function(req, res, next) {
  res.render("create-post-form", { title: 'Create a New Post' });
});

router.post('/new-post', [
  body('title').trim().isLength({min: 1}).escape().withMessage("Title cannot be empty."),
  body('content').trim().isLength({min: 1}).escape().withMessage("Content cannot be empty.")
], (req, res, next) => {
  // Extract any validation errors from a request
  const errors = validationResult(req);
  // If there are errors, re-render the new post form again
  if(!errors.isEmpty()) {
    return res.render('create-post-form', {title: 'Create a New Post', errors: errors.array()});
  } else {
    const post = new Post({
      user: req.user, // Associate current logged in user with the new post
      title: req.body.title,
      content: req.body.content,
      time: new Date(), 
    });
    post.save().then(function() {
      res.redirect("/");
    }, function(err) {
      return next(err);
    });
  }
});

router.get('/get-admin-access', function(req, res, next) {
  res.render('admin-form', { title: 'Become an Admin', user: req.user });
});

router.post('/get-admin-access', [
  body('passcode').trim().escape().custom((value, {req}) => value === process.env.ADMIN_PASSCODE).withMessage("The passcode you entered is incorrect.")
], (req, res, next) => {
  const errors = validationResult(req);

  if(!errors.isEmpty()) {
    return res.render('admin-form', { title: "Become an Admin", user: req.user, errors: errors.array() })
  } else {
    // Update the user with the given username, set upsert to false so no new user will be inserted into the database if no matching user is found, and set useFindAndModify to false so that Mongoose will use findOneAndUpdate() rather than the legacy findAndModify() function
    User.findOneAndUpdate({ username: req.user.username }, { admin_status: true}, { upsert: false, useFindAndModify: false }).then(function() {
      res.redirect("/");
    }, function(err) {
      return next(err);
    });
  }
});

router.post('/delete-post', function(req, res,next) {
  body('delete-post').trim().escape();
  Post.findByIdAndRemove(req.body["delete-post"]).then(function() { // req.body["delete-post"] is the ID of the post that the user wants to delete
    res.redirect("/");
  }, function(err) {
    return next(err);
  });
});

module.exports = router;
