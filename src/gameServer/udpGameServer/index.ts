import dgram from "dgram"
import jwt from "jsonwebtoken"
import { _uid } from "../../_shared/utils/string-utils.util";
import MaJoDo from "../../majodo/MaJoDo";
import { GameServerInterface } from "../gameServer.interface";
import { JWT_SECRET } from "../../_shared/config/config";
import { VOID_MESSAGE } from "../../_shared/constants/messages";
import { MessageType } from "../../_shared/enums/message-types.enum";

export class UDPGameServer implements GameServerInterface {
    private gameServer: dgram.Socket;

    constructor(private readonly serverAddress: string, private readonly udpServerPort: number) {
        this.gameServer = dgram.createSocket("udp4");
    
        this.gameServer.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
          const uid = _uid(rinfo.address, rinfo.port);
          const message = msg.toString();
          this.handleUdpMessage(uid, message);
        });
    
        this.gameServer.bind(this.udpServerPort, this.serverAddress);
        console.log(`UDP server listening on ${this.serverAddress}:${this.udpServerPort}`);
    }

    private handleUdpMessage(uid: string, message: string): void {
        const playersRoom = MaJoDo.clientsRoom[uid];
        if (playersRoom) {
            MaJoDo.lastReceivedUserTimestamps.set(uid, new Date());
            const players = MaJoDo.roomsToClient[playersRoom];
            this.broadcastMessageToRoom(players, message, uid, MessageType.ROOM);
        } else if (message.length > 30 && MaJoDo.tokens.includes(message)) {
            try {
                const decodedPayload = jwt.verify(message, JWT_SECRET) as {
                    roomName: string;
                };
                const roomName = decodedPayload.roomName;

                const currentPlayers = MaJoDo.roomsToClient[roomName] || [];
                MaJoDo.roomsToClient[roomName] = [...currentPlayers, uid];

                MaJoDo.clientsRoom[uid] = roomName;

                MaJoDo.tokens = MaJoDo.tokens.filter((token) => token !== message);

                this.sendToPlayer(uid, `Successfully joined room ${roomName}. Your ID: ${uid}`, MessageType.JOIN_ROOM);
            } catch (error) {
                this.sendToPlayer(uid, `Failed to decode JWT`, MessageType.SERVER_ERROR);
                console.log("Failed to decode JWT:", error);
            }
        } 
        else {
            const [playerIP, playerPortStr] = uid.split(":");
            const playerPort = parseInt(playerPortStr, 10);
            this.gameServer.send(JSON.stringify({content: VOID_MESSAGE, type: MessageType.SERVER_INFO}), playerPort, playerIP,
                (error) => {
                    if (error) {
                    console.error(
                        `Failed to send message to ${playerIP}:${playerPort}`
                        );
                    }
                }
            );
        }
    } 

    broadcastMessageToRoom(players: string[], msg: string, uid: string, type: number): void {
        players.forEach((player) => {
            if (player === uid) return;
            const [playerIP, playerPortStr] = player.split(":");
            const playerPort = parseInt(playerPortStr, 10);

            this.gameServer.send(JSON.stringify({content: `${uid};#${msg}`, type}), playerPort, playerIP,
                (error) => {
                    if (error) {
                    console.error(
                        `Failed to send message to ${playerIP}:${playerPort}`
                        );
                    }
                }
            );
        })
    }

    sendToPlayer(uid: string, msg: string, type: number): void {
        const [playerIP, playerPortStr] = uid.split(":");
        const playerPort = parseInt(playerPortStr, 10);
        const payload: any = {content: msg, type}

        if (type === MessageType.JOIN_ROOM) {
            payload.uid = uid;
            payload.roomId = MaJoDo.clientsRoom[uid];
        }

        this.gameServer.send(JSON.stringify(payload), playerPort, playerIP, (error) => {
            if (error) console.error(`Failed to send message to ${playerIP}:${playerPort}`);
        });
    }

    public getGameServerRaw() {
        return this.gameServer;
    }
}