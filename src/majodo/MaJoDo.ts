import dgram from "dgram";
import WebSocket, { WebSocketServer } from "ws";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import helmet from "helmet";
import roomRouter from "../httpServer/routes/roomRouter";
import { ServerType } from "../_shared/enums/server-type.enum";
import { _uid } from "../_shared/utils/string-utils.util";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import http from "http";
import protobuf from "protobufjs";

dotenv.config();

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

  public static playerConnections: PlayerConnection = {};

  private httpServer: http.Server | null = null;
  private gameServer: dgram.Socket | WebSocket.Server | null = null;
  private expressServer: Application | null = null;
  private lastReceivedUserTimestamps = new Map<string, Date>();
  private Message: protobuf.Type | null = null;

  private readonly JWT_SECRET = process.env.JWT_SECRET || "";

  constructor(
    private readonly type: ServerType,
    private readonly serverAddress: string,
    private readonly httpServerPort: number,
    private readonly udpServerPort: number = 2001
  ) {
    this.serverAddress = serverAddress;
    this.httpServerPort = httpServerPort;
    this.udpServerPort = udpServerPort;
    if (!this.JWT_SECRET) {
      console.warn(`ADD AN ENVIRONMENT VARIABLE "JWT_SECRET"!!!`);
    }
  }

  start(httpDataLimit: string = "50mb"): void {
    this.initHttpServer(httpDataLimit);
    this.initGameServer();
  }

  private initGameServer(): void {
    if (this.type === ServerType.UDP) {
      this.startUdpServer();
    } else if (
      this.type === ServerType.WS ||
      this.type === ServerType.WS_WITH_PROTOBUFS
    ) {
      this.startWsServer();
    } else {
      throw new Error("Unsupported server type. Choose either 'UDP' or 'WS'.");
    }
  }

  private initHttpServer(httpDataLimit: string): void {
    this.expressServer = express();

    this.expressServer.use(helmet());
    this.expressServer.use(cors());
    this.expressServer.use(express.json({ limit: httpDataLimit }));
    this.expressServer.use(
      express.urlencoded({ extended: true, limit: httpDataLimit })
    );

    this.expressServer.use("/api/room", roomRouter);
    this.expressServer.get("/api/health", (req: Request, res: Response) => {
      res.send("Server is healthy");
    });

    // @ts-ignore
    this.httpServer = http.createServer(this.expressServer);

    this.httpServer?.listen(this.httpServerPort, this.serverAddress, () => {
      console.log(
        `Server is listening on ${this.serverAddress}:${this.httpServerPort}`
      );
    });

    this.setupCleanup();
  }

  private startUdpServer(): void {
    const udpServer = dgram.createSocket("udp4");
    this.gameServer = udpServer;

    udpServer.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      const uid = _uid(rinfo.address, rinfo.port);
      const message = msg.toString();
      console.log(uid, message);
      this.handleUdpMessage(uid, message);
    });

    udpServer.bind(this.udpServerPort, this.serverAddress);
  }

  private handleUdpMessage(uid: string, message: string): void {
    const playersRoom = MaJoDo.clientsRoom[uid];
    if (playersRoom) {
      this.lastReceivedUserTimestamps.set(uid, new Date());
      const players = MaJoDo.roomsToClient[playersRoom];
      this.broadcastMessageToRoom(players, message, uid);
    }

    if (message.length > 30 && MaJoDo.tokens.includes(message)) {
      try {
        const decodedPayload = jwt.verify(message, this.JWT_SECRET) as {
          roomName: string;
        };
        const roomName = decodedPayload.roomName;

        const currentPlayers = MaJoDo.roomsToClient[roomName] || [];
        MaJoDo.roomsToClient[roomName] = [...currentPlayers, uid];

        MaJoDo.clientsRoom[uid] = roomName;

        MaJoDo.tokens = MaJoDo.tokens.filter((token) => token !== message);

        this.sendToPlayer(uid, "SUCCESS");
      } catch (error) {
        console.log("Failed to decode JWT:", error);
      }
    }
  }

  private startWsServer(): void {
    // @ts-ignore
    const wsServer = new WebSocket.Server({ server: this.httpServer });
    this.gameServer = wsServer;

    if (this.type === ServerType.WS_WITH_PROTOBUFS) {
      protobuf.load("./src/_shared/protobufs/message.proto", (err, root) => {
        if (err) throw err;
        if (!root) process.exit(1);

        this.Message = root.lookupType("Message");
        if (!this.Message) return process.exit(1)

        wsServer.on("connection", (ws, req) => {
          const ip = req.socket.remoteAddress;
          const port = req.socket.remotePort;

          ws.on("message", (msg) => {
            const uid = _uid(ip, port);

            console.log(uid, msg);
            // @ts-ignore
            const decoded = this.Message.decode(msg as Buffer);
            // @ts-ignore
            this.handleWsMessage(uid, decoded.content, ws);
          });
        });
      });
    } else if (this.type === ServerType.WS) {
      wsServer.on("connection", (ws, req) => {
        const ip = req.socket.remoteAddress;
        const port = req.socket.remotePort;

        ws.on("message", (msg) => {
          const uid = _uid(ip, port);

          console.log(uid, msg);
          // @ts-ignore
          this.handleWsMessage(uid, msg.toString(), ws);
        });
      });
    }
  }

  private handleWsMessage(uid: string, message: string, ws: WebSocket): void {
    const playersRoom = MaJoDo.clientsRoom[uid];
    if (playersRoom) {
      this.lastReceivedUserTimestamps.set(uid, new Date());
      const players = MaJoDo.roomsToClient[playersRoom];
      this.broadcastMessageToRoom(players, message, uid);
    }

    if (message.length > 30 && MaJoDo.tokens.includes(message)) {
      try {
        const decodedPayload = jwt.verify(message, this.JWT_SECRET) as {
          roomName: string;
        };
        const roomName = decodedPayload.roomName;

        const currentPlayers = MaJoDo.roomsToClient[roomName] || [];
        MaJoDo.roomsToClient[roomName] = [...currentPlayers, uid];

        MaJoDo.clientsRoom[uid] = roomName;

        MaJoDo.playerConnections[uid] = ws;

        MaJoDo.tokens = MaJoDo.tokens.filter((token) => token !== message);
        
        
        this.lastReceivedUserTimestamps.set(uid, new Date());
        this.sendToPlayer(uid, "SUCCESS");
      } catch (error) {
        console.log("Failed to decode JWT:", error);
      }
    }
  }

  private broadcastMessageToRoom(
    players: string[],
    msg: string,
    uid: string
  ): void {
    if (!this.gameServer) return;
    players.forEach((player) => {
      if (player === uid) return;

      if (this.gameServer instanceof dgram.Socket && this.type === ServerType.UDP) {
        const [playerIP, playerPortStr] = player.split(":");
        const playerPort = parseInt(playerPortStr, 10);
        console.log(playerPort);
        this.gameServer.send(`${uid};#${msg}`, playerPort, playerIP,
          (error) => {
            if (error) {
              console.error(
                `Failed to send message to ${playerIP}:${playerPort}`
              );
            }
          }
        );
      } else if (this.gameServer instanceof WebSocket.Server && this.type === ServerType.WS) {
        const roomId = MaJoDo.clientsRoom[uid];

        for (let playerUID of MaJoDo.roomsToClient[roomId]) {
          if (playerUID === uid) continue;
          MaJoDo.playerConnections[playerUID].send(`${uid};#${msg}`);
        }
      } else if (this.gameServer instanceof WebSocket.Server && this.type === ServerType.WS_WITH_PROTOBUFS) {
        const roomId = MaJoDo.clientsRoom[uid];

        for (let playerUID of MaJoDo.roomsToClient[roomId]) {
          if (playerUID === uid) continue;
          const payload = { content: `${uid};#${msg}`};
          // @ts-ignore
          MaJoDo.playerConnections[playerUID].send(this.Message.encode(payload).finish());
        }
      }
      });
  }

  private sendToPlayer(uid: string, msg: string) {
    if (
      this.gameServer instanceof dgram.Socket &&
      this.type === ServerType.UDP
    ) {
      const [playerIP, playerPortStr] = uid.split(":");
      const playerPort = parseInt(playerPortStr, 10);

      if (this.gameServer && this.gameServer instanceof dgram.Socket) {
        this.gameServer.send(msg, playerPort, playerIP, (error) => {
          if (error) {
            console.error(
              `Failed to send message to ${playerIP}:${playerPort}`
            );
          }
        });
      }
    } else if (this.gameServer instanceof WebSocket.Server && this.type === ServerType.WS) {
      MaJoDo.playerConnections[uid].send(msg);
    } else if (this.gameServer instanceof WebSocket.Server && this.type === ServerType.WS_WITH_PROTOBUFS) {
      const payload = {content: msg}
      // @ts-ignore
      MaJoDo.playerConnections[uid].send(this.Message.encode(payload).finish());
    }
  }

  private setupCleanup(): void {
    setInterval(() => {
      const now = new Date();
      this.lastReceivedUserTimestamps.forEach((lastReceived, uid) => {
        if (
          now.getTime() - lastReceived.getTime() >
          MaJoDo.IDLE_ALLOWED_TIMEOUT
        ) {
          this.lastReceivedUserTimestamps.delete(uid);
          const roomName = MaJoDo.clientsRoom[uid];

          MaJoDo.roomsToClient[roomName] = MaJoDo.roomsToClient[roomName].filter((client) => client !== uid);
          delete MaJoDo.clientsRoom[uid];

          if (MaJoDo.playerConnections[uid] && this.type !== ServerType.UDP) {
            const payload = {content: "SERVER: TIMEOUT DISCONNECT"};

            MaJoDo.playerConnections[uid].send(this.type === ServerType.WS_WITH_PROTOBUFS && this.Message
              ? this.Message.encode(payload).finish()
              : JSON.stringify(payload))
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

  getGameServer(): dgram.Socket | WebSocket.Server | null {
    return this.gameServer;
  }

  getExpressServer(): Application | null {
    return this.expressServer;
  }
}

export default MaJoDo;
