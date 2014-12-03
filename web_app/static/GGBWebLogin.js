var helper = (function() {
  var BASE_API_PATH = 'plus/v1/';
  return {
    /**
     * Hides the sign in button and starts the post-authorization operations.
     *
     * @param {Object} authResult An Object which contains the access token and
     *   other authentication information.
     */
    onSignInCallback: function(authResult) {
      gapi.client.load('plus','v1').then(function() {
        //$('#authResult').html('Auth Result:<br/>');
        /*for (var field in authResult) {
          $('#authResult').append(' ' + field + ': ' +
              authResult[field] + '<br/>');
        } */
        if (authResult['access_token']) {
          //$('#authOps').show('slow');
          //$('#gConnect').hide();
          document.getElementById('gConnect').setAttribute('style', 'display: none');
          helper.profile();
          //helper.people();
        } else if (authResult['error']) {
          // There was an error, which means the user is not signed in.
          // As an example, you can handle by writing to the console:
          console.log('There was an error: ' + authResult['error']);
          //$('#responseContainer').append('Logged out');
          //$('#authOps').hide('slow');
          //$('#gConnect').show();
          if (authResult['error'] == "user_signed_out") {
            document.getElementById('gConnect').setAttribute('style', 'display: block');
            $('#responseContainer').empty();
          }
        }
        console.log('authResult', authResult);
      });
    },
    /**
     * Calls the OAuth2 endpoint to disconnect the app for the user.
     */
    disconnect: function() {
      // Revoke the access token.
      $.ajax({
        type: 'GET',
        url: 'https://accounts.google.com/o/oauth2/revoke?token=' +
            gapi.auth.getToken().access_token,
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function(result) {
          console.log('revoke response: ' + result);
          $('#authOps').hide();
          $('#profile').empty();
          $('#visiblePeople').empty();
          $('#authResult').empty();
          $('#gConnect').show();
        },
        error: function(e) {
          console.log(e);
        }
      });
    },
    /**
     * Gets and renders the list of people visible to this app.
     */
    people: function() {
      gapi.client.plus.people.list({
        'userId': 'me',
        'collection': 'visible'
      }).then(function(res) {
        var people = res.result;
        $('#visiblePeople').empty();
        $('#visiblePeople').append('Number of people visible to this app: ' +
            people.totalItems + '<br/>');
        for (var personIndex in people.items) {
          person = people.items[personIndex];
          $('#visiblePeople').append('<img src="' + person.image.url + '">');
        }
      });
    },
    /**
     * Gets and renders the currently signed in user's profile data.
     */
    profile: function(){
      gapi.client.plus.people.get({
        'userId': 'me'
      }).then(function(res) {
        var profile = res.result;
        $('#responseContainer').empty();
        $('#responseContainer').append(
            $('<div><a href=\"javascript:logout()\"><img src=\"' + profile.image.url + '\">  ' + 'Hello ' + profile.displayName + '</a></div>'));
        //$('#responseContainer').append(
        //    $('Hello ' + profile.displayName + '</div>'));
        /*if (profile.cover && profile.coverPhoto) {
          $('#responseContainer').append(
              $('<p><img src=\"' + profile.cover.coverPhoto.url + '\"></p>'));
        } */
      }, function(err) {
        var error = err.result;
        $('#responseContainer').empty();
        $('#responseContainer').append(error.message);
      });
    }
  };
})();

function onSignInCallback(authResult) {
  helper.onSignInCallback(authResult);
}

function logout()
{
    console.log("signing out...");
    gapi.auth.signOut();
}
