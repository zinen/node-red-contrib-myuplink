# node-red-contrib-nibeuplink
A Node-Red Node for collecting data from nibe uplink.

[![Platform](https://img.shields.io/badge/platform-Node--RED-red.svg)](https://nodered.org)

***This node is in early test phase!***

![](poimage/node.png)

## TODO
- Fix dependency of npm nibe-fetcher@1.1.0 which is very outdated. No updates for about 6 years. Means it contains outdated dependencies.

## To install

### Install in docker:
In terminal:
```bash
docker exec -it node-red /bin/bash
cd /data
npm install github:zinen/node-red-contrib-nibeuplink
```
*Look out for warnings! Some of the dependencies might not get installed on first try*
