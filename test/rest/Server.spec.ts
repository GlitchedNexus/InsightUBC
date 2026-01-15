import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import * as fs from "fs-extra";
import { clearDisk } from "../TestUtil";

describe("Facade C3", function () {
	let server: Server;
	const port = 4321;
	let sectionsZip: string | object | undefined;
	let roomsZip: string | object | undefined;
	let badZip: string | object | undefined;
	let goodQuery: object | undefined;
	let badQuery: object | undefined;

	before(async function () {
		await clearDisk();
		sectionsZip = await fs.readFile("./test/resources/archives/pair.zip");
		roomsZip = await fs.readFile("./test/resources/archives/campus.zip");
		badZip = await fs.readFile("./test/resources/archives/invalid.zip");
		let data = await fs.readFile("./test/resources/restQueries/good.json", "utf-8");
		goodQuery = JSON.parse(data);
		data = await fs.readFile("./test/resources/restQueries/bad.json", "utf-8");
		badQuery = JSON.parse(data);
	});

	after(function () {
		// nah imma do my own thing
	});

	beforeEach(async function () {
		server = new Server(port);
		await server.start();
	});

	afterEach(async function () {
		await server.stop();
		await clearDisk();
	});

	// ECHO
	it("ECHO", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			return request(SERVER_URL)
				.get("/echo/portantonio")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// PUT one sections
	it("PUT test for sections dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/ye/sections";

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// PUT bad zip
	it("PUT bad zip", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/ye/sections";

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(badZip)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
					Log.trace(res.body.error);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// PUT one rooms
	it("PUT test for rooms dataset", async function () {
		const SERVER_URL = "http://localhost:4321";
		const ENDPOINT_URL = "/dataset/carti/rooms";

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(roomsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// PUT two datasets then list
	it("PUT two then GET list", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/ye/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			await request(SERVER_URL)
				.put("/dataset/carti/rooms")
				.send(roomsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf2: " + err);
				});
			return request(SERVER_URL)
				.get("/datasets")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// DELETE dataset
	it("DELETE one", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/ye/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.delete("/dataset/ye")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// DELETE one bad
	it("DELETE one bad", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/ye/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.delete("/dataset/trav")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.NOT_FOUND);
					Log.trace(res.body.error);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// DELETE one bad2
	it("DELETE one bad2", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/ye/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.delete("/dataset/trav_ye")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
					Log.trace(res.body.error);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	it("POST query good", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.post("/query")
				.send(goodQuery)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	it("POST query bad", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.post("/query")
				.send(badQuery)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
					Log.trace(res.body.error);
				})
				.catch(function (err) {
					Log.trace("wtf3: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// test cpscAvg endpoint
	it("GET cpscAvg", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.get("/cpscAvg/sections")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// test totalFails endpoint
	it("GET totalFails", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.get("/totalFails/sections")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// test avgCount endpoint
	it("GET avgCount", async function () {
		const SERVER_URL = "http://localhost:4321";

		try {
			await request(SERVER_URL)
				.put("/dataset/bob/sections")
				.send(sectionsZip)
				.set("Content-Type", "application/x-zip-compressed")
				.catch(function (err) {
					Log.trace("wtf1: " + err);
				});
			return request(SERVER_URL)
				.get("/avgCount/bob")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(StatusCodes.OK);
					Log.trace(res.body.result);
				})
				.catch(function (err) {
					Log.trace("wtf: " + err);
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
