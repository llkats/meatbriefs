var Briefly = function() {

  // event handler for detecting scroll position and initiating ajax requests
  var scrollEvent = function(e) {
    var height = document.height || document.body.offsetHeight;
    var scroll = window.pageYOffset + window.innerHeight + (window.innerHeight / 2);

    if (scroll >= height) {
      var list = document.querySelector('.briefs');
      var meats = document.querySelectorAll('.briefs li');
      var last  = meats[meats.length - 1].getAttribute('data-key');

      var loading = document.createElement('li');
      loading.id = 'loading';

      var img = document.createElement('img');
      img.src = '/public/loading.gif';
      loading.appendChild(img);
      list.appendChild(loading);

      request(last);

      // remove the listener after the request is kicked off so it doesn't fire a gazillion times
      document.removeEventListener('scroll', scrollEvent);
    }
  };

  function createMeatEntry(meat) {
    var li = document.createElement('li');
    li.setAttribute('data-key', meat.key);

    var video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.src = meat.value.media;
    var p = document.createElement('p');
    p.innerHTML = meat.value.message;
    var date = document.createElement('date');
    date.textContent = new Date(meat.value.created).toLocaleString();

    li.appendChild(video);
    li.appendChild(p);
    li.appendChild(date);
    return li;
  }

  function renderInitData() {
    if (!window._meatbriefInit) {
      request(0);
      return;
    }

    var data = window._meatbriefInit;
    window._meatbriefInit = null;

    var briefList = document.querySelector('.briefs');
    for (var i = 0; i < data.length; i++) {
      var rendered = createMeatEntry(data[i]);
      briefList.appendChild(rendered);
    }
  }

  // set up an ajax request and handle the response
  var request = function(lastmeat) {
    var httpRequest;

    // via MDN: https://developer.mozilla.org/en-US/docs/AJAX/Getting_Started
    if (window.XMLHttpRequest) {
      httpRequest = new window.XMLHttpRequest(); // good browsers
    } else {
      alert('giving up, eff your old browser');
      return;
    }

    var inserted = 0;
    var pos = 0;
    var briefList = document.querySelector('.briefs');

    var interval = null;
    function startTimer() {
      interval = setInterval(read, 50);
    }

    function clearTimer() {
      clearInterval(interval);
      interval = null;
    }

    function read() {
      if (httpRequest.responseText.length <= pos) {
        return;
      }

      var newlinePos = httpRequest.responseText.indexOf('\n', pos);
      while(newlinePos != -1) {
        var meat = createMeatEntry(JSON.parse(httpRequest.responseText.substring(pos, newlinePos)))
        if (!inserted) {
          briefList.removeChild(document.getElementById('loading'));
        }
        briefList.appendChild(meat);
        inserted++;
        pos = newlinePos + 1;
        newlinePos = httpRequest.responseText.indexOf('\n', pos);
      }
    }

    // handle the response from the ajax request
    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState < 3) {
        return;
      }
      if (httpRequest.status !== 200) {
        console.log('There was a problem with the request.');
        return;
      }

      if (httpRequest.readyState === 3) {
        if (!interval) {
          startTimer();
          read();
        }
      } else if (httpRequest.readyState === 4) {
        clearTimer();
        read();

        if (!inserted) {
          var loading = document.getElementById('loading');
          if (document.contains(loading)) {
            var p = document.createElement('p');
            p.innerHTML = 'that\'s all the fomo for today, time to go outside or drink';

            loading.getElementsByTagName('img')[0].src = 'data:image/gif;base64,' +
                'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            loading.appendChild(p);
          }
        } else {
          // add the event listener back to listen for events again
          document.addEventListener('scroll', scrollEvent);
        }
      }
    };

    // make the request
    httpRequest.open('GET', '/moar/' + lastmeat);
    httpRequest.send();
  };

  return {
    init : function() {
      renderInitData();
      document.addEventListener('scroll', scrollEvent);
    }
  };
}();
