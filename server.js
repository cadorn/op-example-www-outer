
const PATH = require("path");
const FS = require("fs");
const EXPRESS = require("express");


const PORT = process.env.PORT || 8080;


var serviceUid = false;
if (FS.existsSync(PATH.join(__dirname, "service.json"))) {
    serviceUid = JSON.parse(FS.readFileSync(PATH.join(__dirname, "service.json"))).uid;
}

var pioConfig = JSON.parse(FS.readFileSync(PATH.join(__dirname, "../.pio.json")));

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

        var requestCount = 0;

        app.get("/_internal_status", function(req, res, next) {

            if (!req.headers["x-auth-token"]) {
                return next();
            }
            if (req.headers["x-auth-token"] !== pioConfig.config["pio.service"].config.internalStatusAuthToken) {
                return next(new Error("'x-auth-token' is invalid"));
            }

            var payload = {
                process: {
                    memoryUsage: process.memoryUsage()
                },
                server: {
                    requestCount: requestCount
                }
            };

            return res.end(JSON.stringify(payload, null, 4));
        });

        mountStaticDir(app, /^\/(.*)$/, PATH.join(__dirname, "www"));
        
        var server = app.listen(PORT);

        console.log("open http://0.0.0.0:" + PORT + "/");

        return callback(null, {
            server: server,
            port: PORT
        });

    } catch(err) {
        return callback(err);
    }

    function mountStaticDir(app, route, path) {
        app.get(route, function(req, res, next) {
            var originalUrl = req.url;
            req.url = req.params[0] || "index.html";
            EXPRESS.static(path)(req, res, function() {
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
