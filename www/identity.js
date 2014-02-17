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
    log("##### INIT 2 #####", window.location.href);
    var url = window.location.href;
    //if (url.indexOf(localStorage.outerFrameURL) == 0){
    if (
        url.indexOf('reload=true') != -1 &&
        localStorage.innerFrameURL &&
        !/^undefined/.test(localStorage.innerFrameURL)
    ) {
        // after OAuth redirect
        // load inner frame with parameters
        var params = url.split("?").pop();
        initInnerFrame(localStorage.innerFrameURL + "?reload=true&" + params);
        log('init - reload=true');
    } else {
        // fresh scenario
        localStorage.clear();
        log('init - fresh start');
        //localStorage.outerFrameURL = window.location.href;
    }
}

/**
 * Initialize inner frame.
 * called by client application
 * after outer page is loaded.
 *
 * @param identityLoginURL - url of the inner frame
 */
window.initInnerFrame = function initInnerFrame(identityLoginURL) {
    var  locationProtocol;
	  if (location.protocol === 'https:'){
		  locationProtocol = "https://";
	  } else {
		  locationProtocol = "http://";
	  }

    if (/skin=\w+/.test(window.location.search)) {
        log('initInnerFrame add skin to url due to window.location.search', window.location.search);

        if (/\?$/.test(identityLoginURL)) {
            identityLoginURL += "";
        } else
        if (/\?/.test(identityLoginURL)) {
            identityLoginURL += "&";
        } else {
            identityLoginURL += "?";
        }
        identityLoginURL += "skin=" + window.location.search.match(/skin=(.+?)(?:&|$|\?)/)[1];
    }
    if (/view=\w+/.test(window.location.search)) {
        log('initInnerFrame add view to url due to window.location.search', window.location.search);

        if (/\?$/.test(identityLoginURL)) {
            identityLoginURL += "";
        } else
        if (/\?/.test(identityLoginURL)) {
            identityLoginURL += "&";
        } else {
            identityLoginURL += "?";
        }
        identityLoginURL += "view=" + window.location.search.match(/view=(.+?)(?:&|$|\?)/)[1];
    }

    log('initInnerFrame ' + locationProtocol + identityLoginURL);

    //innerFrameURL = locationProtocol + identityLoginURL;
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
            if (dataJSON.request.$method === 'identity-access-window'){
                notifyClient(JSON.stringify(dataJSON));
            }else if (dataJSON.request.$method === 'identity-access-lockbox-update'){
                notifyClient(JSON.stringify(dataJSON));
            }else if (dataJSON.request.$method === 'identity-access-rolodex-credentials-get'){
                notifyClient(JSON.stringify(dataJSON));
            }
        }else if (dataJSON.result){
            notifyClient(JSON.stringify(dataJSON));
        }
    } catch (e) {
        log("ERROR", e.message, e.stack);
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
        if (bundle) {
            var dataJSON = JSON.parse(bundle);
            if (dataJSON.notify && dataJSON.notify && dataJSON.notify.browser && dataJSON.notify.browser.outerFrameURL){
                localStorage.outerFrameURL = dataJSON.notify.browser.outerFrameURL;
            }
        }

        sendPostMessage(bundle);
    } catch(e){
        log('sendBundleToJS - error');
    }
}

function sendPostMessage(bundle) {
    inner = document.getElementById(innerFrameId).contentWindow;
    var innerFrameDomainData = innerFrameURL.split("/");
    innerFrameDomain = innerFrameDomainData[2];
    if (location.protocol === 'https:'){
          locationProtocol = "https://";
      } else {
          locationProtocol = "http://";
      }
    log("[sendBundleToJS] bundle", bundle);
    log("[sendBundleToJS] domain", locationProtocol + innerFrameDomain);
    setLastMessage("to inner - " + JSON.stringify(JSON.parse(bundle), null, 4));
    inner.postMessage(bundle, locationProtocol + innerFrameDomain);
}

/**
 * Notifies client application.
 *
 * @param message
 */
