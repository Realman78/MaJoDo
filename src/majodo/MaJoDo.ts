import dgram from "dgram";
import WebSocket from "ws";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import helmet from "helmet";

class MaJoDo {
  private type: string;
  private gameServer: dgram.Socket | WebSocket.Server | null;
  private httpServer: Application | null;
  private clientsRoom: Map<string, string[]>;

  constructor(type: string) {
    this.type = type;
    this.gameServer = null;
    this.httpServer = null;
    this.clientsRoom = new Map<string, string[]>();
  }

  start(serverAddress: string, gameServerPort: number, httpServerPort: number) {
    if (this.type === "UDP") {
      this._startUdpServer(serverAddress, gameServerPort);
    } else if (this.type === "WS") {
      this._startWsServer(gameServerPort);
    } else {
      throw new Error("Unsupported server type. Choose either 'UDP' or 'WS'.");
    }

    this.httpServer = express();

    this.httpServer.use(helmet());
    this.httpServer.use(cors());
    this.httpServer.use(express.json({ limit: "50mb" }));
    this.httpServer.use(express.urlencoded({ extended: true, limit: "50mb" }));

    
    const roomRouter = require('../httpServer/routes/roomRouter')
    this.httpServer.use('/api/room', roomRouter)

    this.httpServer.get("/api/health", (req: Request, res: Response) => {
      res.send("hsis");
    });

    this.httpServer.listen(httpServerPort, serverAddress, () => {
      console.log(`Server is listening on ${serverAddress}:${httpServerPort}`);
    });
  }

  private _startUdpServer(serverAddress: string, port: number) {
    this.gameServer = dgram.createSocket("udp4");
    this.gameServer.on("message", (msg: string, rinfo) => {
      // const message = GameMessage.decode(msg);
      console.log(`UDP received: ${msg}`);
      // console.log(`UDP received: ${message.content}`);
    });
    this.gameServer.bind(port, serverAddress);
  }

  private _startWsServer(port: number) {
    this.gameServer = new WebSocket.Server({ port: port });
    this.gameServer.on("connection", (ws) => {
      ws.on("message", (msg) => {
        // const message = GameMessage.decode(new Uint8Array(msg));
        // console.log(`WebSocket received: ${message.content}`);
        console.log(`WebSocket received: ${msg}`);
      });
    });
  }

  getType(): string {
    return this.type;
  }
  getGameServer(): dgram.Socket | WebSocket.Server | null {
    return this.gameServer;
  }
  getHttpServer(): Application | null {
    return this.httpServer;
  }
  getClientsRoom(): Map<string, string[]> {
    return this.clientsRoom;
  }
}

export default MaJoDo;
