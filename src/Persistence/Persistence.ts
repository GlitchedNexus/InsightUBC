import { InsightDatasetKind, InsightError } from "../controller/IInsightFacade";
import fse from "fs-extra";
import Section from "../DataProcessor/Section";
import Room from "../DataProcessor/Room";

export default class Persistence {
	private path;

	constructor(path: string) {
		this.path = path;
	}

	public async saveDataSets(dataSets: [Map<string, any[]>, Map<string, InsightDatasetKind>]): Promise<void> {
		if (!dataSets) {
			throw new InsightError("Invalid Datasets");
		}

		if (!this.path) {
			throw new InsightError("Invalid file path");
		}

		const dataObject = {
			data: Array.from(dataSets[0].entries()),
			kinds: Array.from(dataSets[1].entries()),
		};

		try {
			await fse.writeJSON(this.path, dataObject, { spaces: 2 });
		} catch {
			throw new InsightError("Failure when writing datasets to file");
		}
	}

	public async loadDataSets(isLoaded: boolean): Promise<[Map<string, any[]>, Map<string, InsightDatasetKind>]> {
		if (!isLoaded) {
			try {
				await fse.ensureFile(this.path);
				const data = await fse.readJSON(this.path);
				const dataMap = new Map<string, any[]>(
					data.data.map(([key, value]: [string, any[]]) => {
						const kind = data.kinds.find(([k]: [string, InsightDatasetKind]) => k === key)[1];
						if (kind === InsightDatasetKind.Sections) {
							value = value.map((item: any) => this.toSection(item));
						} else if (kind === InsightDatasetKind.Rooms) {
							value = value.map((item: any) => this.toRoom(item));
						}
						return [key, value];
					})
				);
				const kindsMap = new Map<string, InsightDatasetKind>(
					data.kinds.map(([key, value]: [string, InsightDatasetKind]) => [key, value])
				);
				return [dataMap, kindsMap];
			} catch {
				return [new Map<string, any[]>(), new Map<string, InsightDatasetKind>()];
			}
		}
		// This should ideally not run.
		return [new Map<string, any[]>(), new Map<string, InsightDatasetKind>()];
	}

	private toSection(cur: any): Section {
		return new Section(
			cur.uuid,
			cur.id,
			cur.title,
			cur.instructor,
			cur.dept,
			cur.year,
			cur.avg,
			cur.pass,
			cur.fail,
			cur.audit
		);
	}

	private toRoom(roomData: any): Room {
		return new Room(
			roomData.fullname,
			roomData.shortname,
			roomData.number,
			roomData.name,
			roomData.address,
			roomData.lat,
			roomData.lon,
			roomData.seats,
			roomData.type,
			roomData.furniture,
			roomData.href
		);
	}
}
