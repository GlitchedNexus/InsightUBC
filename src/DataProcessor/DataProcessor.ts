/**
 * This file contains the implementation for the
 * project's Data Processor which allows us to
 * add, remove and manage datasets as well as
 * validate the datasets as they are added.
 *
 * This code here is also responsible for modelling
 * sections.
 */
import { InsightDataset, InsightDatasetKind, InsightError, NotFoundError } from "../controller/IInsightFacade";
import JSZip from "jszip";
import * as parse5 from "parse5";
import Section from "./Section";
import Room from "./Room";
import Persistence from "../Persistence/Persistence";
import { Cur } from "./Interfaces";
import { getBuildingData, processBuildings, returnRoom } from "./RoomDatasetHelpers";

export default class DataProcessor {
	private persistence: Persistence;
	private dataSets: Map<string, (Section | Room)[]>;
	private dataSetsKind: Map<string, InsightDatasetKind>;
	private sectionsCount: number;
	private isLoaded: boolean;
	private path: string = __dirname + "../../../data/dataSets.json";
	private static defaultYear = 1900;

	constructor() {
		this.dataSets = new Map<string, (Section | Room)[]>();
		this.dataSetsKind = new Map<string, InsightDatasetKind>();
		this.sectionsCount = 10;
		this.isLoaded = false;
		this.persistence = new Persistence(this.path);
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.loadPersistence();

		if (this.dataSets.has(id)) {
			throw new InsightError(`Dataset with ID '${id}' already exists.`);
		}

		if (kind === InsightDatasetKind.Sections) {
			return this.addSectionsDataset(id, content);
		} else if (kind === InsightDatasetKind.Rooms) {
			return this.addRoomsDataset(id, content);
		} else {
			throw new InsightError("Invalid dataset kind.");
		}
	}

	public async loadPersistence(): Promise<void> {
		if (!this.isLoaded) {
			const data = await this.persistence.loadDataSets(this.isLoaded);
			this.dataSets = data[0];
			this.dataSetsKind = data[1];
			this.isLoaded = true;
		}
	}

	private async addRoomsDataset(id: string, content: string): Promise<string[]> {
		await this.loadPersistence();
		const contents = await JSZip.loadAsync(content, { base64: true });

		const htmlFile = contents.file("index.htm");
		if (!htmlFile) {
			throw new InsightError("index.htm not found in the zip file.");
		}

		const htmlContent = await htmlFile.async("string");
		const document = parse5.parse(htmlContent);
		const buildingList = getBuildingData(document);

		if (buildingList.length === 0) {
			throw new InsightError("No building information found.");
		}

		const allRooms = await processBuildings(buildingList, contents);
		const roomInstances = returnRoom(allRooms);

		if (roomInstances.length === 0) {
			throw new InsightError("No valid room data found.");
		}

		this.dataSets.set(id, roomInstances);
		this.dataSetsKind.set(id, InsightDatasetKind.Rooms);
		await this.persistence.saveDataSets([this.dataSets, this.dataSetsKind]);

		return Array.from(this.dataSets.keys());
	}

	/**
	 * Adds sections dataset
	 * @param id
	 * @param content
	 */
	public async addSectionsDataset(id: string, content: string): Promise<string[]> {
		const zipper = new JSZip();
		try {
			const zip = await zipper.loadAsync(content, { base64: true });
			let coursesExists = false;
			const zipContent: string[] = [];

			const files = Object.keys(zip.files);

			await Promise.all(
				files.map(async (rel) => {
					const file = zip.files[rel];
					if (rel === "courses/") {
						coursesExists = true;
					} else if (rel.indexOf("courses/") !== -1 && !file.dir) {
						zipContent.push(await file.async("text"));
					}
				})
			);

			if (!coursesExists) {
				throw new InsightError("Error: no courses folder");
			}

			const ret = await this.handleSectionsDataset(id, zipContent);

			if (ret.length === 0) {
				throw new InsightError("Error: duplicate id");
			}

			return ret;
		} catch {
			throw new InsightError("freaky bob!!");
		}
	}

