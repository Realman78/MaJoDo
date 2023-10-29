export interface GameServerInterface {
    broadcastMessageToRoom(players: string[], msg: string, uid: string): void;
    sendToPlayer(uid: string, msg: string): void;
}