import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import DataProcessor from "../DataProcessor/DataProcessor";
import QueryEngine from "../QueryEngine/QueryEngine";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	// DataProcessor
	private dataProcessor = new DataProcessor();
	private queryEngine = new QueryEngine();
	private static sectionFields: string[] = [
		"uuid",
		"id",
		"title",
		"instructor",
		"dept",
		"year",
		"avg",
		"pass",
		"fail",
		"audit",
	];
	private static roomFields: string[] = [
		"fullname",
		"shortname",
		"number",
		"name",
		"address",
		"lat",
		"lon",
		"seats",
		"type",
		"furniture",
		"href",
	];

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		const temp = id.trim();
		if (temp.length === 0) {
			throw new InsightError("Error: empty or whitespace id");
		}
		if (temp.indexOf("_") !== -1) {
			throw new InsightError("Error: underscore in id");
		}

		if (this.dataProcessor.isDuplicate(id)) {
			throw new InsightError("Error: duplicate id");
		}

		if (kind !== InsightDatasetKind.Rooms && kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid dataset kind");
		}
		return await this.dataProcessor.addDataset(id, content, kind);
	}

	public async removeDataset(id: string): Promise<string> {
		return await this.dataProcessor.removeDataset(id);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Validate the query
		if (!this.queryEngine.validateQuery(query)) {
			throw new InsightError("Invalid query");
		}

		// Get the dataset name from the query
		const datasetName = this.queryEngine.getDatasetName();
		if (!datasetName) {
			throw new InsightError("Invalid dataset name");
		}

		if (
			this.dataProcessor.getKind(datasetName) === InsightDatasetKind.Sections &&
			!this.queryEngine.validateKeysForAll(InsightFacade.sectionFields)
		) {
			throw new InsightError("Dataset mismatch");
		}

		if (
			this.dataProcessor.getKind(datasetName) === InsightDatasetKind.Rooms &&
			!this.queryEngine.validateKeysForAll(InsightFacade.roomFields)
		) {
			throw new InsightError("Dataset mismatch");
		}

		await this.dataProcessor.loadPersistence();

		// Retrieve the dataset
		const db = await this.dataProcessor.getDataset(datasetName);
		if (!db) {
			throw new InsightError("Dataset not found");
		}
		return this.queryEngine.executeQuery(db);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return await this.dataProcessor.listDatasets();
	}
}
