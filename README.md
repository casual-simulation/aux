# AUX

![GitHub issues](https://img.shields.io/github/issues/casual-simulation/aux.svg) ![MIT License](https://img.shields.io/github/license/casual-simulation/aux.svg) ![npm type definitions](https://img.shields.io/npm/types/@casual-simulation/aux-common)

AUX (Ambient User Experience) is a set of web-based tools designed to facilitate the creation of real-time, multi-user, context-aware interactive experiences.

This repository is a monorepo that contains the code which makes the AUX web platform work.

[![AUX Demo](https://img.youtube.com/vi/ghwS5btUhU0/0.jpg)](https://youtu.be/ghwS5btUhU0)

## Projects

### [AUX Server](./src/aux-server/)

<a href="https://hub.docker.com/r/casualsimulation/aux">
    <img alt="AUX Docker Pulls" src="https://img.shields.io/docker/pulls/casualsimulation/aux?label=aux&logo=docker&logoColor=white"/>
</a>
<a href="https://hub.docker.com/r/casualsimulation/aux-arm32">
    <img alt="AUX ARM32 Docker Pulls" src="https://img.shields.io/docker/pulls/casualsimulation/aux-arm32?label=aux-arm32&logo=docker&logoColor=white"/>
</a>

A web application that serves the auxPlayer experience. Built on the other projects.

### [AUX Common](./src/aux-common/)

<a href="https://www.npmjs.com/package/@casual-simulation/aux-common">
    <img alt="AUX Common NPM" src="https://img.shields.io/npm/v/@casual-simulation/aux-common/latest"/>
</a>

A library that contains common operations needed to modify and understand AUX files.

### [AUX VM](./src/aux-vm/)

<a href="https://www.npmjs.com/package/@casual-simulation/aux-vm">
    <img alt="AUX VM NPM" src="https://img.shields.io/npm/v/@casual-simulation/aux-vm/latest"/>
</a>

A set of abstractions and common utilities required to run an AUX on any platform.

#### Related libraries

-   [AUX VM Browser](./src/aux-vm-browser/README.md)
-   [AUX VM Client](./src/aux-vm-client/README.md)
-   [AUX VM Node](./src/aux-vm-node/README.md)

### [Causal Trees](./src/causal-trees/)

<a href="https://www.npmjs.com/package/@casual-simulation/aux-vm">
    <img alt="Causal Trees NPM" src="https://img.shields.io/npm/v/@casual-simulation/causal-trees/latest"/>
</a>

A library to create persistent, distributed, realtime, and conflict-free data types.

#### Related libraries

-   [Causal Tree Client Socket.io](./src/causal-tree-client-socketio/README.md)
-   [Causal Tree Server](./src/causal-tree-server/README.md)
-   [Causal Tree Server Socket.io](./src/causal-tree-server-socketio/README.md)
-   [Causal Tree Store Browser](./src/causal-tree-store-browser/README.md)
-   [Causal Tree Store MongoDB](./src/causal-tree-store-mongodb/README.md)

### [AUX Proxy](./src/aux-proxy/)

<a href="https://hub.docker.com/r/casualsimulation/aux-proxy">
    <img alt="AUX Docker Pulls" src="https://img.shields.io/docker/pulls/casualsimulation/aux-proxy?label=aux-proxy&logo=docker&logoColor=white"/>
</a>

A web service that can facilitate WebSocket tunnels from the external web to a device in an internal network.

### Miscellaneous

-   [Crypto](./src/crypto)
-   [Crypto Browser](./src/crypto-browser)
-   [Crypto Node](./src/crypto-node)
-   [Tunnel](./src/tunnel)
-   [AUX Benchmarks](./src/aux-benchmarks)

## Developing

See [DEVELOPERS.md](./DEVELOPERS.md) for development environment setup instructions.

## License

```
MIT License

Copyright (c) 2019 Casual Simulation, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