	/**
	 * add a section dataset
	 * @param id
	 * @param content
	 * @returns
	 */
	private async handleSectionsDataset(id: string, content: string[]): Promise<string[]> {
		await this.loadPersistence();
		const ret: string[] = [];
		if (this.dataSets.has(id)) {
			return ret;
		}
		const allSections: Section[] = this.addAllValidRecords(content);
		if (allSections.length === 0) {
			return ret;
		}
		this.dataSets.set(id, allSections);
		this.dataSetsKind.set(id, InsightDatasetKind.Sections);
		await this.persistence.saveDataSets([this.dataSets, this.dataSetsKind]);
		this.dataSets.forEach((_, key) => {
			ret.push(key);
		});
		return ret;
	}

	private addAllValidRecords(content: string[]): Section[] {
		const allSections: Section[] = [];
		content.forEach((obj) => {
			let data;
			try {
				data = JSON.parse(obj);
			} catch {
				return;
			}
			if (data.result === undefined) {
				return;
			}
			data.result.forEach((sec: string) => {
				let cur;
				try {
					cur = JSON.parse(JSON.stringify(sec));
				} catch {
					return;
				}
				const cnt = this.getCount(cur);
				if (cnt === this.sectionsCount) {
					allSections.push(this.getDataFromJSON(cur));
				}
			});
		});
		return allSections;
	}

	private getDataFromJSON(cur: Cur): Section {
		if (cur.Section !== undefined && cur.Section === "overall") {
			return new Section(
				String(cur.id),
				cur.Course,
				cur.Title,
				cur.Professor,
				cur.Subject,
				Number(DataProcessor.defaultYear),
				cur.Avg,
				cur.Pass,
				cur.Fail,
				cur.Audit
			);
		}
		return new Section(
			String(cur.id),
			cur.Course,
			cur.Title,
			cur.Professor,
			cur.Subject,
			Number(cur.Year),
			cur.Avg,
			cur.Pass,
			cur.Fail,
			cur.Audit
		);
	}

	private getCount(cur: any): number {
		let cnt = 0;

		if (cur.id !== undefined) {
			cnt++;
		}
		if (cur.Course !== undefined) {
			cnt++;
		}
		if (cur.Title !== undefined) {
			cnt++;
		}
		if (cur.Professor !== undefined) {
			cnt++;
		}
		if (cur.Subject !== undefined) {
			cnt++;
		}
		if (cur.Year !== undefined) {
			cnt++;
		}
		if (cur.Avg !== undefined) {
			cnt++;
		}
		if (cur.Pass !== undefined) {
			cnt++;
		}
		if (cur.Fail !== undefined) {
			cnt++;
		}
		if (cur.Audit !== undefined) {
			cnt++;
		}

		return cnt;
	}

	/**
	 * perform removeDataset
	 * @param id
	 * @returns string
	 */
	public async removeDataset(id: string): Promise<string> {
		await this.loadPersistence();
		const temp = id.trim();
		if (temp.length === 0) {
			throw new InsightError("Error: empty or whitespace id");
		} else if (temp.indexOf("_") !== -1) {
			throw new InsightError("Error: underscore in id");
		}

		if (this.dataSets.delete(id) && this.dataSetsKind.delete(id)) {
			await this.persistence.saveDataSets([this.dataSets, this.dataSetsKind]);
			return id;
		} else {
			throw new NotFoundError("ID not found in database");
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await this.loadPersistence();
		if (this.dataSets.size === 0) {
			return [];
		} else {
			const ret: InsightDataset[] = [];
			this.dataSets.forEach((val, key) => {
				ret.push({
					id: key,
					kind: this.dataSetsKind.get(key) ?? InsightDatasetKind.Sections, // Provide a default value
					numRows: val.length,
				});
			});

			return ret;
		}
	}

	public async getDataset(id: string): Promise<(Section | Room)[]> {
		await this.loadPersistence();

		if (!this.dataSets.has(id)) {
			throw new NotFoundError("ID not found in database");
		}

		return this.dataSets.get(id) as (Section | Room)[];
	}

	public isDuplicate(id: string): boolean {
		return this.dataSets.has(id);
	}

	public getDatasetKind(): Map<string, InsightDatasetKind> {
		return this.dataSetsKind;
	}

	public getKind(name: string): InsightDatasetKind | undefined {
		return this.dataSetsKind.get(name);
	}
}
