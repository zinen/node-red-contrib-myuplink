# node-red-contrib-nibeuplink
Node-Red Node for collecting data from nibe uplink.

[![Platform](https://img.shields.io/badge/platform-Node--RED-red.svg)](https://nodered.org)

During setup of config you will be guided on how to sign up for an API key to your own account. For an easy start import the example.

**How to import:**
Menu top right -> Import -> Examples -> node-red-contrib-nibeuplink -> basic

![](image/node.png) The node


![](image/config.png) The config

## List of supported functions

Documentation of functions are found here https://api.nibeuplink.com/docs/v1/Functions

| Included in node | Functions | Scope |
|---|---|---|
| yes | GET api/v1/systems/{systemId}/status/system | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/status/systemUnit/{systemUnitId} | READSYSTEM |
| yes | GET api/v1/systems/{systemId} | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/software | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/config | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/units | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/notifications | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/notifications | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/parameters | READSYSTEM |
| yes | PUT api/v1/systems/{systemId}/parameters | WRITESYSTEM |
| yes | GET api/v1/systems/{systemId}/premium | READSYSTEM |
| yes, raw and parsed | GET api/v1/systems/{systemId}/serviceinfo/categories | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/serviceinfo/categories/{categoryId} | READSYSTEM |
| yes | GET api/v1/systems/{systemId}/smarthome/mode | READSYSTEM |
| yes | PUT api/v1/systems/{systemId}/smarthome/mode | WRITESYSTEM |
| yes | GET api/v1/systems/{systemId}/smarthome/thermostats | READSYSTEM |
| yes | POST api/v1/systems/{systemId}/smarthome/thermostats | WRITESYSTEM |
| yes | GET api/v1/systems | READSYSTEM |