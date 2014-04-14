var Briefly = function() {

  // event handler for detecting scroll position and initiating ajax requests
  var scrollEvent = function(e) {
    var height = document.height || document.body.offsetHeight;
    var scroll = window.pageYOffset + window.innerHeight + (window.innerHeight / 2);

    if (scroll >= height) {
      var meats = document.getElementsByTagName('li');
      var last  = meats[meats.length - 1].className;

      request(last);

      // remove the listener after the request is kicked off so it doesn't fire a gazillion times
      window.document.removeEventListener('scroll', scrollEvent);
    }
  };

  // set up an ajax request and handle the response
  var request = function(lastmeat) {
    var httpRequest;

    // via MDN: https://developer.mozilla.org/en-US/docs/AJAX/Getting_Started
    if (window.XMLHttpRequest) {
      httpRequest = new XMLHttpRequest(); // good browsers
    } else if (window.ActiveXObject) { // IE
      try {
        httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
      } catch (e) {
        try {
          httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {}
      }
    }

    // (┛ಠ_ಠ)┛彡┻━┻
    if (!httpRequest) {
      alert('giving up, eff your old browser');
      return false;
    }

    // handle the response from the ajax request
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {

          // process the returned string into DOM, held only in memory
          var newlist = document.createElement('div');
          newlist.innerHTML = httpRequest.responseText;


          var newmeats = newlist.getElementsByTagName('li');
          var oldlist = document.getElementsByTagName('ul')[0];

          // append the new meats into the list on the page
          for (var i = 0; i < newmeats.length; i++) {
            oldlist.appendChild(newmeats[i]);
          }

          // add the event listener back to listen for events again
          window.document.addEventListener('scroll', scrollEvent);

        } else {
          console.log('There was a problem with the request.');
        }
      }
    };

    // make the request
    httpRequest.open('GET', '/moar/' + lastmeat);
    httpRequest.send();

  };

  return {
    init : function() {
      window.document.addEventListener('scroll', scrollEvent);
    }
  };

}();
