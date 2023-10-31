import WebSocket from "ws";
import http from "http"
import protobuf from "protobufjs"
import path from "path";
import jwt from "jsonwebtoken"
import { _uid } from "../../_shared/utils/string-utils.util";
import { GameServerInterface } from "../gameServer.interface";
import MaJoDo from "../../majodo/MaJoDo";
import { JWT_SECRET } from "../../_shared/config/config";
import { VOID_MESSAGE } from "../../_shared/constants/messages";
import { MessageType } from "../../_shared/enums/message-types.enum";

export class WebSocketGameServer implements GameServerInterface{
    private gameServer: WebSocket.Server;
    private Message!: protobuf.Type;

    constructor(httpServer: http.Server, private readonly useProtobuffers: boolean) {
        this.gameServer = new WebSocket.Server({ server: httpServer });

        if (useProtobuffers) {
            const protoPath = path.join(__dirname, '../../_shared/protobufs/message.proto');
            protobuf.load(protoPath, (err, root) => {
                if (err) throw err;
                if (!root) process.exit(1);

                this.Message = root.lookupType("Message");
                if (!this.Message) return process.exit(1)

                this.gameServer.on("connection", (ws, req) => {
                    const ip = req.socket.remoteAddress;
                    const port = req.socket.remotePort;

                    ws.on("message", (msg) => {
                        const uid = _uid(ip, port);

                        const decoded = this.Message.decode(msg as Buffer);
                        // @ts-ignore
                        this.handleWsMessage(uid, decoded.content, ws);
                    });
                });
            });
        } else {
            this.gameServer.on("connection", (ws, req) => {
                const ip = req.socket.remoteAddress;
                const port = req.socket.remotePort;

                ws.on("message", (msg) => {
                    const uid = _uid(ip, port);
                    this.handleWsMessage(uid, msg.toString(), ws);
                });
            });
        }
        console.log(`Websocket server started`);
    }

    
    private handleWsMessage(uid: string, message: string, ws: WebSocket): void {
        const playersRoom = MaJoDo.clientsRoom[uid];
        if (playersRoom) {
            MaJoDo.lastReceivedUserTimestamps.set(uid, new Date());
            const players = MaJoDo.roomsToClient[playersRoom];
            this.broadcastMessageToRoom(players, message, uid, MessageType.ROOM);
        } 
        else if (message.length > 30 && MaJoDo.tokens.includes(message)) {
            try {
                const decodedPayload = jwt.verify(message, JWT_SECRET) as {roomName: string;};
                const roomName = decodedPayload.roomName;

                const currentPlayers = MaJoDo.roomsToClient[roomName] || [];
                MaJoDo.roomsToClient[roomName] = [...currentPlayers, uid];

                MaJoDo.clientsRoom[uid] = roomName;

                MaJoDo.playerConnections[uid] = ws;

                MaJoDo.tokens = MaJoDo.tokens.filter((token) => token !== message);
                
                MaJoDo.lastReceivedUserTimestamps.set(uid, new Date());
                this.sendToPlayer(uid, `Successfully joined room ${roomName}. Your ID: ${uid}`, MessageType.JOIN_ROOM);
            } catch (error) {
                console.log("Failed to decode JWT:", error);
            }
        }
        else ws.send(this.useProtobuffers 
            ? this.Message.encode({content: VOID_MESSAGE, type: MessageType.SERVER_INFO}).finish() 
            : JSON.stringify({content: VOID_MESSAGE, type: MessageType.SERVER_INFO}));

    }
    
    broadcastMessageToRoom(players: string[], msg: string, uid: string, type: number): void {
        const payload = { content: `${uid};#${msg}`, type};
        const processedPayload = this.useProtobuffers 
            ? this.Message.encode(payload).finish() 
            : JSON.stringify(payload);
        const roomId = MaJoDo.clientsRoom[uid];
        
        players.forEach((player) => {
            if (player === uid) return;
            for (let playerUID of MaJoDo.roomsToClient[roomId]) {
                if (playerUID === uid) continue;
                MaJoDo.playerConnections[playerUID].send(processedPayload);
            }
        });
    }

    sendToPlayer(uid: string, msg: string, type: number): void {
        const payload: any = {content: msg, type}
        if (type === MessageType.JOIN_ROOM) {
            payload.uid = uid;
            payload.roomId = MaJoDo.clientsRoom[uid];
        }
        MaJoDo.playerConnections[uid].send(this.useProtobuffers 
            ? this.Message.encode(payload).finish() 
            : JSON.stringify(payload));
    }

    public getGameServerRaw() {
        return this.gameServer;
    }
}
