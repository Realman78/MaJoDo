export interface GameServerInterface {
    broadcastMessageToRoom(players: string[], msg: string, uid: string, type: number): void;
    sendToPlayer(uid: string, msg: string, type: number): void;
}