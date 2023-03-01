var express = require('express');
var router = express.Router();
const User = require("../models/user");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Display user sign up form on GET
router.get('/sign-up', function(req, res, next) {
  res.render('sign-up-form', { title: 'Sign Up' });
});

// Handle user sign up on POST
router.post('/sign-up', (req, res, next) => {
  const user = new User({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    username: req.body.username,
    password: req.body.password,
    membership_status: true,
    messages: [],
  }).save(err => {
    if(err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