function notifyClient(message) {
    log("[notifyClient] message", message);
    setLastMessage("to cpp - " + JSON.stringify(JSON.parse(message), null, 4));
    var iframe = document.createElement("IFRAME");
    var locationProtocol;
	  if (location.protocol === 'https:'){
		  locationProtocol = "https:";
	  } else {
		  locationProtocol = "http:";
	  }
    var url = locationProtocol + "//datapass.hookflash.me/?method=notifyClient;data=" + message;
    log("[notifyClient] url", url);
    iframe.setAttribute("src", url);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
}



$(document).ready(function() {

    if (/dev=true/.test(window.location.search)) {
        var button = null;
        $("HEAD").append('<link rel="stylesheet" href="style-dev.css"/>');
        $("BODY").prepend('<div class="label">' + window.location.pathname + '</div>');
        $("BODY").append('<hr>');

        var loginHost = "%IDPROVIDER_HOST%";
        if (window.location.hostname === "localhost") {
            loginHost = "localhost:8001";
        }

        button = $('<button>1) Load Inner Frame</button>');
        button.click(function() {
            window.initInnerFrame("http://" + loginHost + "/login.php?" + ((/skin=\w*/.test(window.location.search))?"&skin="+window.location.search.match(/skin=(.+?)(?:&|$|\?)/)[1]:""));
        });
        $("BODY").append(button);

        // Default to config used on legacy.
        var identityProviderDomain = "idprovider-javascript.hookflash.me";
        if (/-i\.hcs\.io$/.test(loginHost)) {
            identityProviderDomain = loginHost;
        }

        button = $('<button>2) Federated login</button>');
        button.click(function() {
            window.sendBundleToJS(JSON.stringify({
                "notify": {
                    "$domain": identityProviderDomain,
                    "$appID": "com.hookflash.OpenPeerSampleApp",
                    "$handler": "identity",
                    "$id": "A2njBGMmwKAjxiH23SW5myMf5CGfrbVT",
                    "$method": "identity-access-start",
                    "agent": {
                        "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                        "name": "OpenPeerSampleApp",
                        "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                        "url": "www.openpeer.org"
                    },
                    "identity": {
                        "base": "identity://" + identityProviderDomain + "/",
                        "provider": identityProviderDomain
                    },
                    "browser": {
                        "visibility": "visible-on-demand",
                        "popup": "deny",
                        "outerFrameURL": "https://app-javascript.hookflash.me/outer.html?reload=true"
                    }
                }
            }));
        });
        $("BODY").append(button);
        button = $('<button>2) Federated relogin</button>');
        button.click(function() {
            window.sendBundleToJS(JSON.stringify({
                "notify": {
                    "$domain": identityProviderDomain,
                    "$appID": "com.hookflash.OpenPeerSampleApp",
                    "$handler": "identity",
                    "$id": "A2njBGMmwKAjxiH23SW5myMf5CGfrbVT",
                    "$method": "identity-access-start",
                    "agent": {
                        "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                        "name": "OpenPeerSampleApp",
                        "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                        "url": "www.openpeer.org"
                    },
                    "identity": {
                        "uri": "identity://" + identityProviderDomain + "/h13",
                        "reloginKey": "U2FsdGVkX19jc5f/bpoRrplHAmJcT7kFjnm2sBT2V4zqrVoRkS0wQmWaOnppYtWDfznW18jzrn2Jl/iEeYqBYbOxyErlCyDqq25NG+VrFYP9bEEkNIuXCINj39Zz1CGvjyp6uAQe+V40Z2t2vRyPgPFKBwT1a8LLVhFZ5iOwUVhYN/TmOvDhvMmLbUbl+zeR3eOOcM4Kr+TryG7APHTHjbyU30spCKth4z8e2cexHB0=",
                        "provider": identityProviderDomain
                    },
                    "browser": {
                        "visibility": "visible-on-demand",
                        "popup": "deny",
                        "outerFrameURL": "https://app-javascript.hookflash.me/outer.html?reload=true"
                    }
                }
            }));
        });
        $("BODY").append(button);
        button = $('<button>2) Facebook login</button>');
        button.click(function() {
            window.sendBundleToJS(JSON.stringify({
                "notify": {
                    "$domain": identityProviderDomain,
                    "$appID": "com.hookflash.OpenPeerSampleApp",
                    "$handler": "identity",
                    "$id": "A2njBGMmwKAjxiH23SW5myMf5CGfrbVT",
                    "$method": "identity-access-start",
                    "agent": {
                        "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                        "name": "OpenPeerSampleApp",
                        "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                        "url": "www.openpeer.org"
                    },
                    "identity": {
                        "base" : "identity://facebook.com/",
                        "provider": identityProviderDomain
                    },
                    "browser": {
                        "visibility": "visible-on-demand",
                        "popup": "deny",
                        "outerFrameURL": "http://app-javascript.hookflash.me/outer.html?reload=true"
                    }
                }
            }));
        });
        $("BODY").append(button);
        button = $('<button>Test CORS for password service</button>');
        button.click(function() {
            $.ajax({
                url : "http://hfservice-v1-cadorn-i.hcs.io/password1",
                type : "post",
                data : JSON.stringify({"request":{"$domain":"identity-v1-cadorn-i.hcs.io","$id":"393120","$handler":"identity","$method":"hosted-identity-secret-part-set","nonce":"208657a4dde3ea72718009d2ddfc564ba3b0edef","hostingProof":"06d8542289e79814f512eaf545683b8624527f21","hostingProofExpires":1390695625,"clientNonce":"3123","identity":{"accessToken":"facebook-100507572584075-1395793225-416e466dfb1be094ff367656ad7bc9e823a66180","accessSecretProof":"7cbcd3a4f603da1b4ab89d55f19eb3bdff27077a","accessSecretProofExpires":1395793225,"uri":"identity://facebook.com/100007575584075","secretSalt":"14c4a2f0df5590cfc28a72894658e85fe23bd3de","secretPart":"5f08749e7e5e2a2555f3fc1fe7a360b00fe93689"}}}),
                dataType: "json",
                contentType: "application/json",
                // callback handler that will be called on success
                success: function(response, textStatus, jqXHR) {
                    console.log("success", response, textStatus, jqXHR);
                },
                // callback handler that will be called on error
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error(jqXHR, textStatus, errorThrown);
                }
            });

        });
        $("BODY").append(button);
    } else if(/test=true/.test(window.location.search)) {
        //overriding notifyClient to send messages to testClient via postMessage instead
        notifyClient = function(jsonString) {
            var message = {
                message: "notify-client",
                json: jsonString
            };
            sendParent(message);
        };

        function sendParent(message) {
            window.parent.postMessage(JSON.stringify(message), '*');
        }

        //proxy register method which pass the message to the innerFrame
        window.testRegister = function(name, username, password) {
            var payload = {_test_register: {
                name: name, 
                username: username,
                password: password
            }}
            sendPostMessage(JSON.stringify(payload));
        };

        //proxy login method which pass the message to the innerFrame
        window.testLogin = function(username, password) {
            var payload = {_test_login: {
                username: username,
                password: password
            }}
            sendPostMessage(JSON.stringify(payload));
        };

        //look for messages coming from the testClient and evaluate methods bind to window
        window.addEventListener("message", function(event) {
            try{
                var payload = JSON.parse(event.data);
                if(payload.message == 'exec') {
                    window[payload.method].apply(window, payload.args);
                }
            } catch(ex) {
                //don't worry this is not for us
            }
        }, false);

        //tell test-client to initiate its process
        sendParent({message: 'start-communication'});
    }

});




