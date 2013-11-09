
const PATH = require("path");
const FS = require("fs");
const EXPRESS = require("express");


const PORT = process.env.PORT || 8080;


var config = null;
var serviceUid = false;
if (FS.existsSync(PATH.join(__dirname, "service.json"))) {
    config = JSON.parse(FS.readFileSync(PATH.join(__dirname, "service.json")));
    serviceUid = config.uid;
}


exports.main = function(callback) {
    try {

        var app = EXPRESS();

        app.configure(function() {
            app.use(function(req, res, next) {
                if (serviceUid) {
                    res.setHeader("x-service-uid", serviceUid);
                }
                return next();
            });
            app.use(EXPRESS.logger());
            app.use(EXPRESS.bodyParser());
            app.use(EXPRESS.methodOverride());
        });

        mountStaticDir(app, /^\/(.*)$/, PATH.join(__dirname, "www"));
        
        var server = app.listen(PORT);

        console.log("open http://localhost:" + PORT + "/");

        return callback(null, {
            server: server,
            port: PORT
        });

    } catch(err) {
        return callback(err);
    }

    function mountStaticDir(app, route, rootPath) {
        app.get(route, function(req, res, next) {
            var originalUrl = req.url;
            req.url = req.params[0] || "index.html";

            if (/\.html$/.test(req.url) || /\.js$/.test(req.url)) {
                var path = PATH.join(rootPath, req.url);
                if (FS.existsSync(path)) {
                    var data = FS.readFileSync(path).toString();
                    data = data.replace(/%LOGGER_HOST%/g, (config && config.hcs.jslogger.host) || "logger.hookflash.me");
                    data = data.replace(/%HFSERVICE_HOST%/g, (config && config.hcs.hfservice.host) || "hfservice.hookflash.me");
                    data = data.replace(/%IDPROVIDER_HOST%/g, (config && config.hcs.identity.host) || "identity.hookflash.me");
                    if (/\.html$/.test(req.url)) {
                        res.setHeader("Content-Type", "text/html");
                    } else
                    if (/\.js$/.test(req.url)) {
                        res.setHeader("Content-Type", "application/javascript");
                    }
                    return res.end(data);
                }
            }

            EXPRESS.static(rootPath)(req, res, function() {
                req.url = originalUrl;
                return next.apply(null, arguments);
            });
        });
    };
}


if (require.main === module) {
    exports.main(function(err) {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }
    });
}
