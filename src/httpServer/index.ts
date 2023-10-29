import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http"
import roomRouter from "../httpServer/routes/roomRouter";

export class MajodoHttpServer {
    private app: Application;
    private httpServer: http.Server;

    constructor(
        private readonly serverAddress: string,
        private readonly httpServerPort: number,
        private readonly httpDataLimit: string = "50mb"
        ) {
        this.app = express();
        this.setupMiddlewares(this.httpDataLimit);
        
        this.app.get("/api/health", (req: Request, res: Response) => {
            res.send("Server is healthy");
        });

        this.httpServer = http.createServer(this.app);
    
        this.httpServer?.listen(this.httpServerPort, this.serverAddress, () => {
          console.log(
            `Server is listening on ${this.serverAddress}:${this.httpServerPort}`
          );
        });        
    }

    private setupMiddlewares(httpDataLimit: string) {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json({ limit: httpDataLimit }));
        this.app.use(
          express.urlencoded({ extended: true, limit: httpDataLimit })
        );
    
        this.app.use("/api/rooms", roomRouter);
    }

    public getExpressServer() {
        return this.app;
    }

    public getHttpServer() {
        return this.httpServer;
    }
}