/*
// TODO - remove this
function testRolodex(){
    var req = {
                "request": {
                    "$domain": "provider.com",
                    "$appid": "xyz123",
                    "$id": "abd23",
                    "$handler": "identity",
                    "$method": "identity-access-rolodex-credentials-get",

                    "clientNonce": "ed585021eec72de8634ed1a5e24c66c2",
                    "identity": {
                        "accessToken": "a913c2c3314ce71aee554986204a349b",
                        "accessSecretProof": "b7277a5e49b3f5ffa9a8cb1feb86125f75511988",
                        "accessSecretProofExpires": 43843298934,

                        "uri": "identity://domain.com/alice",
                        "provider": "domain.com"
                     }

                }
     };
     sendBundleToJS(JSON.stringify(req));
}

// TODO - remove this function
function testInitInnerLockbox() {
    initInnerFrame("http://idprovider-javascript.hookflash.me/login.html");
}


// TODO - remove this after test
function testNotifyFederatedRelogin() {
    var n = {
                  "notify": {
                      "$domain": "idprovider-javascript.hookflash.me",
                      "$appID": "com.hookflash.OpenPeerSampleApp",
                      "$handler": "identity",
                      "$id": "A2njBGMmwKAjxiH23SW5myMf5CGfrbVT",
                      "$method": "identity-access-start",
                      "agent": {
                          "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                          "name": "OpenPeerSampleApp",
                          "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                          "url": "www.openpeer.org"
                      },
                      "identity": {
                          "uri": "identity://idprovider-javascript.hookflash.me/h13",
                          "reloginKey": "U2FsdGVkX19jc5f/bpoRrplHAmJcT7kFjnm2sBT2V4zqrVoRkS0wQmWaOnppYtWDfznW18jzrn2Jl/iEeYqBYbOxyErlCyDqq25NG+VrFYP9bEEkNIuXCINj39Zz1CGvjyp6uAQe+V40Z2t2vRyPgPFKBwT1a8LLVhFZ5iOwUVhYN/TmOvDhvMmLbUbl+zeR3eOOcM4Kr+TryG7APHTHjbyU30spCKth4z8e2cexHB0=",
                          "provider": "idprovider-javascript.hookflash.me"
                      },
                      "browser": {
                          "visibility": "visible-on-demand",
                          "popup": "deny",
                          "outerFrameURL": "https://app-javascript.hookflash.me/outer.html?reload=true"
                      }
                  }
              };
    sendBundleToJS(JSON.stringify(n));
}
function testNotifyFacebook() {
    var boki = {
                  "notify": {
                      "$domain": "idprovider-javascript.hookflash.me",
                      "$appID": "com.hookflash.OpenPeerSampleApp",
                      "$handler": "identity",
                      "$id": "A2njBGMmwKAjxiH23SW5myMf5CGfrbVT",
                      "$method": "identity-access-start",
                      "agent": {
                          "userAgent": "OpenPeerSampleApp/1.0 (iPhone OS 6.1.2;iPad) HOPID/1.0 (777)",
                          "name": "OpenPeerSampleApp",
                          "image": "http://hookflash.com/wp-content/themes/CleanSpace/images/logo.png",
                          "url": "www.openpeer.org"
                      },
                      "identity": {
                          "base" : "identity://facebook.com/",
                          "provider": "idprovider-javascript.hookflash.me"
                      },
                      "browser": {
                          "visibility": "visible-on-demand",
                          "popup": "deny",
                          "outerFrameURL": "http://app-javascript.hookflash.me/outer.html?reload=true"
                      }
                  }
              };
    sendBundleToJS(JSON.stringify(boki));
}

// TODO - remove this after test
function testIdentityAccessLockboxUpdate(){
    var n = {
        "request": {
            "$domain": "idprovider-javascript.hookflash.me",
            "$appID": "com.hookflash.OpenPeerSampleApp",
            "$handler": "identity",
            "$id": "Us9IVPYTf23B5lQkUw04yL1DdAlQHyKo",
            "$method": "identity-sign",
            "clientNonce": "3ooVx7ZXPz6Q3h27cpSpz5cQNcpfZaEB",
            "identity": {
                "accessToken": "3d03849efaaae84b28750257f0799f0761c13921",
                "accessSecretProof": "3d235f039f7b0bd43d2d733400d2e064c38c61f2",
                "accessSecretProofExpires": 1373544763,
                "uri": "identity://idprovider-javascript.hookflash.me/N",
                "provider": "idprovider-javascript.hookflash.me"
            }
        }
     };
    sendBundleToJS(JSON.stringify(n));
}
*/
})());
