/**
 * This file contains the implementation for the
 * project's query engine that manages all
 * query logic, query validation and query execution.
 */

import Section from "../DataProcessor/Section";
import Room from "../DataProcessor/Room";
import { InsightError, InsightResult, ResultTooLargeError } from "../controller/IInsightFacade";
import { Filter, FilterKey, FilterType } from "./Filter";
import { Comparator } from "./Comparator";
import { Transformer } from "./Transformer";

/**
 * This is the plan:
 *
 * Validation happens real time as we generate the Query.
 *
 * The Query will consist of two classes
 *
 * Query class: Contains options and its specifications + Filter
 *
 * Options: this part is easy to deal with
 * - make sure either order does not exist or references an EXACT key in coloms
 * - take the dataset in coloums to be the reference dataset, return only those keys
 * - there should only be ONE dataset ever referenced
 *
 * Filter class:
 * - four keys, either AND, OR, NOT, REG
 * - list of filters (CPSC 110 😱), list will contain 1 element if NOT or REG
 * - validation method for each type of filter which take in argument section
 * - recursive validation for section
 *
 * Validating Queries:
 * - Just boils down to traversing the filters in the same manner but constructing as well
 * - And making sure things are fine
 */

export default class QueryEngine {
	// These should be rewritten every call made to query
	private comparator: Comparator;
	private transformer: Transformer;
	public topFilter: Filter | undefined;
	private datasetName: string | undefined;
	private static listOfFields = new Set<string>([
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
	]);
	private static fieldLength = 2;
	private static querySize = 3;
	private static numKeys = 1;
	private static resultLimit = 5000;

	public constructor() {
		this.topFilter = undefined;
		this.datasetName = undefined;
		this.comparator = new Comparator();
		this.transformer = new Transformer();
	}

	public getDatasetName(): string {
		return this.datasetName as string;
	}

	// Need to revamp this
	public executeQuery(list: (Section | Room)[]): InsightResult[] {
		const ret: (Section | Room)[] = [];
		list.forEach((item) => {
			try {
				if (this.topFilter?.filterALL(item)) {
					ret.push(item);
				}
			} catch {
				throw new InsightError("Mismatch dataset type (room vs section)");
			}
		});
		ret.forEach((item) => {
			const flag = this.transformer.group(item);
			if (!flag) {
				throw new InsightError("Mismatch dataset type (room vs section)");
			}
		});
		const transformedRet = this.transformer.transform();
		if (transformedRet === undefined) {
			throw new InsightError("Mismatch dataset type (room vs section)");
		}
		const finalRet = this.comparator.executeComparator(transformedRet);
		if (finalRet === undefined) {
			throw new InsightError("Incorrect options, bad columns");
		}
		if (finalRet.length > QueryEngine.resultLimit) {
			throw new ResultTooLargeError("u doing too much");
		}
		return finalRet;
	}

	// Go through the existing JSON, both validate and assemble filter
	public validateQuery(query: any): boolean {
		if (typeof query !== "object" || query === null) {
			return false;
		}
		query = JSON.parse(JSON.stringify(query));
		this.datasetName = undefined;
		this.comparator = new Comparator();
		this.transformer = new Transformer();
		if (!this.validateComponents(query)) {
			return false;
		}
		if (query.WHERE === undefined) {
			return false;
		}
		if (Array.isArray(query.WHERE)) {
			return false;
		}
		if (query.TRANSFORMATIONS !== undefined && Object.keys(query).length > QueryEngine.querySize) {
			return false;
		} else if (query.TRANSFORMATIONS === undefined && Object.keys(query).length > QueryEngine.fieldLength) {
			return false;
		}
		this.topFilter = new Filter(FilterType.TOP, FilterKey.NA, "", 0, "");
		if (Object.keys(query.WHERE).length > 0 && !this.validateQueryHelper(query.WHERE, this.topFilter as Filter)) {
			return false;
		}
		return true;
	}

	public validateComponents(query: any): boolean {
		if (!this.comparator.validateOptions(query)) {
			return false;
		}
		if (!this.transformer.validateTransformer(query)) {
			return false;
		}
		if (
			this.transformer.datasetName !== undefined &&
			this.comparator.datasetName !== undefined &&
			this.transformer.datasetName !== this.comparator.datasetName
		) {
			return false;
		}
		this.datasetName = this.comparator.datasetName;
		if (this.transformer.datasetName !== undefined) {
			this.datasetName = this.transformer.datasetName;
		}
		if (
			this.transformer.datasetName !== undefined &&
			this.comparator.datasetName !== undefined &&
			!this.transformer.checkKeyInTransformer(this.comparator.returnKeys)
		) {
			return false;
		}
		return true;
	}

	public validateKeysForAll(valid: string[]): boolean {
		if (!this.transformer.validateKeys(valid) || !this.comparator.validateKeys(valid)) {
			return false;
		}
		return true;
	}

