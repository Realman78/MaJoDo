
# MaJoDo - Game Server

Easily set up a game server and focus solely on your client-side with MaJoDo. Choose from three different server types to suit your needs: UDP, WebSockets, or WebSockets with Protocol Buffers.
Find example clients [here](https://github.com/Realman78/majodo-client-examples)

## Features

**Seamless Server Types**: Select from three distinct server implementations:
  
**UDP** for fast, connectionless data transmission.

**WS** (Websockets) for a reliable, full-duplex communication channel.

**WS_WITH_PROTOBUFS** (WebSockets with Protocol Buffers) for efficient binary serialization.

**Automated Room Management**: After getting your JWT token from the HTTP server, simply send it to the server (via UDP or WS) and get placed in a room. All your subsequent data is then automatically routed to the correct room.

  

**Built-in Authentication**: Get a JWT token from the HTTP server to ensure secure and authenticated access.

  

**Express Integration**: A built-in HTTP and Express server, ensuring simplicity and extensibility.

  

## Installation

    npm install majodo

  

## Basic Usage
    const MaJoDo = require('majodo');

    // Create a new instance with desired server type, host, and ports
    const majodo = new MaJoDo(ServerType.WS, "0.0.0.0", 3000);

    // UDP: 
    // const majodo = new MaJoDo(ServerType.WS, "0.0.0.0", 3000, UDP_PORT);

    
    // Start the server
    majodo.start();

  

## Server Types

**ServerType.UDP**: Use the UDP protocol for data transmission.

**ServerType. WS**: Utilize WebSockets for communication.

**ServerType.WS_WITH_PROTOBUFS**: Use WebSockets paired with Protocol Buffers for efficient messaging.

  

## Token-Based Authentication

 1. Send a request to the HTTP server.
 2. Retrieve a JWT token.
 3. Use the JWT token to send data to the server (UDP/WS).
 4. Enjoy automatic room routing and data forwarding.

![image](https://github.com/Realman78/MaJoDo/assets/42566748/700f8e48-6f7c-446f-b735-1b5400aef973)

  
## Documentation & Tutorials

For a comprehensive tutorial on setting up and integrating MaJoDo in your game project
