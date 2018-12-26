# Confabulous Vault Loader
Confabulous-Vault-Loader is an Vault Loader for [Confabulous](https://github.com/guidesmiths/confabulous) - a hierarchical, asynchronous config loader and post processor.

## TL;DR
```
const confabulous = require('confabulous')
const Confabulous = confabulous.Confabulous
const vault = require('confabulous-vault-loader')
const processors = confabulous.processors

new Confabulous()
    .add((config) => vault({ url: 'http://localhost:8200', path: 'secret/live/demo', method: 'app-id', appId: 'svc-demo-api' , userId: 'demo-live' }))
    .on('loaded', (config) => console.log('Loaded', JSON.stringify(config, null, 2)))
    .on('reloaded', (config) => console.log('Reloaded', JSON.stringify(config, null, 2)))
    .on('error', (err) => console.error('Error', err))
    .on('reload_error', (err) => console.error('Reload Error', err))
    .end()
```

### Options
|  Option   |  Type   |  Default  |  Notes  |
|-----------|---------|-----------|---------|
| url       | string  |           | URL of the vault server |
| path      | string  |           | Path to the encrypted config |
| method    | string  |           | Authentication method (currently only app-id and token is supported) |
| appId     | string  |           | Application Id (required for authentication when using app-id method) |
| userId    | string  |           | User Id (required for authentication when using app-id method) |
| token     | string  |           | Vault token (required for authentication when using token method) |
| mandatory | boolean | true      | Causes an error/reload_error to be emitted if the configuration does not exist |
| watch     | object  |           | Polls the vault server for changes. Requires an interval, e.g. ```{ interval: '5m'}``` |
| request   | object  | [see here](https://github.com/guidesmiths/confabulous/blob/master/lib/loaders/http.js#L14) | options that will be passed to [the underlying http client](https://github.com/request/request).

## Testing Locally
Setting up a vault environment is no easy task. The following might help...

### Start a vault server in development mode
```
docker run -d -p 8200:8200 --hostname vault --name vault sjourdan/vault
docker logs vault
```
### Make note of the Unseal Key and Root Token and configure exports
```
export VAULT_ADDR=http://vault:8200
export VAULT_TOKEN=<INSERT_TOKEN_HERE>
```
### Create an alias so you can execute vault commands from a container
```
alias vaultcmd="docker run --volume $(pwd)/tests/vault:/tmp --link vault --rm -e VAULT_ADDR -e VAULT_TOKEN sjourdan/vault"
```
### Unseal the vault so you can read / write secrets
```
vaultcmd unseal <INSERT_UNSEAL_KEY>
```
### Upload a policy
```
vaultcmd policy-write demo-live /tmp/policies/live/demo.json
```
### Configure an app-id login
```
vaultcmd auth-enable app-id
vaultcmd write auth/app-id/map/app-id/svc-demo-api value=demo-live display_name=svc-demo-api
vaultcmd write auth/app-id/map/user-id/demo-live value=svc-demo-api
vaultcmd policy-write demo-live /tmp/policies/live/demo.json
```

You should now be able to run tests. Hoorah!
