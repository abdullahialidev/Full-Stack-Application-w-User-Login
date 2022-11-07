module.exports = function (app, passport, db, MongoObjectId) {

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get('/', function (req, res) {
    res.render('index.ejs');
  });

  // EDIT PROFILE

  app.get(`/edit-profile/:id`, (req, res) => {
    const profileId = req.params.id;
    const profileIdToObjectId = new MongoObjectId(profileId);
    db.collection('applications').findOne({
        _id: profileIdToObjectId
      },
      (error, result) => {
        if (error) {
          console.log(`Error retrieving profile with id: ${profileId}`);
          return;
        }

        if (result) {
          console.log("Now returning results: ", result);
        }
        res.render('editApplication.ejs', {
          applicationResults: result
        })
      })
  });

  app.post(`/edit-profile/:id`, (req, res) => {
    const profileId = req.params.id;
    const profileIdToObjectId = new MongoObjectId(profileId);

    db.collection('applications').findOneAndUpdate(
      {
        _id: profileIdToObjectId
      },
      {
        $set: {
          jobTitle: req.body.jobTitle,
          jobSalary: req.body.salary,
          yearsOfExperience: req.body.yoe,
          contanct: req.body.contact,
          hiringManager: req.body.hiringManager,
          emailOfHiringManager: req.body.hiringManagerEmail,
          isContacted: req.body.didContactMe,
          location: req.body.location

        }
      },
      {
        upsert: true,
        returnNewDocument: true
      },
      (error, result) => {
        if (error) {
          console.log(`Error updating profile with id: ${profileId}`);
          return;
        }

        if (result) {
          console.log(`Successfully updated profile with id: ${profileId}`);
        }
        console.log("now redirecting ")
        res.redirect('/profile')
      })
  })

  app.delete('/profile', (req, res) => {
    const profileId = req.body.id;
    const profileIdToObjectId = new MongoObjectId(profileId);

    db.collection('applications').findOneAndDelete({
      _id: profileIdToObjectId
    }, (error, result) => {
        if (error) {
          console.log("Error deleting by id: ", profileIdToObjectId);
          console.log("Error: ", error);
        }

        if (result) {
          console.log("Successfully deleted id: ", profileIdToObjectId);
          res.send({
            status: 204,
            message: "Successfully deleted"
          })
        }
    })
  })

  // PROFILE SECTION =========================
  app.get('/profile', isLoggedIn, function (req, res) {
    db.collection('applications').find().toArray((err, result) => {
      if (err) return console.log(err)
      res.render('profile.ejs', {
        jobApplications: result,
      })
    })
  });

  // LOGOUT ==============================
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  // message board routes ===============================================================

  app.post('/messages', (req, res) => {
    db.collection('messages').insertMany([{
      name: req.body.name,
      msg: req.body.msg,
      thumbUp: 0,
      thumbDown: 0
    }])
    res.redirect('/profile')
  })

  app.put('/thumbUp', (req, res) => {
    db.collection('messages')
      .findOneAndUpdate({
        name: req.body.name,
        msg: req.body.msg,
      }, {
        $set: {
          thumbUp: req.body.thumbUp + 1
        }
      }, {
        sort: {
          _id: -1
        },
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
  })
  app.put('/thumbDown', (req, res) => {
    db.collection('messages')
      .findOneAndUpdate({
        name: req.body.name,
        msg: req.body.msg,
      }, {
        $set: {
          thumbUp: req.body.thumbUp - 1
        }
      }, {
        sort: {
          _id: -1
        },
        upsert: true
      }, (err, result) => {
        if (err) return res.send(err)
        res.send(result)
      })
  })


  app.delete('/messages', (req, res) => {
    db.collection('messages').findOneAndDelete({
      name: req.body.name,
      msg: req.body.msg
    }, (err, result) => {
      if (err) return res.send(500, err)
      res.send('Message deleted!')
    })
  })

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function (req, res) {
    res.render('login.ejs', {
      message: req.flash('loginMessage')
    });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function (req, res) {
    res.render('signup.ejs', {
      message: req.flash('signupMessage')
    });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function (req, res) {
    var user = req.user;
    user.local.email = undefined;
    user.local.password = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // routes for application


  app.post('/applications', function (req, res) {

    const document = {
      jobTitle: req.body.jobTitle,
      jobSalary: req.body.salary,
      yearsOfExperience: req.body.yoe,
      contanct: req.body.contact,
      hiringManager: req.body.hiringManager,
      emailOfHiringManager: req.body.hiringManagerEmail,
      isContacted: req.body.didContactMe,
      location: req.body.location
    }

    try {
      db.collection('applications').insert(document);
      res.redirect('/profile')
    } catch (error) {
      console.log('error occured inserting applications: ', error);
    }


  })

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}