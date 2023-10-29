import dgram from "dgram"
import jwt from "jsonwebtoken"
import { _uid } from "../../_shared/utils/string-utils.util";
import MaJoDo from "../../majodo/MaJoDo";
import { GameServerInterface } from "../gameServer.interface";
import { JWT_SECRET } from "../../_shared/config/config";
import { VOID_MESSAGE } from "../../_shared/constants/messages";

export class UDPGameServer implements GameServerInterface{
    private gameServer: dgram.Socket;

    constructor(private readonly serverAddress: string, private readonly udpServerPort: number) {
        this.gameServer = dgram.createSocket("udp4");
    
        this.gameServer.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
          const uid = _uid(rinfo.address, rinfo.port);
          const message = msg.toString();
          this.handleUdpMessage(uid, message);
        });
    
        this.gameServer.bind(this.udpServerPort, this.serverAddress);
    }

    private handleUdpMessage(uid: string, message: string): void {
        const playersRoom = MaJoDo.clientsRoom[uid];
        if (playersRoom) {
            MaJoDo.lastReceivedUserTimestamps.set(uid, new Date());
            const players = MaJoDo.roomsToClient[playersRoom];
            this.broadcastMessageToRoom(players, message, uid);
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

                this.sendToPlayer(uid, "SUCCESS");
            } catch (error) {
                console.log("Failed to decode JWT:", error);
            }
        } 
        else {
            const [playerIP, playerPortStr] = uid.split(":");
            const playerPort = parseInt(playerPortStr, 10);
            this.gameServer.send(VOID_MESSAGE, playerPort, playerIP,
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

    broadcastMessageToRoom(players: string[], msg: string, uid: string): void {
        players.forEach((player) => {
            if (player === uid) return;
            const [playerIP, playerPortStr] = player.split(":");
            const playerPort = parseInt(playerPortStr, 10);

            this.gameServer.send(`${uid};#${msg}`, playerPort, playerIP,
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

    sendToPlayer(uid: string, msg: string): void {
        const [playerIP, playerPortStr] = uid.split(":");
        const playerPort = parseInt(playerPortStr, 10);

        this.gameServer.send(msg, playerPort, playerIP, (error) => {
            if (error) console.error(`Failed to send message to ${playerIP}:${playerPort}`);
        });
    }

    public getGameServerRaw() {
        return this.gameServer;
    }
}