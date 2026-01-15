import express, { Application, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import * as http from "http";
import cors from "cors";
import * as fs from "fs-extra";
import * as path from "path";

import InsightFacade from "../controller/InsightFacade";
import { IInsightFacade, InsightDatasetKind, InsightError } from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private facade: IInsightFacade | undefined;
	private static ERROR_400 = 400;
	private static ERROR_404 = 404;
	private static OK = 200;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.facade = new InsightFacade();
		this.express = express();

		this.addDataset = this.addDataset.bind(this);
		this.removeDataset = this.removeDataset.bind(this);
		this.queryDataset = this.queryDataset.bind(this);
		this.getDatasets = this.getDatasets.bind(this);
		this.queryCPSCavg = this.queryCPSCavg.bind(this);
		this.queryTotalFails = this.queryTotalFails.bind(this);
		this.queryAvgCount = this.queryAvgCount.bind(this);

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware(): void {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes(): void {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// http://localhost:4321/dataset/:id/:kind
		this.express.put("/dataset/:id/:kind", this.addDataset);

		// http://localhost:4321/dataset/:id/
		this.express.delete("/dataset/:id", this.removeDataset);

		// http://localhost:4321/query
		this.express.post("/query", this.queryDataset);

		// http://localhost:4321/datasets
		this.express.get("/datasets", this.getDatasets);

		// http://localhost:4321/cpscAvg/:id
		this.express.get("/cpscAvg/:id", this.queryCPSCavg);

		// http://localhost:4321/totalFails/:id
		this.express.get("/totalFails/:id", this.queryTotalFails);

		// http://localhost:4321/avgCount/:id
		this.express.get("/avgCount/:id", this.queryAvgCount);
	}

	private async addDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		const kind = req.params.kind;
		const data = req.body.toString("base64");

		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}

		try {
			const ret = await this.facade.addDataset(id, data, kind as InsightDatasetKind);
			res.status(Server.OK).send({ result: ret });
		} catch (e: any) {
			res.status(Server.ERROR_400).send({ error: e.message });
		}
	}

	private async removeDataset(req: Request, res: Response): Promise<void> {
		const id = req.params.id;

		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}

		try {
			const ret = await this.facade.removeDataset(id);
			res.status(Server.OK).send({ result: ret });
		} catch (e: any) {
			if (e instanceof InsightError) {
				res.status(Server.ERROR_400).send({ error: e.message });
			} else {
				res.status(Server.ERROR_404).send({ error: e.message });
			}
		}
	}

	private async queryDataset(req: Request, res: Response): Promise<void> {
		const query = JSON.parse(JSON.stringify(req.body));

		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}

		try {
			const ret = await this.facade.performQuery(query);
			res.status(Server.OK).send({ result: ret });
		} catch (e: any) {
			res.status(Server.ERROR_400).send({ error: e.message });
		}
	}

	private async getDatasets(_: Request, res: Response): Promise<void> {
		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}
		const ret = await this.facade.listDatasets();
		res.status(Server.OK).send({ result: ret });
	}

	private async queryCPSCavg(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}
		const query = await this.loadQuery("cpscAvg.json", id);
		const ret = await this.facade.performQuery(query);
		res.status(Server.OK).send({ result: ret });
	}

	private async queryTotalFails(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}
		const query = await this.loadQuery("totalFails.json", id);
		const ret = await this.facade.performQuery(query);
		res.status(Server.OK).send({ result: ret });
	}

	private async queryAvgCount(req: Request, res: Response): Promise<void> {
		const id = req.params.id;
		if (this.facade === undefined) {
			this.facade = new InsightFacade();
		}
		const query = await this.loadQuery("95avgCount.json", id);
		const ret = await this.facade.performQuery(query);
		res.status(Server.OK).send({ result: ret });
	}

	// GPT Generated code + some changes
	private replaceKeyPattern(json: any, targetPrefix: string, replacementPrefix: string): any {
		if (Array.isArray(json)) {
			// Process arrays recursively
			return json.map((item) => this.replaceKeyPattern(item, targetPrefix, replacementPrefix));
		} else if (typeof json === "object" && json !== null) {
			// Process objects recursively
			const updatedObject: any = {};
			for (const key in json) {
				const newKey = key.startsWith(targetPrefix) ? key.replace(targetPrefix, replacementPrefix) : key;
				updatedObject[newKey] = this.replaceKeyPattern(json[key], targetPrefix, replacementPrefix);
			}
			return updatedObject;
		} else {
			if (typeof json === "string") {
				return json.replace(targetPrefix, replacementPrefix);
			} else {
				return json;
			}
		}
	}

	private async loadQuery(name: string, id: string): Promise<any> {
		const filePath = path.resolve(__dirname, "insights", name);
		const data = await fs.readFile(filePath, "utf-8");
		const query: unknown = JSON.parse(data);
		const ret = this.replaceKeyPattern(query, "sections", id);
		return ret;
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response): void {
		try {
			Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(StatusCodes.OK).json({ result: response });
		} catch (err) {
			res.status(StatusCodes.BAD_REQUEST).json({ error: err });
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
