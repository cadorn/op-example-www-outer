
const PATH = require("path");
const EXPRESS = require("express");


const PORT = process.env.PORT || 8080;


exports.main = function(callback) {
    try {

        var app = EXPRESS();

        app.configure(function() {
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
