import dgram from "dgram";
import WebSocket from "ws";
import { Application } from "express";
import { ServerType } from "../_shared/enums/server-type.enum";
import { _uid } from "../_shared/utils/string-utils.util";
import http from "http";
import { JWT_SECRET } from "../_shared/config/config";
import { MajodoHttpServer } from "../httpServer";
import { WebSocketGameServer } from "../gameServer/wsGameServer";
import { UDPGameServer } from "../gameServer/udpGameServer";

interface PlayerConnection {
  [uid: string]: WebSocket;
}
interface ClientRoom {
  [uid: string]: string;
}

interface RoomToClient {
  [roomName: string]: string[];
}

class MaJoDo {
  public static IDLE_ALLOWED_TIMEOUT = 60_000;
  public static IDLE_CHECK_TIMEOUT = 10_000;
  public static clientsRoom: ClientRoom = {};
  public static roomsToClient: RoomToClient = {};
  public static tokens: string[] = [];
  public static lastReceivedUserTimestamps = new Map<string, Date>();

  public static playerConnections: PlayerConnection = {};

  private httpServer: http.Server | null = null;
  private gameServer!: UDPGameServer | WebSocketGameServer;
  private gameServerRaw!: dgram.Socket | WebSocket.Server;
  private expressServer: Application | null = null;


  constructor(
    private readonly type: ServerType,
    private readonly serverAddress: string,
    private readonly httpServerPort: number,
    private readonly udpServerPort: number = 2001
  ) {
    this.serverAddress = serverAddress;
    this.httpServerPort = httpServerPort;
    this.udpServerPort = udpServerPort;
    if (!JWT_SECRET) {
      console.warn(`ADD AN ENVIRONMENT VARIABLE "JWT_SECRET"!!!`);
    }
  }

  start(httpDataLimit: string = "50mb"): void {
    const app = new MajodoHttpServer(this.serverAddress, this.httpServerPort, httpDataLimit);
    this.httpServer = app.getHttpServer();
    this.expressServer = app.getExpressServer()
    this.initGameServer();

    this.setupCleanup()
  }

  private initGameServer(): void {
    if (this.type === ServerType.UDP) {
      const udpServer = new UDPGameServer(this.serverAddress, this.udpServerPort);
      this.gameServer = udpServer;
      this.gameServerRaw = udpServer.getGameServerRaw()
    } else if ((this.type === ServerType.WS || this.type === ServerType.WS_WITH_PROTOBUFS) && this.httpServer) {
      const wsServer = new WebSocketGameServer(this.httpServer, this.type === ServerType.WS_WITH_PROTOBUFS)
      this.gameServer = wsServer;
      this.gameServerRaw = wsServer.getGameServerRaw();
    } else {
      throw new Error("Unsupported server type. Choose 'UDP', 'WS_WITH_PROTOBUFS' or 'WS'.");
    }
  }

  private setupCleanup(): void {
    setInterval(() => {
      const now = new Date();
      MaJoDo.lastReceivedUserTimestamps.forEach((lastReceived, uid) => {
        if (now.getTime() - lastReceived.getTime() > MaJoDo.IDLE_ALLOWED_TIMEOUT) {
          MaJoDo.lastReceivedUserTimestamps.delete(uid);
          const roomName = MaJoDo.clientsRoom[uid];

          MaJoDo.roomsToClient[roomName] = MaJoDo.roomsToClient[roomName].filter((client) => client !== uid);
          delete MaJoDo.clientsRoom[uid];

          if (MaJoDo.playerConnections[uid] && this.type !== ServerType.UDP) {
            this.gameServer.sendToPlayer(uid, "SERVER: TIMEOUT DISCONNECT")
          }

          if (!MaJoDo.roomsToClient[roomName].length)
            delete MaJoDo.roomsToClient[roomName];
        }
      });
    }, MaJoDo.IDLE_CHECK_TIMEOUT);
  }

  getType(): ServerType {
    return this.type;
  }

  getGameServer(): UDPGameServer | WebSocketGameServer {
    return this.gameServer;
  }

  getGameServerRaw(): dgram.Socket | WebSocket.Server {
    return this.gameServerRaw;
  }

  getExpressServer(): Application | null {
    return this.expressServer;
  }
}

export default MaJoDo;
