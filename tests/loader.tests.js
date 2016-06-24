var assert = require('chai').assert
var loader = require('..')
var request = require('request')
var EventEmitter = require('events').EventEmitter

describe('Vault Loader', function() {

    var confabulous
    var token

    before(function(done) {
        request({ method: 'POST', url: 'http://localhost:8200/v1/auth/app-id/login', json: true, body: { app_id: 'svc-demo-api', user_id: 'demo-live' } }, function(err, res, body) {
            if (err) return done(err)
            if (res.statusCode !== 200) return done(new Error('Login failed: ' + res.statusCode))
            token = body.auth.client_token
            done()
        })
    })

    beforeEach(function(done) {
        confabulous = new EventEmitter()

        request({ method: 'DELETE', url: 'http://localhost:8200/v1/secret/live/demo', headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            if (err) return done(err)
            if (res.statusCode !== 204) return done(new Error('Error deleting data: ' + res.statusCode))
            done();
        })
    })

    afterEach(function(done) {
        confabulous.emit('reloading')
        confabulous.removeAllListeners()
        done()
    })

    after(function(done) {
        request({ method: 'DELETE', url: 'http://localhost:8200/v1/secret/live/demo', headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            if (err) return done(err)
            if (res.statusCode !== 204) return done(new Error('Error deleting data: ' + res.statusCode))
            done();
        })
    })

    it('should require url when mandatory', function(done) {
        loader()(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'url is required')
            done()
        })
    })

    it('should require a path when mandatory', function(done) {
        loader({ url: 'http://localhost:8200' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'path is required')
            done()
        })
    })

    it('should require a method when mandatory', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'method is required')
            done()
        })
    })

    it('should require an appId when mandatory and method is app-id', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'appId is required')
            done()
        })
    })

    it('should require a userId when mandatory and method is app-id', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'userId is required')
            done()
        })
    })

    it('should require a watch interval when watching and method is app-id', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api', userId: 'demo-live', watch: {} })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'watch interval is required')
            done()
        })
    })

    it('should load configuration', function(done) {

        request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            assert.ifError(err)
            assert.equal(res.statusCode, 204)

            loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' })(confabulous, function(err, config) {
                assert.ifError(err)
                assert.equal(config.loaded, 'loaded')
                done()
            })
        })
    })

    it('should timeout', function(done) {

        loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', request: { timeout: 1 } })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'ETIMEDOUT')
            done()
        })
    })

    it('should report errors', function(done) {
        loader({ url: 'http://localhost:9999', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' })(confabulous, function(err, config) {
            assert(err)
            assert(/connect ECONNREFUSED/.test(err.message), err.message)
            done()
        })
    })

    it('should report unexpected status codes', function(done) {
        loader({ url: 'http://localhost:8200', path: 'sys/foo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'http://localhost:8200/v1/sys/foo returned 403')
            done()
        })
    })

    it('should report 404s when mandatory', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo/missing', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' })(confabulous, function(err, config) {
            assert(err)
            assert.equal(err.message, 'http://localhost:8200/v1/secret/live/demo/missing returned 404')
            done()
        })
    })

    it('should ignore 404s when not mandatory', function(done) {
        loader({ url: 'http://localhost:8200', path: 'secret/live/demo/missing', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', mandatory: false })(confabulous, function(err, config) {
            assert.equal(err, true)
            done()
        })
    })

    it('should emit change event when data changes', function(done) {

        request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            assert.ifError(err)
            assert.equal(res.statusCode, 204)

            loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', watch: { interval: '1s' } })(confabulous, function(err, config) {
                assert.ifError(err)
                assert.equal(config.loaded, 'loaded')

                request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'reloaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
                    assert.ifError(err)
                    assert.equal(res.statusCode, 204)
                    done()
                })
            })
        })
    })

    it('should emit change event when a previously existing page starting returning 404', function(done) {

        request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            assert.ifError(err)
            assert.equal(res.statusCode, 204)

            loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', watch: { interval: '1s' }, mandatory: false })(confabulous, function(err, config) {
                assert.ifError(err)
                assert.equal(config.loaded, 'loaded')

                request({ method: 'DELETE', url: 'http://localhost:8200/v1/secret/live/demo', json: true, headers: { 'X-Vault-Token': token }, mandatory: false }, function(err, res, body) {
                    assert.ifError(err)
                    assert.equal(res.statusCode, 204)
                })

            }).on('change', done)
        })
    })

    it('should emit change event when a previously missing page starts returning 200', function(done) {

        loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', watch: { interval: '1s' }, mandatory: false })(confabulous, function(err, config) {
            assert.equal(err, true)

            request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
                assert.ifError(err)
                assert.equal(res.statusCode, 204)
            })

        }).on('change', done)
    })

    it('should not emit change events when content does not change', function(done) {

        request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            assert.ifError(err)
            assert.equal(res.statusCode, 204)

            loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live', watch: { interval: '1s' } })(confabulous, function(err, config) {
                assert.ifError(err)
                assert.equal(config.loaded, 'loaded')
                setTimeout(done, 1500)
            }).on('change', function() {
                assert(false, 'Change event emitted')
            })
        })
    })

    it('should post-process', function(done) {

        request({ method: 'POST', url: 'http://localhost:8200/v1/secret/live/demo', json: true, body: { loaded: 'loaded' }, headers: { 'X-Vault-Token': token }}, function(err, res, body) {
            assert.ifError(err)
            assert.equal(res.statusCode, 204)

            loader({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' }, [
                function(config, cb) {
                    config.loaded = config.loaded.toUpperCase()
                    cb(null, config)
                }
            ])(confabulous, function(err, config) {
                assert.ifError(err)
                assert.equal(config.loaded, 'LOADED')
                done()
            })
        })
    })
})