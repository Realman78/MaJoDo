import dgram from "dgram";
import WebSocket from "ws";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import helmet from "helmet";
import roomRouter from "../httpServer/routes/roomRouter";
import { ServerType } from "../_shared/enums/server-type.enum";
import { _uid } from "../_shared/utils/string-utils.util";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

interface ClientRoom {
  [uid: string]: string;
}

interface RoomToClient {
  [roomName: string]: string[];
}

class MaJoDo {
  private gameServer: dgram.Socket | WebSocket.Server | null = null;
  private httpServer: Application | null = null;
  private lastReceivedTimestamps = new Map<string, Date>();
  public static clientsRoom: ClientRoom = {};
  public static roomsToClient: RoomToClient = {};
  public static tokens: string[] = [];
  private readonly JWT_SECRET = process.env.JWT_SECRET || "";

  constructor(private readonly type: ServerType) {
    if (!this.JWT_SECRET) {
      console.warn(`ADD AN ENVIRONMENT VARIABLE "JWT_SECRET"!!!`);
    }
  }

  start(serverAddress: string, gameServerPort: number, httpServerPort: number): void {
    this.initGameServer(serverAddress, gameServerPort);
    this.initHttpServer(serverAddress, httpServerPort);
  }

  private initGameServer(serverAddress: string, port: number): void {
    if (this.type === ServerType.UDP) {
      this.startUdpServer(serverAddress, port);
    } else if (this.type === ServerType.WS) {
      this.startWsServer(port);
    } else {
      throw new Error("Unsupported server type. Choose either 'UDP' or 'WS'.");
    }
  }

  private initHttpServer(serverAddress: string, port: number): void {
    this.httpServer = express();

    this.httpServer.use(helmet());
    this.httpServer.use(cors());
    this.httpServer.use(express.json({ limit: "50mb" }));
    this.httpServer.use(express.urlencoded({ extended: true, limit: "50mb" }));

    this.httpServer.use("/api/room", roomRouter);
    this.httpServer.get("/api/health", (req: Request, res: Response) => {
      res.send("Server is healthy");
    });

    this.httpServer.listen(port, serverAddress, () => {
      console.log(`Server is listening on ${serverAddress}:${port}`);
    });

    this.setupCleanup();
  }

  private startUdpServer(serverAddress: string, port: number): void {
    const udpServer = dgram.createSocket("udp4");
    this.gameServer = udpServer;

    udpServer.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      const uid = _uid(rinfo.address, rinfo.port);
      const message = msg.toString();
      this.handleUdpMessage(uid, message);
    });

    udpServer.bind(port, serverAddress);
  }

  private handleUdpMessage(uid: string, message: string): void {
    const playersRoom = MaJoDo.clientsRoom[uid];
    if (playersRoom) {
      this.lastReceivedTimestamps.set(uid, new Date());
      const players = MaJoDo.roomsToClient[playersRoom];
      this.broadcastMessageToRoom(players, message);
    }

    if (message.length > 30 && MaJoDo.tokens.includes(message)) {
      try {
        const decodedPayload = jwt.verify(message, this.JWT_SECRET) as { roomName: string };
        const roomName = decodedPayload.roomName;

        const currentPlayers = MaJoDo.roomsToClient[roomName] || [];
        MaJoDo.roomsToClient[roomName] = [...currentPlayers, uid];

        MaJoDo.clientsRoom[uid] = roomName;
        
        MaJoDo.tokens = MaJoDo.tokens.filter(token => token !== message);
      } catch (error) {
        console.log("Failed to decode JWT:", error);
      }
    }
  }

  private startWsServer(port: number): void {
    this.gameServer = new WebSocket.Server({ port });
    this.gameServer.on("connection", ws => {
      ws.on("message", msg => {
        console.log(`WebSocket received: ${msg}`);
      });
    });
  }

  private broadcastMessageToRoom(players: string[], msg: string): void {
    players.forEach(player => {
      const [playerIP, playerPortStr] = player.split(":");
      const playerPort = parseInt(playerPortStr, 10);

      if (this.gameServer && this.gameServer instanceof dgram.Socket) {
        this.gameServer.send(msg, playerPort, playerIP, error => {
          if (error) {
            console.error(`Failed to send message to ${playerIP}:${playerPort}`);
          }
        });
      }
    });
  }

  private setupCleanup(): void {
    setInterval(() => {
      const now = new Date();
      this.lastReceivedTimestamps.forEach((lastReceived, uid) => {
        if (now.getTime() - lastReceived.getTime() > 120_000) {
          delete MaJoDo.clientsRoom[uid];
          this.lastReceivedTimestamps.delete(uid);
        }
      });
    }, 60_000);
  }

  getType(): ServerType {
    return this.type;
  }

  getGameServer(): dgram.Socket | WebSocket.Server | null {
    return this.gameServer;
  }

  getHttpServer(): Application | null {
    return this.httpServer;
  }
}

export default MaJoDo;
