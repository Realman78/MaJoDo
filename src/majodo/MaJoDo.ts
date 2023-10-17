import dgram from "dgram";
import WebSocket from "ws";
import express, { Request, Response, Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { ServerType } from "../_shared/enums/server-type.enum";

class MaJoDo {
    private readonly type: ServerType;
    private gameServer: dgram.Socket | WebSocket.Server | null = null;
    private httpServer: Application | null = null;
    private clientsRoom: Map<string, string[]> = new Map();

    constructor(type: ServerType) {
        this.type = type;
    }

    start(serverAddress: string, gameServerPort: number, httpServerPort: number): void {
        this.initGameServer(serverAddress, gameServerPort);
        this.initHttpServer(serverAddress, httpServerPort);
    }

    private initGameServer(serverAddress: string, port: number): void {
        switch (this.type) {
            case ServerType.UDP:
                this._startUdpServer(serverAddress, port);
                break;
            case ServerType.WS:
                this._startWsServer(port);
                break;
            default:
                throw new Error("Unsupported server type. Choose either 'UDP' or 'WS'.");
        }
    }

    private initHttpServer(serverAddress: string, port: number): void {
        this.httpServer = express();

        this.httpServer.use(helmet());
        this.httpServer.use(cors());
        this.httpServer.use(express.json({ limit: "50mb" }));
        this.httpServer.use(express.urlencoded({ extended: true, limit: "50mb" }));

        const roomRouter = require('../httpServer/routes/roomRouter');
        this.httpServer.use('/api/room', roomRouter);

        this.httpServer.get("/api/health", (req: Request, res: Response) => {
            res.send("Server is healthy");
        });

        this.httpServer.listen(port, serverAddress, () => {
            console.log(`Server is listening on ${serverAddress}:${port}`);
        });
    }

    private _startUdpServer(serverAddress: string, port: number): void {
        this.gameServer = dgram.createSocket("udp4");
        this.gameServer.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
            console.log(`UDP received: ${msg.toString()}`);
        });
        this.gameServer.bind(port, serverAddress);
    }

    private _startWsServer(port: number): void {
        this.gameServer = new WebSocket.Server({ port });
        this.gameServer.on("connection", (ws) => {
            ws.on("message", (msg) => {
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
