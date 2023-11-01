declare module "majodo" {
  import { Application } from "express";
  import WebSocket from "ws";
  import * as dgram from "dgram";
  import * as http from "http";

  interface GameServerInterface {
    broadcastMessageToRoom(
      players: string[],
      msg: string,
      uid: string,
      type: number
    ): void;
    sendToPlayer(uid: string, msg: string, type: number): void;
  }

  export class UDPGameServer implements GameServerInterface {
    private readonly serverAddress: string;
    private readonly udpServerPort: number;
    private gameServer: dgram.Socket;

    constructor(serverAddress: string, udpServerPort: number);

    private handleUdpMessage(uid: string, message: string): void;
    broadcastMessageToRoom(
      players: string[],
      msg: string,
      uid: string,
      type: number
    ): void;
    sendToPlayer(uid: string, msg: string, type: number): void;
    getGameServerRaw(): dgram.Socket;
  }

  export class WebSocketGameServer implements GameServerInterface {
    constructor(httpServer: http.Server, useProtobuffers: boolean);

    broadcastMessageToRoom(
      players: string[],
      msg: string,
      uid: string,
      type: number
    ): void;
    sendToPlayer(uid: string, msg: string, type: number): void;
    getGameServerRaw(): WebSocket.Server;
  }

  export class MajodoHttpServer {
    constructor(
      serverAddress: string,
      httpServerPort: number,
      httpDataLimit?: string
    );

    getExpressServer(): Application;
    getHttpServer(): http.Server;
  }

  export enum ServerType {
    UDP = "UDP",
    WS = "WS",
    WS_WITH_PROTOBUFS = "WS_WITH_PROTOBUFS",
  }

  export enum MessageType {
    SERVER_INFO = 0,
    SERVER_ERROR = 1,
    ROOM = 2,
    JOIN_ROOM = 3,
  }

  interface PlayerConnection {
    [uid: string]: WebSocket;
  }

  interface ClientRoom {
    [uid: string]: string;
  }

  interface RoomToClient {
    [roomName: string]: string[];
  }

  export class MaJoDo {
    public static IDLE_ALLOWED_TIMEOUT: number;
    public static IDLE_CHECK_TIMEOUT: number;
    public static roomsToClient: RoomToClient;
    public static lastReceivedUserTimestamps: Map<string, Date>;
    public static clientsRoom: ClientRoom;
    public static tokens: string[];
    public static playerConnections: PlayerConnection;

    constructor(
      type: ServerType,
      serverAddress: string,
      httpServerPort: number,
      udpServerPort?: number
    );

    start(httpDataLimit?: string): void;
    getType(): ServerType;
    getGameServer(): UDPGameServer | WebSocketGameServer; // Make sure to define these classes/interfaces too
    getGameServerRaw(): dgram.Socket | WebSocket.Server;
    getExpressServer(): Application;
  }
}