	public validateQueryHelper(query: any, filter: Filter): boolean {
		if (Object.keys(query).length > QueryEngine.numKeys) {
			return false;
		}
		if (query.AND !== undefined) {
			return this.handleAND(query.AND, filter);
		} else if (query.OR !== undefined) {
			return this.handleOR(query.OR, filter);
		} else if (query.LT !== undefined) {
			return this.handleLT(query.LT, filter);
		} else if (query.GT !== undefined) {
			return this.handleGT(query.GT, filter);
		} else if (query.EQ !== undefined) {
			return this.handleEQ(query.EQ, filter);
		} else if (query.IS !== undefined) {
			return this.handleIS(query.IS, filter);
		} else if (query.NOT !== undefined) {
			return this.handleNOT(query.NOT, filter);
		}
		return false;
	}

	public handleAND(query: any, filter: Filter): boolean {
		if (!Array.isArray(query)) {
			return false;
		}
		if (query.length === 0) {
			return false;
		}
		const cur = new Filter(FilterType.AND, FilterKey.NA, "", 0, "");
		filter.pushFilterList(cur);
		let ret = true;
		query.forEach((item) => {
			if (!this.validateQueryHelper(item, cur)) {
				ret = false;
			}
		});
		return ret;
	}

	public handleOR(query: any, filter: Filter): boolean {
		if (!Array.isArray(query)) {
			return false;
		}
		if (query.length === 0) {
			return false;
		}
		const cur = new Filter(FilterType.OR, FilterKey.NA, "", 0, "");
		filter.pushFilterList(cur);
		let ret = true;
		query.forEach((item) => {
			if (!this.validateQueryHelper(item, cur)) {
				ret = false;
			}
		});
		return ret;
	}

	public handleLT(query: any, filter: Filter): boolean {
		if (typeof query !== "object" || query === null) {
			return false;
		}

		const curKeys = Object.keys(query);
		if (curKeys.length !== QueryEngine.numKeys) {
			return false;
		}
		const parts = curKeys[0].split("_");
		if (!this.validateField(parts)) {
			return false;
		}
		if (typeof query[curKeys[0]] !== "number") {
			return false;
		}
		const cur = new Filter(FilterType.REG, FilterKey.LT, parts[1], query[curKeys[0]] as number, "");
		filter.pushFilterList(cur);
		return true;
	}

	public handleGT(query: any, filter: Filter): boolean {
		if (typeof query !== "object" || query === null) {
			return false;
		}

		const curKeys = Object.keys(query);
		if (curKeys.length !== QueryEngine.numKeys) {
			return false;
		}
		const parts = curKeys[0].split("_");
		if (!this.validateField(parts)) {
			return false;
		}
		if (typeof query[curKeys[0]] !== "number") {
			return false;
		}
		const cur = new Filter(FilterType.REG, FilterKey.GT, parts[1], query[curKeys[0]] as number, "");
		filter.pushFilterList(cur);
		return true;
	}

	public handleEQ(query: any, filter: Filter): boolean {
		if (typeof query !== "object") {
			return false;
		}

		const curKeys = Object.keys(query);
		if (curKeys.length !== QueryEngine.numKeys) {
			return false;
		}
		const parts = curKeys[0].split("_");
		if (!this.validateField(parts)) {
			return false;
		}
		if (!(typeof query[curKeys[0]] === "number")) {
			return false;
		}
		const cur = new Filter(FilterType.REG, FilterKey.EQ, parts[1], query[curKeys[0]] as number, "");
		filter.pushFilterList(cur);
		return true;
	}

	public handleIS(query: any, filter: Filter): boolean {
		if (typeof query !== "object") {
			return false;
		}

		const curKeys = Object.keys(query);
		if (curKeys.length !== QueryEngine.numKeys) {
			return false;
		}
		const parts = curKeys[0].split("_");
		if (!this.validateField(parts)) {
			return false;
		}

		const value = query[curKeys[0]];
		if (typeof value !== "string") {
			return false;
		}

		// Check for invalid asterisk positions
		if (value.slice(1, -1).includes("*")) {
			return false;
		}

		const cur = new Filter(FilterType.REG, FilterKey.IS, parts[1], 0, value);
		filter.pushFilterList(cur);
		return true;
	}

	public handleNOT(query: any, filter: Filter): boolean {
		if (typeof query !== "object") {
			return false;
		}

		const curKeys = Object.keys(query);

		if (curKeys.length === 0) {
			return false;
		}

		const cur = new Filter(FilterType.NOT, FilterKey.NA, "", 0, "");
		filter.pushFilterList(cur);

		return this.validateQueryHelper(query, cur);
	}

	public validateField(parts: string[]): boolean {
		if (parts.length !== QueryEngine.fieldLength) {
			return false;
		} else if (
			(this.datasetName === undefined || this.datasetName === parts[0]) &&
			QueryEngine.listOfFields.has(parts[1])
		) {
			return true;
		}
		return false;
	}
}
