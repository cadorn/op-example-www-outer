/* 

Copyright (c) 2012, SMB Phone Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies,
either expressed or implied, of the FreeBSD Project.

 */

/**
 *      This webpage is loaded as a hidden inner iframe by the browser and receives
 *  information via the outer JavaScript via a message posted to the identity 
 *  provider's inner JavaScript hidden iframe window page.The URL for this page 
 *  to render in a browser is returned from the "Identity Login Start" page. 
 *  Normally the inner page receives the private posted information and immediately 
 *  redirects the inner page to the identity provider's login page allowing the user
 *  to enter their identity credentials. This the outer page is typically rendered 
 *  inside a browser window and contains sufficient display size to allow an 
 *  identity provider to enter their credential information (unless relogin is used 
 *  in which case there will be no rendered page for entering credential information).
 *  
 *  Methods:
 *      init                                - loads inner frame (called on load)
 *      initInnerFrame                      - called by client app
 *      sendBundleToJS                      - called by client app
 *      notifyClient                        - sends message to client application
 */

((function() {


function setLastMessage(message) {
//  $("#lastMessageViewer").prepend(message + "\n");
}


// CONSTANTS
var innerFrameId = "innerFrameId";       // inner iframe id
var innerFrameParentId = "innerFrame";   // inner iframe id

// Variables
var inner;
var innerFrameDomain;
var innerFrameURL;                       // inner iframe url
var initData;


function log() {
    if (window.__LOGGER) {
        return window.__LOGGER.log.apply(null, arguments);
    } else {
        console.log(arguments);
    }
}


/** 
 * Init method.
 * onload page
 */
window.init = function init() {
    log("##### INIT #####", window.location.href);
    var url = window.location.href;
    initData = {outerURL: url};
}

/**
 * Initialize inner frame.
 * called by client application
 * after outer page is loaded.
 *
 * @param identityLoginURL - url of the inner frame
 */
window.initInnerFrame = function initInnerFrame(identityLoginURL) {
    log('initInnerFrame' + identityLoginURL);
    innerFrameURL = identityLoginURL;
    localStorage.innerFrameURL = innerFrameURL;
    // load inner frame
    var innerFrame = document.createElement('iframe');
    innerFrame.src = innerFrameURL;
    innerFrame.id = innerFrameId;
    var parentDiv = document.getElementById(innerFrameParentId);
    parentDiv.appendChild(innerFrame);
}

/**
 * Global cross-domain message receiver.
 *
 * @param message
 */
window.onmessage = function(message) {
    log('window.onmessage - start' + message.data);
    handleOnMessage(message);
}

/**
 * Handle window.onmessage.
 *
 * @param message
 */
function handleOnMessage(message) {
    try {
        var dataJSON = JSON.parse(message.data);

        log("[handleOnMessage] dataJSON", dataJSON);
        setLastMessage("onmessage - " + JSON.stringify(dataJSON, null, 4));

        if (dataJSON.notify) {
            //localStorage.outerFrameURL = dataJSON.notify.browser.outerFrameURL;
            notifyClient(JSON.stringify(dataJSON));
        }else if (dataJSON.request) {
            if (dataJSON.request.$method === 'namespace-grant-window'){
                notifyClient(JSON.stringify(dataJSON));
            }else if (dataJSON.request.$method === 'identity-access-lockbox-update'){
                notifyClient(JSON.stringify(dataJSON));
            }
        }else {
            notifyClient(JSON.stringify(dataJSON));
        }
    } catch (e) {
        // handle exception
        var errorMessage = {
            "error" : "error parsing json"
        };
        notifyClient(JSON.stringify(errorMessage));
    }
}

/**
 * Client to javaScript message receiver.
 *
 * @param bundle - notify or result
 */
window.sendBundleToJS = function sendBundleToJS(bundle){
    log('sendBundleToJS -' + bundle);
    try {
        var dataJSON = JSON.parse(bundle);
        inner = document.getElementById(innerFrameId).contentWindow;
        var innerFrameDomainData = innerFrameURL.split("/");
        innerFrameDomain = innerFrameDomainData[2];
        //TODO
        if (location.protocol === 'https:'){
		      locationProtocol = "https:";
	      } else {
		      locationProtocol = "http:";
	      }
        setLastMessage("to inner - " + JSON.stringify(JSON.parse(bundle), null, 4));
        inner.postMessage(bundle, locationProtocol + innerFrameDomain);
    } catch(e){
        log('sendBundleToJS - error');
    }
}

/**
 * Notifies client application.
 *
 * @param message
 */
function notifyClient(message) {
    var iframe = document.createElement("IFRAME");
    var locationProtocol;
	  if (location.protocol === 'https:'){
		  locationProtocol = "https:";
	  } else {
		  locationProtocol = "http:";
	  }
    setLastMessage("to cpp - " + JSON.stringify(JSON.parse(message), null, 4));
    iframe.setAttribute("src", locationProtocol + "//datapass.hookflash.me/?method=notifyClient;data=" + message);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
    console.log(locationProtocol + "//datapass.hookflash.me/?method=notifyClient  data=" + message);
}



$(document).ready(function() {

    if (window.location.search === "?dev=true") {
        var button = null;
        $("BODY").append('<hr>');

        button = $('<button>1) Load Inner Frame</button>');
        button.click(function() {
            window.initInnerFrame("//%HFSERVICE_HOST%/hfservice/namespacegrantinnerframe?dev=true");
        });
        $("BODY").append(button);
    }

});



/*
// TODO - remove this function
function testInitInnerFrame() {
    //initInnerFrame("http://localhost:8080/hfservice/hostedidentityinnerframe");
    initInnerFrame("https://hcs-javascript.hookflash.me/hfservice/namespacegrantinnerframe");
}

// TODO - remove this after test
function testGrantStartNotify() {
    var n = {
      "notify": {
        "$domain": "idprovider-javascript.hookflash.me",
        "$appid": "com.hookflash.OpenPeerSampleApp",
        "$id": "abd23",
        "$handler": "namespace-grant",
        "$method": "namespace-grant-start",

        "agent": {
          "userAgent": "hookflash/1.0.1001a (iOS/iPad)",
          "name": "hookflash",
          "image": "https://hookflash.com/brandsquare.png",
          "url": "https://hookflash.com/agentinfo/"
        },

        "namespaceGrantChallenges": {

           "namespaceGrantChallenge": [
             {
              "$id": "20651257fecbe8436cea6bfd3277fec1223ebd63",
              "name": "Provider Lockbox Service",
              "image": "https://provider.com/lockbox/lockbox.png",
              "url": "https://provider.com/lockbox/",

              "namespaces": {
                "namespace": [
                  {
                    //"$id": "http://localhost:8080/hfservice/permission/permission1"
                    "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission1"
                  },
                  {
                    //"$id": "http://localhost:8080/hfservice/permission/permission2"
                    "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission2"
                  }
                ]
              }
            },
            {
              "$id": "1bbca957f2cb2802480b81c16b1f76176b762340",
              "name": "Provider Identity Service",
              "image": "https://provider.com/identity/identity.png",
              "url": "https://provider.com/identity/",

              "namespaces": {
                "namespace": [
                  {
                    //"$id": "http://localhost:8080/hfservice/permission/permission1"
                    "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission1"
                  },
                  {
                    //"$id": "http://localhost:8080/hfservice/permission/permission2"
                    "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission2"
                  }
                ]
              }
            }
          ]
        },

        "browser": {
          "visibility": "visible-on-demand",
          "popup": "deny",
          "outerFrameURL": "https://webapp.com/outerframe?reload=true"
        }
      }
    };
    sendBundleToJS(JSON.stringify(n));
}

// TODO - remove this after test
function testGrantStartBoki(){
   
    var boki = {
        "notify": {
            "$domain": "hcs-javascript.hookflash.me",
            "$appID": "com.hookflash.OpenPeerSampleApp",
            "$handler": "namespace-grant",
            "$id": "xkEDTGddTlVAIddKFiAWbwXgfCdRwURP",
            "$method": "namespace-grant-start",
            "agent": {
                "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                "name": "OpenPeerSampleApp",
                "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                "url": "www.openpeer.org"
            },
            "namespaceGrantChallenges": {
                "namespaceGrantChallenge": {
                    "$id": "7e590c892c2f89f1d04d984a639d708f",
                    "name": "Provider Lockbox Service",
                    "image": "Provider Lockbox Service",
                    "url": "Provider Lockbox Service",
                    "domains": "Provider Lockbox Service",
                    "namespaces": {
                        "namespace": [
                            {
                                "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission1"
                            },
                            {
                                "$id": "https://hcs-javascript.hookflash.me/hfservice/static/permission/permission2"
                            }
                        ]
                    }
                }
            },
            "browser": {
                "visibility": "visible-on-demand",
                "popup": "deny",
                "outerFrameURL": "grantFinished"
            }
        }
    };
    sendBundleToJS(JSON.stringify(boki));
}
*/

})());
