import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let bad: string;
	let big: string;
	let empty: string;
	let random: string;
	let nocourse: string;
	let badsections: string;
	let incorrectFolderName: string;
	let nameWithSpaces: string;
	let coursesInvalidJSON: string;
	let single: string;

	let rooms: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("small.zip");
		bad = await getContentFromArchives("invalid.zip");
		big = await getContentFromArchives("pair.zip");
		empty = await getContentFromArchives("empty.zip");
		random = await getContentFromArchives("random.zip");
		nocourse = await getContentFromArchives("nocourse.zip");
		badsections = await getContentFromArchives("badsections.zip");
		incorrectFolderName = await getContentFromArchives("incorrectFolderName.zip");
		nameWithSpaces = await getContentFromArchives("long folder name.zip");
		coursesInvalidJSON = await getContentFromArchives("coursesInvalidJSON.zip");
		single = await getContentFromArchives("coursesSingle.zip");

		rooms = await getContentFromArchives("campus.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("Persistence", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("Persistence: Check if new InsightFacade has no data", async function () {
			const test = new InsightFacade();
			const result = await test.listDatasets();
			expect(result).to.deep.equal([]);
		});
		it("Persistence: Check if new InsightFacade adds data adn third insight facade is set up", async function () {
			const test = new InsightFacade();
			await test.addDataset("sections", single, InsightDatasetKind.Sections);
			const testNew = new InsightFacade();
			const result = await testNew.listDatasets();
			expect(result).to.deep.equal([{ id: "sections", kind: InsightDatasetKind.Sections, numRows: 1 }]);
		});

		it("Persistence: Check if new InsightFacade add to old data ", async function () {
			await facade.addDataset("sections", single, InsightDatasetKind.Sections);
			await facade.addDataset("big", single, InsightDatasetKind.Sections);
			await facade.addDataset("bigger", single, InsightDatasetKind.Sections);
			const test = new InsightFacade();
			const result = await test.addDataset("single", single, InsightDatasetKind.Sections);
			expect(result).to.have.members(["single", "big", "bigger", "sections"]);
		});

		it("Persistence: Check if new InsightFacade remove from old data ", async function () {
			await facade.addDataset("sections", single, InsightDatasetKind.Sections);
			await facade.addDataset("big", single, InsightDatasetKind.Sections);
			await facade.addDataset("bigger", single, InsightDatasetKind.Sections);
			const test = new InsightFacade();
			const result = await test.removeDataset("big");
			expect(result).equal("big");
		});

		it("Persistence: list old database with single dataset", async function () {
			try {
				await facade.addDataset("hello", big, InsightDatasetKind.Sections);
				const test = new InsightFacade();
				const result = await test.listDatasets();

				expect(result).have.deep.members([{ id: "hello", kind: InsightDatasetKind.Sections, numRows: 64612 }]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("Persistence: list old database with multiple datasets", async function () {
			try {
				await facade.addDataset("hello", big, InsightDatasetKind.Sections);
				await facade.addDataset("bye", big, InsightDatasetKind.Sections);
				const test = new InsightFacade();
				const result = await test.listDatasets();
				expect(result).have.deep.members([
					{ id: "hello", kind: InsightDatasetKind.Sections, numRows: 64612 },
					{ id: "bye", kind: InsightDatasetKind.Sections, numRows: 64612 },
				]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("Persistence: list old database with rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				const test = new InsightFacade();
				const result = await test.listDatasets();

				expect(result).have.deep.members([{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("Persistence: list old database with multiple rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.addDataset("chambers", rooms, InsightDatasetKind.Rooms);
				const test = new InsightFacade();
				const result = await test.listDatasets();

				expect(result).have.deep.members([
					{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 },
					{ id: "chambers", kind: InsightDatasetKind.Rooms, numRows: 364 },
				]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("Persistence: list old database with multiple rooms and sections dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.addDataset("hello", big, InsightDatasetKind.Sections);
				const test = new InsightFacade();
				const result = await test.listDatasets();

				expect(result).have.deep.members([
					{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 },
					{ id: "hello", kind: InsightDatasetKind.Sections, numRows: 64612 },
				]);
			} catch {
				expect.fail("Should have not failed");
			}
		});
	});

	describe("AddDataset: Rooms", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		// ROOMS
		it("AddDataset: Add rooms dataset with valid ID", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				const result = await facade.listDatasets();
				expect(result).have.deep.members([{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("AddDataset: Add rooms dataset with valid ID and remove it", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.removeDataset("rooms");
				const result = await facade.listDatasets();

				expect(result).have.deep.members([]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("AddDataset: Add rooms dataset with valid ID and add it again", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.removeDataset("rooms");
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				const result = await facade.listDatasets();
				expect(result).have.deep.members([{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("AddDataset: Add rooms and sections datasets with valid ID", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				const result = await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				expect(result).have.members(["rooms", "sections"]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		// Invalid ID's

		it("Add Dataset: Reject dataset with an empty dataset id", async function () {
			try {
				await facade.addDataset("", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject dataset with ID containing only underscores", async function () {
			try {
				await facade.addDataset("_", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject ID with only whitespaces", async function () {
			try {
				await facade.addDataset("  ", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject with whitespace id with underscore", async function () {
			try {
				await facade.addDataset(" _", rooms, InsightDatasetKind.Rooms);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: add dataset when dataset id has space between text", async function () {
			try {
				const result = await facade.addDataset("long name", rooms, InsightDatasetKind.Rooms);
				expect(result).have.members(["long name"]);
			} catch {
				expect.fail("Error should not have been thrown above");
			}
		});
	});

	describe("AddDataset: Sections", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		// Invalid ID's

		it("AddDataset: Reject non-base64 string id", async function () {
			try {
				await facade.addDataset("single", "invalid-base64-string", InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("Add Dataset: Reject dataset with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject dataset with ID containing only underscores", async function () {
			try {
				await facade.addDataset("_", sections, InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject ID with only whitespaces", async function () {
			try {
				await facade.addDataset("  ", sections, InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject with whitespace id with underscore", async function () {
			try {
				await facade.addDataset(" _", sections, InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Add sections dataset when dataset id has space between text", async function () {
			try {
				const result = await facade.addDataset("long name", nameWithSpaces, InsightDatasetKind.Sections);
				return expect(result).have.members(["long name"]);
			} catch {
				return expect.fail("Error should not have have thrown above");
			}
		});

		// Invalid Datasets

		it("AddDataset: Reject empty string instead of dataset", async function () {
			try {
				await facade.addDataset("hey", "", InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: dataset has invalid JSON", async function () {
			try {
				await facade.addDataset("invalidJSON", coursesInvalidJSON, InsightDatasetKind.Sections);
				return expect.fail("Should've thrown an error");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: dataset has incorrectly named folder", async function () {
			try {
				await facade.addDataset("incorrectlyNamed", incorrectFolderName, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject zip file with courses, with files, but no valid sections", async function () {
			try {
				await facade.addDataset("hey", empty, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject zip file with folder not named courses, but has valid sections", async function () {
			try {
				await facade.addDataset("hey", random, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject no course folder", async function () {
			try {
				await facade.addDataset("hey", nocourse, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject zip file with courses with invalid sections", async function () {
			try {
				await facade.addDataset("hey", badsections, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("AddDataset: Reject zip file with courses but no content", async function () {
			try {
				await facade.addDataset("hey", bad, InsightDatasetKind.Sections);
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Valid ID's & valid datasets

		it("Add Dataset: Add two valid datasets into database", async function () {
			try {
				await facade.addDataset("kris-tyson-chat", sections, InsightDatasetKind.Sections);
				const result = await facade.addDataset("mrbeast-kids", sections, InsightDatasetKind.Sections);

				expect(result).have.members(["kris-tyson-chat", "mrbeast-kids"]);
			} catch {
				expect.fail("Should have returned a proper list");
			}
		});

		it("AddDataset: Add, remove and re-add dataset into database", async function () {
			try {
				await facade.addDataset("kris-tyson-chat", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("kris-tyson-chat");
				const result = await facade.addDataset("mrbeast-kids", sections, InsightDatasetKind.Sections);

				expect(result).have.members(["mrbeast-kids"]);
			} catch {
				expect.fail("Should have returned a proper list");
			}
		});

		it("Add Dataset: Add three valid datasets into database", async function () {
			try {
				await facade.addDataset("kris-tyson-chat", sections, InsightDatasetKind.Sections);
				await facade.addDataset("mrbeast-kids", single, InsightDatasetKind.Sections);
				const result = await facade.addDataset("edp cupcakes", single, InsightDatasetKind.Sections);

				expect(result).have.members(["kris-tyson-chat", "mrbeast-kids", "edp cupcakes"]);
			} catch {
				expect.fail("Should have returned a proper list");
			}
		});

		it("AddDataset: Reject dataset with ID already in database", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.addDataset("hello", big, InsightDatasetKind.Sections);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		// Invalid ID's

		it("RemoveDataset: empty string as ID", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("RemoveDataset: ID string contains underscore", async function () {
			try {
				await facade.removeDataset("db_name");
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("RemoveDataset: ID string contains only whitespace", async function () {
			try {
				await facade.removeDataset("          ");
				expect.fail("Should've thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		//  Valid ID's

		it("RemoveDataset: Remove dataset with valid ID in database with single dataset", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("hello");

				expect(result).to.equal("hello");
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("RemoveDataset: Consecutively remove two datasets with valid IDs in database", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.addDataset("bye", big, InsightDatasetKind.Sections);
				const result = await facade.removeDataset("hello");
				const result2 = await facade.removeDataset("bye");
				const fin = await facade.listDatasets();

				expect(result).to.equal("hello");
				expect(result2).to.equal("bye");

				expect(fin).have.deep.members([]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("RemoveDataset: Remove dataset from database with multiple datasets", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.addDataset("bye", big, InsightDatasetKind.Sections);
				await facade.removeDataset("hello");
				const result = await facade.listDatasets();

				expect(result).have.deep.members([{ id: "bye", kind: InsightDatasetKind.Sections, numRows: 64612 }]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("RemoveDataset: Reject valid ID due to case sensitivity", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("Hello");

				expect.fail("Should have failed");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("RemoveDataset: Remove dataset and listDataset should be empty", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("hello");
				const result = await facade.listDatasets();

				expect(result).have.deep.members([]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("RemoveDataset: Reject ID not in database", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("bye");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("RemoveDataset: Reject to remove already deleted dataset", async function () {
			try {
				await facade.addDataset("hello", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("hello");
				await facade.removeDataset("hello");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		// Rooms

		it("RemoveDataset: Remove room dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				const result = await facade.removeDataset("rooms");
				const list = await facade.listDatasets();
				expect(result).to.equal("rooms");
				expect(list).to.deep.equal([]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});

		it("RemoveDataset: Remove room dataset and then remove it again", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.removeDataset("rooms");
				await facade.removeDataset("rooms");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("RemoveDataset: Add rooms and sections datasets and remove both", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				const check = await facade.removeDataset("rooms");
				const checkTwo = await facade.removeDataset("sections");
				const result = await facade.listDatasets();

				expect(check).to.equal("rooms");
				expect(checkTwo).to.equal("sections");
				expect(result).have.deep.members([]);
			} catch {
				expect.fail("Should have not thrown an error");
			}
		});
	});

	describe("listDatasets", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("ListDataset: list empty database", async function () {
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([]);
		});

		it("ListDatasets: list database with single entry", async function () {
			try {
				await facade.addDataset("hello", big, InsightDatasetKind.Sections);

				const result = await facade.listDatasets();

				expect(result).have.deep.members([{ id: "hello", kind: InsightDatasetKind.Sections, numRows: 64612 }]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("ListDatasets: list database with multiple entries", async function () {
			try {
				await facade.addDataset("hello", single, InsightDatasetKind.Sections);
				await facade.addDataset("bye", single, InsightDatasetKind.Sections);
				const result = await facade.listDatasets();
				expect(result).have.deep.members([
					{ id: "hello", kind: InsightDatasetKind.Sections, numRows: 1 },
					{ id: "bye", kind: InsightDatasetKind.Sections, numRows: 1 },
				]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("ListDatasets: list database with rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);

				const result = await facade.listDatasets();

				expect(result).have.deep.members([{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 }]);
			} catch {
				expect.fail("Should have not failed");
			}
		});

		it("ListDatasets: list database with multiple rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				await facade.addDataset("chambers", rooms, InsightDatasetKind.Rooms);

				const result = await facade.listDatasets();

				expect(result).have.deep.members([
					{ id: "rooms", kind: InsightDatasetKind.Rooms, numRows: 364 },
					{ id: "chambers", kind: InsightDatasetKind.Rooms, numRows: 364 },
				]);
			} catch {
				expect.fail("Should have not failed");
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<any> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = [];
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					return expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					return expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "NotFoundError") {
					return expect(err).to.be.instanceOf(NotFoundError);
				} else {
					return expect(err).to.be.instanceOf(ResultTooLargeError);
				}
			}
			if (errorExpected) {
				return expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}
			return expect(result).to.have.deep.members(expected);
		}

		async function checkSort(this: Mocha.Context): Promise<any> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkSort." +
						"Usage: 'checkSort' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}

			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = [];
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					return expect.fail(`performQuery threw unexpected error: ${err}`);
				}
				if (expected === "InsightError") {
					return expect(err).to.be.instanceOf(InsightError);
				} else if (expected === "NotFoundError") {
					return expect(err).to.be.instanceOf(NotFoundError);
				} else {
					return expect(err).to.be.instanceOf(ResultTooLargeError);
				}
			}
			if (errorExpected) {
				return expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			// Convert result to an array of JSON objects
			const resultArray = Object.values(result);

			// Check if the result is in the expected order
			for (let i = 0; i < expected.length; i++) {
				expect(resultArray[i]).to.deep.equal(expected[i]);
			}
		}

		before(async function () {
			const facade1 = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.

			try {
				await facade1.addDataset("sections", sections, InsightDatasetKind.Sections);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}

			try {
				await facade1.addDataset("big", big, InsightDatasetKind.Sections);
			} catch (err) {
				throw new Error(`Second dataset failed to be added. \n${err}`);
			}

			try {
				await facade1.addDataset("ubc-sections", big, InsightDatasetKind.Sections);
			} catch (err) {
				throw new Error(`Third dataset failed to be added. \n${err}`);
			}

			try {
				await facade1.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			} catch (err) {
				throw new Error(`Fourth dataset failed to be added. \n${err}`);
			}

			facade = new InsightFacade();
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.

		// valid queries
		// to be honest, I don't expect many tests for this
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[valid/wildcardLeft.json] test left wildcard", checkQuery);
		it("[valid/wildcardRight.json] test right wildcard", checkQuery);
		it("[valid/wildcardBoth.json] test both wildcard", checkQuery);
		it("[valid/complex1.json] test complex query one", checkQuery);
		it("[valid/complex2.json] test complex query two", checkQuery);
		it("[valid/complex3.json] test complex query three", checkQuery);
		it("[valid/complex4.json] test complex query four", checkQuery);
		it("[valid/validDatasetNameContainsHyphen.json] Dataset Name Contains Hyphen", checkQuery);
		it("[valid/validEmpty.json] Query returning nothing", checkQuery);
		it("[valid/validNoOrdering.json] Query with No Ordering", checkQuery);
		it("[valid/validSimpleInputString.json] Query with simple string", checkQuery);
		// invalid queries
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);
		it("[invalid/noFilter.json] Query no filter too large", checkQuery);
		it("[invalid/badDataset.json] test bad dataset", checkQuery);
		it("[invalid/emptyAnd.json] test empty AND", checkQuery);
		it("[invalid/emptyOr.json] test empty OR", checkQuery);
		it("[invalid/emptyGT.json] test empty GT", checkQuery);
		it("[invalid/emptyLT.json] test empty LT", checkQuery);
		it("[invalid/emptyEQ.json] test empty EQ", checkQuery);
		it("[invalid/emptyNot.json] test empty NOT", checkQuery);
		it("[invalid/emptyOptions.json] test empty OPTIONS", checkQuery);
		it("[invalid/emptyCol.json] test empty COL", checkQuery);
		it("[invalid/emptyOrder.json] test empty ORDER", checkQuery);
		it("[invalid/wrongType1.json] test wrong type one", checkQuery);
		it("[invalid/wrongType2.json] test wrong type two", checkQuery);
		it("[invalid/manyBadErrors.json] test multiple errors", checkQuery);
		it("[invalid/twoDatasets.json] test mentioning two datasets", checkQuery);
		it("[invalid/wrongKey.json] test with wrong keys", checkQuery);
		it("[invalid/wildcardWrong.json] test with wrong wildcard", checkQuery);
		it("[invalid/invalidDoubleUnderscore.json] Query missing WHERE", checkQuery);
		it("[invalid/invalidEmptyJSONQuery.json] Query with Empty JSON", checkQuery);
		it("[invalid/wrongCase.json] test with wrong case", checkQuery);
		it("[invalid/invalidMissingColumns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/invalidMKey.json] Query missing M Key", checkQuery);
		it("[invalid/invalidOrderKey.json] Query with invalid order key", checkQuery);
		it("[invalid/invalidOrderKeyNotInColumns.json] Query Order Key Not In Columns", checkQuery);
		it("[invalid/invalidSKey.json] Query missing S Key", checkQuery);
		it("[invalid/wildcardWrongDoubleStart.json] test with wrong wildcard", checkQuery);
		it("[invalid/wildcardWrongDoubleEnd.json] test with wrong wildcard", checkQuery);

		// GT, LT, EQ
		it("[valid/validGT.json] Query with GT", checkQuery);
		it("[valid/validLT.json] Query with LT", checkQuery);
		it("[valid/validEQ.json] Query with EQ", checkQuery);

		// Sorting
		it("[valid/validOrderingStrings.json] Query with sorting based on string field", checkQuery);
		it("[valid/validOrderingStrings.json] Query with sorting based on string field", checkSort);

		it("[valid/validOrderingNumbers.json] Query with sorting based on numeric field", checkQuery);
		it("[valid/validOrderingNumbers.json] Query with sorting based on numeric field", checkSort);

		// New queries
		// Valid
		it("[validNew/simple.json] Simple query w/ transformations and sort", checkSort);
		it("[validNew/complex1.json] Complex query w/ transformations and sort", checkSort);
		it("[validNew/complex2.json] Complex query 2 w/ transformations and sort", checkSort);
		it("[validNew/complex3.json] Complex query 3 w/ transformations and sort", checkQuery);
		it("[validNew/complex4.json] Complex query 4 w/ transformations and sort", checkSort);
		it("[validNew/complex5.json] Complex query 5 w/ transformations and sort", checkSort);
		it("[validNew/roomsEverything.json] Query all rooms keys", checkQuery);
		it("[validNew/simple2.json] simple 2", checkSort);
		it("[validNew/complex6.json] complex 6", checkQuery);

		// Invalid
		it("[invalidNew/badApplyMax.json] Query with bad key in apply MAX", checkQuery);
		it("[invalidNew/badApplyMin.json] Query with bad key in apply MIN", checkQuery);
		it("[invalidNew/badApplySum.json] Query with bad key in apply SUM", checkQuery);
		it("[invalidNew/emptyGroup.json] Query with empty group", checkQuery);
		it("[invalidNew/groupBadKey.json] Query with bad key in group", checkQuery);
		it("[invalidNew/manyCaseErrors.json] Query with many case errors", checkQuery);
		it("[invalidNew/manyKeyErrors.json] Query with many key errors", checkQuery);
		it("[invalidNew/colKeyNotInGroup.json] Query with col key not in group", checkQuery);
		it("[invalidNew/sus1.json] sus 1", checkQuery);
		it("[invalidNew/sus2.json] sus 2", checkQuery);
		it("[invalidNew/sus3.json] sus 3", checkQuery);
		it("[invalidNew/sus4.json] sus 4", checkQuery);
		it("[invalidNew/sus5.json] sus 5", checkQuery);
		it("[invalidNew/sus6.json] sus 6", checkQuery);
		it("[invalidNew/sus7.json] sus 7", checkQuery);
		it("[invalidNew/sus8.json] sus 8", checkQuery);
		it("[invalidNew/dupe.json] query with dupe", checkQuery);
		it("[invalidNew/stop1.json] i cant 1", checkQuery);
		it("[invalidNew/stop2.json] i cant 2", checkQuery);
		it("[invalidNew/stop3.json] i cant 3", checkQuery);
		it("[invalidNew/stop4.json] i cant 4", checkQuery);
		it("[invalidNew/stop5.json] i cant 5", checkQuery);
		it("[invalidNew/stop6.json] i cant 6", checkQuery);
		it("[invalidNew/emptyKeys.json] empty keys", checkQuery);
		it("[invalidNew/applyGroup.json] apply key in group", checkQuery);
		it("[invalidNew/word.json] word", checkQuery);

		// Extra
		// it("[extra/checkAVGDecimal.json] ex7", checkQuery);
		// it("[extra/checkMIN.json] ex1", checkQuery);
		// it("[extra/checkMINSUM.json] ex3", checkQuery);
		// it("[extra/checkMINSUMSorting.json] ex4", checkQuery);
		// it("[extra/checkSUM.json] ex2", checkQuery);
		// it("[extra/checkSUMAVGDecimal.json] ex7", checkQuery);
		// it("[extra/checkSUMDecimal.json] ex7", checkQuery);
		// it("[extra/idfc.json] ex7", checkQuery);
		// it("[extra/idfc2.json] ex7", checkQuery);
		// it("[extra/invalidCheckMin.json] ex5", checkQuery);
		// it("[extra/invalidCheckSUM.json] ex6", checkQuery);
	});
});
